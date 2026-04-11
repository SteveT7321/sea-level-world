# 🌊 Global Sea Level Rise Observatory

Interactive visualization of sea level rise projections for the **top 20 highest flood-risk nations**, covering 2000–2100 under five IPCC AR6 climate scenarios.

**🔗 Live demo:** [stevet7321.github.io/sea-level-world](https://stevet7321.github.io/sea-level-world/)

> Or clone the repo and open `index.html` directly in any browser — no server required.

---

## Features

- **20 countries** ranked by flood risk — switch via a prominent floating button on the map
- **Real flag images** (flagcdn.com) for every country in selector and header
- **5 climate scenarios** with color-coded tabs and a dedicated description bar below
- **Interactive Leaflet map** with animated flood layer (4 depth levels, pulsing CSS animation)
- **Chart.js trend chart** — historical data (2000–2025) + projection band (2025–2100)
- **Timeline playback** — adjustable speed (0.5×–5×) and step size (1/5/10 yr)
- **Live stats panel** — sea level anomaly, rise rate, flood area (km²), at-risk population (M)
- **Threatened areas list** — zones that flood at current sea level, sorted north → south
- Responsive design — desktop and mobile

---

## Countries Covered

| Rank | Country | Key Risk Factor |
|------|---------|----------------|
| 1 | 🇧🇩 Bangladesh | Ganges–Brahmaputra delta, 80% land below 5 m |
| 2 | 🇲🇻 Maldives | Coral atolls, avg elevation < 1.5 m |
| 3 | 🇹🇻 Tuvalu | Pacific micro-atoll, existential risk |
| 4 | 🇰🇮 Kiribati | 33 low-lying Pacific islands |
| 5 | 🇲🇭 Marshall Islands | Max elevation 3 m, high ENSO exposure |
| 6 | 🇻🇳 Vietnam | Mekong & Red River deltas, 17 M at risk |
| 7 | 🇳🇱 Netherlands | 26% of land below sea level |
| 8 | 🇪🇬 Egypt | Nile Delta, heavy subsidence |
| 9 | 🇲🇲 Myanmar | Irrawaddy delta, limited coastal defenses |
| 10 | 🇹🇭 Thailand | Bangkok sinking 2–5 cm/yr |
| 11 | 🇮🇳 India | 170 M people in coastal districts |
| 12 | 🇨🇳 China | Yangtze & Pearl River deltas, 145 M exposed |
| 13 | 🇮🇩 Indonesia | Jakarta relocated due to extreme subsidence |
| 14 | 🇵🇭 Philippines | Manila Bay, typhoon zone |
| 15 | 🇵🇰 Pakistan | Indus Delta, Karachi coast |
| 16 | 🇰🇭 Cambodia | Mekong & Tonle Sap floodplain |
| 17 | 🇳🇬 Nigeria | Niger Delta, Lagos coastline erosion |
| 18 | 🇲🇿 Mozambique | Cyclone-prone, low adaptation capacity |
| 19 | 🇯🇵 Japan | Tokyo / Osaka / Nagoya zero-meter zones |
| 20 | 🇹🇼 Taiwan | Western coastal plains, typhoon amplification |

---

## Climate Scenarios

| Dot | Scenario | 2100 Rise — Bangladesh (median) |
|-----|----------|---------------------------------|
| 🟢 | SSP1-2.6 Optimistic | +70 cm |
| 🟡 | SSP2-4.5 Moderate | +120 cm |
| 🟠 | SSP5-8.5 Pessimistic | +180 cm |
| 🔴 | SSP5+ High-end | +250 cm |
| 🟣 | Ice Sheet Collapse | +380 cm |

> Values are relative to 1990 baseline. Each country has individually calibrated SSP projections, trend rate, and seasonal parameters based on IPCC AR6 regional data.

---

## Usage

```bash
# Step 1 — fetch real historical tide-gauge data (one-time setup, requires Python 3.8+)
python scripts/fetch_psmsl.py
# outputs data/historical.json (17 countries from PSMSL, 3 use synthetic fallback)

# Step 2 — local server (required for data/historical.json to load)
python -m http.server 8080
# then visit http://localhost:8080

# Or open index.html directly (works offline, uses synthetic data only)
```

### Controls

| Control | Action |
|---------|--------|
| **Country button** (floating, top-center of map) | Switch between 20 countries |
| **Scenario tabs** | Change climate projection |
| **Description bar** | Shows scenario summary + color dot |
| **▶ Play / ⏸ Pause** | Animate timeline 2000 → 2100 |
| **↺ Restart** (appears at 2100) | Rewind to 2000 and replay |
| **Timeline slider** | Jump to any point in time |
| **1yr / 5yr / 10yr** | Playback step size |
| **Speed** | 0.5× to 5× |
| **⏮ / ⏭** | Jump to start / end |

---

## Tech Stack

- **[Leaflet.js 1.9.4](https://leafletjs.com)** — interactive map + GeoJSON flood polygon layer
- **[Chart.js 4.4.0](https://www.chartjs.org)** + chartjs-plugin-annotation — sea level trend chart
- **[CartoDB Positron](https://carto.com/basemaps)** — map tiles (free, no API key)
- **[flagcdn.com](https://flagcdn.com)** — country flag images
- Pure HTML / CSS / JavaScript — zero build step, no dependencies to install

Sea level data uses **real tide-gauge records** where available (PSMSL, normalized to 1990 baseline), with synthetic fallback for countries without reliable gauge coverage. SSP projection bands are parameterized from IPCC AR6 regional values. Flood map polygons are built-in coastal approximations. No backend required to view the site — run `python scripts/fetch_psmsl.py` once to download real historical data.

---

## Project Structure

```
sea_level_world/
├── index.html          # Layout: topbar, scenario tabs, description bar, map, side panel, controls
├── style.css           # Dark ocean theme, CSS Grid layout, flood animations, responsive
├── script.js           # COUNTRIES_CONFIG (20 nations) + data loading + all render logic
├── data/
│   └── historical.json # Real tide-gauge data (generated by fetch_psmsl.py; gitignored)
└── scripts/
    ├── fetch_psmsl.py  # Fetch real historical data from PSMSL (Python 3.8+, no dependencies)
    └── process_dem.py  # (Optional) Generate high-accuracy flood polygons from SRTM DEM
```

All per-country parameters — map center/zoom, trend rate, seasonal params, SSP projections, elevation band polygons, threatened areas list — live in the `COUNTRIES_CONFIG` array at the top of `script.js`. Adding a new country requires only one config object.

### Real data vs synthetic fallback

| Country | Source | Station(s) |
|---------|--------|------------|
| Bangladesh | PSMSL | Cox's Bazaar (1476) |
| Maldives | PSMSL | Malé (1733) |
| Tuvalu | PSMSL | Funafuti (820) |
| Kiribati | PSMSL | Tarawa-C (1739), Tarawa-B (1579) |
| Marshall Islands | PSMSL | Kwajalein (513), Majuro-B (1217) |
| Vietnam | PSMSL | Danang (1475) |
| Netherlands | PSMSL | Vlissingen (9), Hoek van Holland (22), IJmuiden (23) |
| Egypt | PSMSL | Alexandria (1) |
| Thailand | PSMSL | Ko Lak (174) |
| India | PSMSL | Mumbai (43), Kochi (438) |
| China | PSMSL | Xiamen (727) |
| Indonesia | PSMSL | Jakarta (185) |
| Philippines | PSMSL | Manila (145) |
| Pakistan | PSMSL | Karachi (204) |
| Mozambique | PSMSL | Beira (937) |
| Japan | PSMSL | Aburatsubo (130), Tokyo III (1545), Osaka (1099), Hakata (1094) |
| Taiwan | PSMSL | Keelung II (545), Kaohsiung II (1356) |
| Myanmar | — | synthetic fallback |
| Cambodia | — | synthetic fallback |
| Nigeria | — | synthetic fallback |

> **Synthetic fallback** — countries without a usable PSMSL station have their historical sea level curve generated mathematically:
> `value = trend + seasonal + interannual + noise`
> where `trend` is a linear rise from 1990 at the country's IPCC AR6 regional rate, `seasonal` is a sinusoidal annual cycle, `interannual` models ENSO variability (3.7-yr and 7.1-yr periods), and `noise` is deterministic pseudo-random. Parameters are set per-country in `COUNTRIES_CONFIG` inside `script.js`. The resulting curve is physically plausible but **not observational data**.
