/* =====================================================
   Global Sea Level Rise Observatory — Main Logic
   ===================================================== */

'use strict';

/* ---- Constants ---- */
const START_YEAR = 2000;
const END_YEAR   = 2100;
const TODAY_YEAR = 2025;
const TODAY_DOY  = 88; // 2025-03-29

const SCENARIO_COLORS = {
  ssp126:         { main: '#10B981', band: 'rgba(16,185,129,0.15)'  },
  ssp245:         { main: '#F59E0B', band: 'rgba(245,158,11,0.15)'  },
  ssp585:         { main: '#F97316', band: 'rgba(249,115,22,0.15)'  },
  ssp_extreme:    { main: '#EF4444', band: 'rgba(239,68,68,0.15)'   },
  ssp_catastrophe:{ main: '#7c3aed', band: 'rgba(124,58,237,0.18)'  },
};

/* ================================================================
   Countries Config — 20 highest flood-risk nations
   ssp values: median rise in cm relative to 1990 baseline, by 2100
   areaLookup: area km², pop in millions (M)
   ================================================================ */

const COUNTRIES_CONFIG = [
  {
    id: 'bangladesh', flagCode: 'bd', name: 'Bangladesh', flag: '🇧🇩', rank: 1,
    mapCenter: [23.0, 90.3], mapZoom: 7,
    trendRate: 0.80,          // cm/yr — combined SLR + delta subsidence
    seasonalAmplitude: 14, seasonalPeakMonth: 9, // monsoon peak
    ensoAmplitude1: 5.0, ensoAmplitude2: 3.0,
    ssp: {
      ssp126:          { median:  70, low:  35, high: 120 },
      ssp245:          { median: 120, low:  70, high: 185 },
      ssp585:          { median: 180, low: 115, high: 265 },
      ssp_extreme:     { median: 250, low: 175, high: 360 },
      ssp_catastrophe: { median: 380, low: 270, high: 520 },
    },
    areaLookup: [
      { elevM: 0.5, area:  5200, pop:  3.8 },
      { elevM: 1.0, area: 13000, pop:  9.5 },
      { elevM: 2.0, area: 30000, pop: 18.0 },
      { elevM: 3.0, area: 48000, pop: 26.0 },
      { elevM: 5.0, area: 85000, pop: 38.0 },
    ],
    threatenedAreas: ["Dhaka Metro", "Chittagong Port", "Khulna (Sundarbans)", "Barisal Division", "Cox's Bazar", "Noakhali Coast"],
    badge: 'BWDB', description: 'Ganges–Brahmaputra–Meghna delta · 80% of land below 5m',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Sundarbans (Khulna)"},"geometry":{"type":"Polygon","coordinates":[[[89.0,21.6],[90.0,21.6],[90.0,22.5],[89.0,22.5],[89.0,21.6]]]}},
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Meghna Estuary"},"geometry":{"type":"Polygon","coordinates":[[[90.6,22.0],[91.2,22.0],[91.2,22.8],[90.6,22.8],[90.6,22.0]]]}},
      {"type":"Feature","properties":{"elevation_m":0.4,"name":"Coastal Barisal"},"geometry":{"type":"Polygon","coordinates":[[[90.0,22.2],[90.8,22.2],[90.8,23.0],[90.0,23.0],[90.0,22.2]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Noakhali Coast"},"geometry":{"type":"Polygon","coordinates":[[[91.0,22.5],[91.8,22.5],[91.8,23.2],[91.0,23.2],[91.0,22.5]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Cox's Bazar Coast"},"geometry":{"type":"Polygon","coordinates":[[[91.7,21.0],[92.2,21.0],[92.2,21.8],[91.7,21.8],[91.7,21.0]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Lower Delta (Faridpur–Gopalganj)"},"geometry":{"type":"Polygon","coordinates":[[[89.5,23.0],[91.5,23.0],[91.5,24.0],[89.5,24.0],[89.5,23.0]]]}},
      {"type":"Feature","properties":{"elevation_m":2.0,"name":"Dhaka Surroundings"},"geometry":{"type":"Polygon","coordinates":[[[90.0,23.5],[91.0,23.5],[91.0,24.5],[90.0,24.5],[90.0,23.5]]]}},
      {"type":"Feature","properties":{"elevation_m":3.0,"name":"Upper Delta (Rajshahi–Pabna)"},"geometry":{"type":"Polygon","coordinates":[[[88.5,24.0],[91.0,24.0],[91.0,25.0],[88.5,25.0],[88.5,24.0]]]}},
    ]},
  },
  {
    id: 'maldives', flagCode: 'mv', name: 'Maldives', flag: '🇲🇻', rank: 2,
    mapCenter: [3.2, 73.2], mapZoom: 7,
    trendRate: 0.45,
    seasonalAmplitude: 8, seasonalPeakMonth: 11,
    ensoAmplitude1: 4.0, ensoAmplitude2: 2.5,
    ssp: {
      ssp126:          { median:  45, low:  22, high:  78 },
      ssp245:          { median:  80, low:  45, high: 122 },
      ssp585:          { median: 120, low:  75, high: 175 },
      ssp_extreme:     { median: 170, low: 115, high: 240 },
      ssp_catastrophe: { median: 265, low: 185, high: 370 },
    },
    areaLookup: [
      { elevM: 0.3, area:  150, pop: 0.25 },
      { elevM: 0.5, area:  270, pop: 0.43 },
      { elevM: 1.0, area:  295, pop: 0.49 },
      { elevM: 2.0, area:  298, pop: 0.50 },
      { elevM: 3.0, area:  300, pop: 0.50 },
    ],
    threatenedAreas: ["Malé (Capital)", "Addu City", "Fuvahmulah", "North Malé Atoll", "Baa Atoll"],
    badge: 'MEE', description: 'Coral atolls · Average elevation < 1.5 m · Entire nation threatened',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"North Malé Atoll"},"geometry":{"type":"Polygon","coordinates":[[[73.35,4.0],[73.70,4.0],[73.70,4.5],[73.35,4.5],[73.35,4.0]]]}},
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"South Malé Atoll"},"geometry":{"type":"Polygon","coordinates":[[[73.30,3.3],[73.55,3.3],[73.55,4.0],[73.30,4.0],[73.30,3.3]]]}},
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Addu Atoll (Southernmost)"},"geometry":{"type":"Polygon","coordinates":[[[73.10,-0.8],[73.30,-0.8],[73.30,0.5],[73.10,0.5],[73.10,-0.8]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Baa Atoll"},"geometry":{"type":"Polygon","coordinates":[[[72.85,4.8],[73.20,4.8],[73.20,5.3],[72.85,5.3],[72.85,4.8]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Lhaviyani Atoll"},"geometry":{"type":"Polygon","coordinates":[[[73.35,5.2],[73.65,5.2],[73.65,5.6],[73.35,5.6],[73.35,5.2]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Central Atolls"},"geometry":{"type":"Polygon","coordinates":[[[72.80,1.5],[73.50,1.5],[73.50,3.2],[72.80,3.2],[72.80,1.5]]]}},
    ]},
  },
  {
    id: 'tuvalu', flagCode: 'tv', name: 'Tuvalu', flag: '🇹🇻', rank: 3,
    mapCenter: [-8.5, 179.2], mapZoom: 9,
    trendRate: 0.50,
    seasonalAmplitude: 7, seasonalPeakMonth: 2,
    ensoAmplitude1: 6.0, ensoAmplitude2: 3.5,
    ssp: {
      ssp126:          { median:  50, low:  25, high:  85 },
      ssp245:          { median:  88, low:  50, high: 135 },
      ssp585:          { median: 130, low:  82, high: 192 },
      ssp_extreme:     { median: 185, low: 125, high: 265 },
      ssp_catastrophe: { median: 290, low: 200, high: 405 },
    },
    areaLookup: [
      { elevM: 0.3, area:   6, pop: 0.005 },
      { elevM: 0.5, area:  18, pop: 0.009 },
      { elevM: 1.0, area:  25, pop: 0.011 },
      { elevM: 2.0, area:  26, pop: 0.011 },
      { elevM: 3.0, area:  26, pop: 0.011 },
    ],
    threatenedAreas: ["Funafuti (Capital)", "Nukufetau Atoll", "Vaitupu Atoll", "Nanumea Atoll"],
    badge: 'MNRE', description: 'Pacific micro-atoll nation · Max elevation 3–4 m · Existential risk',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Funafuti Atoll"},"geometry":{"type":"Polygon","coordinates":[[[179.10,-8.65],[179.28,-8.65],[179.28,-8.45],[179.10,-8.45],[179.10,-8.65]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Nukufetau Atoll"},"geometry":{"type":"Polygon","coordinates":[[[178.28,-8.10],[178.45,-8.10],[178.45,-7.95],[178.28,-7.95],[178.28,-8.10]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Vaitupu Atoll"},"geometry":{"type":"Polygon","coordinates":[[[178.62,-7.52],[178.72,-7.52],[178.72,-7.43],[178.62,-7.43],[178.62,-7.52]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Nanumea Atoll"},"geometry":{"type":"Polygon","coordinates":[[[176.10,-5.70],[176.20,-5.70],[176.20,-5.62],[176.10,-5.62],[176.10,-5.70]]]}},
    ]},
  },
  {
    id: 'kiribati', flagCode: 'ki', name: 'Kiribati', flag: '🇰🇮', rank: 4,
    mapCenter: [1.3, 173.0], mapZoom: 8,
    trendRate: 0.48,
    seasonalAmplitude: 8, seasonalPeakMonth: 2,
    ensoAmplitude1: 6.5, ensoAmplitude2: 4.0,
    ssp: {
      ssp126:          { median:  48, low:  24, high:  82 },
      ssp245:          { median:  85, low:  48, high: 130 },
      ssp585:          { median: 128, low:  80, high: 188 },
      ssp_extreme:     { median: 182, low: 122, high: 260 },
      ssp_catastrophe: { median: 285, low: 196, high: 398 },
    },
    areaLookup: [
      { elevM: 0.3, area:  35, pop: 0.025 },
      { elevM: 0.5, area:  60, pop: 0.060 },
      { elevM: 1.0, area: 100, pop: 0.100 },
      { elevM: 2.0, area: 112, pop: 0.112 },
      { elevM: 3.0, area: 113, pop: 0.113 },
    ],
    threatenedAreas: ["South Tarawa", "Betio", "Bikenibeu", "Abaiang Atoll"],
    badge: 'MELAD', description: 'Central Pacific atolls · 33 low-lying islands · Existential flood risk',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"South Tarawa"},"geometry":{"type":"Polygon","coordinates":[[[172.90,1.28],[173.20,1.28],[173.20,1.48],[172.90,1.48],[172.90,1.28]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Abaiang Atoll"},"geometry":{"type":"Polygon","coordinates":[[[172.92,1.70],[173.05,1.70],[173.05,2.00],[172.92,2.00],[172.92,1.70]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Maiana Atoll"},"geometry":{"type":"Polygon","coordinates":[[[173.00,0.90],[173.12,0.90],[173.12,1.08],[173.00,1.08],[173.00,0.90]]]}},
    ]},
  },
  {
    id: 'marshall', flagCode: 'mh', name: 'Marshall Islands', flag: '🇲🇭', rank: 5,
    mapCenter: [7.1, 171.2], mapZoom: 8,
    trendRate: 0.52,
    seasonalAmplitude: 7, seasonalPeakMonth: 11,
    ensoAmplitude1: 6.0, ensoAmplitude2: 3.8,
    ssp: {
      ssp126:          { median:  52, low:  26, high:  88 },
      ssp245:          { median:  92, low:  52, high: 140 },
      ssp585:          { median: 138, low:  86, high: 200 },
      ssp_extreme:     { median: 196, low: 132, high: 280 },
      ssp_catastrophe: { median: 308, low: 212, high: 430 },
    },
    areaLookup: [
      { elevM: 0.3, area:  25, pop: 0.020 },
      { elevM: 0.5, area:  90, pop: 0.040 },
      { elevM: 1.0, area: 175, pop: 0.055 },
      { elevM: 2.0, area: 180, pop: 0.058 },
      { elevM: 3.0, area: 181, pop: 0.059 },
    ],
    threatenedAreas: ["Majuro (Capital)", "Ebeye", "Kwajalein Atoll", "Arno Atoll"],
    badge: 'OEPPC', description: 'North Pacific atolls · Max elevation 3 m · High ENSO vulnerability',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Majuro Atoll"},"geometry":{"type":"Polygon","coordinates":[[[171.05,7.02],[171.42,7.02],[171.42,7.22],[171.05,7.22],[171.05,7.02]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Kwajalein Atoll"},"geometry":{"type":"Polygon","coordinates":[[[167.58,8.62],[167.82,8.62],[167.82,8.78],[167.58,8.78],[167.58,8.62]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Arno Atoll"},"geometry":{"type":"Polygon","coordinates":[[[171.52,7.02],[171.72,7.02],[171.72,7.20],[171.52,7.20],[171.52,7.02]]]}},
    ]},
  },
  {
    id: 'vietnam', flagCode: 'vn', name: 'Vietnam', flag: '🇻🇳', rank: 6,
    mapCenter: [10.5, 106.5], mapZoom: 6,
    trendRate: 0.35,
    seasonalAmplitude: 12, seasonalPeakMonth: 10,
    ensoAmplitude1: 3.8, ensoAmplitude2: 2.2,
    ssp: {
      ssp126:          { median:  38, low:  20, high:  65 },
      ssp245:          { median:  70, low:  40, high: 108 },
      ssp585:          { median: 110, low:  68, high: 160 },
      ssp_extreme:     { median: 158, low: 106, high: 225 },
      ssp_catastrophe: { median: 248, low: 170, high: 346 },
    },
    areaLookup: [
      { elevM: 0.5, area:  2200, pop:  3.5 },
      { elevM: 1.0, area:  8500, pop: 10.5 },
      { elevM: 2.0, area: 18000, pop: 20.0 },
      { elevM: 3.0, area: 28000, pop: 28.5 },
      { elevM: 5.0, area: 42000, pop: 38.0 },
    ],
    threatenedAreas: ["Ho Chi Minh City", "Cần Thơ", "Cà Mau Province", "Kiên Giang Coast", "Hà Nội (Red River Delta)", "Hải Phòng"],
    badge: 'MONRE', description: 'Mekong & Red River deltas · 17M people in flood-prone lowlands',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Cà Mau Peninsula (Southernmost)"},"geometry":{"type":"Polygon","coordinates":[[[104.5,8.5],[105.5,8.5],[105.5,9.4],[104.5,9.4],[104.5,8.5]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Mekong Delta West"},"geometry":{"type":"Polygon","coordinates":[[[104.5,9.4],[106.0,9.4],[106.0,10.5],[104.5,10.5],[104.5,9.4]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Mekong Delta East (HCMC)"},"geometry":{"type":"Polygon","coordinates":[[[106.0,10.0],[107.0,10.0],[107.0,11.0],[106.0,11.0],[106.0,10.0]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Mekong Delta Inland"},"geometry":{"type":"Polygon","coordinates":[[[104.5,10.2],[107.0,10.2],[107.0,11.5],[104.5,11.5],[104.5,10.2]]]}},
      {"type":"Feature","properties":{"elevation_m":1.5,"name":"Central Coastal Lowlands"},"geometry":{"type":"Polygon","coordinates":[[[107.0,10.5],[109.0,10.5],[109.0,14.0],[107.0,14.0],[107.0,10.5]]]}},
      {"type":"Feature","properties":{"elevation_m":2.0,"name":"Red River Delta"},"geometry":{"type":"Polygon","coordinates":[[[105.5,19.5],[107.0,19.5],[107.0,21.5],[105.5,21.5],[105.5,19.5]]]}},
    ]},
  },
  {
    id: 'netherlands', flagCode: 'nl', name: 'Netherlands', flag: '🇳🇱', rank: 7,
    mapCenter: [52.3, 5.3], mapZoom: 7,
    trendRate: 0.28,
    seasonalAmplitude: 6, seasonalPeakMonth: 11,
    ensoAmplitude1: 2.5, ensoAmplitude2: 1.8,
    ssp: {
      ssp126:          { median:  30, low:  15, high:  52 },
      ssp245:          { median:  58, low:  33, high:  88 },
      ssp585:          { median:  95, low:  58, high: 140 },
      ssp_extreme:     { median: 138, low:  92, high: 198 },
      ssp_catastrophe: { median: 215, low: 148, high: 302 },
    },
    areaLookup: [
      { elevM: 0.0, area:  2000, pop:  1.0 },
      { elevM: 0.5, area:  8500, pop:  4.2 },
      { elevM: 1.0, area: 18000, pop:  8.5 },
      { elevM: 2.0, area: 26000, pop: 12.0 },
      { elevM: 5.0, area: 36000, pop: 16.5 },
    ],
    threatenedAreas: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Zeeland Province", "Frisian Islands"],
    badge: 'Rijkswaterstaat', description: '26% of land below sea level · World leader in flood defense',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":-0.5,"name":"Zeeland & South Holland Coast"},"geometry":{"type":"Polygon","coordinates":[[[3.35,51.2],[4.20,51.2],[4.20,52.0],[3.35,52.0],[3.35,51.2]]]}},
      {"type":"Feature","properties":{"elevation_m":0.0,"name":"Rhine–Meuse Delta (Rotterdam)"},"geometry":{"type":"Polygon","coordinates":[[[4.0,51.7],[5.0,51.7],[5.0,52.1],[4.0,52.1],[4.0,51.7]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"North Holland (Amsterdam)"},"geometry":{"type":"Polygon","coordinates":[[[4.5,52.1],[5.2,52.1],[5.2,52.7],[4.5,52.7],[4.5,52.1]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"IJsselmeer Polders"},"geometry":{"type":"Polygon","coordinates":[[[5.0,52.5],[5.5,52.5],[5.5,53.0],[5.0,53.0],[5.0,52.5]]]}},
      {"type":"Feature","properties":{"elevation_m":2.0,"name":"Wadden Sea Coast"},"geometry":{"type":"Polygon","coordinates":[[[4.6,52.8],[5.8,52.8],[5.8,53.5],[4.6,53.5],[4.6,52.8]]]}},
    ]},
  },
  {
    id: 'egypt', flagCode: 'eg', name: 'Egypt (Nile Delta)', flag: '🇪🇬', rank: 8,
    mapCenter: [30.8, 31.0], mapZoom: 8,
    trendRate: 0.25,
    seasonalAmplitude: 5, seasonalPeakMonth: 11,
    ensoAmplitude1: 2.0, ensoAmplitude2: 1.5,
    ssp: {
      ssp126:          { median:  28, low:  14, high:  48 },
      ssp245:          { median:  55, low:  31, high:  84 },
      ssp585:          { median:  90, low:  56, high: 132 },
      ssp_extreme:     { median: 130, low:  88, high: 188 },
      ssp_catastrophe: { median: 205, low: 140, high: 288 },
    },
    areaLookup: [
      { elevM: 0.5, area:  1800, pop:  2.5 },
      { elevM: 1.0, area:  5500, pop:  6.5 },
      { elevM: 2.0, area: 12000, pop: 12.0 },
      { elevM: 3.0, area: 18000, pop: 16.0 },
      { elevM: 5.0, area: 28000, pop: 22.0 },
    ],
    threatenedAreas: ["Alexandria", "Port Said", "Damietta", "Kafr el-Sheikh", "Beheira Governorate"],
    badge: 'EEAA', description: 'Nile Delta · 55% of Egypt\'s agricultural land at risk · Heavy subsidence',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Alexandria Coast"},"geometry":{"type":"Polygon","coordinates":[[[29.5,31.1],[30.5,31.1],[30.5,31.3],[29.5,31.3],[29.5,31.1]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Nile Delta (Northern Coast)"},"geometry":{"type":"Polygon","coordinates":[[[30.0,31.0],[32.5,31.0],[32.5,31.6],[30.0,31.6],[30.0,31.0]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Northern Delta (Kafr el-Sheikh)"},"geometry":{"type":"Polygon","coordinates":[[[30.2,30.5],[31.8,30.5],[31.8,31.2],[30.2,31.2],[30.2,30.5]]]}},
      {"type":"Feature","properties":{"elevation_m":2.0,"name":"Central Nile Delta"},"geometry":{"type":"Polygon","coordinates":[[[30.0,30.0],[32.3,30.0],[32.3,31.0],[30.0,31.0],[30.0,30.0]]]}},
    ]},
  },
  {
    id: 'myanmar', flagCode: 'mm', name: 'Myanmar', flag: '🇲🇲', rank: 9,
    mapCenter: [16.2, 96.0], mapZoom: 7,
    trendRate: 0.38,
    seasonalAmplitude: 13, seasonalPeakMonth: 9,
    ensoAmplitude1: 3.5, ensoAmplitude2: 2.0,
    ssp: {
      ssp126:          { median:  42, low:  21, high:  72 },
      ssp245:          { median:  76, low:  43, high: 116 },
      ssp585:          { median: 118, low:  73, high: 170 },
      ssp_extreme:     { median: 168, low: 113, high: 240 },
      ssp_catastrophe: { median: 265, low: 182, high: 370 },
    },
    areaLookup: [
      { elevM: 0.5, area:  3200, pop:  2.8 },
      { elevM: 1.0, area:  8500, pop:  6.5 },
      { elevM: 2.0, area: 16000, pop: 10.5 },
      { elevM: 3.0, area: 22000, pop: 13.5 },
      { elevM: 5.0, area: 32000, pop: 18.0 },
    ],
    threatenedAreas: ["Yangon", "Pathein", "Mawlamyine", "Irrawaddy Delta", "Rakhine Coast"],
    badge: 'DMH', description: 'Irrawaddy & Salween deltas · Cyclone-prone · Limited coastal defenses',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Irrawaddy Delta South"},"geometry":{"type":"Polygon","coordinates":[[[94.5,15.5],[96.5,15.5],[96.5,16.5],[94.5,16.5],[94.5,15.5]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Irrawaddy Delta Mid"},"geometry":{"type":"Polygon","coordinates":[[[94.5,16.5],[96.5,16.5],[96.5,17.5],[94.5,17.5],[94.5,16.5]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Yangon Coastal Region"},"geometry":{"type":"Polygon","coordinates":[[[96.0,16.5],[97.0,16.5],[97.0,17.5],[96.0,17.5],[96.0,16.5]]]}},
      {"type":"Feature","properties":{"elevation_m":2.0,"name":"Rakhine Coast"},"geometry":{"type":"Polygon","coordinates":[[[93.0,17.5],[95.0,17.5],[95.0,20.0],[93.0,20.0],[93.0,17.5]]]}},
    ]},
  },
  {
    id: 'thailand', flagCode: 'th', name: 'Thailand', flag: '🇹🇭', rank: 10,
    mapCenter: [13.5, 100.5], mapZoom: 8,
    trendRate: 0.32,
    seasonalAmplitude: 11, seasonalPeakMonth: 10,
    ensoAmplitude1: 3.0, ensoAmplitude2: 2.0,
    ssp: {
      ssp126:          { median:  35, low:  18, high:  60 },
      ssp245:          { median:  65, low:  37, high:  99 },
      ssp585:          { median: 105, low:  65, high: 152 },
      ssp_extreme:     { median: 150, low: 100, high: 215 },
      ssp_catastrophe: { median: 238, low: 163, high: 333 },
    },
    areaLookup: [
      { elevM: 0.5, area:  2500, pop:  3.0 },
      { elevM: 1.0, area:  6000, pop:  6.5 },
      { elevM: 2.0, area: 11000, pop: 10.8 },
      { elevM: 3.0, area: 16000, pop: 14.0 },
      { elevM: 5.0, area: 22000, pop: 18.5 },
    ],
    threatenedAreas: ["Bangkok", "Samut Prakan", "Chachoengsao", "Ayutthaya (floods)", "Gulf of Thailand Coast"],
    badge: 'GISTDA', description: 'Chao Phraya delta · Bangkok subsiding 2–5 cm/yr · 9M people at risk',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Bangkok Metro (Subsidence Zone)"},"geometry":{"type":"Polygon","coordinates":[[[100.2,13.2],[101.0,13.2],[101.0,13.9],[100.2,13.9],[100.2,13.2]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Gulf of Thailand Coast"},"geometry":{"type":"Polygon","coordinates":[[[99.8,12.5],[101.5,12.5],[101.5,13.5],[99.8,13.5],[99.8,12.5]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Chao Phraya Floodplain"},"geometry":{"type":"Polygon","coordinates":[[[100.0,13.5],[101.2,13.5],[101.2,14.8],[100.0,14.8],[100.0,13.5]]]}},
      {"type":"Feature","properties":{"elevation_m":2.0,"name":"Eastern Gulf Coast (Pattaya)"},"geometry":{"type":"Polygon","coordinates":[[[100.8,12.5],[101.5,12.5],[101.5,13.3],[100.8,13.3],[100.8,12.5]]]}},
    ]},
  },
  {
    id: 'india', flagCode: 'in', name: 'India', flag: '🇮🇳', rank: 11,
    mapCenter: [20.0, 82.0], mapZoom: 5,
    trendRate: 0.30,
    seasonalAmplitude: 10, seasonalPeakMonth: 9,
    ensoAmplitude1: 3.0, ensoAmplitude2: 2.0,
    ssp: {
      ssp126:          { median:  32, low:  16, high:  55 },
      ssp245:          { median:  60, low:  34, high:  92 },
      ssp585:          { median:  98, low:  60, high: 145 },
      ssp_extreme:     { median: 140, low:  94, high: 200 },
      ssp_catastrophe: { median: 220, low: 150, high: 308 },
    },
    areaLookup: [
      { elevM: 0.5, area:  8000, pop:  8.0 },
      { elevM: 1.0, area: 22000, pop: 18.5 },
      { elevM: 2.0, area: 45000, pop: 32.0 },
      { elevM: 3.0, area: 68000, pop: 44.0 },
      { elevM: 5.0, area: 95000, pop: 58.0 },
    ],
    threatenedAreas: ["Kolkata (Sundarbans)", "Mumbai", "Chennai", "Visakhapatnam", "Odisha Coast", "Kerala Backwaters"],
    badge: 'INCOIS', description: 'World\'s longest coastline exposure · 170M in coastal districts at risk',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Sundarbans (West Bengal)"},"geometry":{"type":"Polygon","coordinates":[[[88.0,21.5],[89.0,21.5],[89.0,22.5],[88.0,22.5],[88.0,21.5]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Mumbai Low-lying Areas"},"geometry":{"type":"Polygon","coordinates":[[[72.7,18.8],[73.1,18.8],[73.1,19.2],[72.7,19.2],[72.7,18.8]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Odisha Coast"},"geometry":{"type":"Polygon","coordinates":[[[84.5,19.5],[87.5,19.5],[87.5,21.0],[84.5,21.0],[84.5,19.5]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Godavari–Krishna Delta"},"geometry":{"type":"Polygon","coordinates":[[[80.5,15.5],[82.5,15.5],[82.5,17.0],[80.5,17.0],[80.5,15.5]]]}},
      {"type":"Feature","properties":{"elevation_m":1.5,"name":"Kerala Backwaters Coast"},"geometry":{"type":"Polygon","coordinates":[[[75.8,8.5],[76.8,8.5],[76.8,11.5],[75.8,11.5],[75.8,8.5]]]}},
      {"type":"Feature","properties":{"elevation_m":2.0,"name":"Gulf of Khambhat (Gujarat)"},"geometry":{"type":"Polygon","coordinates":[[[71.5,21.5],[73.5,21.5],[73.5,23.5],[71.5,23.5],[71.5,21.5]]]}},
      {"type":"Feature","properties":{"elevation_m":3.0,"name":"East Coast Broad Lowlands"},"geometry":{"type":"Polygon","coordinates":[[[79.5,13.0],[81.5,13.0],[81.5,15.5],[79.5,15.5],[79.5,13.0]]]}},
    ]},
  },
  {
    id: 'china', flagCode: 'cn', name: 'China', flag: '🇨🇳', rank: 12,
    mapCenter: [31.2, 121.5], mapZoom: 6,
    trendRate: 0.35,
    seasonalAmplitude: 9, seasonalPeakMonth: 9,
    ensoAmplitude1: 3.2, ensoAmplitude2: 2.0,
    ssp: {
      ssp126:          { median:  38, low:  19, high:  64 },
      ssp245:          { median:  68, low:  39, high: 105 },
      ssp585:          { median: 108, low:  67, high: 158 },
      ssp_extreme:     { median: 155, low: 104, high: 220 },
      ssp_catastrophe: { median: 242, low: 166, high: 340 },
    },
    areaLookup: [
      { elevM: 0.5, area: 12000, pop: 15.0 },
      { elevM: 1.0, area: 35000, pop: 38.0 },
      { elevM: 2.0, area: 65000, pop: 62.0 },
      { elevM: 3.0, area: 95000, pop: 82.0 },
      { elevM: 5.0, area:140000, pop:105.0 },
    ],
    threatenedAreas: ["Shanghai", "Guangzhou", "Shenzhen", "Tianjin", "Hangzhou Bay", "Pearl River Delta"],
    badge: 'MNR', description: 'Yangtze & Pearl River deltas · 145M in low-elevation coastal zones',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Shanghai Pudong Low Zone"},"geometry":{"type":"Polygon","coordinates":[[[121.3,30.8],[122.0,30.8],[122.0,31.5],[121.3,31.5],[121.3,30.8]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Yangtze Delta Coast"},"geometry":{"type":"Polygon","coordinates":[[[120.5,30.5],[122.5,30.5],[122.5,32.0],[120.5,32.0],[120.5,30.5]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Pearl River Delta (Guangzhou)"},"geometry":{"type":"Polygon","coordinates":[[[113.0,22.0],[114.5,22.0],[114.5,23.5],[113.0,23.5],[113.0,22.0]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Hangzhou Bay"},"geometry":{"type":"Polygon","coordinates":[[[120.0,29.5],[122.0,29.5],[122.0,30.7],[120.0,30.7],[120.0,29.5]]]}},
      {"type":"Feature","properties":{"elevation_m":2.0,"name":"Bohai Sea Coast (Tianjin)"},"geometry":{"type":"Polygon","coordinates":[[[116.5,38.0],[118.5,38.0],[118.5,39.5],[116.5,39.5],[116.5,38.0]]]}},
      {"type":"Feature","properties":{"elevation_m":3.0,"name":"Jiangsu North Plain"},"geometry":{"type":"Polygon","coordinates":[[[119.5,32.0],[121.5,32.0],[121.5,34.5],[119.5,34.5],[119.5,32.0]]]}},
    ]},
  },
  {
    id: 'indonesia', flagCode: 'id', name: 'Indonesia', flag: '🇮🇩', rank: 13,
    mapCenter: [-6.2, 106.8], mapZoom: 6,
    trendRate: 0.40,
    seasonalAmplitude: 10, seasonalPeakMonth: 1,
    ensoAmplitude1: 5.5, ensoAmplitude2: 3.0,
    ssp: {
      ssp126:          { median:  45, low:  22, high:  76 },
      ssp245:          { median:  80, low:  45, high: 122 },
      ssp585:          { median: 122, low:  76, high: 178 },
      ssp_extreme:     { median: 175, low: 118, high: 250 },
      ssp_catastrophe: { median: 275, low: 188, high: 385 },
    },
    areaLookup: [
      { elevM: 0.5, area: 18000, pop: 20.0 },
      { elevM: 1.0, area: 42000, pop: 40.0 },
      { elevM: 2.0, area: 75000, pop: 62.0 },
      { elevM: 3.0, area:105000, pop: 80.0 },
      { elevM: 5.0, area:150000, pop:102.0 },
    ],
    threatenedAreas: ["Jakarta (Sinking)", "Semarang", "Surabaya", "Palembang", "Medan (East Sumatra)"],
    badge: 'BMKG', description: 'Jakarta sinking 25 cm/decade · Indonesia capital relocated due to flooding',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Jakarta North Bay (Sinking)"},"geometry":{"type":"Polygon","coordinates":[[[106.5,-6.3],[107.2,-6.3],[107.2,-6.0],[106.5,-6.0],[106.5,-6.3]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"North Java Coast (Semarang)"},"geometry":{"type":"Polygon","coordinates":[[[109.5,-7.2],[111.0,-7.2],[111.0,-6.8],[109.5,-6.8],[109.5,-7.2]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"East Sumatra Lowlands"},"geometry":{"type":"Polygon","coordinates":[[[103.5,1.0],[106.0,1.0],[106.0,2.8],[103.5,2.8],[103.5,1.0]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Surabaya–Sidoarjo Coast"},"geometry":{"type":"Polygon","coordinates":[[[112.5,-7.5],[113.5,-7.5],[113.5,-7.1],[112.5,-7.1],[112.5,-7.5]]]}},
      {"type":"Feature","properties":{"elevation_m":1.5,"name":"Kalimantan South Coast"},"geometry":{"type":"Polygon","coordinates":[[[114.5,-4.5],[117.5,-4.5],[117.5,-3.0],[114.5,-3.0],[114.5,-4.5]]]}},
    ]},
  },
  {
    id: 'philippines', flagCode: 'ph', name: 'Philippines', flag: '🇵🇭', rank: 14,
    mapCenter: [12.0, 122.0], mapZoom: 6,
    trendRate: 0.38,
    seasonalAmplitude: 11, seasonalPeakMonth: 10,
    ensoAmplitude1: 4.5, ensoAmplitude2: 2.8,
    ssp: {
      ssp126:          { median:  42, low:  21, high:  72 },
      ssp245:          { median:  76, low:  43, high: 116 },
      ssp585:          { median: 118, low:  73, high: 170 },
      ssp_extreme:     { median: 168, low: 113, high: 242 },
      ssp_catastrophe: { median: 265, low: 182, high: 370 },
    },
    areaLookup: [
      { elevM: 0.5, area:  5500, pop:  5.5 },
      { elevM: 1.0, area: 14000, pop: 12.0 },
      { elevM: 2.0, area: 22000, pop: 18.5 },
      { elevM: 3.0, area: 28000, pop: 22.5 },
      { elevM: 5.0, area: 36000, pop: 28.0 },
    ],
    threatenedAreas: ["Metro Manila (Bay)", "Cebu City", "Davao Gulf Coast", "Samar Island", "Leyte Gulf"],
    badge: 'NAMRIA', description: 'Typhoon zone · Manila Bay exposure · 60M living in coastal areas',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Manila Bay (Metro Manila)"},"geometry":{"type":"Polygon","coordinates":[[[120.5,14.3],[121.0,14.3],[121.0,14.8],[120.5,14.8],[120.5,14.3]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Pampanga Delta (Central Luzon)"},"geometry":{"type":"Polygon","coordinates":[[[120.3,14.6],[121.2,14.6],[121.2,15.4],[120.3,15.4],[120.3,14.6]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Visayas (Leyte/Samar)"},"geometry":{"type":"Polygon","coordinates":[[[124.0,10.5],[125.5,10.5],[125.5,12.0],[124.0,12.0],[124.0,10.5]]]}},
      {"type":"Feature","properties":{"elevation_m":1.5,"name":"Cotabato Basin (Mindanao)"},"geometry":{"type":"Polygon","coordinates":[[[123.5,6.5],[125.5,6.5],[125.5,8.5],[123.5,8.5],[123.5,6.5]]]}},
    ]},
  },
  {
    id: 'pakistan', flagCode: 'pk', name: 'Pakistan', flag: '🇵🇰', rank: 15,
    mapCenter: [24.5, 67.2], mapZoom: 8,
    trendRate: 0.30,
    seasonalAmplitude: 8, seasonalPeakMonth: 8,
    ensoAmplitude1: 2.5, ensoAmplitude2: 1.5,
    ssp: {
      ssp126:          { median:  32, low:  16, high:  55 },
      ssp245:          { median:  60, low:  34, high:  92 },
      ssp585:          { median:  98, low:  60, high: 145 },
      ssp_extreme:     { median: 140, low:  94, high: 200 },
      ssp_catastrophe: { median: 220, low: 150, high: 308 },
    },
    areaLookup: [
      { elevM: 0.5, area:  2500, pop:  2.0 },
      { elevM: 1.0, area:  6000, pop:  4.5 },
      { elevM: 2.0, area: 10000, pop:  7.0 },
      { elevM: 3.0, area: 14000, pop:  9.0 },
      { elevM: 5.0, area: 19000, pop: 11.5 },
    ],
    threatenedAreas: ["Karachi", "Indus Delta (Thatta)", "Sujawal", "Makran Coast", "Keti Bandar"],
    badge: 'PMD', description: 'Indus Delta · Karachi coast · Monsoon + cyclone exposure',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Indus Delta (Thatta/Keti Bandar)"},"geometry":{"type":"Polygon","coordinates":[[[67.0,23.5],[68.5,23.5],[68.5,24.5],[67.0,24.5],[67.0,23.5]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Karachi Coastal Zone"},"geometry":{"type":"Polygon","coordinates":[[[66.5,24.5],[67.2,24.5],[67.2,25.1],[66.5,25.1],[66.5,24.5]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Makran Coast"},"geometry":{"type":"Polygon","coordinates":[[[62.0,24.5],[66.5,24.5],[66.5,25.2],[62.0,25.2],[62.0,24.5]]]}},
      {"type":"Feature","properties":{"elevation_m":2.0,"name":"Lower Sindh Plains"},"geometry":{"type":"Polygon","coordinates":[[[67.5,25.0],[69.5,25.0],[69.5,26.5],[67.5,26.5],[67.5,25.0]]]}},
    ]},
  },
  {
    id: 'cambodia', flagCode: 'kh', name: 'Cambodia', flag: '🇰🇭', rank: 16,
    mapCenter: [11.5, 104.9], mapZoom: 8,
    trendRate: 0.33,
    seasonalAmplitude: 12, seasonalPeakMonth: 10,
    ensoAmplitude1: 3.5, ensoAmplitude2: 2.0,
    ssp: {
      ssp126:          { median:  36, low:  18, high:  62 },
      ssp245:          { median:  66, low:  37, high: 101 },
      ssp585:          { median: 105, low:  65, high: 154 },
      ssp_extreme:     { median: 150, low: 101, high: 215 },
      ssp_catastrophe: { median: 238, low: 163, high: 333 },
    },
    areaLookup: [
      { elevM: 0.5, area:  3500, pop:  2.8 },
      { elevM: 1.0, area:  9000, pop:  5.5 },
      { elevM: 2.0, area: 16000, pop:  8.5 },
      { elevM: 3.0, area: 20000, pop: 10.0 },
      { elevM: 5.0, area: 24000, pop: 11.5 },
    ],
    threatenedAreas: ["Phnom Penh (Mekong)", "Kampot Coast", "Koh Kong Province", "Tonle Sap Floodplain", "Sihanoukville"],
    badge: 'MoE', description: 'Mekong delta & Tonle Sap · Seasonal flooding doubles flood risk',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Gulf of Thailand Coast"},"geometry":{"type":"Polygon","coordinates":[[[103.0,10.0],[104.5,10.0],[104.5,11.2],[103.0,11.2],[103.0,10.0]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Mekong–Bassac Floodplain"},"geometry":{"type":"Polygon","coordinates":[[[104.5,10.5],[106.0,10.5],[106.0,11.8],[104.5,11.8],[104.5,10.5]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Tonle Sap Basin"},"geometry":{"type":"Polygon","coordinates":[[[103.5,12.0],[105.5,12.0],[105.5,13.5],[103.5,13.5],[103.5,12.0]]]}},
      {"type":"Feature","properties":{"elevation_m":2.0,"name":"Central Cambodia Lowlands"},"geometry":{"type":"Polygon","coordinates":[[[104.0,11.0],[106.0,11.0],[106.0,13.0],[104.0,13.0],[104.0,11.0]]]}},
    ]},
  },
  {
    id: 'nigeria', flagCode: 'ng', name: 'Nigeria', flag: '🇳🇬', rank: 17,
    mapCenter: [5.3, 5.5], mapZoom: 8,
    trendRate: 0.30,
    seasonalAmplitude: 9, seasonalPeakMonth: 9,
    ensoAmplitude1: 2.8, ensoAmplitude2: 1.8,
    ssp: {
      ssp126:          { median:  32, low:  16, high:  55 },
      ssp245:          { median:  60, low:  34, high:  92 },
      ssp585:          { median:  96, low:  59, high: 142 },
      ssp_extreme:     { median: 138, low:  93, high: 198 },
      ssp_catastrophe: { median: 218, low: 148, high: 305 },
    },
    areaLookup: [
      { elevM: 0.5, area:  4500, pop:  4.5 },
      { elevM: 1.0, area: 10000, pop:  9.0 },
      { elevM: 2.0, area: 16000, pop: 13.5 },
      { elevM: 3.0, area: 20000, pop: 16.0 },
      { elevM: 5.0, area: 26000, pop: 19.5 },
    ],
    threatenedAreas: ["Lagos (Victoria Island)", "Port Harcourt", "Niger Delta Communities", "Warri", "Bonny Island"],
    badge: 'NIMET', description: 'Niger Delta oil region · Lagos coastline erosion · Major subsidence',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Lagos Coast (Victoria Island)"},"geometry":{"type":"Polygon","coordinates":[[[3.0,6.3],[3.5,6.3],[3.5,6.6],[3.0,6.6],[3.0,6.3]]]}},
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Niger Delta (Creeks)"},"geometry":{"type":"Polygon","coordinates":[[[5.0,4.5],[7.5,4.5],[7.5,5.5],[5.0,5.5],[5.0,4.5]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Port Harcourt Zone"},"geometry":{"type":"Polygon","coordinates":[[[6.5,4.5],[7.5,4.5],[7.5,5.2],[6.5,5.2],[6.5,4.5]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Coastal Lowlands (Benin–Delta)"},"geometry":{"type":"Polygon","coordinates":[[[5.0,5.5],[7.5,5.5],[7.5,6.5],[5.0,6.5],[5.0,5.5]]]}},
    ]},
  },
  {
    id: 'mozambique', flagCode: 'mz', name: 'Mozambique', flag: '🇲🇿', rank: 18,
    mapCenter: [-18.5, 35.5], mapZoom: 7,
    trendRate: 0.28,
    seasonalAmplitude: 9, seasonalPeakMonth: 3,
    ensoAmplitude1: 2.5, ensoAmplitude2: 1.5,
    ssp: {
      ssp126:          { median:  30, low:  15, high:  52 },
      ssp245:          { median:  58, low:  33, high:  88 },
      ssp585:          { median:  92, low:  57, high: 135 },
      ssp_extreme:     { median: 132, low:  88, high: 190 },
      ssp_catastrophe: { median: 210, low: 143, high: 295 },
    },
    areaLookup: [
      { elevM: 0.5, area:  3500, pop:  1.8 },
      { elevM: 1.0, area:  8000, pop:  3.5 },
      { elevM: 2.0, area: 15000, pop:  5.8 },
      { elevM: 3.0, area: 20000, pop:  7.2 },
      { elevM: 5.0, area: 28000, pop:  9.5 },
    ],
    threatenedAreas: ["Beira", "Quelimane", "Sofala Coast", "Zambezi Delta", "Maputo Bay"],
    badge: 'INAM', description: 'Cyclone Idai (2019) exposed extreme vulnerability · Low adaptation capacity',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Zambezi Delta"},"geometry":{"type":"Polygon","coordinates":[[[35.5,-18.5],[37.0,-18.5],[37.0,-17.5],[35.5,-17.5],[35.5,-18.5]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Sofala Coast (Beira)"},"geometry":{"type":"Polygon","coordinates":[[[34.5,-20.5],[35.8,-20.5],[35.8,-19.0],[34.5,-19.0],[34.5,-20.5]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Limpopo Delta (South)"},"geometry":{"type":"Polygon","coordinates":[[[33.5,-25.5],[35.5,-25.5],[35.5,-23.5],[33.5,-23.5],[33.5,-25.5]]]}},
      {"type":"Feature","properties":{"elevation_m":2.0,"name":"Northern Coastal Plain"},"geometry":{"type":"Polygon","coordinates":[[[35.0,-15.0],[40.0,-15.0],[40.0,-12.0],[35.0,-12.0],[35.0,-15.0]]]}},
    ]},
  },
  {
    id: 'japan', flagCode: 'jp', name: 'Japan', flag: '🇯🇵', rank: 19,
    mapCenter: [36.5, 137.0], mapZoom: 5,
    trendRate: 0.22,          // cm/yr — JMA Aburatubo reference
    seasonalAmplitude: 9, seasonalPeakMonth: 9, // autumn peak
    ensoAmplitude1: 4.0, ensoAmplitude2: 2.5,
    ssp: {
      ssp126:          { median:  30, low:  15, high:  52 },
      ssp245:          { median:  60, low:  34, high:  92 },
      ssp585:          { median: 100, low:  62, high: 148 },
      ssp_extreme:     { median: 150, low: 100, high: 205 },
      ssp_catastrophe: { median: 220, low: 160, high: 310 },
    },
    areaLookup: [
      { elevM: 0.5, area:  1800, pop:  4.5 },
      { elevM: 1.0, area:  4200, pop:  9.2 },
      { elevM: 2.0, area:  8500, pop: 16.0 },
      { elevM: 3.0, area: 12000, pop: 20.5 },
      { elevM: 5.0, area: 18000, pop: 28.0 },
    ],
    threatenedAreas: ["Koto/Katsushika (Tokyo)", "Osaka Zero-meter Zone", "Nagoya (Nobi Plain)", "Fukuoka Bay", "Sendai Plain"],
    badge: 'JMA', description: 'Tokyo, Osaka & Nagoya zero-meter zones · Kuroshio current variability',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Koto/Katsushika (Tokyo Zero-meter)"},"geometry":{"type":"Polygon","coordinates":[[[139.80,35.63],[139.92,35.63],[139.92,35.72],[139.80,35.72],[139.80,35.63]]]}},
      {"type":"Feature","properties":{"elevation_m":0.4,"name":"Sumida/Edogawa Districts"},"geometry":{"type":"Polygon","coordinates":[[[139.78,35.68],[139.90,35.68],[139.91,35.78],[139.79,35.79],[139.78,35.68]]]}},
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Osaka Zero-meter Zone"},"geometry":{"type":"Polygon","coordinates":[[[135.42,34.61],[135.52,34.61],[135.53,34.68],[135.43,34.69],[135.42,34.61]]]}},
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Nagoya Delta (Nobi Plain)"},"geometry":{"type":"Polygon","coordinates":[[[136.62,35.03],[136.82,35.03],[136.83,35.18],[136.63,35.19],[136.62,35.03]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Tokyo Bay South Coast"},"geometry":{"type":"Polygon","coordinates":[[[139.68,35.52],[139.90,35.52],[139.91,35.63],[139.69,35.64],[139.68,35.52]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Osaka Bay Coast"},"geometry":{"type":"Polygon","coordinates":[[[135.42,34.55],[135.60,34.55],[135.61,34.65],[135.43,34.66],[135.42,34.55]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Sendai Plain (Tohoku)"},"geometry":{"type":"Polygon","coordinates":[[[140.95,38.12],[141.10,38.12],[141.11,38.30],[140.96,38.31],[140.95,38.12]]]}},
      {"type":"Feature","properties":{"elevation_m":2.0,"name":"Tokyo Metro Lowlands"},"geometry":{"type":"Polygon","coordinates":[[[139.70,35.62],[139.95,35.62],[139.96,35.80],[139.71,35.81],[139.70,35.62]]]}},
      {"type":"Feature","properties":{"elevation_m":3.0,"name":"Osaka Plain Broad"},"geometry":{"type":"Polygon","coordinates":[[[135.30,34.55],[135.68,34.55],[135.70,34.80],[135.32,34.82],[135.30,34.55]]]}},
      {"type":"Feature","properties":{"elevation_m":4.0,"name":"Kanto Plain (Greater Tokyo)"},"geometry":{"type":"Polygon","coordinates":[[[139.50,35.42],[140.40,35.40],[140.42,35.80],[139.52,35.82],[139.50,35.42]]]}},
    ]},
  },
  {
    id: 'taiwan', flagCode: 'tw', name: 'Taiwan', flag: '🇹🇼', rank: 20,
    mapCenter: [23.6, 121.2], mapZoom: 8,
    trendRate: 0.32,          // cm/yr — Keelung station
    seasonalAmplitude: 8, seasonalPeakMonth: 6, // summer peak
    ensoAmplitude1: 3.5, ensoAmplitude2: 2.0,
    ssp: {
      ssp126:          { median:  22, low:  15, high:  48 },
      ssp245:          { median:  53, low:  30, high:  82 },
      ssp585:          { median:  90, low:  55, high: 135 },
      ssp_extreme:     { median: 135, low:  90, high: 185 },
      ssp_catastrophe: { median: 200, low: 150, high: 290 },
    },
    areaLookup: [
      { elevM: 0.5, area:   85, pop: 0.12 },
      { elevM: 1.0, area:  210, pop: 0.28 },
      { elevM: 1.5, area:  420, pop: 0.52 },
      { elevM: 2.0, area:  680, pop: 0.87 },
      { elevM: 3.0, area: 1150, pop: 1.45 },
      { elevM: 5.0, area: 2100, pop: 2.64 },
    ],
    threatenedAreas: ["Tainan (Annan)", "Yunlin Coast", "Kaohsiung (Cijin)", "Chiayi Budai", "Taipei Basin (low areas)"],
    badge: 'CWA', description: 'Western coastal plains · Land subsidence in south · Typhoon amplification',
    elevationBands: {"type":"FeatureCollection","features":[
      {"type":"Feature","properties":{"elevation_m":0.3,"name":"Tainan Annan Coast"},"geometry":{"type":"Polygon","coordinates":[[[120.10,22.95],[120.18,22.95],[120.19,23.02],[120.12,23.05],[120.10,22.95]]]}},
      {"type":"Feature","properties":{"elevation_m":0.4,"name":"Yunlin Mailiao Coast"},"geometry":{"type":"Polygon","coordinates":[[[120.10,23.70],[120.18,23.70],[120.18,23.82],[120.11,23.83],[120.10,23.70]]]}},
      {"type":"Feature","properties":{"elevation_m":0.4,"name":"Kaohsiung Cijin/Linbian"},"geometry":{"type":"Polygon","coordinates":[[[120.40,22.40],[120.52,22.40],[120.54,22.58],[120.42,22.60],[120.40,22.40]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Chiayi Budai Saltpans"},"geometry":{"type":"Polygon","coordinates":[[[120.10,23.35],[120.16,23.35],[120.17,23.50],[120.11,23.51],[120.10,23.35]]]}},
      {"type":"Feature","properties":{"elevation_m":0.5,"name":"Tainan Beimen Lagoon"},"geometry":{"type":"Polygon","coordinates":[[[120.10,23.17],[120.18,23.17],[120.20,23.36],[120.11,23.37],[120.10,23.17]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Chiayi Dongshi Coast"},"geometry":{"type":"Polygon","coordinates":[[[120.10,23.45],[120.22,23.45],[120.24,23.58],[120.11,23.58],[120.10,23.45]]]}},
      {"type":"Feature","properties":{"elevation_m":1.0,"name":"Changhua Coast"},"geometry":{"type":"Polygon","coordinates":[[[120.12,24.00],[120.28,23.99],[120.30,24.25],[120.13,24.26],[120.12,24.00]]]}},
      {"type":"Feature","properties":{"elevation_m":1.5,"name":"Pingtung Donggang/Jiadong"},"geometry":{"type":"Polygon","coordinates":[[[120.45,22.30],[120.65,22.30],[120.67,22.58],[120.47,22.60],[120.45,22.30]]]}},
      {"type":"Feature","properties":{"elevation_m":2.0,"name":"Tainan–Kaohsiung Plain"},"geometry":{"type":"Polygon","coordinates":[[[120.12,22.88],[120.40,22.87],[120.42,23.40],[120.14,23.42],[120.12,22.88]]]}},
      {"type":"Feature","properties":{"elevation_m":2.0,"name":"Taipei Sanchong/Luzhou"},"geometry":{"type":"Polygon","coordinates":[[[121.38,24.95],[121.55,24.95],[121.56,25.10],[121.40,25.11],[121.38,24.95]]]}},
      {"type":"Feature","properties":{"elevation_m":3.5,"name":"Taipei Basin"},"geometry":{"type":"Polygon","coordinates":[[[121.30,24.88],[121.62,24.87],[121.64,25.12],[121.32,25.14],[121.30,24.88]]]}},
      {"type":"Feature","properties":{"elevation_m":3.5,"name":"Changhua–Yunlin Broad Plain"},"geometry":{"type":"Polygon","coordinates":[[[120.12,23.55],[120.62,23.53],[120.64,24.55],[120.14,24.57],[120.12,23.55]]]}},
      {"type":"Feature","properties":{"elevation_m":5.0,"name":"Western Plains (North)"},"geometry":{"type":"Polygon","coordinates":[[[120.12,24.55],[121.10,24.50],[121.12,25.05],[120.60,25.10],[120.14,25.08],[120.12,24.55]]]}},
      {"type":"Feature","properties":{"elevation_m":5.0,"name":"Western Plains (South)"},"geometry":{"type":"Polygon","coordinates":[[[120.10,22.15],[120.72,22.13],[120.74,24.55],[120.12,24.57],[120.10,22.15]]]}}
    ]},
  },
];

/* ---- Active country & State ---- */
let activeCountry = COUNTRIES_CONFIG[0]; // default: Bangladesh
let realHistoricalData = {}; // populated from data/historical.json if available
let realElevationData  = {}; // cache: country_id → GeoJSON (loaded from data/elevation/{id}.geojson)

let state = {
  scenario:    'ssp126',
  sliderValue: 57,
  isPlaying:   false,
  playTimer:   null,
  granularity: '1y',
  speed:       1,
  chart:       null,
  floodLayer:  null,
  map:         null,
  data: {
    historical: null,
    ssp126: null, ssp245: null, ssp585: null,
    ssp_extreme: null, ssp_catastrophe: null,
  }
};

/* ================================================================
   1. Data Generation (country-agnostic, reads activeCountry)
   ================================================================ */

function generateAllData() {
  return {
    historical:      generateHistoricalData(),
    ssp126:          generateProjectionData('ssp126'),
    ssp245:          generateProjectionData('ssp245'),
    ssp585:          generateProjectionData('ssp585'),
    ssp_extreme:     generateProjectionData('ssp_extreme'),
    ssp_catastrophe: generateProjectionData('ssp_catastrophe'),
  };
}

function generateHistoricalData() {
  const real = realHistoricalData[activeCountry.id];
  if (real && real.length > 0) {
    // Use real tide-gauge data from START_YEAR onwards
    const data = real.filter(d => d.year >= START_YEAR);
    if (data.length > 0) {
      // If real data ends before today, extend with trend-only projection to avoid chart gap
      const last = data[data.length - 1];
      const lastMark  = last.year * 12 + last.month;
      const todayMark = TODAY_YEAR * 12 + 3; // March 2025
      if (lastMark < todayMark) {
        let { year, month, value } = last;
        month++;
        if (month > 12) { month = 1; year++; }
        while (year < TODAY_YEAR || (year === TODAY_YEAR && month <= 3)) {
          value += activeCountry.trendRate / 12;
          data.push({ year, month, value: parseFloat(value.toFixed(2)) });
          month++;
          if (month > 12) { month = 1; year++; }
        }
      }
      return data;
    }
  }
  // Synthetic fallback (used when no real data available for this country)
  const data = [];
  const trendRate = activeCountry.trendRate;
  let year = START_YEAR, month = 1;
  while (year < TODAY_YEAR || (year === TODAY_YEAR && month <= 3)) {
    const t = year + (month - 0.5) / 12;
    const trend = (t - 1990) * trendRate;
    const seasonal = activeCountry.seasonalAmplitude
      * Math.sin(2 * Math.PI * ((month - activeCountry.seasonalPeakMonth) / 12));
    const interannual = activeCountry.ensoAmplitude1 * Math.sin(2 * Math.PI * t / 3.7)
                      + activeCountry.ensoAmplitude2 * Math.sin(2 * Math.PI * t / 7.1);
    const noise = 1.5 * pseudoRandom(year * 12 + month);
    data.push({ year, month, value: parseFloat((trend + seasonal + interannual + noise).toFixed(2)) });
    month++;
    if (month > 12) { month = 1; year++; }
  }
  return data;
}

function generateProjectionData(scenario) {
  const data = [];
  const t = activeCountry.ssp[scenario];
  const startValue = (TODAY_YEAR - 1990) * activeCountry.trendRate;
  const startYear = 2025;
  const endYear   = 2100;

  let year = TODAY_YEAR, month = 4;
  while (year < endYear || (year === endYear && month <= 12)) {
    const progress = ((year + month / 12) - startYear) / (endYear - startYear);
    const curve    = Math.pow(progress, 1.3);
    const median   = startValue + (t.median - startValue) * curve;
    const low      = startValue + (t.low    - startValue) * curve;
    const high     = startValue + (t.high   - startValue) * curve;
    const seasonal = (activeCountry.seasonalAmplitude + progress * 2)
      * Math.sin(2 * Math.PI * ((month - activeCountry.seasonalPeakMonth) / 12));
    data.push({
      year, month,
      median: parseFloat((median + seasonal).toFixed(2)),
      low:    parseFloat((low    + seasonal * 0.8).toFixed(2)),
      high:   parseFloat((high   + seasonal * 1.2).toFixed(2)),
    });
    month++;
    if (month > 12) { month = 1; year++; }
  }
  return data;
}

function pseudoRandom(seed) {
  const x = Math.sin(seed + 1) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/* ================================================================
   2. Time mapping
   ================================================================ */

function sliderToYear(val) {
  return START_YEAR + (val / 100) * (END_YEAR - START_YEAR);
}
function yearToSlider(year) {
  return ((year - START_YEAR) / (END_YEAR - START_YEAR)) * 100;
}
function yearToLabel(yearFrac) {
  const year = Math.floor(yearFrac);
  const month = Math.ceil((yearFrac - year) * 12) || 1;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${monthNames[month - 1]} ${year}`;
}

function getSeaLevelAt(sliderVal) {
  const yearFrac = sliderToYear(sliderVal);
  const year  = Math.floor(yearFrac);
  const month = Math.max(1, Math.ceil((yearFrac - year) * 12));
  if (yearFrac <= TODAY_YEAR + 3 / 12) {
    const entry = state.data.historical.find(d => d.year === year && d.month === month)
                || state.data.historical[state.data.historical.length - 1];
    return entry ? entry.value : 0;
  } else {
    const proj  = state.data[state.scenario];
    const entry = proj.find(d => d.year === year && d.month === month)
                || proj[proj.length - 1];
    return entry ? entry.median : 0;
  }
}

/* ================================================================
   3. Chart.js
   ================================================================ */

function initChart() {
  const ctx  = document.getElementById('seaLevelChart').getContext('2d');
  const hist = state.data.historical;
  const proj = state.data[state.scenario];
  const col  = SCENARIO_COLORS[state.scenario];

  const labels = [], histValues = [], projValues = [], projLow = [], projHigh = [];

  hist.forEach(d => {
    if (d.month === 6) {
      labels.push(`${d.year}`);
      histValues.push(d.value);
      projValues.push(null); projLow.push(null); projHigh.push(null);
    }
  });

  const lastHist = hist[hist.length - 1];
  labels.push(`${lastHist.year}/${lastHist.month}`);
  histValues.push(lastHist.value);
  projValues.push(lastHist.value); projLow.push(lastHist.value); projHigh.push(lastHist.value);

  proj.forEach(d => {
    if (d.month === 6) {
      labels.push(`${d.year}`);
      histValues.push(null);
      projValues.push(d.median); projLow.push(d.low); projHigh.push(d.high);
    }
  });

  const todayIdx = histValues.filter(v => v !== null).length;

  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Historical',       data: histValues, borderColor: '#0EA5E9', borderWidth: 1.5,
          pointRadius: 0, fill: { target: 'origin', above: 'rgba(14,165,233,0.08)', below: 'rgba(14,165,233,0.04)' },
          tension: 0.4, spanGaps: false },
        { label: 'Median Projection', data: projValues, borderColor: col.main, borderWidth: 2,
          borderDash: [6, 3], pointRadius: 0, fill: false, tension: 0.4, spanGaps: false },
        { label: '95% CI Upper',      data: projHigh, borderColor: 'transparent', pointRadius: 0,
          fill: '+1', backgroundColor: col.band, tension: 0.4, spanGaps: false },
        { label: '95% CI Lower',      data: projLow, borderColor: 'transparent', pointRadius: 0,
          fill: false, tension: 0.4, spanGaps: false },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#94A3B8', font: { size: 10 }, boxWidth: 14,
            filter: item => item.text !== '95% CI Upper' && item.text !== '95% CI Lower' }
        },
        tooltip: {
          backgroundColor: 'rgba(10,22,50,0.92)', titleColor: '#E2E8F0', bodyColor: '#94A3B8',
          borderColor: 'rgba(14,165,233,0.3)', borderWidth: 1,
          callbacks: { label: ctx => ctx.raw === null ? null : ` ${ctx.dataset.label}: ${ctx.raw.toFixed(1)} cm` }
        },
        annotation: {
          annotations: {
            todayLine: {
              type: 'line', xMin: todayIdx, xMax: todayIdx,
              borderColor: '#06B6D4', borderWidth: 1.5, borderDash: [4, 4],
              label: { content: 'Today', display: true, position: 'start',
                color: '#06B6D4', font: { size: 9 }, backgroundColor: 'transparent' }
            },
            currentPos: { type: 'line', xMin: todayIdx, xMax: todayIdx,
              borderColor: 'rgba(255,255,255,0.5)', borderWidth: 1, id: 'currentPos' }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#475569', font: { size: 9 }, maxTicksLimit: 12, maxRotation: 0 },
             grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#475569', font: { size: 9 }, callback: v => `${v} cm` },
             grid: { color: 'rgba(255,255,255,0.04)' }, title: { display: false } }
      }
    }
  });
}

function updateChart() {
  const proj = state.data[state.scenario];
  const col  = SCENARIO_COLORS[state.scenario];
  const hist = state.data.historical;
  const newProjValues = [], newProjLow = [], newProjHigh = [];
  hist.filter(d => d.month === 6).forEach(() => {
    newProjValues.push(null); newProjLow.push(null); newProjHigh.push(null);
  });
  const lastHist = hist[hist.length - 1];
  newProjValues.push(lastHist.value); newProjLow.push(lastHist.value); newProjHigh.push(lastHist.value);
  proj.filter(d => d.month === 6).forEach(d => {
    newProjValues.push(d.median); newProjLow.push(d.low); newProjHigh.push(d.high);
  });
  state.chart.data.datasets[1].data = newProjValues;
  state.chart.data.datasets[1].borderColor = col.main;
  state.chart.data.datasets[2].data = newProjHigh;
  state.chart.data.datasets[2].backgroundColor = col.band;
  state.chart.data.datasets[3].data = newProjLow;
  state.chart.update('none');
}

function updateChartCurrentLine(sliderVal) {
  if (!state.chart) return;
  const year   = Math.floor(sliderToYear(sliderVal));
  const labels = state.chart.data.labels;
  let closestIdx = 0, minDiff = Infinity;
  labels.forEach((lbl, i) => {
    const diff = Math.abs(parseFloat(lbl.split('/')[0]) - year);
    if (diff < minDiff) { minDiff = diff; closestIdx = i; }
  });
  state.chart.options.plugins.annotation.annotations.currentPos.xMin = closestIdx;
  state.chart.options.plugins.annotation.annotations.currentPos.xMax = closestIdx;
  state.chart.update('none');
}

/* ================================================================
   4. Leaflet Map + Flood Layer
   ================================================================ */

async function loadElevationGeoJson(country) {
  // Return cached if available
  if (realElevationData[country.id]) return realElevationData[country.id];
  try {
    const res = await fetch(`data/elevation/${country.id}.geojson`);
    if (res.ok) {
      const gj = await res.json();
      realElevationData[country.id] = gj;
      console.log(`[sea-level] Loaded real elevation: ${country.id}`);
      return gj;
    }
  } catch { /* fall through */ }
  // Fallback to inline approximate polygons from COUNTRIES_CONFIG
  return country.elevationBands;
}

async function initMap() {
  state.map = L.map('map', {
    center: activeCountry.mapCenter,
    zoom:   activeCountry.mapZoom,
    zoomControl: true,
    attributionControl: false,
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18, subdomains: 'abcd',
  }).addTo(state.map);
  L.control.attribution({ prefix: '' }).addTo(state.map);
  const geoJson = await loadElevationGeoJson(activeCountry);
  applyElevationGeoJson(geoJson);
}

function applyElevationGeoJson(geoJson) {
  state.floodLayer = L.geoJSON(geoJson, {
    style: feature => floodStyle(feature, 0),
    onEachFeature: (feature, layer) => {
      const elev = feature.properties.elevation_m;
      const safe = s => String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
      layer.bindPopup(
        `<b>${safe(feature.properties.name || 'Coastal Low Zone')}</b><br>` +
        `Elevation: <b>${elev} m</b> or below<br>` +
        `Flood threshold: sea level rise <b>≥ ${(elev * 100).toFixed(0)} cm</b>`
      );
    }
  }).addTo(state.map);
  updateFloodLayer();
}

const FLOOD_LEVELS = [
  { maxDepth:  30, cls: 'flood-pink',   fill: '#831843', stroke: '#f472b6' },
  { maxDepth:  80, cls: 'flood-yellow', fill: '#713f12', stroke: '#eab308' },
  { maxDepth: 150, cls: 'flood-orange', fill: '#7c2d12', stroke: '#f97316' },
  { maxDepth: Infinity, cls: 'flood-red', fill: '#7f1d1d', stroke: '#ef4444' },
];
const FLOOD_CLASSES = FLOOD_LEVELS.map(l => l.cls);

function floodStyle(feature, seaLevelCm) {
  const elevCm = feature.properties.elevation_m * 100;
  if (seaLevelCm < elevCm) return { fillColor: 'transparent', fillOpacity: 0, stroke: false, weight: 0 };
  const depth = seaLevelCm - elevCm;
  const level = FLOOD_LEVELS.find(l => depth < l.maxDepth);
  return { fillColor: level.fill, fillOpacity: 0.55, stroke: true, color: level.stroke, weight: 3 };
}

function updateFloodLayer() {
  if (!state.floodLayer) return;
  const seaLevel = getSeaLevelAt(state.sliderValue);
  state.floodLayer.eachLayer(layer => {
    layer.setStyle(floodStyle(layer.feature, seaLevel));
    const el = layer.getElement ? layer.getElement() : null;
    if (!el) return;
    el.classList.remove(...FLOOD_CLASSES);
    const elevCm = layer.feature.properties.elevation_m * 100;
    if (seaLevel >= elevCm) {
      const depth = seaLevel - elevCm;
      const level = FLOOD_LEVELS.find(l => depth < l.maxDepth);
      el.classList.add(level.cls);
    }
  });
}

/* ================================================================
   5. Stats Panel
   ================================================================ */

function computeArea(seaLevelCm) {
  const seaLevelM = seaLevelCm / 100;
  const lookup = activeCountry.areaLookup;
  for (let i = lookup.length - 1; i >= 0; i--) {
    if (seaLevelM >= lookup[i].elevM * 0.8) return lookup[i];
  }
  return { area: 0, pop: 0 };
}

function computeRate(sliderVal) {
  const yr = sliderToYear(sliderVal);
  const v1 = getSeaLevelAtYear(yr - 5);
  const v2 = getSeaLevelAtYear(yr + 5);
  return ((v2 - v1) / 10 * 10).toFixed(1);
}

function getSeaLevelAtYear(yearFrac) {
  const tmpSlider = yearToSlider(yearFrac);
  return getSeaLevelAt(Math.max(0, Math.min(100, tmpSlider)));
}

function featureCentroidLat(f) {
  const coords = f.geometry.coordinates[0];
  return coords.reduce((s, c) => s + c[1], 0) / coords.length;
}

function getAffectedZones(seaLevelCm) {
  const source = state.floodLayer
    ? state.floodLayer.getLayers().map(l => l.feature)
    : activeCountry.elevationBands.features;
  return source
    .filter(f => seaLevelCm >= f.properties.elevation_m * 100)
    .sort((a, b) => featureCentroidLat(b) - featureCentroidLat(a))
    .map(f => f.properties.name);
}

function updateStats() {
  const seaLevel = getSeaLevelAt(state.sliderValue);
  const yearFrac = sliderToYear(state.sliderValue);
  const rate     = computeRate(state.sliderValue);
  const { area, pop } = computeArea(seaLevel);
  const zones    = getAffectedZones(seaLevel);

  document.getElementById('currentDateDisplay').textContent = yearToLabel(yearFrac);
  document.getElementById('timeDisplayText').textContent    = yearToLabel(yearFrac);

  setStatValue('statSeaLevel', seaLevel > 0 ? `+${seaLevel.toFixed(1)}` : seaLevel.toFixed(1));
  setStatValue('statRate', rate);
  setStatValue('statArea', area.toLocaleString());
  setStatValue('statPop', pop.toFixed(pop < 1 ? 2 : 1));

  const citiesEl = document.getElementById('citiesList');
  if (zones.length) {
    const safe = c => c.replace(/[<>&"]/g, ch => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[ch]));
    citiesEl.innerHTML = zones.map(c => `<span class="city-tag">${safe(c)}</span>`).join('');
  } else {
    citiesEl.innerHTML = '<span class="city-none">— Minimal impact at current level</span>';
  }

  document.getElementById('mapSeaLevelBadge').textContent =
    `Sea Level ${seaLevel >= 0 ? '+' : ''}${seaLevel.toFixed(1)} cm`;

  const modeBadge = document.getElementById('mapModeBadge');
  if (yearFrac <= TODAY_YEAR + 3 / 12) {
    modeBadge.textContent = 'Historical';
    modeBadge.className = 'hud-badge mode-history';
  } else {
    const names = {
      ssp126: 'Optimistic', ssp245: 'Moderate', ssp585: 'Pessimistic',
      ssp_extreme: 'High-end', ssp_catastrophe: 'Catastrophic',
    };
    modeBadge.textContent = names[state.scenario] || 'Projection';
    modeBadge.className = 'hud-badge mode-future';
  }
}

function setStatValue(id, val) {
  const el = document.getElementById(id);
  if (el.textContent === String(val)) return;
  el.textContent = val;
  el.classList.remove('updated');
  void el.offsetWidth;
  el.classList.add('updated');
}

/* ================================================================
   6. Timeline Control
   ================================================================ */

function onSliderChange() {
  state.sliderValue = parseFloat(document.getElementById('timeSlider').value);
  updateFloodLayer();
  updateStats();
  updateChartCurrentLine(state.sliderValue);
}

function startPlay() {
  if (state.isPlaying) return;
  state.isPlaying = true;
  document.getElementById('btnPlay').textContent = '⏸';
  document.getElementById('btnPlay').classList.add('playing');
  const step = getPlayStep();
  state.playTimer = setInterval(() => {
    state.sliderValue = Math.min(100, state.sliderValue + step);
    document.getElementById('timeSlider').value = state.sliderValue;
    updateFloodLayer();
    updateStats();
    updateChartCurrentLine(state.sliderValue);
    if (state.sliderValue >= 100) stopPlay();
  }, 100);
}

function stopPlay() {
  state.isPlaying = false;
  clearInterval(state.playTimer);
  document.getElementById('btnPlay').textContent = '▶';
  document.getElementById('btnPlay').classList.remove('playing');
}

function getPlayStep() {
  const granSteps = { '1y': 1, '5y': 5, '10y': 10 };
  return (granSteps[state.granularity] || 1) * state.speed * 0.12;
}

/* ================================================================
   7. Country Selector
   ================================================================ */

function buildCountryList() {
  const list = document.getElementById('country-list');
  list.innerHTML = '';
  COUNTRIES_CONFIG.forEach(country => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.dataset.id = country.id;
    if (country.id === activeCountry.id) li.classList.add('active');
    li.innerHTML =
      `<img class="li-flag-img" src="https://flagcdn.com/w40/${country.flagCode}.png" alt="${country.name}" />` +
      `<span class="li-name">${country.name}</span>` +
      `<span class="li-rank">#${country.rank}</span>`;
    li.addEventListener('click', () => {
      switchCountry(country.id);
      closeCountryDropdown();
    });
    list.appendChild(li);
  });
}

function openCountryDropdown() {
  document.getElementById('country-list').classList.add('open');
  document.getElementById('country-trigger').setAttribute('aria-expanded', 'true');
}

function closeCountryDropdown() {
  document.getElementById('country-list').classList.remove('open');
  document.getElementById('country-trigger').setAttribute('aria-expanded', 'false');
}

function toggleCountryDropdown() {
  const list = document.getElementById('country-list');
  if (list.classList.contains('open')) closeCountryDropdown();
  else openCountryDropdown();
}

async function switchCountry(id) {
  if (id === activeCountry.id) return;
  if (state.isPlaying) stopPlay();

  activeCountry = COUNTRIES_CONFIG.find(c => c.id === id);

  // Regenerate data
  state.data = generateAllData();

  // Reset map
  state.map.setView(activeCountry.mapCenter, activeCountry.mapZoom);
  if (state.floodLayer) {
    state.map.removeLayer(state.floodLayer);
    state.floodLayer = null;
  }
  const geoJson = await loadElevationGeoJson(activeCountry);
  applyElevationGeoJson(geoJson);

  // Rebuild chart
  if (state.chart) { state.chart.destroy(); state.chart = null; }
  initChart();

  // Update UI
  updateScenarioTabs();
  updateCountrySelectorUI();
  updateStats();
  updateChartCurrentLine(state.sliderValue);

  // Mark active in list
  document.querySelectorAll('#country-list li').forEach(li => {
    li.classList.toggle('active', li.dataset.id === id);
  });
}

function updateScenarioTabs() {
  const scenarios = ['ssp126', 'ssp245', 'ssp585', 'ssp_extreme', 'ssp_catastrophe'];
  scenarios.forEach(sc => {
    const el = document.getElementById(`rise-${sc}`);
    if (el) el.textContent = `+${activeCountry.ssp[sc].median} cm`;
  });
}

function updateCountrySelectorUI() {
  const flagEl = document.getElementById('country-flag');
  flagEl.src = `https://flagcdn.com/w40/${activeCountry.flagCode}.png`;
  flagEl.alt = activeCountry.name;
  document.getElementById('country-name').textContent = activeCountry.name;
  document.getElementById('country-rank').textContent = `#${activeCountry.rank}`;
  document.getElementById('headerBadge').innerHTML =
    `<img class="flag-img-sm" src="https://flagcdn.com/w40/${activeCountry.flagCode}.png" alt="${activeCountry.name}" />`;
  document.getElementById('countryDesc').textContent = activeCountry.description;
}

/* ================================================================
   8. Event Binding
   ================================================================ */

function bindEvents() {
  document.getElementById('timeSlider').addEventListener('input',  onSliderChange);
  document.getElementById('timeSlider').addEventListener('change', onSliderChange);

  document.getElementById('btnPlay').addEventListener('click', () => {
    if (state.isPlaying) stopPlay(); else startPlay();
  });
  document.getElementById('btnRewind').addEventListener('click', () => {
    stopPlay(); state.sliderValue = 0;
    document.getElementById('timeSlider').value = 0; onSliderChange();
  });
  document.getElementById('btnFastFwd').addEventListener('click', () => {
    stopPlay(); state.sliderValue = 100;
    document.getElementById('timeSlider').value = 100; onSliderChange();
  });

  document.getElementById('playSpeed').addEventListener('change', e => {
    state.speed = parseFloat(e.target.value);
    if (state.isPlaying) { stopPlay(); startPlay(); }
  });

  document.querySelectorAll('.scenario-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.scenario-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.scenario = btn.dataset.scenario;
      const descEl = document.getElementById('scenarioDesc');
      if (descEl) descEl.textContent = btn.dataset.desc || '';
      const iconEl = document.getElementById('scenarioDescIcon');
      if (iconEl) iconEl.dataset.scenario = state.scenario;
      updateChart();
      updateFloodLayer();
      updateStats();
    });
  });

  document.querySelectorAll('.gran-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gran-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.granularity = btn.dataset.gran;
      if (state.isPlaying) { stopPlay(); startPlay(); }
    });
  });

  // Country dropdown
  document.getElementById('country-trigger').addEventListener('click', e => {
    e.stopPropagation();
    toggleCountryDropdown();
  });
  document.addEventListener('click', e => {
    if (!document.getElementById('country-dropdown').contains(e.target)) {
      closeCountryDropdown();
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCountryDropdown();
  });
}

/* ================================================================
   9. Initialization
   ================================================================ */

async function init() {
  // Generate data
  state.data = generateAllData();

  // Set initial slider to today
  const todaySlider = yearToSlider(TODAY_YEAR + TODAY_DOY / 365);
  state.sliderValue = parseFloat(todaySlider.toFixed(1));
  document.getElementById('timeSlider').value = state.sliderValue;
  document.getElementById('todayMarker').style.left = `${state.sliderValue}%`;
  document.querySelector('.slider-track-history').style.width = `${state.sliderValue}%`;

  // Build country list
  buildCountryList();

  // Init chart
  initChart();

  // Init map (async: loads real elevation GeoJSON if available)
  await initMap();

  // Bind events
  bindEvents();

  // Initial UI update
  updateScenarioTabs();
  updateCountrySelectorUI();
  updateStats();
}

document.addEventListener('DOMContentLoaded', async () => {
  // Try to load real historical data; silently fall back to synthetic if unavailable
  try {
    const res = await fetch('data/historical.json');
    if (res.ok) {
      const json = await res.json();
      // Strip _meta key; remaining keys are country ids → [{year,month,value}]
      const { _meta, ...countries } = json;
      realHistoricalData = countries;
      const loaded = Object.keys(countries).length;
      console.log(`[sea-level] Loaded real historical data for ${loaded} countries`);
    }
  } catch (e) {
    console.log('[sea-level] No data/historical.json found, using synthetic data');
  }
  await init();
});
