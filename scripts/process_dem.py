# -*- coding: utf-8 -*-
"""
process_dem.py — 從 SRTM GL1 (30m) DEM 生成全球 20 個高風險國家的沿海高程帶 GeoJSON

使用方式：
  python scripts/process_dem.py                  # 處理所有國家
  python scripts/process_dem.py taiwan japan      # 只處理指定國家

前置需求：
  pip install rasterio numpy shapely pyproj

DEM 資料下載（一次性）：
  NASA EarthData: https://search.earthdata.nasa.gov/
  搜尋「SRTMGL1」，依各國 tile 清單下載後解壓縮到 data/dem/
  執行本腳本時會印出每個國家需要的 tile 清單。
  若不想手動下載，執行：
    python scripts/process_dem.py --download
  需要安裝：pip install requests tqdm  並有 NASA EarthData 帳號
  export EARTHDATA_USER=你的帳號
  export EARTHDATA_PASS=你的密碼

輸出：
  data/elevation/{country_id}.geojson  — 各高程帶多邊形

注意：
  - SRTM 覆蓋範圍 60°N～56°S，所有目標國家均在範圍內
  - 大國（中國、印度、印尼）只處理沿海緊縮範圍以控制檔案大小
  - 太平洋島國（Tuvalu、Kiribati 等）整體面積小，精度受 30m 解析度限制
  - Indonesia Jakarta 的資料包含地層下陷，反映相對海平面
"""

import sys
import os
import io
import json
import math
import argparse
import numpy as np

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
from pathlib import Path

try:
    import rasterio
    from rasterio.merge import merge
    from rasterio.features import shapes
    from rasterio.mask import mask as rio_mask
    from rasterio.io import MemoryFile
    from shapely.geometry import shape, mapping, MultiPolygon, box
    from shapely.ops import unary_union
except ImportError:
    print("缺少必要套件，請執行：")
    print("  pip install rasterio numpy shapely pyproj")
    sys.exit(1)

# ================================================================
# 高程門檻（公尺）
# ================================================================
ELEVATION_THRESHOLDS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0]

# 多邊形簡化容差（度，約 200m）
SIMPLIFY_TOLERANCE = 0.002

# 最小保留面積（度²，約 1 km²）
MIN_AREA_DEG2 = 0.0001

