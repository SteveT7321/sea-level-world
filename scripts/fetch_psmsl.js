/**
 * fetch_psmsl.js — 從 PSMSL 和 NOAA 抓取全球 20 個高風險國家的潮位歷史資料
 *
 * 使用方式：
 *   node scripts/fetch_psmsl.js
 *
 * 需求：Node.js 18+（內建 fetch）
 * 輸出：data/historical.json
 *
 * 資料來源：
 *   PSMSL (Permanent Service for Mean Sea Level): https://www.psmsl.org
 *   NOAA CO-OPS API: https://api.tidesandcurrents.noaa.gov
 *
 * 站點 ID 可在 PSMSL 網站查詢：https://www.psmsl.org/data/obtaining/map.html
 * 若特定國家無可靠站點，將略過並使用前端合成資料 fallback。
 */

'use strict';

const fs   = require('fs');
const path = require('path');

/* ================================================================
   各國潮位站設定
   source: 'psmsl' | 'noaa' | null（null = 無站點，前端 fallback 合成）
   psmsl: stations[].id 為 PSMSL RLR 月均資料的站點 ID
   noaa:  stations[].id 為 NOAA CO-OPS 站點 ID（字串）
   ================================================================ */
const COUNTRY_STATIONS = [
  {
    id: 'bangladesh',
    source: 'psmsl',
    stations: [
      { id: 1087, name: 'Chittagong' },
    ],
    note: 'PSMSL 1087; Cox\'s Bazar 歷史紀錄過短不納入',
  },
  {
    id: 'maldives',
    source: 'psmsl',
    stations: [
      { id: 1733, name: 'Malé' },
    ],
  },
  {
    id: 'tuvalu',
    source: 'psmsl',
    stations: [
      { id: 820, name: 'Funafuti' },
    ],
  },
  {
    id: 'kiribati',
    source: 'psmsl',
    stations: [
      { id: 1614, name: 'Tarawa (Betio)' },
    ],
    note: '如抓取失敗，請至 psmsl.org 確認 Tarawa 的正確 ID',
  },
  {
    id: 'marshall_islands',
    source: 'psmsl',
    stations: [
      { id:  851, name: 'Kwajalein' },
      { id: 1185, name: 'Majuro' },
    ],
  },
  {
    id: 'vietnam',
    source: 'psmsl',
    stations: [
      { id: 238, name: 'Hon Dau (Haiphong)' },
    ],
  },
  {
    id: 'netherlands',
    source: 'psmsl',
    stations: [
      { id:  9, name: 'Vlissingen' },
      { id: 22, name: 'Hoek van Holland' },
      { id: 23, name: 'IJmuiden' },
    ],
  },
  {
    id: 'egypt',
    source: 'psmsl',
    stations: [
      { id: 1, name: 'Alexandria' },
    ],
  },
  {
    id: 'myanmar',
    source: null,  // 無可靠 PSMSL 站點
    stations: [],
    note: '無 PSMSL 站點，前端使用合成資料',
  },
  {
    id: 'thailand',
    source: 'psmsl',
    stations: [
      { id: 276, name: 'Ko Lak' },
    ],
  },
  {
    id: 'india',
    source: 'psmsl',
    stations: [
      { id: 123, name: 'Mumbai (Bombay)' },
      { id:  49, name: 'Kochi (Cochin)' },
    ],
  },
  {
    id: 'china',
    source: 'psmsl',
    stations: [
      { id: 268, name: 'Xiamen' },
    ],
  },
  {
    id: 'indonesia',
    source: 'psmsl',
    stations: [
      { id: 185, name: 'Jakarta (Tanjung Priok)' },
    ],
    note: 'Jakarta 有地層下陷問題，資料反映相對海平面（含地層下陷）',
  },
  {
    id: 'philippines',
    source: 'psmsl',
    stations: [
      { id: 61, name: 'Manila' },
    ],
  },
  {
    id: 'pakistan',
    source: 'psmsl',
    stations: [
      { id: 20, name: 'Karachi' },
    ],
  },
  {
    id: 'cambodia',
    source: null,  // 無可靠 PSMSL 站點
    stations: [],
    note: '無 PSMSL 站點，前端使用合成資料',
  },
  {
    id: 'nigeria',
    source: 'psmsl',
    stations: [
      { id: 2079, name: 'Lagos II' },
    ],
  },
  {
    id: 'mozambique',
    source: 'psmsl',
    stations: [
      { id: 937, name: 'Beira' },
    ],
  },
  {
    id: 'japan',
    source: 'psmsl',
    stations: [
      { id: 1024, name: '東京 (Tokyo)' },
      { id: 1316, name: '大阪 (Osaka)' },
      { id:  610, name: '油壺 (Aburatsubo)' },
      { id: 1318, name: '博多 (Hakata)' },
    ],
  },
  {
    id: 'taiwan',
    source: 'noaa',
    stations: [
      { id: '1636000', name: '基隆 (Keelung)' },
      { id: '1635000', name: '高雄 (Kaohsiung)' },
    ],
  },
];

