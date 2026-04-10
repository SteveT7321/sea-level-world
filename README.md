# 🌊 Global Sea Level Rise Observatory

Interactive visualization of sea level rise projections for the **top 20 highest flood-risk nations**, covering 2000–2100 under five IPCC AR6 climate scenarios.

**🔗 Live demo:** [stevet7321.github.io/sea-level-world](https://stevet7321.github.io/sea-level-world/)

> Or clone the repo and open `index.html` directly in any browser — no server required.

---

## Features

- **20 countries** ranked by flood risk, selectable via a floating map overlay
- **5 climate scenarios**: SSP1-2.6 · SSP2-4.5 · SSP5-8.5 · High-end SSP5+ · Ice Sheet Collapse
- **Interactive Leaflet map** with animated flood layer showing inundation depth by elevation band
- **Chart.js trend chart** with historical data (2000–2025) + projection envelope (2025–2100)
- **Timeline playback** with adjustable speed (0.5×–5×) and granularity (1/5/10 yr)
- **Live stats panel**: sea level anomaly, rise rate, flood area (km²), at-risk population
- Responsive design — works on desktop and mobile

---

## Countries Covered

| Rank | Country | Key Risk Factor |
|------|---------|----------------|
| 🥇 1 | 🇧🇩 Bangladesh | Ganges–Brahmaputra delta, 80% land below 5 m |
| 🥈 2 | 🇲🇻 Maldives | Coral atolls, avg elevation < 1.5 m |
| 🥉 3 | 🇹🇻 Tuvalu | Pacific micro-atoll, existential risk |
| 4 | 🇰🇮 Kiribati | 33 low-lying Pacific islands |
| 5 | 🇲🇭 Marshall Islands | Max elevation 3 m, high ENSO exposure |
| 6 | 🇻🇳 Vietnam | Mekong & Red River deltas, 17 M at risk |
| 7 | 🇳🇱 Netherlands | 26% of land below sea level |
| 8 | 🇪🇬 Egypt | Nile Delta, heavy subsidence |
| 9 | 🇲🇲 Myanmar | Irrawaddy delta, limited coastal defenses |
| 10 | 🇹🇭 Thailand | Bangkok sinking 2–5 cm/yr |
| 11 | 🇮🇳 India | 170 M in coastal districts |
| 12 | 🇨🇳 China | Yangtze & Pearl River deltas, 145 M exposed |
| 13 | 🇮🇩 Indonesia | Jakarta relocated due to subsidence |
| 14 | 🇵🇭 Philippines | Manila Bay, typhoon zone |
| 15 | 🇵🇰 Pakistan | Indus Delta, Karachi coast |
| 16 | 🇰🇭 Cambodia | Mekong & Tonle Sap floodplain |
| 17 | 🇳🇬 Nigeria | Niger Delta, Lagos coastline erosion |
| 18 | 🇲🇿 Mozambique | Cyclone-prone, low adaptation capacity |
| 19 | 🇯🇵 Japan | Tokyo/Osaka/Nagoya zero-meter zones |
| 20 | 🇹🇼 Taiwan | Western coastal plains, typhoon amplification |

---

## Climate Scenarios

| Scenario | Label | 2100 Rise (Bangladesh median) |
|----------|-------|-------------------------------|
| SSP1-2.6 | Optimistic | +70 cm |
| SSP2-4.5 | Moderate | +120 cm |
| SSP5-8.5 | Pessimistic | +180 cm |
| SSP5+ High-end | West Antarctic instability | +250 cm |
| Ice Sheet Collapse | Extreme | +380 cm |

> Values are relative to 1990 baseline and include local subsidence rates. Based on IPCC AR6 regional projections.

---

## Usage

```bash
# Option 1 — open directly
open sea_level_world/index.html

# Option 2 — local server (recommended for best performance)
cd sea_level_world
python -m http.server 8080
# then open http://localhost:8080
```

### Controls

| Control | Action |
|---------|--------|
| **Country button** (map center-top) | Switch between 20 countries |
| **Scenario tabs** | Change climate projection |
| **▶ Play** | Animate timeline 2000 → 2100 |
| **Timeline slider** | Jump to any year |
| **1yr / 5yr / 10yr** | Playback step size |
| **Speed** | 0.5× to 5× |
| **⏮ / ⏭** | Jump to start / end |

---

## Tech Stack

- **Leaflet.js 1.9.4** — interactive map + flood polygon layer
- **Chart.js 4.4.0** + chartjs-plugin-annotation — sea level trend chart
- **CartoDB Positron** — map tiles (free, no API key needed)
- Pure HTML / CSS / JavaScript — zero build step, zero dependencies to install

All sea level data is **synthetically generated** from IPCC AR6 parameters. No backend or external API calls required.

---

## Project Structure

```
sea_level_world/
├── index.html      # UI — country selector, scenario tabs, map, stats panel
├── style.css       # Dark ocean theme, responsive layout
└── script.js       # COUNTRIES_CONFIG (20 nations) + all visualization logic
```

The entire per-country configuration (map center/zoom, trend rate, seasonal params, SSP projections, elevation polygons, threatened areas) lives in the `COUNTRIES_CONFIG` array at the top of `script.js`. Adding a new country requires only one new config entry.