# ================================================================
# 各國設定：沿海關注範圍 (lon_min, lat_min, lon_max, lat_max)
# 大國只取沿海低地區域，避免 tile 太多
# ================================================================
COUNTRIES = {
    'bangladesh': {
        'name': 'Bangladesh',
        'regions': [
            ('Ganges-Brahmaputra Delta',    (88.0, 21.5, 92.5, 24.5)),
        ],
    },
    'maldives': {
        'name': 'Maldives',
        'regions': [
            ('North Atolls',   (72.8, 4.0, 73.8, 7.2)),
            ('Central Atolls', (72.7, 0.5, 73.6, 4.0)),
            ('South Atolls',   (72.9, -1.0, 73.5, 0.5)),
        ],
    },
    'tuvalu': {
        'name': 'Tuvalu',
        'regions': [
            ('All Islands', (176.0, -10.0, 180.0, -5.5)),
        ],
    },
    'kiribati': {
        'name': 'Kiribati',
        'regions': [
            ('Gilbert Islands', (172.5, -3.5, 174.0, 3.5)),
            ('Line Islands',   (-158.0, -4.0, -154.5, 3.0)),
        ],
    },
    'marshall_islands': {
        'name': 'Marshall Islands',
        'regions': [
            ('Ratak Chain',  (169.0, 5.0, 172.5, 12.0)),
            ('Ralik Chain',  (165.5, 4.5, 168.5, 12.5)),
        ],
    },
    'vietnam': {
        'name': 'Vietnam',
        'regions': [
            ('Red River Delta',   (105.5, 19.5, 107.5, 21.5)),
            ('Mekong Delta',      (104.5, 9.0,  107.5, 11.5)),
        ],
    },
    'netherlands': {
        'name': 'Netherlands',
        'regions': [
            ('Coastal Lowlands', (3.3, 51.0, 7.3, 53.6)),
        ],
    },
    'egypt': {
        'name': 'Egypt',
        'regions': [
            ('Nile Delta',      (29.5, 30.0, 32.5, 31.8)),
            ('Alexandria Coast',(29.5, 30.8, 31.0, 31.3)),
        ],
    },
    'myanmar': {
        'name': 'Myanmar',
        'regions': [
            ('Irrawaddy Delta', (94.5, 15.0, 96.5, 17.5)),
            ('Ayeyarwady Coast',(97.0, 15.5, 98.5, 17.0)),
        ],
    },
    'thailand': {
        'name': 'Thailand',
        'regions': [
            ('Bangkok Basin',   (100.0, 13.0, 101.5, 14.5)),
            ('Gulf Coast',      (99.5, 10.5, 101.0, 13.0)),
        ],
    },
    'india': {
        'name': 'India',
        'regions': [
            ('Ganges Delta (West Bengal)',  (87.5, 21.0, 89.5, 22.5)),
            ('Sundarbans',                  (88.0, 21.3, 89.2, 22.2)),
            ('Mumbai Coast',               (72.5, 18.5, 73.5, 19.5)),
            ('Krishna-Godavari Delta',     (80.5, 15.5, 82.5, 17.0)),
            ('Cauvery Delta',              (79.5, 10.5, 80.5, 11.5)),
        ],
    },
    'china': {
        'name': 'China',
        'regions': [
            ('Yangtze Delta (Shanghai)',   (120.5, 30.5, 122.0, 31.8)),
            ('Pearl River Delta',          (112.5, 21.5, 114.5, 23.5)),
            ('Yellow River Delta',         (118.0, 37.0, 120.0, 38.5)),
        ],
    },
    'indonesia': {
        'name': 'Indonesia',
        'regions': [
            ('Jakarta Bay',          (106.5, -6.4,  107.2, -5.9)),
            ('North Java Coast',     (107.0, -7.0,  111.0, -6.0)),
            ('Sumatra East Coast',   (103.5, -2.0,  106.0,  1.5)),
        ],
    },
    'philippines': {
        'name': 'Philippines',
        'regions': [
            ('Manila Bay',    (120.5, 14.0, 121.5, 14.9)),
            ('Central Luzon', (120.0, 14.5, 121.5, 16.0)),
        ],
    },
    'pakistan': {
        'name': 'Pakistan',
        'regions': [
            ('Indus Delta',   (67.0, 23.5, 68.5, 25.0)),
            ('Karachi Coast', (66.5, 24.5, 67.5, 25.2)),
        ],
    },
    'cambodia': {
        'name': 'Cambodia',
        'regions': [
            ('Mekong Floodplain', (104.5, 10.5, 107.0, 12.5)),
            ('Tonle Sap Basin',   (103.5, 12.0, 105.0, 13.5)),
        ],
    },
    'nigeria': {
        'name': 'Nigeria',
        'regions': [
            ('Niger Delta',   (5.0, 4.0, 7.5, 6.0)),
            ('Lagos Coast',   (3.0, 6.2, 4.5, 6.8)),
        ],
    },
    'mozambique': {
        'name': 'Mozambique',
        'regions': [
            ('Beira Coast',         (34.5, -20.5, 36.0, -18.5)),
            ('Maputo Bay',          (32.5, -26.0, 33.5, -24.5)),
            ('Zambezi Delta',       (35.5, -18.5, 37.0, -17.0)),
        ],
    },
    'japan': {
        'name': 'Japan',
        'regions': [
            ('Kanto Plain',    (138.8, 35.0, 140.8, 36.2)),
            ('Nobi Plain',     (136.5, 34.8, 137.2, 35.4)),
            ('Osaka Bay',      (135.2, 34.3, 135.8, 34.9)),
            ('Ariake Sea',     (130.1, 32.4, 130.9, 33.1)),
            ('Fukuoka Plain',  (130.2, 33.4, 130.7, 33.8)),
            ('Sendai Plain',   (140.7, 38.0, 141.3, 38.5)),
            ('Kochi Plain',    (133.3, 33.4, 133.8, 33.7)),
        ],
    },
    'taiwan': {
        'name': 'Taiwan',
        'regions': [
            ('West Coast Plain',  (119.8, 22.5, 121.0, 25.0)),
            ('Taipei Basin',      (121.2, 24.9, 121.8, 25.3)),
        ],
    },
}