/* ================================================================
   PSMSL fetch
   格式：每行 "YYYY.YY;MSL_mm;FLAG;FLAG2"
   ================================================================ */
async function fetchPSMSL(station) {
  const url = `https://www.psmsl.org/data/obtaining/rlr.monthly.data/${station.id}.rlrdata`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'sea-level-world-viz/1.0 (educational research)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    const rows = [];
    for (const line of text.trim().split('\n')) {
      const parts = line.trim().split(';');
      if (parts.length < 2) continue;
      const yearFrac = parseFloat(parts[0]);
      const msl      = parseFloat(parts[1]);
      if (isNaN(yearFrac) || isNaN(msl) || msl === -99999) continue;

      const year  = Math.floor(yearFrac);
      // PSMSL 以 0.0 = 1月，故 month = round(frac*12)+1，限 1-12
      const month = Math.min(12, Math.max(1, Math.round((yearFrac - year) * 12) + 1));
      rows.push({ year, month, msl_cm: msl / 10 }); // mm → cm
    }
    console.log(`    ✓ PSMSL ${station.id} (${station.name}): ${rows.length} 筆`);
    return rows;
  } catch (e) {
    console.warn(`    ✗ PSMSL ${station.id} (${station.name}) 失敗: ${e.message}`);
    return [];
  }
}

/* ================================================================
   NOAA CO-OPS fetch（台灣用，逐年請求月均 MSL）
   ================================================================ */
