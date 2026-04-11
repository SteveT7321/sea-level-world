"""
fetch_psmsl.py — 從 PSMSL 和 NOAA 抓取全球 20 個高風險國家的潮位歷史資料

使用方式：
  python scripts/fetch_psmsl.py

需求：Python 3.8+（內建 urllib）
輸出：data/historical.json
"""

import json
import math
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

# ================================================================
# 各國潮位站設定
# source: 'psmsl' | 'noaa' | None
# ================================================================
COUNTRY_STATIONS = [
    {
        'id': 'bangladesh', 'source': 'psmsl',
        'stations': [{'id': 1476, 'name': "Cox's Bazaar"}],
        # PSMSL 1476: 1978-2000, baseline ok
    },
    {
        'id': 'maldives', 'source': 'psmsl',
        'stations': [{'id': 1733, 'name': 'Male'}],
    },
    {
        'id': 'tuvalu', 'source': 'psmsl',
        'stations': [{'id': 820, 'name': 'Funafuti'}],
    },
    {
        'id': 'kiribati', 'source': 'psmsl',
        'stations': [
            {'id': 1739, 'name': 'Tarawa-C Betio'},
            {'id': 1579, 'name': 'Tarawa-B Bairiki'},
        ],
        # 1739: 1988-1997; 1579: 1983-1988 — combined gives baseline coverage
    },
    {
        'id': 'marshall_islands', 'source': 'psmsl',
        'stations': [
            {'id': 513,  'name': 'Kwajalein'},
            {'id': 1217, 'name': 'Majuro-B'},
        ],
    },
    {
        'id': 'vietnam', 'source': 'psmsl',
        'stations': [{'id': 1475, 'name': 'Danang'}],
        # PSMSL 1475: 1978-2013, baseline ok
    },
    {
        'id': 'netherlands', 'source': 'psmsl',
        'stations': [
            {'id': 9,  'name': 'Vlissingen'},
            {'id': 22, 'name': 'Hoek van Holland'},
            {'id': 23, 'name': 'IJmuiden'},
        ],
    },
    {
        'id': 'egypt', 'source': 'psmsl',
        'stations': [{'id': 1, 'name': 'Alexandria'}],
    },
    {
        'id': 'myanmar', 'source': None, 'stations': [],
    },
    {
        'id': 'thailand', 'source': 'psmsl',
        'stations': [{'id': 174, 'name': 'Ko Lak'}],
        # PSMSL 174: 1940-2024, baseline ok
    },
    {
        'id': 'india', 'source': 'psmsl',
        'stations': [
            {'id': 43,  'name': 'Mumbai (Apollo Bandar)'},
            {'id': 438, 'name': 'Kochi (Cochin)'},
        ],
    },
    {
        'id': 'china', 'source': 'psmsl',
        'stations': [{'id': 727, 'name': 'Xiamen'}],
        # PSMSL 727: 1954-2004, baseline ok
    },
    {
        'id': 'indonesia', 'source': 'psmsl',
        'stations': [{'id': 185, 'name': 'Jakarta (Tanjung Priok)'}],
        # Note: Jakarta data includes land subsidence (relative SLR)
    },
    {
        'id': 'philippines', 'source': 'psmsl',
        'stations': [{'id': 145, 'name': 'Manila S.Harbor'}],
        # PSMSL 145: 1901-2024, baseline ok
    },
    {
        'id': 'pakistan', 'source': 'psmsl',
        'stations': [{'id': 204, 'name': 'Karachi'}],
        # PSMSL 204: 1916-2016, baseline ok
    },
    {
        'id': 'cambodia', 'source': None, 'stations': [],
    },
    {
        'id': 'nigeria', 'source': None, 'stations': [],
        # No reliable PSMSL station for Nigerian coast; synthetic fallback
    },
    {
        'id': 'mozambique', 'source': 'psmsl',
        'stations': [{'id': 937, 'name': 'Beira'}],
    },
    {
        'id': 'japan', 'source': 'psmsl',
        'stations': [
            {'id': 130,  'name': 'Aburatsubo'},
            {'id': 1545, 'name': 'Tokyo III'},
            {'id': 1099, 'name': 'Osaka'},
            {'id': 1094, 'name': 'Hakata'},
        ],
        # All confirmed: 1930-2025, 1982-2024, 1965-2025, 1965-2022
    },
    {
        'id': 'taiwan', 'source': 'psmsl',
        'stations': [
            {'id': 545,  'name': 'Keelung II'},
            {'id': 1356, 'name': 'Kaohsiung II'},
        ],
        # Best available PSMSL: 545 (1956-1995), 1356 (1973-1989)
        # Recent years will be extended by trend in the frontend
    },
]


def fetch_url(url, timeout=20):
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'sea-level-world-viz/1.0 (educational research)'}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode('utf-8', errors='replace')
    except Exception as e:
        return None


def fetch_psmsl(station):
    url = f"https://www.psmsl.org/data/obtaining/rlr.monthly.data/{station['id']}.rlrdata"
    text = fetch_url(url)
    if not text:
        print(f"    x PSMSL {station['id']} ({station['name']}): fetch failed")
        return []

    rows = []
    for line in text.strip().split('\n'):
        parts = line.strip().split(';')
        if len(parts) < 2:
            continue
        try:
            year_frac = float(parts[0])
            msl       = float(parts[1])
        except ValueError:
            continue
        if math.isnan(msl) or msl == -99999:
            continue
        year  = int(year_frac)
        month = min(12, max(1, round((year_frac - year) * 12) + 1))
        rows.append({'year': year, 'month': month, 'msl_cm': msl / 10.0})

    print(f"    ok PSMSL {station['id']} ({station['name']}): {len(rows)} records")
    return rows