def tile_names_for_bounds(lon_min, lat_min, lon_max, lat_max):
    """根據 bounds 計算需要的 SRTM GL1 tile 名稱清單"""
    tiles = []
    for lat in range(math.floor(lat_min), math.ceil(lat_max)):
        for lon in range(math.floor(lon_min), math.ceil(lon_max)):
            ns = 'N' if lat >= 0 else 'S'
            ew = 'E' if lon >= 0 else 'W'
            tiles.append(f'{ns}{abs(lat):02d}{ew}{abs(lon):03d}')
    return tiles


def find_tiles(dem_dir: Path, tile_name: str):
    """在 dem_dir 中尋找指定 tile 的檔案（.hgt / .tif / .img）"""
    for ext in ('*.hgt', '*.tif', '*.img'):
        matches = list(dem_dir.glob(f'{tile_name}{ext}')) + \
                  list(dem_dir.glob(f'{tile_name.upper()}{ext}')) + \
                  list(dem_dir.glob(f'{tile_name.lower()}{ext}'))
        if matches:
            return matches[0]
    return None


def load_tiles_for_bounds(dem_dir: Path, lon_min, lat_min, lon_max, lat_max):
    """讀取並合併覆蓋指定 bounds 的 DEM tiles，回傳 (elevation_array, transform)"""
    tile_names = tile_names_for_bounds(lon_min, lat_min, lon_max, lat_max)
    datasets = []
    missing = []

    for name in tile_names:
        fp = find_tiles(dem_dir, name)
        if fp:
            datasets.append(rasterio.open(fp))
        else:
            missing.append(name)

    if missing:
        print(f"    ⚠ 缺少 tiles: {', '.join(missing)}")

    if not datasets:
        return None, None

    if len(datasets) == 1:
        ds = datasets[0]
        arr = ds.read(1).astype(np.float32)
        t   = ds.transform
        ds.close()
        return arr, t

    merged, transform = merge(datasets)
    for ds in datasets:
        ds.close()
    return merged[0].astype(np.float32), transform


def elevation_to_polygons(elevation, transform, threshold_m, region_bounds):
    """將低於門檻高程的像素轉換為多邊形，裁切至 region_bounds"""
    # 遮罩：0 <= elev < threshold（排除海洋負值與高地）
    mask = np.where(
        (elevation >= 0) & (elevation < threshold_m),
        1, 0
    ).astype(np.uint8)

    if mask.sum() == 0:
        return MultiPolygon()

    polys = []
    for geom, val in shapes(mask, transform=transform):
        if val == 1:
            p = shape(geom)
            if p.is_valid and p.area > 0:
                polys.append(p)

    if not polys:
        return MultiPolygon()

    union      = unary_union(polys)
    simplified = union.simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)
    region_box = box(*region_bounds)
    clipped    = simplified.intersection(region_box)

    if clipped.is_empty:
        return MultiPolygon()

    # 過濾太小的 polygons
    if clipped.geom_type == 'MultiPolygon':
        geoms = [g for g in clipped.geoms if g.area >= MIN_AREA_DEG2]
        return MultiPolygon(geoms) if geoms else MultiPolygon()
    elif clipped.geom_type == 'Polygon':
        return clipped if clipped.area >= MIN_AREA_DEG2 else MultiPolygon()
    return MultiPolygon()