function buildNoaaUrl(stationId, year) {
  return (
    `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
    `?station=${stationId}` +
    `&product=monthly_mean` +
    `&datum=MSL` +
    `&time_zone=GMT` +
    `&units=metric` +
    `&format=json` +
    `&begin_date=${year}0101` +
    `&end_date=${year}1231`
  );
}

async function fetchNoaaStation(station) {
  const START_YEAR = 1960;
  const END_YEAR   = new Date().getFullYear();
  const rows = [];
  console.log(`    下載 NOAA ${station.id} (${station.name}) ${START_YEAR}–${END_YEAR} ...`);

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    try {
      const res  = await fetch(buildNoaaUrl(station.id, year), { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      if (!data.error && data.data) {
        for (const d of data.data) {
          const yr = parseInt(d.t.slice(0, 4));
          const mo = parseInt(d.t.slice(4, 6));
          const v  = parseFloat(d.MSL);
          if (!isNaN(v)) rows.push({ year: yr, month: mo, msl_cm: v * 100 }); // m → cm
        }
      }
    } catch { /* 略過個別年份失敗 */ }
    await new Promise(r => setTimeout(r, 150)); // 避免請求過快
  }
  console.log(`    ✓ NOAA ${station.id} (${station.name}): ${rows.length} 筆`);
  return rows;
}

/* ================================================================
   1990 年基準化（使用 1988-1992 平均）
   ================================================================ */
function computeBaseline1990(rows) {
  const near = rows.filter(r => r.year >= 1988 && r.year <= 1992);
  if (near.length === 0) return null; // 無基準期資料
  return near.reduce((s, r) => s + r.msl_cm, 0) / near.length;
}

/* ================================================================
   填補缺漏月份（線性內插，最多補 24 個月空缺）
   ================================================================ */
function fillGaps(data) {
  if (data.length < 2) return data;
  const result = [];
  for (let i = 0; i < data.length - 1; i++) {
    result.push(data[i]);
    const curr = data[i], next = data[i + 1];
    const cMark = curr.year * 12 + curr.month;
    const nMark = next.year * 12 + next.month;
    const gap = nMark - cMark;
    if (gap > 1 && gap <= 24) {
      for (let g = 1; g < gap; g++) {
        const t     = g / gap;
        const moNum = cMark + g;
        const yr    = Math.floor((moNum - 1) / 12);
        const mo    = ((moNum - 1) % 12) + 1;
        result.push({
          year: yr, month: mo,
          value: parseFloat((curr.value + (next.value - curr.value) * t).toFixed(2)),
          interpolated: true,
        });
      }
    }
  }
  result.push(data[data.length - 1]);
  return result;
}

/* ================================================================
   處理單一國家：抓取、平均多站、1990 基準化
   回傳 [{year, month, value}]，value 單位 cm（1990 基準）
   ================================================================ */
async function processCountry(config) {
  if (!config.source || config.stations.length === 0) return null;

  const allNormalized = [];

  for (const station of config.stations) {
    let raw = [];
    if (config.source === 'psmsl') {
      raw = await fetchPSMSL(station);
    } else if (config.source === 'noaa') {
      raw = await fetchNoaaStation(station);
    }
    if (raw.length === 0) continue;

    const baseline = computeBaseline1990(raw);
    if (baseline === null) {
      console.warn(`    ⚠ ${station.name}: 無 1988-1992 資料，略過基準化`);
      continue;
    }

    const normalized = raw.map(r => ({
      year:  r.year,
      month: r.month,
      value: parseFloat((r.msl_cm - baseline).toFixed(2)),
    }));
    allNormalized.push(...normalized);
    console.log(`    基準值 ${station.name}: ${baseline.toFixed(2)} cm`);
  }

  if (allNormalized.length === 0) return null;

  // 同年月多站取平均
  const byYearMonth = {};
  allNormalized.forEach(d => {
    const key = `${d.year}-${String(d.month).padStart(2, '0')}`;
    if (!byYearMonth[key]) byYearMonth[key] = [];
    byYearMonth[key].push(d.value);
  });

  const merged = Object.entries(byYearMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => {
      const [y, m] = key.split('-');
      return {
        year:  parseInt(y),
        month: parseInt(m),
        value: parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)),
      };
    });

  return fillGaps(merged);
}

/* ================================================================
   Main
   ================================================================ */
async function main() {
  const outDir  = path.join(__dirname, '..', 'data');
  const outPath = path.join(outDir, 'historical.json');

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const result   = {};
  const sources  = {};
  let   success  = 0;
  let   skipped  = 0;

  for (const config of COUNTRY_STATIONS) {
    console.log(`\n[${config.id}]`);
    if (!config.source) {
      console.log('  略過（無站點）');
      skipped++;
      continue;
    }

    const data = await processCountry(config);
    if (!data || data.length === 0) {
      console.warn(`  ✗ 無法取得資料，前端將 fallback 合成資料`);
      skipped++;
      continue;
    }

    result[config.id] = data;
    sources[config.id] = {
      source:   config.source.toUpperCase(),
      stations: config.stations.map(s =>
        `${s.name} (${config.source === 'psmsl' ? 'PSMSL' : 'NOAA'} ${s.id})`
      ),
    };
    console.log(`  ✅ ${data.length} 筆月均資料（${data[0].year}/${data[0].month} – ${data[data.length-1].year}/${data[data.length-1].month}）`);
    success++;
  }

  const output = {
    _meta: {
      generated:   new Date().toISOString().slice(0, 10),
      unit:        'cm',
      baseline:    '1990 (1988-1992 mean)',
      interval:    'monthly',
      note:        'Countries with null data use synthetic fallback in the frontend.',
      sources,
    },
    ...result,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ 完成！成功 ${success} 國，略過 ${skipped} 國`);
  console.log(`   輸出：${outPath}`);
  console.log(`   略過的國家將由前端自動使用合成資料補充`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