def fetch_noaa_year(station_id, year):
    url = (
        f"https://api.tidesandcurrents.noaa.gov/api/prod/datagetter"
        f"?station={station_id}&product=monthly_mean&datum=MSL"
        f"&time_zone=GMT&units=metric&format=json"
        f"&begin_date={year}0101&end_date={year}1231"
    )
    text = fetch_url(url, timeout=10)
    if not text:
        return []
    try:
        data = json.loads(text)
    except Exception:
        return []
    if 'error' in data or 'data' not in data:
        return []
    rows = []
    for d in data['data']:
        try:
            yr = int(d['t'][:4])
            mo = int(d['t'][4:6])
            v  = float(d['MSL'])
            rows.append({'year': yr, 'month': mo, 'msl_cm': v * 100.0})
        except Exception:
            continue
    return rows


def fetch_noaa_station(station):
    import datetime
    start_year = 1960
    end_year   = datetime.date.today().year
    rows = []
    print(f"    Downloading NOAA {station['id']} ({station['name']}) {start_year}-{end_year}...")
    for year in range(start_year, end_year + 1):
        yr_rows = fetch_noaa_year(station['id'], year)
        rows.extend(yr_rows)
        sys.stdout.write(f"\r    {year}... {len(rows)} records")
        sys.stdout.flush()
        time.sleep(0.15)
    print(f"\n    ok NOAA {station['id']} ({station['name']}): {len(rows)} records")
    return rows


def compute_baseline_1990(rows):
    near = [r for r in rows if 1988 <= r['year'] <= 1992]
    if not near:
        return None
    return sum(r['msl_cm'] for r in near) / len(near)


def fill_gaps(data):
    if len(data) < 2:
        return data
    result = []
    for i in range(len(data) - 1):
        result.append(data[i])
        curr = data[i]
        nxt  = data[i + 1]
        c_mark = curr['year'] * 12 + curr['month']
        n_mark = nxt['year']  * 12 + nxt['month']
        gap = n_mark - c_mark
        if 1 < gap <= 24:
            for g in range(1, gap):
                t     = g / gap
                mo_num = c_mark + g
                yr    = (mo_num - 1) // 12
                mo    = (mo_num - 1) % 12 + 1
                val   = curr['value'] + (nxt['value'] - curr['value']) * t
                result.append({
                    'year': yr, 'month': mo,
                    'value': round(val, 2),
                    'interpolated': True,
                })
    result.append(data[-1])
    return result


def process_country(config):
    if not config['source'] or not config['stations']:
        return None

    all_normalized = []
    for station in config['stations']:
        if config['source'] == 'psmsl':
            raw = fetch_psmsl(station)
        else:
            raw = fetch_noaa_station(station)

        if not raw:
            continue

        baseline = compute_baseline_1990(raw)
        if baseline is None:
            print(f"    ! {station['name']}: no 1988-1992 data, skipping")
            continue

        normalized = [
            {'year': r['year'], 'month': r['month'],
             'value': round(r['msl_cm'] - baseline, 2)}
            for r in raw
        ]
        all_normalized.extend(normalized)
        print(f"    baseline {station['name']}: {baseline:.2f} cm")

    if not all_normalized:
        return None

    # Average across stations for same year-month
    by_ym = {}
    for d in all_normalized:
        key = (d['year'], d['month'])
        by_ym.setdefault(key, []).append(d['value'])

    merged = [
        {'year': k[0], 'month': k[1],
         'value': round(sum(v) / len(v), 2)}
        for k, v in sorted(by_ym.items())
    ]

    return fill_gaps(merged)


def main():
    out_dir  = Path(__file__).parent.parent / 'data'
    out_path = out_dir / 'historical.json'
    out_dir.mkdir(parents=True, exist_ok=True)

    result  = {}
    sources = {}
    success = 0
    skipped = 0

    for config in COUNTRY_STATIONS:
        print(f"\n[{config['id']}]")
        if not config['source']:
            print("  skip (no station)")
            skipped += 1
            continue

        data = process_country(config)
        if not data:
            print("  x no data retrieved, frontend will use synthetic fallback")
            skipped += 1
            continue

        result[config['id']] = data
        sources[config['id']] = {
            'source':   config['source'].upper(),
            'stations': [
                f"{s['name']} ({'PSMSL' if config['source']=='psmsl' else 'NOAA'} {s['id']})"
                for s in config['stations']
            ],
        }
        span = f"{data[0]['year']}/{data[0]['month']} - {data[-1]['year']}/{data[-1]['month']}"
        print(f"  ok {len(data)} monthly records ({span})")
        success += 1

    output = {
        '_meta': {
            'generated': __import__('datetime').date.today().isoformat(),
            'unit':      'cm',
            'baseline':  '1990 (1988-1992 mean)',
            'interval':  'monthly',
            'note':      'Countries with null data use synthetic fallback in the frontend.',
            'sources':   sources,
        },
        **result,
    }

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"Done: {success} countries ok, {skipped} skipped")
    print(f"Output: {out_path}")
    print(f"Skipped countries will use synthetic data in the frontend.")


if __name__ == '__main__':
    main()