def process_country(country_id: str, dem_dir: Path, out_dir: Path):
    """處理單一國家，輸出 {country_id}.geojson"""
    config = COUNTRIES.get(country_id)
    if not config:
        print(f"[{country_id}] 未知的國家 ID，跳過")
        return False

    print(f"\n{'='*50}")
    print(f"[{country_id}] {config['name']}")
    print(f"{'='*50}")

    # 印出需要的所有 tile
    all_tiles = set()
    for _, bounds in config['regions']:
        for t in tile_names_for_bounds(*bounds):
            all_tiles.add(t)
    print(f"需要 tiles（共 {len(all_tiles)} 個）：{', '.join(sorted(all_tiles))}")

    features_by_threshold = {t: [] for t in ELEVATION_THRESHOLDS}

    for region_name, bounds in config['regions']:
        print(f"\n  區域：{region_name} {bounds}")
        elevation, transform = load_tiles_for_bounds(dem_dir, *bounds)
        if elevation is None:
            print(f"  ✗ 無可用 tile，跳過此區域")
            continue

        for threshold in ELEVATION_THRESHOLDS:
            poly = elevation_to_polygons(elevation, transform, threshold, bounds)
            if not poly.is_empty:
                features_by_threshold[threshold].append(poly)

    # 合併各區域、輸出 features
    features = []
    for threshold in ELEVATION_THRESHOLDS:
        polys = features_by_threshold[threshold]
        if not polys:
            continue
        combined   = unary_union(polys)
        simplified = combined.simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)
        features.append({
            'type': 'Feature',
            'properties': {
                'elevation_m': threshold,
                'name': f'Below {threshold} m',
            },
            'geometry': mapping(simplified),
        })
        print(f"  ✓ threshold {threshold}m: {simplified.geom_type}")

    if not features:
        print(f"  ✗ 無任何高程帶資料（可能 DEM tile 尚未下載）")
        return False

    geojson = {
        'type': 'FeatureCollection',
        'crs': {'type': 'name', 'properties': {'name': 'EPSG:4326'}},
        '_meta': {
            'country': country_id,
            'source': 'SRTM GL1 30m',
            'thresholds_m': ELEVATION_THRESHOLDS,
            'simplify_tolerance_deg': SIMPLIFY_TOLERANCE,
        },
        'features': features,
    }

    out_path = out_dir / f'{country_id}.geojson'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, separators=(',', ':'))

    size_kb = out_path.stat().st_size / 1024
    print(f"\n  ✅ {len(features)} 個高程帶 → {out_path.name} ({size_kb:.1f} KB)")
    return True


def print_all_tiles():
    """印出所有國家需要的 tile 清單（方便一次性批次下載）"""
    print("\n=== 所有國家需要的 SRTM GL1 tiles ===\n")
    all_tiles = set()
    for cid, config in COUNTRIES.items():
        tiles = set()
        for _, bounds in config['regions']:
            for t in tile_names_for_bounds(*bounds):
                tiles.add(t)
        all_tiles |= tiles
        print(f"{config['name']:20s} ({len(tiles):3d} tiles): {', '.join(sorted(tiles))}")
    print(f"\n合計 {len(all_tiles)} 個不重複 tiles")
    print("\n下載網址：https://search.earthdata.nasa.gov/  → 搜尋 SRTMGL1")
    print("格式：選 .hgt.zip，解壓後放入 data/dem/")


def download_tiles(dem_dir: Path, country_ids: list):
    """嘗試自動下載所需 tiles（需 EarthData 帳號與 requests 套件）"""
    try:
        import requests
    except ImportError:
        print("請先安裝：pip install requests")
        return

    user = os.environ.get('EARTHDATA_USER')
    pw   = os.environ.get('EARTHDATA_PASS')
    if not user or not pw:
        print("請先設定環境變數：EARTHDATA_USER 和 EARTHDATA_PASS")
        print("  export EARTHDATA_USER=你的帳號")
        print("  export EARTHDATA_PASS=你的密碼")
        return

    dem_dir.mkdir(parents=True, exist_ok=True)
    needed = set()
    for cid in country_ids:
        config = COUNTRIES.get(cid)
        if not config:
            continue
        for _, bounds in config['regions']:
            for t in tile_names_for_bounds(*bounds):
                needed.add(t)

    print(f"\n需要下載 {len(needed)} 個 tiles...")
    base_url = "https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL1.003/2000.02.11"

    for tile in sorted(needed):
        out_hgt = dem_dir / f'{tile}.hgt'
        if out_hgt.exists():
            print(f"  已存在：{tile}.hgt，跳過")
            continue

        zip_name = f'{tile}.SRTMGL1.hgt.zip'
        url = f'{base_url}/{zip_name}'
        print(f"  下載 {zip_name} ...", end='', flush=True)
        try:
            import zipfile, io
            r = requests.get(url, auth=(user, pw), timeout=60)
            if r.status_code == 200:
                with zipfile.ZipFile(io.BytesIO(r.content)) as z:
                    z.extractall(dem_dir)
                print(f" ✓")
            elif r.status_code == 404:
                print(f" ✗ 無此 tile（可能是海洋區域）")
            else:
                print(f" ✗ HTTP {r.status_code}")
        except Exception as e:
            print(f" ✗ {e}")


# ================================================================
# Main
# ================================================================
def main():
    parser = argparse.ArgumentParser(
        description='從 SRTM GL1 DEM 生成各國沿海高程帶 GeoJSON'
    )
    parser.add_argument(
        'countries', nargs='*',
        help='要處理的國家 ID（留空 = 全部）。例：taiwan japan'
    )
    parser.add_argument(
        '--list-tiles', action='store_true',
        help='印出所有國家需要的 tile 清單後退出'
    )
    parser.add_argument(
        '--download', action='store_true',
        help='自動下載所需 DEM tiles（需 EarthData 帳號）'
    )
    args = parser.parse_args()

    script_dir  = Path(__file__).parent
    project_dir = script_dir.parent
    dem_dir     = project_dir / 'data' / 'dem'
    out_dir     = project_dir / 'data' / 'elevation'

    if args.list_tiles:
        print_all_tiles()
        return

    target_ids = args.countries if args.countries else list(COUNTRIES.keys())

    # 驗證 ID
    unknown = [c for c in target_ids if c not in COUNTRIES]
    if unknown:
        print(f"未知的國家 ID：{unknown}")
        print(f"可用 ID：{list(COUNTRIES.keys())}")
        sys.exit(1)

    if args.download:
        download_tiles(dem_dir, target_ids)

    if not dem_dir.exists() or not any(dem_dir.iterdir() if dem_dir.exists() else []):
        print(f"\ndata/dem/ 目錄為空或不存在。")
        print("請先下載 SRTM GL1 tiles：")
        print("  1. 執行 python scripts/process_dem.py --list-tiles 查看需要的 tiles")
        print("  2. 至 https://search.earthdata.nasa.gov/ 搜尋 SRTMGL1 下載")
        print("  3. 解壓縮後放入 data/dem/")
        print("  或執行：")
        print("     export EARTHDATA_USER=你的帳號")
        print("     export EARTHDATA_PASS=你的密碼")
        print("     python scripts/process_dem.py --download")
        return

    out_dir.mkdir(parents=True, exist_ok=True)
    success = 0
    failed  = []

    for cid in target_ids:
        ok = process_country(cid, dem_dir, out_dir)
        if ok:
            success += 1
        else:
            failed.append(cid)

    print(f"\n{'='*50}")
    print(f"完成：{success}/{len(target_ids)} 個國家")
    if failed:
        print(f"失敗（DEM 未下載）：{', '.join(failed)}")
    print(f"輸出目錄：{out_dir}")


if __name__ == '__main__':
    main()
