/* ══════════════════════════════════════════════════════
   NETZERRA — app.js
   Kenya's Carbon Intelligence Platform
   github.com/netzerra | shukriali411@gmail.com
══════════════════════════════════════════════════════ */

'use strict';

// ── STATE ─────────────────────────────────────────────
const S = {
  user: {
    name: 'Shukri Ali', email: 'shukriali411@gmail.com',
    phone: '+254705366807', org: 'Netzerra', plan: 'Canopy (Demo)',
    score: 68, totalEmissions: 2847, totalOffsets: 710, projects: 12
  },
  lastCalc: null,
  charts: {},
  isFirstLogin: true,
  kncr: {
    projects: [
      { id:'NTZ-001', name:'Turkana Solar Borehole Cluster', sector:'borehole', county:'Turkana', credits:420, standard:'Verra VCS', step:2, created:'2026-01-15' },
      { id:'NTZ-002', name:'Rift Valley Matatu CNG Pilot',   sector:'transport', county:'Nakuru',  credits:1100, standard:'Gold Standard', step:1, created:'2026-02-20' }
    ]
  }
};

// ── EMISSION FACTORS (Kenya-calibrated, IPCC AR6) ─────
// KPLC grid EF: Kenya's grid is ~90% renewable (geothermal 44%, hydro 23%, wind 16%).
// IEA grid average: 56.81 gCO2/kWh (2020), ~70 gCO2/kWh (2022-2023 including peak thermal).
// Source: SEforAll Country Brief Kenya / IEA Emissions Factors 2024.
// NOTE: 0.497 (formerly used) is incorrect — that figure applies to fossil-heavy grids.
const EF = {
  diesel:2.68, petrol:2.31, hfo:3.17, lpg:2.98, cng:1.99, kplc:0.070,
  steel:1.85, pvc:2.41, cement:0.83, rebar:1.99, concrete:0.159,
  asphalt:0.045, timber:0.72, glass:0.91,
  // GWP values set dynamically from GWP_SETS — defaults to AR6
  // HFC-134a: AR4=1430, AR5=1300, AR6=1530 (GHG Protocol Aug 2024)
  // R-404A:   AR4=3922, AR5=3922, AR6=4180 (GHG Protocol Aug 2024)
  gwpCH4:27.0, gwpN2O:273, gwpHFC134a:1530, gwpR404A:4180,
  ef3pasture:0.02, feedConc:0.45, truckKm:0.20, lightKm:0.165, motoKm:0.103,
  livestock: {
    dairy:  [68,  16, 70],
    beef:   [47,  10, 50],
    goat:   [5,  0.17, 8],
    sheep:  [8,  0.19, 12],
    camel:  [46,   7, 45],
    pig:    [1,   4.5, 16],
    donkey: [10,    1, 20],
    poultry:[0.02,0.02,0.6]
  },
  sectorBenchmarks: { borehole:50, livestock:300, transport:200, construct:500, manufact:200 }
};

// ── GWP LOOKUP TABLES — verified GHG Protocol Aug 2024 ──
// Source: https://ghgprotocol.org/sites/default/files/2024-08/Global-Warming-Potential-Values.pdf
// UNFCCC Paris Agreement uses AR5. Kenya KNCR moving to AR6.
const GWP_SETS = {
  AR5: {
    label: 'AR5 (IPCC 2013) — UNFCCC Paris Agreement standard',
    CH4_biogenic: 28,   // non-fossil (livestock, wetlands)
    CH4_fossil:   30,   // natural gas leaks, coal
    N2O:          265,
    HFC134a:      1300,
    R404A:        3922,
    source: 'IPCC 2013 Fifth Assessment Report, Table 8.A.1'
  },
  AR6: {
    label: 'AR6 (IPCC 2021) — Kenya KNCR recommended',
    CH4_biogenic: 27.0, // non-fossil (livestock, manure, wetlands)
    CH4_fossil:   29.8, // fossil fuel methane leaks
    N2O:          273,
    HFC134a:      1530, // corrected from AR4 value of 1430
    R404A:        4180,
    source: 'IPCC 2021 Sixth Assessment Report WG1 Ch.7 / GHG Protocol Aug 2024'
  }
};
let ACTIVE_GWP = 'AR6'; // default — user can switch

function applyGWP(set) {
  ACTIVE_GWP = set;
  const g = GWP_SETS[set];
  EF.gwpCH4    = g.CH4_biogenic;
  EF.gwpN2O    = g.N2O;
  EF.gwpHFC134a = g.HFC134a;
  EF.gwpR404A  = g.R404A;
  const badge = document.getElementById('res-gwp-tag');
  if (badge) badge.textContent = set + ' Active';
  toast(`GWP updated to ${set}: CH₄=${g.CH4_biogenic}, N₂O=${g.N2O}`, 'info');
  // Re-run last calc if exists
  if (S.lastCalc) toast('Re-run your calculation to apply the new GWP values.','info');
}

// ── UNCERTAINTY RANGES — IPCC 2006 Tier 1 defaults ───
// Source: IPCC 2006 Vol.1 Chapter 3 Table 3.3 / Vol.4 Table 1.4
const UNCERTAINTY = {
  diesel:       { pct: 5,  basis:'IPCC 2006 Vol.1 Table 3.3 — fuel combustion EF' },
  petrol:       { pct: 5,  basis:'IPCC 2006 Vol.1 Table 3.3' },
  hfo:          { pct: 5,  basis:'IPCC 2006 Vol.1 Table 3.3' },
  kplc:         { pct: 10, basis:'IEA grid EF uncertainty — generation mix variation' },
  steel:        { pct: 20, basis:'World Steel LCI range — BOF process variation' },
  cement:       { pct: 10, basis:'Bath ICE v3.0 standard deviation' },
  rebar:        { pct: 20, basis:'Bath ICE v3.0 standard deviation' },
  concrete:     { pct: 15, basis:'Bath ICE v3.0 standard deviation' },
  livestock_ch4:{ pct: 30, basis:'IPCC 2006 Vol.4 Table 1.4 — Tier 1 enteric fermentation' },
  livestock_n2o:{ pct: 50, basis:'IPCC 2006 Vol.4 Table 1.4 — Tier 1 manure N2O' },
  transport:    { pct: 8,  basis:'DEFRA 2023 vehicle EF standard deviation' },
  hfc_fugitive: { pct: 40, basis:'IPCC 2006 Vol.2 Ch.7 — refrigerant leak rate uncertainty' },
};

function calcUncertainty(total_t, sector) {
  // Combined uncertainty using error propagation (sum of squared uncertainties)
  // Simplified to dominant-source percentage for display
  const dominant = {
    borehole: UNCERTAINTY.diesel,
    livestock: UNCERTAINTY.livestock_ch4,
    transport: UNCERTAINTY.transport,
    construct: UNCERTAINTY.cement,
    manufact:  UNCERTAINTY.diesel,
  };
  const d = dominant[sector] || { pct:15, basis:'IPCC 2006 Tier 1 default' };
  const low  = +(total_t * (1 - d.pct/100)).toFixed(2);
  const high = +(total_t * (1 + d.pct/100)).toFixed(2);
  return { pct: d.pct, low, high, basis: d.basis };
}

// ── LEAKAGE FACTORS — project displacement emissions ─
// Source: IPCC 2006 Vol.4 Ch.4 / IPCC 2019 Refinement / Kenya KEFRI biomass data
const LEAKAGE = {
  // Vegetation carbon stocks for Kenya land cover types (tCO2e/ha)
  // Source: IPCC 2006 Vol.4 Table 4.7 (Eastern Africa tropical zones)
  moist_forest:    { tco2ha: 620, label:'Moist tropical forest (Coast/Mt Kenya)' },
  dry_woodland:    { tco2ha: 85,  label:'Dry woodland / bush (ASAL — Turkana, Garissa)' },
  degraded_land:   { tco2ha: 12,  label:'Degraded / bare land' },
  grassland:       { tco2ha: 18,  label:'Savannah / grassland (Maasai Mara, Narok)' },
  wetland:         { tco2ha: 380, label:'Wetland / riparian (Tana River, Lake regions)' },
  cropland_active: { tco2ha: 22,  label:'Active cropland / smallholder farm' },
};

function calcLeakage(landType, hectares) {
  if (!landType || !hectares || hectares <= 0) return null;
  const lk = LEAKAGE[landType];
  if (!lk) return null;
  const total = +(lk.tco2ha * hectares).toFixed(2);
  return { total, perHa: lk.tco2ha, label: lk.label };
}

// ── REGULATORY CONFIG (edit here when NEMA changes rules) ──
const KNCR_CONFIG = {
  version: '2025-CarbonTrading',
  lastChecked: '2026-03-16',
  regulations: [
    { name:'Climate Change Act 2016', year:'2016', status:'Active' },
    { name:'Climate Change (Amendment) Act 2023', year:'2023', status:'Active' },
    { name:'Carbon Markets Regulations 2024', year:'2024', gazetted:'17 May 2024', status:'Active' },
    { name:'Carbon Trading Regulations 2025', year:'2025', status:'Active', note:'Governs exchange trading, custody under Central Depositories Act' },
    { name:'Non-Market Approaches Regulations 2025', year:'2025', status:'Active', note:'Covers collaborative climate actions between countries' },
  ],
  pipeline: [
    { step:1, label:'Concept Note',   icon:'📝', desc:'Project Concept Note submitted to NEMA Climate Change Directorate' },
    { step:2, label:'PDD Draft',      icon:'📋', desc:'Full Project Design Document developed with accredited VVB' },
    { step:3, label:'Validation',     icon:'🔍', desc:'Third-party VVB reviews and validates the PDD' },
    { step:4, label:'DNA Review',     icon:'🏛️', desc:'NEMA issues or denies Letter of Authorisation (LoA)' },
    { step:5, label:'Registered',     icon:'📲', desc:'Project listed on kncr.go.ke with public project page' },
    { step:6, label:'Credits Live',   icon:'🏅', desc:'Verified credits issued, community disbursement begins' },
  ],
  communityBenefit: { landBased: 0.40, nonLand: 0.25, privateExempt: true },
  taxRate: 0.15,
  penalties: { falseData: 500000000, failureToReport: 20000, jailMonths: 6 },
  fourthScheduleSections: [
    'Project Summary & Parties','Emission Baseline & Methodology',
    'Community Benefit Sharing Plan','Environmental Safeguards',
    'Grievance Redress Mechanism','Monitoring & Verification Plan',
    'Dispute Resolution','Signatures & Execution',
  ],
  bilateralMarkets: [
    { country:'🇨🇭 Switzerland', status:'active',      note:'ITMO transfers operational' },
    { country:'🇸🇪 Sweden',      status:'negotiating', note:'Expected to finalise 2026' },
    { country:'🇸🇬 Singapore',   status:'negotiating', note:'Active Article 6.2 negotiation' },
    { country:'🇰🇷 South Korea', status:'negotiating', note:'Multi-lateral coalition' },
    { country:'🇬🇧 UK',          status:'coalition',   note:'UK ICF Programme partner' },
  ],
};

// ── DATA BENCHMARKS — plausibility ranges per input ──
const BENCHMARKS = {
  borehole: {
    'bh-diesel-drill': { min:50,   max:8000,  label:'Diesel for drilling',   unit:'L', hint:'Typical: 200–3,000 L for a 60–150m borehole' },
    'bh-diesel-pump':  { min:0,    max:25000, label:'Annual pump diesel',    unit:'L/yr', hint:'Typical: 500–8,000 L/yr for a 3kW pump running 6h/day' },
    'bh-kwh':          { min:0,    max:80000, label:'Annual grid electricity',unit:'kWh/yr', hint:'Typical: 1,000–15,000 kWh/yr for electric submersible' },
    'bh-steel':        { min:0,    max:15000, label:'Steel casing',          unit:'kg', hint:'Typical: 400–4,000 kg for a 60–150m borehole' },
    'bh-tkm':          { min:0,    max:2000,  label:'Transport distance',    unit:'km', hint:'Nairobi to most counties: 100–900 km one-way' },
  },
  livestock: {
    'ls-dairy':   { min:0, max:50000,  label:'Dairy cattle',  unit:'heads', hint:'Kenya small farm: 2–20 heads. Commercial: up to 2,000' },
    'ls-beef':    { min:0, max:200000, label:'Beef cattle',   unit:'heads', hint:'Kenya pastoralist: 50–5,000. Ranch: up to 50,000' },
    'ls-goats':   { min:0, max:500000, label:'Goats',         unit:'heads', hint:'Household: 5–50. Commercial: up to 10,000' },
    'ls-feed':    { min:0, max:5000,   label:'Feed concentrate', unit:'t/yr', hint:'Typical dairy farm 100 cows: 50–200 t/yr concentrate' },
  },
  transport: {
    'tr-matatu':  { min:0, max:5000000, label:'Matatu diesel',  unit:'L', hint:'Per vehicle: 3,600–5,400 L/yr. 100 matatus: ~450,000 L' },
    'tr-heavy':   { min:0, max:8000000, label:'Truck diesel',   unit:'L', hint:'Per truck: 30,000–80,000 L/yr. 10 trucks: ~500,000 L' },
    'tr-hfc':     { min:0, max:500,     label:'HFC-134a leaked', unit:'kg/yr', hint:'Typical cold van: 0.5–5 kg/yr. Flag if >20 kg without fleet size explanation' },
    'tr-r404':    { min:0, max:500,     label:'R-404A leaked',   unit:'kg/yr', hint:'Industrial freezer system: 1–20 kg/yr' },
  },
  construct: {
    'con-cement':   { min:0, max:500000, label:'Cement',         unit:'t', hint:'Small building 500m²: ~80t. Large road 1km: ~300t' },
    'con-steel':    { min:0, max:100000, label:'Structural steel',unit:'t', hint:'Multi-storey building: 50–500t. Small structure: 5–50t' },
    'con-excav':    { min:0, max:20000,  label:'Excavator diesel',unit:'L/mo', hint:'Typical 20-tonne excavator: 800–2,500 L/day × days worked' },
  },
  manufact: {
    'mfg-diesel':  { min:0, max:5000000, label:'Annual diesel',   unit:'L', hint:'Small factory: 5,000–50,000 L/yr. Large: up to 500,000 L/yr' },
    'mfg-kwh':     { min:0, max:10000000,label:'Annual grid kWh', unit:'kWh', hint:'Small SME: 20,000–200,000 kWh/yr. Large factory: up to 2M kWh' },
    'mfg-hfc':     { min:0, max:1000,    label:'HFC-134a leaked', unit:'kg/yr', hint:'Cold store: 2–20 kg/yr. Flag if >50 kg without very large system' },
  },
};

// ── DATA SOURCE DECLARATIONS ──────────────────────────
const DATA_SOURCES = [
  { value:'',         label:'— Select data source —' },
  { value:'receipt',  label:'📄 Fuel/purchase receipt (verified)' },
  { value:'meter',    label:'⚡ Utility meter reading (verified)' },
  { value:'invoice',  label:'📋 Contractor invoice (verified)' },
  { value:'log',      label:'📒 Operational log / field record (verified)' },
  { value:'estimate', label:'📐 Engineering estimate (unverified)' },
  { value:'visual',   label:'👁️ Visual estimate (unverified)' },
];

// DQS = Data Quality Score (0-100)
function calcDQS(sources) {
  if (!sources || !sources.length) return 0;
  const weights = { receipt:100, meter:100, invoice:95, log:85, estimate:45, visual:20, '':0 };
  const total = sources.reduce((a, src) => a + (weights[src] || 0), 0);
  return Math.round(total / sources.length);
}
function dqsLabel(score) {
  if (score >= 90) return { grade:'Audit-Ready',  color:'#69F0AE', icon:'🔒' };
  if (score >= 70) return { grade:'Verified',      color:'#A5D6A7', icon:'✅' };
  if (score >= 45) return { grade:'Mixed Sources', color:'#FFD54F', icon:'⚠️' };
  return              { grade:'Unverified',     color:'#EF9A9A', icon:'🚩' };
}

// Validate a value against benchmark ranges — returns null or flag text
function validateBenchmark(sector, fieldId, value) {
  const bench = BENCHMARKS[sector]?.[fieldId];
  if (!bench || value === 0) return null;
  if (value > bench.max) return `⚠️ ${bench.label} (${value.toLocaleString()} ${bench.unit}) is above the typical maximum of ${bench.max.toLocaleString()} ${bench.unit}. ${bench.hint}`;
  return null;
}

// Collect source declarations from active panel
function collectSources(prefix, fields) {
  return fields.map(f => {
    const el = document.getElementById(`src-${prefix}-${f}`);
    return el ? el.value : '';
  });
}

// Render source declaration select for a field
function srcSelect(prefix, field) {
  return `<select id="src-${prefix}-${field}" class="src-select" onchange="updateDQSPreview('${prefix}')">
    ${DATA_SOURCES.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
  </select>`;
}

// Live DQS preview while user fills form
function updateDQSPreview(prefix) {
  const allSels = document.querySelectorAll(`[id^="src-${prefix}-"]`);
  if (!allSels.length) return;
  const vals = Array.from(allSels).map(s => s.value).filter(v => v);
  if (!vals.length) return;
  const score = calcDQS(vals);
  const info  = dqsLabel(score);
  const el = document.getElementById(`dqs-preview-${prefix}`);
  if (el) el.innerHTML = `${info.icon} Data Quality Preview: <b style="color:${info.color}">${score}/100 — ${info.grade}</b>`;
}

// ── ONBOARDING ────────────────────────────────────────
const OB = [
  { icon:'👋', title:'Welcome to Netzerra!', body:'Kenya\'s carbon intelligence platform — built for KNCR compliance, county governments, and community protection. Let\'s get you oriented in 30 seconds.' },
  { icon:'⚡', title:'Start with a Calculation', body:'Pick a sector: Borehole, Livestock, Transport, Construction, or Manufacturing. Enter your activity data and get an IPCC AR6-compliant result instantly.' },
  { icon:'🏢', title:'County Dashboard (New!)', body:'<strong style="color:var(--mint)">Dedicated to county officers.</strong> See all carbon projects, community benefit fund tracking, FLLoCA compliance status, and carbon levy revenue — by ward.' },
  { icon:'🏛️', title:'KNCR Gateway', body:"Kenya's National Carbon Registry launched February 2026. The KNCR Gateway helps you register projects, generate DNA submission packages, and calculate your 25% community benefit obligations." },
  { icon:'📄', title:'True PDF Reports', body:'Every calculation generates a real ISO 14064-1:2018 aligned PDF — formatted for county government reporting, NEMA submissions, and VCM verification bodies. Click "Download PDF" after any calculation.' }
];
let obStep = 0;

function renderOnboarding() {
  const d = OB[obStep];
  document.getElementById('ob-steps').innerHTML =
    OB.map((_,i) => `<div class="ob-step ${i<obStep?'done':i===obStep?'active':''}"></div>`).join('');
  const last = obStep === OB.length - 1;
  document.getElementById('ob-content').innerHTML = `
    <div class="ob-icon">${d.icon}</div>
    <div class="ob-title">${d.title}</div>
    <div class="ob-body">${d.body}</div>
    <div class="ob-actions">
      <span class="ob-skip" onclick="closeOnboarding()">Skip tour</span>
      <button class="ob-next" onclick="${last?'closeOnboarding()':'obNext()'}">${last?'Get Started 🚀':'Next →'}</button>
    </div>`;
}
function obNext() { obStep = Math.min(obStep + 1, OB.length - 1); renderOnboarding(); }
function closeOnboarding() { document.getElementById('onboarding-overlay').classList.remove('open'); }

// ── PROFILE & ACCOUNT ─────────────────────────────────
function switchProfileTab(tab) {
  document.getElementById('ptab-details').classList.toggle('active', tab === 'details');
  document.getElementById('ptab-account').classList.toggle('active', tab === 'account');
  document.getElementById('ppanel-details').style.display  = tab === 'details' ? '' : 'none';
  document.getElementById('ppanel-account').style.display  = tab === 'account' ? '' : 'none';
}

function switchAccountTab(tab) {
  document.querySelectorAll('#ppanel-account .auth-tab').forEach((el, i) =>
    el.classList.toggle('active', (i===0 && tab==='signin') || (i===1 && tab==='create')));
  document.getElementById('acc-signin').style.display  = tab === 'signin' ? '' : 'none';
  document.getElementById('acc-create').style.display  = tab === 'create' ? '' : 'none';
}

function accountSignIn() {
  const e = document.getElementById('acc-email').value.trim();
  const p = document.getElementById('acc-pw').value;
  if (!e || !p) { toast('Enter email and password.', 'error'); return; }
  S.user.email = e;
  updateSidebar();
  closeModal('modal-profile');
  toast('✅ Signed in as ' + e, 'success');
}

function accountCreate() {
  const n  = document.getElementById('acc-name').value.trim();
  const e  = document.getElementById('acc-email2').value.trim();
  const ph = document.getElementById('acc-phone').value.trim();
  const o  = document.getElementById('acc-org').value;
  const pw = document.getElementById('acc-pw2').value;
  if (!n || !e || !ph || !pw) { toast('Please fill all fields.', 'error'); return; }
  Object.assign(S.user, { name: n, email: e, phone: ph, org: o });
  updateSidebar();
  closeModal('modal-profile');
  toast('✅ Account created! Welcome, ' + n.split(' ')[0] + ' 🌿', 'success');
}

function saveProfile() {
  const n = document.getElementById('prof-name').value.trim();
  const o = document.getElementById('prof-org').value.trim();
  const e = document.getElementById('prof-email').value.trim();
  const p = document.getElementById('prof-phone').value.trim();
  if (n) S.user.name  = n;
  if (o) S.user.org   = o;
  if (e) S.user.email = e;
  if (p) S.user.phone = p;
  updateSidebar();
  closeModal('modal-profile');
  toast('✅ Profile updated!', 'success');
  saveToStorage();
}

function openProfileModal() {
  document.getElementById('prof-name').value  = S.user.name;
  document.getElementById('prof-org').value   = S.user.org;
  document.getElementById('prof-email').value = S.user.email;
  document.getElementById('prof-phone').value = S.user.phone;
  switchProfileTab('details');
  openModal('modal-profile');
}

function updateSidebar() {
  const ini = S.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('sb-avatar').textContent   = ini;
  document.getElementById('sb-name').textContent     = S.user.name;
  document.getElementById('sb-plan').textContent     = '🏔️ ' + S.user.plan;
  document.getElementById('sb-score').textContent    = S.user.score;
  document.getElementById('pp-name').textContent     = S.user.name;
  document.getElementById('pp-org').textContent      = S.user.org + ' · Carbon Intelligence';
  document.getElementById('pp-total').textContent    = S.user.totalEmissions.toLocaleString();
  document.getElementById('pp-score').textContent    = S.user.score;
  document.getElementById('pp-projects').textContent = S.user.projects;
}

// ── NAVIGATION ────────────────────────────────────────
const LABELS = {
  home:'Home', dashboard:'Dashboard', calculator:'Emission Calculator',
  county:'County Dashboard', leaderboard:'Leaderboard', community:'Community Feed',
  passport:'Carbon Passport', offsets:'Offset Strategies', methodology:'Methodology',
  docs:'Documentation Hub', marketplace:'Marketplace', membership:'Membership Plans',
  education:'Education Centre', about:'About & Founder', kncr:'KNCR Gateway',
  disclaimer:'Disclaimer & Legal'
};

function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const sec = document.getElementById(id + '-section');
  if (sec) sec.classList.add('active');
  // highlight active nav item
  document.querySelectorAll('.nav-item').forEach(n => {
    const oc = n.getAttribute('onclick') || '';
    if (oc.includes("'" + id + "'")) n.classList.add('active');
  });
  document.getElementById('breadcrumb').innerHTML = '<b>' + (LABELS[id] || id) + '</b>';
  window.scrollTo(0, 0);
  if (id === 'leaderboard' && !S.charts.county) initLeaderboardCharts();
  if (id === 'kncr') { renderKNCRPipeline(); renderKNCRProjects(); }
  if (id === 'county' && document.getElementById('county-select').value) loadCountyData();
}

function toggleSidebar() {
  const sb   = document.getElementById('sidebar');
  const main = document.getElementById('main');
  const ft   = document.getElementById('site-footer');
  if (window.innerWidth <= 768) {
    sb.classList.toggle('open');
  } else {
    sb.classList.toggle('collapsed');
    main.classList.toggle('full');
    if (ft) ft.classList.toggle('full');
  }
}

function openCalcTab(t) { showSection('calculator'); setTimeout(() => switchCalcTab(t), 80); }
function switchCalcTab(t) {
  ['borehole','livestock','transport','construct','manufact'].forEach(s => {
    document.getElementById('tab-' + s).classList.toggle('active', s === t);
    document.getElementById('panel-' + s).classList.toggle('active', s === t);
  });
}
function setBottomActive(el) {
  document.querySelectorAll('.bnav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
}
// Close sidebar on outside click (mobile)
document.addEventListener('click', e => {
  const sb = document.getElementById('sidebar');
  if (window.innerWidth <= 768 && sb &&
      sb.classList.contains('open') &&
      !sb.contains(e.target) &&
      !e.target.closest('.hamburger')) {
    sb.classList.remove('open');
  }
});

// ── HELPERS ───────────────────────────────────────────
function v(id) { return parseFloat(document.getElementById(id).value) || 0; }
function t(id) { return document.getElementById(id).value || ''; }

// ── NTZ SCORE ─────────────────────────────────────────
function calcNTZScore(total_t, sector) {
  const bench         = EF.sectorBenchmarks[sector] || 100;
  const intensityScore = 40 * Math.max(0, 1 - total_t / bench);
  const offsetRatio   = S.user.totalOffsets / Math.max(S.user.totalEmissions, 1);
  const offsetScore   = 30 * Math.min(1, offsetRatio);
  const reductionScore = S.user.projects > 1 ? 18 : 10;
  const engScore      = 10 * Math.min(1, S.user.projects / 10);
  return Math.round(intensityScore + offsetScore + reductionScore + engScore);
}
function gradeFromScore(s) {
  if (s >= 85) return 'A+ · Climate Leader 🌟';
  if (s >= 70) return 'A · Climate Positive 🌿';
  if (s >= 55) return 'B · Improving 📈';
  if (s >= 40) return 'C · Needs Attention ⚠️';
  return 'D · High Emitter 🔴';
}

// ── RESULTS DISPLAY ───────────────────────────────────
function showResults(name, sector, total_t, s1_t, s2_t, s3_t, breakdown, offsets, flags, sources) {
  const dqs     = calcDQS(sources || []);
  const dqsInfo = dqsLabel(dqs);

  S.lastCalc = {
    name, sector, total_t, s1_t, s2_t, s3_t,
    date: new Date().toISOString().split('T')[0],
    dqs, dqsGrade: dqsInfo.grade,
    flags: flags || [],
    sources: sources || [],
    ref: 'NTZ-' + Date.now(),
    uncertainty: calcUncertainty(total_t, sector),
    gwp: ACTIVE_GWP,
  };
  S.user.totalEmissions = Math.round(S.user.totalEmissions + total_t);
  S.user.projects++;
  const gs = calcNTZScore(total_t, sector);
  S.user.score = Math.round((S.user.score * (S.user.projects - 1) + gs) / S.user.projects);

  document.getElementById('res-empty').style.display = 'none';
  document.getElementById('res-content').style.display = 'block';
  document.getElementById('res-total').textContent = total_t.toFixed(2);
  document.getElementById('res-s1').textContent = s1_t.toFixed(2) + ' t';
  document.getElementById('res-s2').textContent = s2_t.toFixed(2) + ' t';
  document.getElementById('res-s3').textContent = s3_t.toFixed(2) + ' t';
  document.getElementById('res-score').textContent = gs;
  document.getElementById('res-grade').textContent  = gradeFromScore(gs);
  document.getElementById('res-breakdown').innerHTML = breakdown;
  document.getElementById('res-offsets').innerHTML   = offsets;

  const mx = Math.max(s1_t, s2_t, s3_t, 0.001);
  document.getElementById('res-s1-bar').style.width = (s1_t / mx * 100) + '%';
  document.getElementById('res-s2-bar').style.width = (s2_t / mx * 100) + '%';
  document.getElementById('res-s3-bar').style.width = (s3_t / mx * 100) + '%';

  // ── Uncertainty ──
  const unc = calcUncertainty(total_t, sector);
  document.getElementById('res-uncertainty').style.display = 'block';
  document.getElementById('res-unc-range').textContent =
    `${unc.low} – ${unc.high} tCO₂e/yr`;
  document.getElementById('res-unc-pct').textContent  = `±${unc.pct}%`;
  document.getElementById('res-unc-basis').textContent = unc.basis;

  // ── GWP version badge ──
  document.getElementById('res-gwp-tag').textContent =
    `${ACTIVE_GWP} · CH₄=${EF.gwpCH4} · N₂O=${EF.gwpN2O}`;

  // ── DQS Box ──
  document.getElementById('res-dqs-score').textContent = dqs;
  document.getElementById('res-dqs-grade').textContent = `${dqsInfo.icon} ${dqsInfo.grade}`;
  document.getElementById('res-dqs-score').style.color = dqsInfo.color;
  document.getElementById('res-dqs-box').style.borderColor = dqsInfo.color + '55';

  // ── Flags ──
  const flagEl = document.getElementById('res-flags');
  if (flags && flags.length) {
    flagEl.style.display = 'block';
    flagEl.innerHTML = flags.map(f =>
      `<div class="flag-item">🚩 ${f}</div>`
    ).join('');
  } else {
    flagEl.style.display = 'none';
    flagEl.innerHTML = '';
  }

  // ── Source audit trail ──
  const srcEl = document.getElementById('res-sources');
  if (sources && sources.filter(Boolean).length) {
    const srcMap = { receipt:'📄 Receipt', meter:'⚡ Meter', invoice:'📋 Invoice', log:'📒 Log', estimate:'📐 Estimate', visual:'👁️ Visual' };
    const unique = [...new Set(sources.filter(Boolean))];
    srcEl.style.display = 'block';
    srcEl.innerHTML = `<span style="font-size:.64rem;color:rgba(255,255,255,.38);display:block;margin-bottom:3px">Data sources declared:</span>` +
      unique.map(s => `<span class="src-chip-res">${srcMap[s]||s}</span>`).join(' ');
  } else {
    srcEl.style.display = 'none';
  }

  document.getElementById('sb-score').textContent  = S.user.score;
  document.getElementById('kpi-total').textContent = S.user.totalEmissions.toLocaleString();
  document.getElementById('kpi-score').textContent = S.user.score;

  // Benchmark, save, and share URL update
  postCalcHooks();

  const flagNote = (flags && flags.length) ? ` — ${flags.length} plausibility flag${flags.length>1?'s':''}` : '';
  toast(`✅ ${total_t.toFixed(2)} tCO₂e/yr — ${name}${flagNote}`, flags?.length ? 'info' : 'success');
}

// ── BOREHOLE AUTOFILL FROM DEPTH ─────────────────────
// Drilling fuel rates (L/m) by rock formation — Kenya drilling contractor data
const BH_DRILL_RATES = { soft:8, medium:15, hard:22, veryhard:30 };
// Casing weight (kg/m) by diameter
const BH_CASING_KG = { '4':6.5, '6':10, '8':15, '10':22 };
// Rising main weight (kg/m) by casing diameter (HDPE pipe)
const BH_PIPE_KG   = { '4':0.7, '6':1.2, '8':1.8, '10':2.6 };
// Grout (kg/m) by diameter — annular volume × 1,500 kg/m³
const BH_GROUT_KG  = { '4':12, '6':20, '8':32, '10':48 };
// Pump power (kW) estimate:  P = (Q_m3hr × depth_m × 9810) / (3,600,000 × 0.60)
// simplified: P ≈ Q × depth / 220
// Daily kWh = power × hours; Annual kWh = daily × 365

function autofillBorehole() {
  const depth  = parseFloat(document.getElementById('bh-depth')?.value) || 0;
  const diam   = document.getElementById('bh-diameter')?.value || '6';
  const rock   = document.getElementById('bh-rock')?.value || 'medium';
  const ptype  = document.getElementById('bh-pump-type')?.value || 'electric';
  const yield_ = parseFloat(document.getElementById('bh-yield')?.value) || 5;
  const hours  = parseFloat(document.getElementById('bh-hours')?.value) || 12;

  if (!depth || depth <= 0) return;

  // 1. Drilling diesel
  const drillLitres = Math.round(depth * BH_DRILL_RATES[rock]);
  setAutoField('bh-diesel-drill', drillLitres);
  setHint('bh-drill-hint', `Auto: ${depth}m × ${BH_DRILL_RATES[rock]} L/m (${rock} rock) = ${drillLitres.toLocaleString()} L`);

  // 2. Pump type → diesel or electric
  if (ptype === 'diesel') {
    // Estimate diesel pump consumption: ~0.3 L/kWh equivalent
    const pumpKW    = (yield_ * depth) / 220;
    const annualL   = Math.round(pumpKW * hours * 365 * 0.28);  // ~0.28 L/kWh diesel engine
    setAutoField('bh-diesel-pump', annualL);
    setAutoField('bh-kwh', 0);
    setAutoField('bh-solar', 0);
    setHint('bh-pump-hint', `Auto: ${pumpKW.toFixed(1)} kW pump × ${hours}h/day × 365 × 0.28 L/kWh ≈ ${annualL.toLocaleString()} L/yr`);
    setHint('bh-kwh-hint', `0 kWh/yr — diesel pump selected`);
    setHint('bh-solar-hint', `N/A — diesel pump`);
  } else if (ptype === 'solar') {
    setAutoField('bh-diesel-pump', 0);
    setAutoField('bh-solar', 100);
    const pumpKW  = (yield_ * depth) / 220;
    const annualKWh = Math.round(pumpKW * hours * 365);
    setAutoField('bh-kwh', annualKWh);
    setHint('bh-pump-hint', `0 L/yr — solar pump, zero diesel`);
    setHint('bh-kwh-hint', `Auto: ${pumpKW.toFixed(2)} kW × ${hours}h/day × 365 = ${annualKWh.toLocaleString()} kWh/yr (100% solar)`);
    setHint('bh-solar-hint', `100% — solar pump selected`);
  } else if (ptype === 'hybrid') {
    setAutoField('bh-diesel-pump', Math.round((yield_ * depth) / 220 * hours * 365 * 0.28 * 0.15)); // 15% backup
    setAutoField('bh-solar', 85);
    const pumpKW = (yield_ * depth) / 220;
    setAutoField('bh-kwh', Math.round(pumpKW * hours * 365));
    setHint('bh-pump-hint', `Auto: ~15% diesel backup hours estimated`);
    setHint('bh-solar-hint', `85% solar (hybrid)`);
  } else {
    // Electric
    setAutoField('bh-diesel-pump', 0);
    setAutoField('bh-solar', 0);
    const pumpKW    = (yield_ * depth) / 220;
    const annualKWh = Math.round(pumpKW * hours * 365);
    setAutoField('bh-kwh', annualKWh);
    setHint('bh-pump-hint', `0 L/yr — electric pump`);
    setHint('bh-kwh-hint', `Auto: ${pumpKW.toFixed(2)} kW × ${hours}h/day × 365 = ${annualKWh.toLocaleString()} kWh/yr (Kenya grid)`);
    setHint('bh-solar-hint', `0% solar — pure grid electric`);
  }

  // 3. Materials from depth + diameter
  const steelKg  = Math.round(depth * BH_CASING_KG[diam]);
  const pvcKg    = Math.round(depth * BH_PIPE_KG[diam]);
  const cementKg = Math.round(depth * BH_GROUT_KG[diam]);
  setAutoField('bh-steel',  steelKg);
  setAutoField('bh-pvc',    pvcKg);
  setAutoField('bh-cement', cementKg);
  setHint('bh-steel-hint',  `Auto: ${depth}m × ${BH_CASING_KG[diam]} kg/m (${diam}-inch casing) = ${steelKg.toLocaleString()} kg`);
  setHint('bh-pvc-hint',    `Auto: ${depth}m × ${BH_PIPE_KG[diam]} kg/m HDPE rising main = ${pvcKg.toLocaleString()} kg`);
  setHint('bh-cement-hint', `Auto: ${depth}m × ${BH_GROUT_KG[diam]} kg/m annular grout = ${cementKg.toLocaleString()} kg`);

  // 4. Update callout summary
  const pumpKW = (yield_ * depth) / 220;
  const el = document.getElementById('bh-auto-callout');
  if (el) el.innerHTML =
    `✅ <b>${depth}m ${diam}-inch ${rock} rock</b> · Drill: ${drillLitres.toLocaleString()} L · ` +
    `Pump: ${pumpKW.toFixed(2)} kW · Casing: ${steelKg.toLocaleString()} kg steel · ` +
    `Grout: ${cementKg.toLocaleString()} kg · <em>All values editable below</em>`;
}

function setAutoField(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function setHint(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ── CALCULATORS ───────────────────────────────────────
function calcBorehole() {
  const lt = v('bh-lifetime') || 20;
  const sp = v('bh-solar') / 100;
  const s1_kg = (v('bh-diesel-drill') * EF.diesel / lt) +
                (v('bh-diesel-pump')  * EF.diesel) +
                (v('bh-diesel-gen')   * EF.diesel);
  const s2_kg = v('bh-kwh') * EF.kplc * (1 - sp);
  const s3_mat = (v('bh-steel') * EF.steel * 1000 + v('bh-pvc') * EF.pvc * 1000 + v('bh-cement') * EF.cement * 1000) / lt;
  const s3_trn = v('bh-tkm') * 5 * EF.truckKm / lt;
  const [s1, s2, s3] = [s1_kg / 1000, s2_kg / 1000, (s3_mat + s3_trn) / 1000];
  const tt = s1 + s2 + s3;
  const flags = ['bh-diesel-drill','bh-diesel-pump','bh-kwh','bh-steel','bh-tkm']
    .map(f => validateBenchmark('borehole', f, v(f))).filter(Boolean);
  const sources = collectSources('bh', ['diesel-drill','diesel-pump','kwh','steel']);
  showResults(t('bh-name') || 'Borehole', 'borehole', tt, s1, s2, s3,
    `<b style="color:var(--mint)">Breakdown:</b><br>Diesel drill (amort): ${(v('bh-diesel-drill')*EF.diesel/lt/1000).toFixed(3)} t<br>Diesel pump: ${(v('bh-diesel-pump')*EF.diesel/1000).toFixed(3)} t<br>Grid elec: ${s2.toFixed(3)} t<br>Casing materials: ${(s3_mat/1000).toFixed(3)} t`,
    `🌳 <b>Offset ${tt.toFixed(1)} tCO₂e/yr:</b><br>Plant ${Math.ceil(tt/17*10000)} m² bamboo (17 tCO₂e/ha/yr)<br>Or ${Math.ceil(tt/3.5)} biogas digesters<br>Or replace diesel pump with solar`,
    flags, sources);
}

function calcLivestock() {
  const sys = t('ls-manure');
  const ef3 = sys === 'biogas' ? 0.001 : EF.ef3pasture;
  const heads = {
    dairy: v('ls-dairy'), beef:  v('ls-beef'), goat:   v('ls-goats'),
    sheep: v('ls-sheep'), camel: v('ls-camels'), pig:  v('ls-pigs'),
    donkey: v('ls-donkeys'), poultry: v('ls-poultry') * 100
  };
  let ee = 0, em = 0, en = 0;
  Object.entries(heads).forEach(([sp, n]) => {
    const [ent, man, nex] = EF.livestock[sp];
    ee += n * ent * EF.gwpCH4;
    em += n * man * EF.gwpCH4;
    en += n * nex * ef3 * (44/28) * EF.gwpN2O;
  });
  const s1 = (ee + em + en) / 1000;
  const s2 = v('ls-kwh') * EF.kplc / 1000;
  const s3 = v('ls-feed') * 1000 * EF.feedConc / 1000;
  const tt = s1 + s2 + s3;
  const totalH = Object.values(heads).reduce((a, b) => a + b, 0);
  const flags = ['ls-dairy','ls-beef','ls-goats','ls-feed']
    .map(f => validateBenchmark('livestock', f, v(f))).filter(Boolean);
  const sources = collectSources('ls', ['dairy','beef','goats','feed','kwh']);
  showResults(t('ls-name') || 'Livestock', 'livestock', tt, s1, s2, s3,
    `<b style="color:var(--mint)">Breakdown:</b><br>Enteric CH₄: ${(ee/1000).toFixed(2)} t<br>Manure CH₄: ${(em/1000).toFixed(2)} t<br>Manure N₂O: ${(en/1000).toFixed(2)} t<br>Feed S3: ${s3.toFixed(2)} t<br>Intensity: ${totalH>0?(tt*1000/totalH).toFixed(1):0} kgCO₂e/head`,
    `🐄 <b>Offset ${tt.toFixed(1)} tCO₂e/yr:</b><br>Install ${Math.ceil(s1/3.5)} biogas digesters<br>Silvopastoral trees: Grevillea 6 tCO₂e/ha/yr<br>Improved pasture → cut feed concentrate`,
    flags, sources);
}

function calcTransport() {
  const s1_kg = (v('tr-heavy') + v('tr-matatu') + v('tr-bus') + v('tr-light')) * EF.diesel +
                (v('tr-moto') + v('tr-car')) * EF.petrol;
  const s3_kg = v('tr-hfc') * EF.gwpHFC134a + v('tr-r404') * EF.gwpR404A;
  const [s1, s3] = [s1_kg / 1000, s3_kg / 1000];
  const tt = s1 + s3;
  const nv = v('tr-vehicles') || 1;
  const flags = ['tr-matatu','tr-heavy','tr-hfc','tr-r404']
    .map(f => validateBenchmark('transport', f, v(f))).filter(Boolean);
  const sources = collectSources('tr', ['heavy','matatu','moto','hfc']);
  showResults(t('tr-name') || 'Fleet', 'transport', tt, s1, 0, s3,
    `<b style="color:var(--mint)">Breakdown:</b><br>Diesel fleet: ${s1.toFixed(3)} t<br>Refrigerants: ${s3.toFixed(3)} t<br>Per vehicle: ${(tt/nv).toFixed(2)} tCO₂e/yr`,
    `🚌 <b>Cut ${tt.toFixed(1)} tCO₂e/yr:</b><br>Convert matatus to CNG (−25%)<br>Fix refrigerant leaks immediately<br>Route optimise — reduce dead km 15%`,
    flags, sources);
}

function calcConstruction() {
  const mo = v('con-months') || 12;
  const s3_kg = v('con-cement') * 830 + v('con-concrete') * 159 +
                v('con-steel') * 1850 + v('con-rebar') * 1990 +
                v('con-asphalt') * 45 + v('con-timber') * 720;
  const s1_kg = (v('con-excav') + v('con-gen')) * mo * EF.diesel + v('con-tkm') * EF.truckKm;
  const s2_kg = v('con-kwh') * mo * EF.kplc;
  const [s1, s2, s3] = [s1_kg / 1000, s2_kg / 1000, s3_kg / 1000];
  const tt = s1 + s2 + s3;

  // Leakage — land clearing
  const lkType = document.getElementById('con-land-type')?.value || '';
  const lkHa   = v('con-land-ha');
  const lk     = calcLeakage(lkType, lkHa);
  const lkNote = lk
    ? `<br>⚠️ <b>Leakage (land clearing):</b> ${lk.total.toFixed(1)} tCO₂e<br><span style="font-size:.7rem;opacity:.7">${lk.label} · ${lk.perHa} tCO₂e/ha · IPCC 2006 Vol.4 Table 4.7</span>`
    : `<br><span style="font-size:.7rem;opacity:.5">No land-clearing leakage declared — set below if applicable</span>`;

  const flags = ['con-cement','con-steel','con-excav']
    .map(f => validateBenchmark('construct', f, v(f))).filter(Boolean);
  const sources = collectSources('con', ['cement','steel','excav','kwh']);
  showResults(t('con-name') || 'Construction', 'construct', tt + (lk ? lk.total : 0), s1, s2, s3,
    `<b style="color:var(--mint)">Breakdown:</b><br>Embodied materials: ${s3.toFixed(2)} t<br>Site machinery: ${s1.toFixed(2)} t<br>Site electricity: ${s2.toFixed(3)} t${lkNote}`,
    `🏗️ <b>Reduce ${tt.toFixed(1)} tCO₂e:</b><br>Switch OPC → PLC cement (−13%)<br>Use recycled EAF steel (−77%)<br>Plant ${Math.ceil(tt/17)} ha bamboo`,
    flags, sources);
}

function calcManufacturing() {
  const s1_kg = v('mfg-diesel') * EF.diesel + v('mfg-hfo') * EF.hfo +
                v('mfg-lpg') * EF.lpg + v('mfg-pco2') * 1000;
  const s2_kg = Math.max(0, v('mfg-kwh') - v('mfg-solar')) * EF.kplc;
  const s3_kg = v('mfg-hfc') * EF.gwpHFC134a + v('mfg-r404') * EF.gwpR404A +
                v('mfg-ww') * 25 + v('mfg-waste') * 580;
  const [s1, s2, s3] = [s1_kg / 1000, s2_kg / 1000, s3_kg / 1000];
  const tt = s1 + s2 + s3;
  const out = v('mfg-output') || 1;
  const flags = ['mfg-diesel','mfg-kwh','mfg-hfc']
    .map(f => validateBenchmark('manufact', f, v(f))).filter(Boolean);
  const sources = collectSources('mf', ['diesel','kwh','hfc','waste']);
  showResults(t('mfg-name') || 'Facility', 'manufact', tt, s1, s2, s3,
    `<b style="color:var(--mint)">Breakdown:</b><br>Combustion (S1): ${s1.toFixed(2)} t<br>Electricity (S2): ${s2.toFixed(2)} t<br>Refrigerants+waste: ${s3.toFixed(2)} t<br>Intensity: ${(tt*1000/out).toFixed(1)} kgCO₂e/t`,
    `🏭 <b>Reduce ${tt.toFixed(1)} tCO₂e/yr:</b><br>Rooftop solar → Scope 2 −40–80%<br>Fix refrigerant leaks today<br>Plant ${Math.ceil(tt/8)} ha Casuarina`,
    flags, sources);
}

// ── PDF REPORT ────────────────────────────────────────
// Strategy: open report in new tab then auto-print (Save as PDF).
// This is 100% reliable on all browsers and GitHub Pages — no html2canvas blank-page issues.
async function generateAndDownloadPDF() {
  const c = S.lastCalc;
  if (!c) { toast('Run a calculation first!', 'error'); return; }

  const gs      = calcNTZScore(c.total_t, c.sector);
  const now     = new Date().toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' });
  const ref     = c.ref || ('NTZ-' + Date.now());
  const dqsInfo = dqsLabel(c.dqs || 0);
  const u       = calcUncertainty(c.total_t, c.sector);

  const html = buildReportHTML(c, gs, now, ref, dqsInfo, u, true /* auto-print */);

  const win = window.open('', '_blank');
  if (!win) {
    toast('Pop-up blocked — use the Print button instead', 'error');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  toast('📄 Report opened — choose "Save as PDF" in the print dialog', 'success');
}

// Print-only version (no auto-print trigger)
function printReport() {
  const c = S.lastCalc;
  if (!c) { toast('Run a calculation first!', 'error'); return; }

  const gs      = calcNTZScore(c.total_t, c.sector);
  const now     = new Date().toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' });
  const ref     = c.ref || ('NTZ-' + Date.now());
  const dqsInfo = dqsLabel(c.dqs || 0);
  const u       = calcUncertainty(c.total_t, c.sector);

  const html = buildReportHTML(c, gs, now, ref, dqsInfo, u, false /* manual print */);

  const win = window.open('', '_blank');
  if (!win) { toast('Pop-up blocked — please allow pop-ups for this site', 'error'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

// ── SHARED REPORT HTML BUILDER ────────────────────────
function buildReportHTML(c, gs, now, ref, dqsInfo, u, autoPrint) {
  const grade = gradeFromScore(gs).split('·')[0].trim();
  const flagsHTML = c.flags && c.flags.length
    ? `<div class="box-warn">
         <div class="box-title">⚠ Plausibility Flags (${c.flags.length}) — Auditor Review Required</div>
         ${c.flags.map(f => `<div class="flag-row">• ${f}</div>`).join('')}
       </div>`
    : `<div class="box-ok">✓ No plausibility flags — all values within expected benchmark ranges.</div>`;

  const sourcesHTML = c.sources && c.sources.filter(Boolean).length
    ? `Sources declared: <strong>${[...new Set(c.sources.filter(Boolean))].join(', ')}</strong>`
    : `<span style="color:#B71C1C">No data sources declared — attach supporting documents before formal submission.</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Netzerra Report — ${c.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #1A3A2A;
    background: #fff;
    padding: 28px 32px;
    max-width: 780px;
    margin: 0 auto;
    line-height: 1.5;
  }

  /* Header */
  .hdr { background:#0D3320; color:#fff; padding:20px 24px; border-radius:8px; margin-bottom:16px; }
  .hdr-brand { font-size:20px; font-weight:800; margin-bottom:2px; }
  .hdr-sub   { font-size:8px; letter-spacing:1.5px; text-transform:uppercase; color:#9DC9A8; margin-bottom:10px; }
  .hdr-title { font-size:16px; font-weight:700; margin-bottom:5px; }
  .hdr-meta  { font-size:10px; color:#9DC9A8; }

  /* KPI row */
  .kpi-row { display:flex; gap:8px; margin-bottom:12px; }
  .kpi {
    flex:1; border-radius:5px; padding:10px 8px; text-align:center;
    border:1px solid #C5E1A5; background:#F1F8E9;
  }
  .kpi-bad { border-color:#FFCDD2; background:#FFEBEE; }
  .kpi-val { font-size:15px; font-weight:700; color:#1B5E20; }
  .kpi-bad .kpi-val { color:#B71C1C; }
  .kpi-lbl { font-size:7.5px; text-transform:uppercase; color:#558B2F; margin-top:2px; }
  .kpi-bad .kpi-lbl { color:#C62828; }

  /* Section headings */
  .sec-h { font-size:12px; font-weight:700; color:#1B5E20; border-bottom:2px solid #E8F5E9; padding-bottom:3px; margin:12px 0 7px; }

  /* Boxes */
  .box-ok   { background:#E8F5E9; border:1px solid #A5D6A7; border-radius:5px; padding:7px 12px; margin-bottom:10px; font-size:10px; color:#2E7D32; }
  .box-warn { background:#FFF3E0; border-left:4px solid #FF6D00; padding:9px 13px; margin-bottom:10px; border-radius:0 5px 5px 0; }
  .box-title { font-weight:700; color:#E65100; font-size:11px; margin-bottom:4px; }
  .flag-row  { font-size:9.5px; color:#BF360C; padding:1px 0; }
  .box-blue  { background:#E3F2FD; border:1px solid #BBDEFB; border-radius:4px; padding:7px 11px; margin-bottom:10px; font-size:10px; color:#1565C0; }
  .box-dq    { background:#F3F9FF; border:1px solid #BBDEFB; border-radius:4px; padding:8px 11px; margin-bottom:10px; font-size:10px; }
  .box-dq-t  { font-weight:700; color:#1565C0; margin-bottom:3px; }
  .box-dq-s  { font-size:8.5px; color:#607D8B; margin-top:3px; }
  .box-disc  { background:#E3F2FD; border-left:4px solid #1565C0; border-radius:0 5px 5px 0; padding:9px 13px; font-size:9px; color:#0D47A1; margin-bottom:8px; }
  .box-mvp   { font-size:7.5px; color:#BDBDBD; margin-top:5px; padding-top:4px; border-top:1px solid #F5F5F5; }

  /* Tables */
  table { width:100%; border-collapse:collapse; }
  .tbl-scope th { background:#1B5E20; color:#fff; padding:5px 8px; text-align:left; font-weight:600; }
  .tbl-scope td { padding:5px 8px; border-bottom:1px solid #E8F5E9; color:#333; }
  .tbl-scope .alt { background:#F9FBF7; }
  .tbl-scope .tot { background:#E8F5E9; font-weight:700; color:#1B5E20; }
  .tbl-scope .src { font-size:9px; color:#607D8B; }
  .tbl-off th { background:#F1F8E9; color:#1B5E20; padding:5px 8px; text-align:left; font-weight:600; border-bottom:1px solid #C5E1A5; }
  .tbl-off td { padding:5px 8px; border-bottom:1px solid #E8F5E9; color:#333; }
  .tbl-off .alt { background:#F9FBF7; }
  .tbl-sum td { padding:3px 0; font-size:10.5px; }
  .tbl-sum .lbl { color:#607D8B; font-weight:600; width:20%; }
  .foot { border-top:1px solid #E8F5E9; padding-top:6px; margin-top:8px; display:flex; justify-content:space-between; font-size:8px; color:#90A4AE; }

  @media print {
    body { padding:16px 20px; }
    @page { margin:1.2cm; size:A4; }
    .no-print { display:none !important; }
  }
</style>
</head>
<body>

<!-- PRINT BUTTON — hidden when printing -->
<div class="no-print" style="text-align:right;margin-bottom:14px">
  <button onclick="window.print()"
    style="background:#1B5E20;color:#fff;border:none;padding:9px 22px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:700">
    ⬇ Save as PDF / Print
  </button>
  <span style="font-size:10px;color:#607D8B;margin-left:10px">In print dialog → Destination → Save as PDF</span>
</div>

<!-- HEADER -->
<div class="hdr">
  <div class="hdr-brand">Netzerra</div>
  <div class="hdr-sub">Kenya Carbon Intelligence Platform &middot; MVP v1.0</div>
  <div class="hdr-title">Greenhouse Gas Emission Report</div>
  <div class="hdr-meta">${S.user.name} &middot; ${S.user.org} &middot; ${now} &middot; Ref: ${ref}</div>
</div>

<!-- KPI ROW -->
<div class="kpi-row">
  <div class="kpi">
    <div class="kpi-val">${c.total_t.toFixed(2)}</div>
    <div class="kpi-lbl">tCO2e / year</div>
  </div>
  <div class="kpi">
    <div class="kpi-val">${gs}/100</div>
    <div class="kpi-lbl">NTZ Score</div>
  </div>
  <div class="kpi">
    <div class="kpi-val">${grade}</div>
    <div class="kpi-lbl">Grade</div>
  </div>
  <div class="kpi ${c.dqs>=70 ? '' : 'kpi-bad'}">
    <div class="kpi-val">${c.dqs||0}/100</div>
    <div class="kpi-lbl">Data Quality</div>
  </div>
</div>

${flagsHTML}

<!-- PROJECT SUMMARY -->
<div class="sec-h">Project Summary</div>
<table class="tbl-sum">
  <tr>
    <td class="lbl">Project</td><td>${c.name}</td>
    <td class="lbl">Sector</td><td>${c.sector}</td>
    <td class="lbl">Date</td><td>${c.date}</td>
  </tr>
</table>

<!-- METHODOLOGY -->
<div class="sec-h">Methodology &amp; GWP Version</div>
<p style="font-size:10.5px;color:#333;line-height:1.7;margin-bottom:6px">
  IPCC 2006 Guidelines + <strong>${ACTIVE_GWP} GWP100</strong>:
  CH4=${EF.gwpCH4}, N2O=${EF.gwpN2O},
  HFC-134a=${EF.gwpHFC134a.toLocaleString()}, R-404A=${EF.gwpR404A.toLocaleString()}.
  Kenya grid: <strong>0.070 kgCO2e/kWh</strong> (IEA 2024, ~90% renewable).
  GWP source: ${ACTIVE_GWP==='AR6'?'GHG Protocol Aug 2024 / IPCC AR6 WG1 Ch.7':'IPCC AR5 2013 / UNFCCC Paris Agreement'}.
  Regulatory config: v${KNCR_CONFIG.version}.
</p>
<div class="box-blue">
  <strong>IPCC Tier 1 Uncertainty (±${u.pct}%):</strong>
  ${u.low} to ${u.high} tCO2e/yr &nbsp;|&nbsp; ${u.basis}
</div>

<!-- SCOPE BREAKDOWN -->
<div class="sec-h">Scope Breakdown</div>
<table class="tbl-scope" style="margin-bottom:10px">
  <thead>
    <tr>
      <th style="width:38%">Scope</th>
      <th style="text-align:right;width:13%">tCO2e/yr</th>
      <th style="text-align:right;width:8%">%</th>
      <th>Primary Source</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Scope 1 — Direct combustion</td>
      <td style="text-align:right">${c.s1_t.toFixed(3)}</td>
      <td style="text-align:right">${c.total_t>0?(c.s1_t/c.total_t*100).toFixed(1):0}%</td>
      <td class="src">IPCC 2006 Vol.2 / DEFRA 2023</td>
    </tr>
    <tr class="alt">
      <td>Scope 2 — Purchased energy</td>
      <td style="text-align:right">${c.s2_t.toFixed(3)}</td>
      <td style="text-align:right">${c.total_t>0?(c.s2_t/c.total_t*100).toFixed(1):0}%</td>
      <td class="src">IEA 2024 — 0.070 kgCO2e/kWh</td>
    </tr>
    <tr>
      <td>Scope 3 — Embodied / upstream</td>
      <td style="text-align:right">${c.s3_t.toFixed(3)}</td>
      <td style="text-align:right">${c.total_t>0?(c.s3_t/c.total_t*100).toFixed(1):0}%</td>
      <td class="src">Bath ICE v3.0 / World Steel 2023</td>
    </tr>
    <tr class="tot">
      <td><strong>TOTAL</strong></td>
      <td style="text-align:right"><strong>${c.total_t.toFixed(3)}</strong></td>
      <td style="text-align:right"><strong>100%</strong></td>
      <td></td>
    </tr>
  </tbody>
</table>

<!-- DATA AUDIT TRAIL -->
<div class="sec-h">Data Audit Trail</div>
<div class="box-dq">
  <div class="box-dq-t">${dqsInfo.icon} Data Quality Score: ${c.dqs||0}/100 — ${c.dqsGrade||'Not declared'}</div>
  <div>${sourcesHTML}</div>
  <div class="box-dq-s">DQS 90+ = Audit-Ready &nbsp;|&nbsp; DQS 70–89 = Verified &nbsp;|&nbsp; Below 70 = Supporting docs required</div>
</div>

<!-- RECOMMENDED OFFSETS -->
<div class="sec-h">Recommended Offset Strategies</div>
<table class="tbl-off" style="margin-bottom:12px">
  <thead>
    <tr>
      <th style="width:30%">Strategy</th>
      <th style="width:40%">Requirement to Neutralise</th>
      <th>Source</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Bamboo plantation</td>
      <td>${(c.total_t/17).toFixed(2)} ha at 17 tCO2e/ha/yr</td>
      <td>Yuen et al. 2017</td>
    </tr>
    <tr class="alt">
      <td>Casuarina equisetifolia</td>
      <td>${(c.total_t/8).toFixed(2)} ha at 8 tCO2e/ha/yr</td>
      <td>KEFRI 2019</td>
    </tr>
    <tr>
      <td>Biogas digesters</td>
      <td>${Math.ceil(c.total_t/3.5)} units at 3.5 tCO2e/unit/yr</td>
      <td>SNV Kenya 2021</td>
    </tr>
  </tbody>
</table>

<!-- DISCLAIMER -->
<div class="box-disc">
  Generated by Netzerra MVP v1.0 — Kenya Carbon Intelligence Platform.
  ${ACTIVE_GWP} GWP values (GHG Protocol Aug 2024). ISO 14064-1:2018 aligned.
  This report is generated from user-inputted data and should be reviewed by a qualified
  carbon auditor before formal submission to NEMA, KNCR, or any VCM verification body.
</div>

<!-- FOOTER -->
<div class="foot">
  <span>Netzerra &middot; shukriali411@gmail.com &middot; +254 705 366 807 &middot; netzerrakenya.com</span>
  <span>${ref} &middot; ${now}</span>
</div>
<div class="box-mvp">
  MVP DISCLAIMER: County data shown is illustrative. No formal partnerships established with county governments, NEMA, or KNCR.
  This tool does not constitute legal or regulatory advice. © 2026 Netzerra · Shukri Ali.
</div>

${autoPrint ? '<script>window.onload = function(){ window.print(); }<\/script>' : ''}
</body>
</html>`;
}

// ── COUNTY DASHBOARD ──────────────────────────────────
const COUNTY_DATA = {
  'Turkana':  { projects:[{n:'Turkana Solar Borehole Cluster',s:'borehole',c:420,step:2,st:'PDD Submitted'},{n:'Turkana Rangeland Carbon',s:'livestock',c:850,step:1,st:'Draft'}], revenue:23800000, community:5950000, floca:'partial', wards:['Kanamkemer','Turkana West','Loima','Turkana East','Kibish'] },
  'Laikipia': { projects:[{n:'Laikipia Drip Irrigation MRV',s:'borehole',c:280,step:3,st:'Validated'},{n:'Ol Pejeta Livestock GHG',s:'livestock',c:620,step:2,st:'PDD Submitted'}], revenue:12400000, community:3100000, floca:'compliant', wards:['Rumuruti','Nanyuki','Ol Moran','Laikipia East','Laikipia West'] },
  'Isiolo':   { projects:[{n:'Northern Rangeland Carbon Initiative',s:'livestock',c:1200,step:4,st:'DNA Review'}], revenue:7500000, community:1875000, floca:'compliant', wards:['Isiolo Township','Oldonyiro','Merti','Garbatulla'] },
  'Samburu':  { projects:[{n:'Samburu Rangelands MRV',s:'livestock',c:780,step:2,st:'PDD Submitted'}], revenue:8200000, community:2050000, floca:'partial', wards:['Samburu East','Samburu North','Samburu West'] },
  'Narok':    { projects:[{n:'Narok Livestock GHG Audit',s:'livestock',c:950,step:3,st:'Validated'},{n:'Mara Biogas Programme',s:'biogas',c:320,step:1,st:'Draft'}], revenue:15600000, community:3900000, floca:'compliant', wards:['Narok Town','Transmara East','Transmara West','Kilgoris','Emurua Dikirr'] },
  'Kajiado':  { projects:[{n:'Kajiado Carbon Oversight',s:'livestock',c:440,step:1,st:'Draft'}], revenue:3200000, community:800000, floca:'missing', wards:['Kajiado Central','Isinya','Mashuuru','Kajiado North','Loitokitok'] },
  'Nakuru':   { projects:[{n:'Nakuru Agricultural MRV',s:'livestock',c:680,step:2,st:'PDD Submitted'},{n:'Menengai Geothermal Carbon',s:'solar',c:1400,step:3,st:'Validated'}], revenue:18200000, community:4550000, floca:'compliant', wards:['Nakuru Town East','Nakuru Town West','Bahati','Subukia','Rongai','Molo','Njoro'] },
  'Garissa':  { projects:[{n:'Garissa Rangeland Carbon',s:'livestock',c:560,step:1,st:'Draft'}], revenue:4100000, community:1025000, floca:'missing', wards:['Garissa Township','Balambala','Lagdera','Dadaab','Fafi','Ijara'] },
};

function loadCountyData() {
  const county = document.getElementById('county-select').value;
  document.getElementById('county-placeholder').style.display = county ? 'none' : 'block';
  document.getElementById('county-kpis').style.display    = county ? 'grid' : 'none';
  document.getElementById('county-content').style.display = county ? 'grid' : 'none';
  if (!county) return;

  const d = COUNTY_DATA[county] || {
    projects:[{n:'Demo Project',s:'borehole',c:300,step:1,st:'Draft'}],
    revenue:5000000, community:1250000, floca:'partial',
    wards:['Central Ward','East Ward','West Ward']
  };
  document.getElementById('c-name-hdr').textContent = county;
  document.getElementById('c-projects').textContent = d.projects.length;
  document.getElementById('c-revenue').textContent  = 'KES ' + d.revenue.toLocaleString();
  document.getElementById('c-community').textContent = 'KES ' + d.community.toLocaleString();
  const fMap = { compliant:'🟢 Compliant', partial:'🟡 Partial', missing:'🔴 Missing' };
  const fSub = { compliant:'All criteria met', partial:'Some gaps remain', missing:'Data submission required' };
  document.getElementById('c-floca').textContent     = fMap[d.floca] || '—';
  document.getElementById('c-floca-sub').textContent = fSub[d.floca] || '—';

  // Projects
  const SICO = { borehole:'💧', livestock:'🐄', transport:'🚌', forestry:'🌳', solar:'☀️', biogas:'🔥', construct:'🏗️', manufact:'🏭' };
  const SMAP = { 1:['s-draft','Draft'], 2:['s-submitted','PDD Submitted'], 3:['s-validated','Validated'], 4:['s-registered','DNA Review'], 5:['s-registered','Registered'], 6:['s-credits','Credits Live'] };
  document.getElementById('county-projects-list').innerHTML = d.projects.map(p => {
    const [cls] = SMAP[p.step] || SMAP[1];
    return `<div class="kncr-proj-card"><div class="kpc-ico">${SICO[p.s]||'🌿'}</div><div class="kpc-info"><div class="kpc-name">${p.n}</div><div class="kpc-meta">${p.c.toLocaleString()} tCO₂e/yr · KES ${(p.c*12*130).toLocaleString()} potential/yr</div></div><div class="kpc-status ${cls}">${p.st}</div></div>`;
  }).join('');

  // Ward bars
  const wardColors = ['#EF5350','#F5A623','#4CAF50','#00C9A7','#2196F3','#7B3FA0','#FF9800'];
  document.getElementById('ward-bars').innerHTML = d.wards.map((w, i) => {
    const em = Math.round(150 + Math.random() * 650);
    const pct = em / 800 * 100;
    return `<div class="ward-bar"><div class="ward-bar-hdr"><span>${w}</span><span>${em.toLocaleString()} tCO₂e/yr est.</span></div><div class="ward-track"><div class="ward-fill" style="width:${pct}%;background:${wardColors[i%wardColors.length]}"></div></div></div>`;
  }).join('');

  // FLLoCA details
  const items = [
    ['County Climate Action Plan (CCAP)', '✅ Submitted 2025', 'compliant'],
    ['Climate Expenditure Budget (≥1.5%)', d.floca==='compliant'?'✅ 2.3% allocated':'🟡 1.2% allocated', d.floca==='compliant'?'compliant':'partial'],
    ['County Climate Change Fund (CCCF)', d.floca!=='missing'?'✅ Operational':'🔴 Not established', d.floca!=='missing'?'compliant':'missing'],
    ['Performance Data Report Q1 2026', d.floca==='compliant'?'✅ Submitted':'🟡 Pending', d.floca==='compliant'?'compliant':'partial'],
    ['Community Benefit Records', d.floca==='compliant'?'✅ Documented':'🟡 Partial', d.floca==='compliant'?'compliant':'partial'],
    ['KNCR Project Registration', d.projects.filter(p=>p.step>=3).length+' of '+d.projects.length+' registered', d.projects.every(p=>p.step>=3)?'compliant':'partial'],
  ];
  document.getElementById('floca-details').innerHTML = items.map(([l,val,st]) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.78rem"><span style="color:rgba(255,255,255,.68)">${l}</span><span class="floca-badge ${st}">${val}</span></div>`
  ).join('');

  // Community benefit breakdown
  document.getElementById('community-benefit-tracking').innerHTML = `
    <div style="margin-bottom:.75rem">
      <div style="display:flex;justify-content:space-between;font-size:.76rem;color:rgba(255,255,255,.5);margin-bottom:.28rem"><span>Received to date</span><span style="color:var(--mint);font-family:'JetBrains Mono',monospace">KES ${d.community.toLocaleString()}</span></div>
      <div style="height:6px;background:rgba(255,255,255,.07);border-radius:999px;overflow:hidden"><div style="height:100%;background:var(--leaf);border-radius:999px;width:${Math.min(100,d.community/d.revenue*100).toFixed(0)}%"></div></div>
      <div style="font-size:.66rem;color:rgba(255,255,255,.3);margin-top:.18rem">${(d.community/d.revenue*100).toFixed(1)}% of total revenue channelled</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.45rem;font-size:.73rem">
      ${[['🌊 Clean Water','38%'],['📚 Education','22%'],['🏥 Healthcare','18%'],['⚡ Energy Access','12%'],['🌳 Reforestation','10%']].map(([n,p])=>`<div style="background:rgba(255,255,255,.04);padding:.48rem .62rem;border-radius:5px;display:flex;justify-content:space-between"><span>${n}</span><span style="color:var(--mint)">${p}</span></div>`).join('')}
    </div>`;

  // Levy timeline
  const months  = ['Mar 25','Jun 25','Sep 25','Dec 25','Mar 26','Jun 26 (F)','Dec 26 (F)'];
  const amounts = [800000,1200000,950000,1100000,1350000,1500000,1600000].map(x => Math.round(x * d.revenue / 24000000));
  const statuses = ['received','received','received','received','received','forecast','forecast'];
  document.getElementById('levy-timeline').innerHTML = months.map((m,i) =>
    `<div class="rev-row"><span style="color:rgba(255,255,255,.62)">${m}</span><span class="rev-amount">KES ${amounts[i].toLocaleString()}</span><span class="rev-status ${statuses[i]}">${statuses[i]==='received'?'Received':'Forecast'}</span></div>`
  ).join('');

  // Revenue chart
  if (S.charts.countyRevenue) S.charts.countyRevenue.destroy();
  setTimeout(() => {
    const ctx = document.getElementById('county-revenue-chart');
    if (!ctx) return;
    S.charts.countyRevenue = new Chart(ctx, {
      type:'bar',
      data:{
        labels:['Q1 2025','Q2 2025','Q3 2025','Q4 2025','Q1 2026','Q2 2026E'],
        datasets:[
          { label:'Budget', data:[3,3.5,3.2,3.8,4.2,4.5].map(x=>x*d.revenue/15000000), backgroundColor:'rgba(58,170,92,.22)', borderColor:'rgba(58,170,92,.7)', borderWidth:1 },
          { label:'Actual/Forecast', data:[2.8,3.6,2.95,3.5,3.9,null].map(x=>x?x*d.revenue/15000000:null), backgroundColor:'rgba(0,201,167,.22)', borderColor:'rgba(0,201,167,.7)', borderWidth:1 }
        ]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:'rgba(255,255,255,.52)', boxWidth:10, font:{size:10} } } },
        scales:{ y:{ ticks:{ color:'rgba(255,255,255,.42)', font:{size:9}, callback: v => 'KES '+(v/1e6).toFixed(1)+'M' }, grid:{ color:'rgba(255,255,255,.05)' } }, x:{ ticks:{ color:'rgba(255,255,255,.42)', font:{size:9} }, grid:{ display:false } } }
      }
    });
  }, 80);
}

function generateFLoCAReport() {
  const county = document.getElementById('county-select').value;
  if (!county) { toast('Please select a county first.', 'error'); return; }

  const d = COUNTY_DATA[county] || {
    projects:[], revenue:5000000, community:1250000, floca:'partial',
    wards:['Central Ward','East Ward','West Ward']
  };

  const now     = new Date().toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' });
  const quarter = 'Q1 2026';
  const ref     = 'NTZ-FLOCA-' + county.toUpperCase().slice(0,3) + '-' + Date.now();

  const fMap  = { compliant:'Compliant', partial:'Partial', missing:'Non-Compliant' };
  const fCol  = { compliant:'#2E7D32', partial:'#E65100', missing:'#B71C1C' };
  const fBg   = { compliant:'#E8F5E9', partial:'#FFF3E0', missing:'#FFEBEE' };

  const criteria = [
    { name:'County Climate Action Plan (CCAP)', status: d.floca!=='missing'?'compliant':'missing', note: d.floca!=='missing'?'Submitted and adopted':'Not yet produced' },
    { name:'Climate Expenditure Budget (min 1.5%)', status: d.floca==='compliant'?'compliant':'partial', note: d.floca==='compliant'?'2.3% allocated (above minimum)':'1.2% allocated (below 1.5% minimum)' },
    { name:'County Climate Change Fund (CCCF)', status: d.floca!=='missing'?'compliant':'missing', note: d.floca!=='missing'?'Operational and disbursing':'Not yet established' },
    { name:'Performance Data Report', status: d.floca==='compliant'?'compliant':'partial', note: d.floca==='compliant'?`${quarter} report submitted on time`:`${quarter} report pending` },
    { name:'Community Benefit Records (25%/40%)', status: d.floca==='compliant'?'compliant':'partial', note: d.floca==='compliant'?`KES ${d.community.toLocaleString()} documented and disbursed`:'Partial records — full documentation required' },
    { name:'KNCR Project Registrations', status: d.projects.filter(p=>p.step>=3).length>0?'compliant':'partial', note:`${d.projects.filter(p=>p.step>=3).length} of ${d.projects.length} projects validated or above` },
  ];

  const overallScore = criteria.filter(c=>c.status==='compliant').length;
  const overallStatus = overallScore===6?'FULLY COMPLIANT':overallScore>=4?'PARTIALLY COMPLIANT':'NON-COMPLIANT';
  const overallColor  = overallScore===6?'#1B5E20':overallScore>=4?'#E65100':'#B71C1C';
  const overallBg     = overallScore===6?'#E8F5E9':overallScore>=4?'#FFF3E0':'#FFEBEE';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>FLLoCA Performance Report — ${county} County</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1A3A2A;background:#fff;padding:28px 32px;max-width:780px;margin:0 auto;line-height:1.5}
  .hdr{background:#0D3320;color:#fff;padding:20px 24px;border-radius:8px;margin-bottom:16px}
  .hdr-brand{font-size:18px;font-weight:800;margin-bottom:2px}
  .hdr-sub{font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:#9DC9A8;margin-bottom:10px}
  .hdr-title{font-size:15px;font-weight:700;margin-bottom:4px}
  .hdr-meta{font-size:10px;color:#9DC9A8}
  .wb-banner{background:#1A3A6B;color:#fff;padding:10px 16px;border-radius:5px;margin-bottom:14px;font-size:10px;display:flex;justify-content:space-between;align-items:center}
  .wb-logo{font-weight:700;font-size:12px}
  .sec-h{font-size:12px;font-weight:700;color:#1B5E20;border-bottom:2px solid #E8F5E9;padding-bottom:3px;margin:12px 0 7px}
  .overall{border-radius:6px;padding:12px 16px;margin-bottom:14px;text-align:center}
  .overall-score{font-size:28px;font-weight:800;margin-bottom:2px}
  .overall-label{font-size:10px;text-transform:uppercase;letter-spacing:1px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px}
  .tbl-crit th{background:#1B5E20;color:#fff;padding:5px 8px;text-align:left;font-weight:600;font-size:10px}
  .tbl-crit td{padding:6px 8px;border-bottom:1px solid #E8F5E9;font-size:10px}
  .tbl-crit .alt{background:#F9FBF7}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:9px;font-weight:700;text-transform:uppercase}
  .badge-ok  {background:#E8F5E9;color:#2E7D32}
  .badge-warn{background:#FFF3E0;color:#E65100}
  .badge-bad {background:#FFEBEE;color:#B71C1C}
  .tbl-kpi th{background:#F1F8E9;color:#1B5E20;padding:5px 8px;text-align:left;font-weight:600;border-bottom:1px solid #C5E1A5;font-size:10px}
  .tbl-kpi td{padding:6px 8px;border-bottom:1px solid #E8F5E9;font-size:10px}
  .tbl-proj th{background:#1A3A6B;color:#fff;padding:5px 8px;text-align:left;font-weight:600;font-size:10px}
  .tbl-proj td{padding:5px 8px;border-bottom:1px solid #E8F5E9;font-size:10px}
  .tbl-proj .alt{background:#F5F8FF}
  .box-blue{background:#E3F2FD;border:1px solid #BBDEFB;border-radius:4px;padding:8px 12px;margin-bottom:10px;font-size:10px;color:#1565C0}
  .box-warn{background:#FFF3E0;border-left:4px solid #FF9800;padding:9px 13px;margin-bottom:10px;border-radius:0 5px 5px 0;font-size:10px;color:#E65100}
  .box-ok{background:#E8F5E9;border:1px solid #A5D6A7;border-radius:4px;padding:8px 12px;margin-bottom:10px;font-size:10px;color:#2E7D32}
  .foot{border-top:1px solid #E8F5E9;padding-top:6px;margin-top:10px;display:flex;justify-content:space-between;font-size:8px;color:#90A4AE}
  .disc{font-size:7.5px;color:#BDBDBD;margin-top:5px;padding-top:4px;border-top:1px solid #F5F5F5}
  .sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:16px}
  .sign-block{border-top:2px solid #E8F5E9;padding-top:6px}
  .sign-line{height:36px}
  .sign-label{font-size:8px;color:#90A4AE;text-transform:uppercase;letter-spacing:.5px}
  .no-print{text-align:right;margin-bottom:14px}
  @media print{
    .no-print{display:none!important}
    @page{margin:1.5cm;size:A4}
  }
</style>
</head>
<body>

<div class="no-print">
  <button onclick="window.print()" style="background:#1A3A6B;color:#fff;border:none;padding:9px 22px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:700">
    ⬇ Save as PDF / Print
  </button>
  <span style="font-size:10px;color:#607D8B;margin-left:10px">Print → Save as PDF → Use with official NTPIU / National Treasury FLLoCA templates</span>
</div>

<!-- HEADER -->
<div class="hdr">
  <div class="hdr-brand">Netzerra &nbsp;·&nbsp; County Carbon Intelligence</div>
  <div class="hdr-sub">Kenya Carbon Intelligence Platform &middot; MVP v1.0</div>
  <div class="hdr-title">FLLoCA Performance &amp; Compliance Report</div>
  <div class="hdr-meta">${county} County &nbsp;·&nbsp; Period: ${quarter} &nbsp;·&nbsp; Generated: ${now} &nbsp;·&nbsp; Ref: ${ref}</div>
</div>

<!-- FLOCA PROGRAMME BANNER -->
<div class="wb-banner" style="background:#1A4A2E">
  <div>
    <div class="wb-logo">FLLoCA — Forest and Landscape Livelihoods and Climate Adaptation</div>
    <div style="font-size:9px;opacity:.8;margin-top:2px">Results-based climate finance · Administered by the National Treasury &amp; State Department for Environment and Climate Change · USD 82M programme</div>
  </div>
  <div style="font-size:9px;opacity:.7">County: ${county} &nbsp;·&nbsp; ${quarter}</div>
</div>
<div style="background:#FFF8E1;border:1px solid #FFD54F;border-radius:4px;padding:6px 12px;margin-bottom:12px;font-size:9px;color:#795548">
  ⚠️ DATA PREPARATION TOOL: This document is for internal county use only. All figures must be verified and entered into official National Treasury NTPIU templates before formal FLLoCA submission. Netzerra has no affiliation with the National Treasury, World Bank, or FLLoCA programme.
</div>

<!-- OVERALL COMPLIANCE STATUS -->
<div class="overall" style="background:${overallBg};border:2px solid ${overallColor}">
  <div class="overall-score" style="color:${overallColor}">${overallScore}/6</div>
  <div style="font-size:14px;font-weight:700;color:${overallColor};margin-bottom:2px">${overallStatus}</div>
  <div class="overall-label" style="color:${overallColor}">FLLoCA Performance Criteria Met</div>
</div>

<!-- COMPLIANCE CRITERIA TABLE -->
<div class="sec-h">Performance Criteria Assessment</div>
<table class="tbl-crit">
  <thead>
    <tr>
      <th style="width:38%">Criteria</th>
      <th style="width:18%">Status</th>
      <th>Details / Evidence</th>
    </tr>
  </thead>
  <tbody>
    ${criteria.map((c, i) => `
    <tr class="${i%2===1?'alt':''}">
      <td><strong>${c.name}</strong></td>
      <td>
        <span class="badge badge-${c.status==='compliant'?'ok':c.status==='partial'?'warn':'bad'}">
          ${fMap[c.status]||c.status}
        </span>
      </td>
      <td style="color:#555">${c.note}</td>
    </tr>`).join('')}
  </tbody>
</table>

<!-- KEY PERFORMANCE INDICATORS -->
<div class="sec-h">County Carbon Finance — Key Performance Indicators</div>
<table class="tbl-kpi">
  <thead>
    <tr>
      <th>Indicator</th>
      <th style="text-align:right">Value</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Total Carbon Revenue Received (YTD)</td>
      <td style="text-align:right;font-weight:700;color:#1B5E20">KES ${d.revenue.toLocaleString()}</td>
      <td style="color:#607D8B;font-size:9px">Levy + credit proceeds</td>
    </tr>
    <tr class="alt">
      <td>Community Benefit Fund Disbursed</td>
      <td style="text-align:right;font-weight:700;color:#1B5E20">KES ${d.community.toLocaleString()}</td>
      <td style="color:#607D8B;font-size:9px">${((d.community/d.revenue)*100).toFixed(1)}% of total revenue — mandate: ${d.projects.some(p=>p.s==='borehole'||p.s==='livestock')?'40%':'25%'}</td>
    </tr>
    <tr>
      <td>Active KNCR Projects</td>
      <td style="text-align:right;font-weight:700;color:#1B5E20">${d.projects.length}</td>
      <td style="color:#607D8B;font-size:9px">${d.projects.filter(p=>p.step>=3).length} validated or registered</td>
    </tr>
    <tr class="alt">
      <td>Estimated Annual Carbon Credits</td>
      <td style="text-align:right;font-weight:700;color:#1B5E20">${d.projects.reduce((a,p)=>a+p.c,0).toLocaleString()} tCO2e/yr</td>
      <td style="color:#607D8B;font-size:9px">Across all active projects</td>
    </tr>
    <tr>
      <td>Potential Annual Revenue (@ USD 12/t)</td>
      <td style="text-align:right;font-weight:700;color:#1B5E20">KES ${(d.projects.reduce((a,p)=>a+p.c,0)*12*130).toLocaleString()}</td>
      <td style="color:#607D8B;font-size:9px">At current market price</td>
    </tr>
  </tbody>
</table>

<!-- PROJECT REGISTRY -->
<div class="sec-h">KNCR Project Registry — ${county} County</div>
<table class="tbl-proj">
  <thead>
    <tr>
      <th style="width:40%">Project Name</th>
      <th>Sector</th>
      <th style="text-align:right">Credits (tCO2e/yr)</th>
      <th>Pipeline Status</th>
    </tr>
  </thead>
  <tbody>
    ${d.projects.map((p, i) => {
      const steps = ['','Concept Note','PDD Draft','Validated','DNA Review','Registered','Credits Live'];
      return `<tr class="${i%2===1?'alt':''}">
        <td><strong>${p.n}</strong></td>
        <td>${p.s}</td>
        <td style="text-align:right">${p.c.toLocaleString()}</td>
        <td><span class="badge badge-${p.step>=3?'ok':p.step>=2?'warn':'bad'}">${steps[p.step]||'Draft'}</span></td>
      </tr>`;
    }).join('')}
  </tbody>
</table>

<!-- NEXT STEPS BOX -->
<div class="sec-h">Recommended Actions for Next Reporting Period</div>
${overallScore < 6
  ? `<div class="box-warn">
       <strong>Actions Required to Achieve Full Compliance:</strong><br>
       ${criteria.filter(c=>c.status!=='compliant').map(c=>`• ${c.name}: ${c.note}`).join('<br>')}
     </div>`
  : `<div class="box-ok">
       ✓ ${county} County meets all six FLLoCA performance criteria. County is eligible for the full results-based grant tranche.
     </div>`}
<div class="box-blue">
  <strong>Next disbursement eligibility:</strong> Counties must submit performance reports within 30 days of quarter end.
  Contact the FLLoCA County Liaison Officer at the State Department of Environment and Climate Change to confirm submission timelines.
  Netzerra reference: <strong>${ref}</strong>
</div>

<!-- DECLARATIONS & SIGNATURES -->
<div class="sec-h">Declaration and Sign-off</div>
<p style="font-size:10px;color:#333;margin-bottom:12px">
  We, the undersigned officers of ${county} County Government, declare that the information
  in this performance report is accurate and complete to the best of our knowledge, and has been
  prepared in accordance with FLLoCA reporting requirements and Kenya's Climate Change Act 2016 (Amended 2023).
</p>
<div class="sign-grid">
  <div class="sign-block">
    <div class="sign-line"></div>
    <div class="sign-label">County Executive Committee Member — Environment</div>
  </div>
  <div class="sign-block">
    <div class="sign-line"></div>
    <div class="sign-label">County Director of Environment / Climate Change</div>
  </div>
  <div class="sign-block" style="margin-top:16px">
    <div class="sign-line"></div>
    <div class="sign-label">Date of Submission</div>
  </div>
  <div class="sign-block" style="margin-top:16px">
    <div class="sign-line"></div>
    <div class="sign-label">National Treasury NTPIU Representative</div>
  </div>
</div>

<!-- FOOTER -->
<div class="foot">
  <span>Netzerra &middot; shukriali411@gmail.com &middot; +254 705 366 807 &middot; netzerrakenya.com</span>
  <span>${ref} &middot; ${now}</span>
</div>
<div class="disc">
  IMPORTANT DISCLAIMER: All data in this document is illustrative and must be replaced with verified county figures before any official submission. Netzerra has no formal partnership with ${county} County Government, the National Treasury, or any FLLoCA programme administrator. This is a data preparation tool only — official FLLoCA reports must be submitted through the National Treasury NTPIU using approved templates.
  This report template is provided as a tool to assist county officers in preparing their own reports. Verify all figures before formal submission. © 2026 Netzerra.
</div>

</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { toast('Pop-up blocked — please allow pop-ups for this site', 'error'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
  toast('✅ FLLoCA report opened — click "Save as PDF / Print" in the new tab', 'success');
}

// ── CHARTS ────────────────────────────────────────────
function initCharts() {
  Chart.defaults.color = 'rgba(255,255,255,.52)';
  Chart.defaults.borderColor = 'rgba(255,255,255,.06)';

  S.charts.sector = new Chart(document.getElementById('sector-chart'), {
    type:'doughnut',
    data:{
      labels:['Borehole','Livestock','Transport','Construction','Manufacturing'],
      datasets:[{ data:[8,38,24,18,12], backgroundColor:['rgba(21,101,192,.78)','rgba(230,81,0,.78)','rgba(55,71,79,.78)','rgba(109,76,65,.78)','rgba(106,27,154,.78)'], borderWidth:2, borderColor:'rgba(7,28,15,.8)' }]
    },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right', labels:{ boxWidth:10, font:{size:10} } } } }
  });

  S.charts.trend = new Chart(document.getElementById('trend-chart'), {
    type:'line',
    data:{
      labels:['Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb'],
      datasets:[
        { label:'Emissions (tCO₂e)', data:[280,295,260,312,290,305,278,320,298,265,290,312], borderColor:'rgba(239,154,154,.88)', backgroundColor:'rgba(239,154,154,.07)', fill:true, tension:0.4, pointRadius:3 },
        { label:'Offsets', data:[50,55,58,60,62,64,66,66,67,68,69,70], borderColor:'rgba(105,240,174,.88)', backgroundColor:'rgba(105,240,174,.06)', fill:true, tension:0.4, pointRadius:3 }
      ]
    },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ boxWidth:10, font:{size:10} } } }, scales:{ y:{ beginAtZero:false, ticks:{ font:{size:9} } }, x:{ ticks:{ font:{size:9} } } } }
  });
}

function initLeaderboardCharts() {
  if (!document.getElementById('county-chart')) return;
  S.charts.county = new Chart(document.getElementById('county-chart'), {
    type:'bar',
    data:{ labels:['Narok','Laikipia','Turkana','Nakuru','Baringo','Machakos','Kitui'], datasets:[{ label:'Avg NTZ Score', data:[74,71,68,65,63,60,57], backgroundColor:'rgba(58,170,92,.62)', borderColor:'rgba(58,170,92,1)', borderWidth:1, borderRadius:3 }] },
    options:{ responsive:true, maintainAspectRatio:false, indexAxis:'y', plugins:{ legend:{ display:false } }, scales:{ x:{ max:100, ticks:{ font:{size:9} } }, y:{ ticks:{ font:{size:10} } } } }
  });
  S.charts.sectorDist = new Chart(document.getElementById('sector-dist-chart'), {
    type:'pie',
    data:{ labels:['Livestock','Borehole','Transport','Construction'], datasets:[{ data:[48,12,24,16], backgroundColor:['rgba(230,81,0,.78)','rgba(21,101,192,.78)','rgba(55,71,79,.78)','rgba(109,76,65,.78)'], borderWidth:2, borderColor:'rgba(7,28,15,.8)' }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right', labels:{ boxWidth:10, font:{size:10} } } } }
  });
}

// ── TICKER ────────────────────────────────────────────
function startTicker() {
  const dailyKg = 25e9 / 365;
  const start = new Date(); start.setHours(0,0,0,0);
  function tick() {
    const secs = (Date.now() - start) / 1000;
    const tToday = Math.floor(dailyKg * secs / 1e6);
    document.getElementById('emission-ticker').textContent = tToday.toLocaleString() + ' tCO₂e today';
  }
  tick(); setInterval(tick, 2000);
}

// ── KNCR ──────────────────────────────────────────────
const KNCR_STEPS = [
  {l:'Concept Note',i:'📝'},{l:'PDD Draft',i:'📋'},{l:'Validation',i:'🔍'},
  {l:'DNA Review',i:'🏛️'},{l:'Registered',i:'📲'},{l:'Credits Live',i:'🏅'}
];

function renderKNCRPipeline(active = 1) {
  const el = document.getElementById('kncr-pipeline');
  if (!el) return;
  el.innerHTML = KNCR_STEPS.map((s, i) => {
    const n = i + 1;
    const cls = n < active ? 'done' : n === active ? 'active' : 'locked';
    return `<div class="pipeline-step"><div class="ps-circle ${cls}">${n < active ? '✓' : s.i}</div><div class="ps-label ${cls}">${s.l}</div></div>`;
  }).join('');
}

const SICO = { borehole:'💧', livestock:'🐄', transport:'🚌', forestry:'🌳', solar:'☀️', biogas:'🔥', construct:'🏗️' };
const SMAP = { 1:['s-draft','Draft'], 2:['s-submitted','PDD Submitted'], 3:['s-validated','Validated'], 4:['s-registered','DNA Review'], 5:['s-registered','Registered'], 6:['s-credits','Credits Live'] };

function renderKNCRProjects() {
  const el = document.getElementById('kncr-projects-list');
  if (!el) return;
  if (!S.kncr.projects.length) {
    el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:rgba(255,255,255,.26)">No projects yet — click "+ New Project" to begin your KNCR journey.</div>';
    return;
  }
  el.innerHTML = S.kncr.projects.map((p, i) => {
    const [cls, lbl] = SMAP[p.step] || SMAP[1];
    return `<div class="kncr-proj-card" onclick="advanceKNCR(${i})"><div class="kpc-ico">${SICO[p.sector]||'🌿'}</div><div class="kpc-info"><div class="kpc-name">${p.name}</div><div class="kpc-meta">${p.county} · ${p.standard} · ${p.credits.toLocaleString()} tCO₂e/yr</div></div><div class="kpc-status ${cls}">${lbl}</div></div>`;
  }).join('');
}

function addKNCRProject() {
  const name = document.getElementById('kn-name').value.trim();
  if (!name) { toast('Please enter a project name', 'error'); return; }
  const id = 'NTZ-' + String(S.kncr.projects.length + 1).padStart(3,'0');
  S.kncr.projects.push({
    id, name,
    sector:   document.getElementById('kn-sector').value,
    county:   document.getElementById('kn-county').value,
    credits:  parseFloat(document.getElementById('kn-credits').value) || 500,
    standard: document.getElementById('kn-std').value,
    step: 1,
    created: new Date().toISOString().split('T')[0]
  });
  closeModal('modal-kncr-new');
  renderKNCRProjects();
  renderKNCRPipeline(1);
  toast('🏛️ Project "' + name + '" added to KNCR pipeline!', 'success');
  saveToStorage();
  document.getElementById('kn-name').value = '';
  document.getElementById('kn-credits').value = '';
}

function advanceKNCR(i) {
  const p = S.kncr.projects[i];
  if (!p) return;
  renderKNCRPipeline(p.step);
  if (p.step < 6) {
    p.step++;
    renderKNCRProjects();
    renderKNCRPipeline(p.step);
    toast(p.step === 6 ? '🏅 Credits issued for ' + p.name + '!' : '✅ ' + p.name + ' → Step ' + p.step, p.step === 6 ? 'success' : 'info');
  } else {
    toast('🏅 ' + p.name + ' — Credits already live!', 'success');
  }
}

function generateKNCRPackage() {
  const name     = document.getElementById('kncr-proj-name').value.trim() || 'Unnamed Project';
  const credits  = parseFloat(document.getElementById('kncr-credits').value) || 0;
  const county   = document.getElementById('kncr-county').value;
  const proponent= document.getElementById('kncr-proponent').value.trim() || S.user.org;
  const standard = document.getElementById('kncr-standard').value;
  const c        = S.lastCalc;
  const now      = new Date().toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' });
  const ref      = 'NTZ-PDD-' + Date.now();

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>KNCR Package — ${name}</title>
<style>
body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:2rem;color:#1A3A2A;background:#fff}
h1{font-size:1.6rem;color:#0D3320;margin-bottom:.4rem}
h2{font-size:1rem;color:#1B5E20;border-bottom:2px solid #E8F5E9;padding-bottom:.35rem;margin:1.5rem 0 .85rem}
.hdr{background:linear-gradient(135deg,#0D3320,#1A4A2E);color:#fff;padding:1.75rem;border-radius:10px;margin-bottom:1.75rem}
.tag{background:rgba(76,175,80,.2);border:1px solid rgba(76,175,80,.4);color:#A5D6A7;padding:.22rem .72rem;border-radius:14px;font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;display:inline-block;margin-bottom:.72rem}
table{width:100%;border-collapse:collapse;font-size:.82rem;margin:.85rem 0}
th{background:#1B5E20;color:#fff;padding:.52rem .7rem;text-align:left}
td{padding:.48rem .7rem;border-bottom:1px solid #E8F5E9}
tr:nth-child(even) td{background:#F9FBF7}
tr.tot td{background:#E8F5E9;font-weight:700;color:#1B5E20}
.info{background:#E3F2FD;border-left:4px solid #1565C0;padding:.75rem 1rem;border-radius:0 7px 7px 0;font-size:.78rem;color:#0D47A1;margin:.9rem 0}
.warn{background:#FFF8E1;border-left:4px solid #F9A825;padding:.75rem 1rem;border-radius:0 7px 7px 0;font-size:.78rem;color:#795548;margin:.9rem 0}
.sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:2rem}
.sign-block{border-top:2px solid #E8F5E9;padding-top:.65rem}
.sign-line{height:48px}
.sign-label{font-size:.68rem;color:#90A4AE;text-transform:uppercase;letter-spacing:.06em}
.footer{margin-top:2rem;padding-top:.85rem;border-top:1px solid #E8F5E9;display:flex;justify-content:space-between;font-size:.68rem;color:#90A4AE}
ul{margin:.5rem 0 0 1.4rem;color:#333;line-height:1.9}
li{font-size:.82rem}
@media print{button{display:none!important}}
</style></head><body>

<div class="hdr">
  <div class="tag">🏛️ Kenya National Carbon Registry · Official Submission Package</div>
  <h1 style="color:#fff">Project Design Document</h1>
  <div style="color:rgba(255,255,255,.65);font-size:.85rem">${name}</div>
  <div style="color:rgba(255,255,255,.5);font-size:.73rem;margin-top:.72rem;display:flex;gap:1.5rem;flex-wrap:wrap">
    <span>Proponent: ${proponent}</span><span>County: ${county}</span>
    <span>Credits: ${credits.toLocaleString()} tCO₂e/yr</span><span>Date: ${now}</span><span>Ref: ${ref}</span>
  </div>
</div>

<h2>1. Project Summary</h2>
<table>
  <tr><td><strong>Project Title</strong></td><td>${name}</td></tr>
  <tr><td><strong>Project Proponent</strong></td><td>${proponent}</td></tr>
  <tr><td><strong>Location</strong></td><td>${county} County, Republic of Kenya</td></tr>
  <tr><td><strong>Est. Annual Credits</strong></td><td><strong>${credits.toLocaleString()} tCO₂e/yr</strong></td></tr>
  <tr><td><strong>Registry Standard</strong></td><td>${standard}</td></tr>
  <tr><td><strong>Crediting Period</strong></td><td>10 years (renewable)</td></tr>
  <tr><td><strong>Methodology</strong></td><td>Netzerra v1.0 — IPCC 2006 Guidelines, AR6 GWP₁₀₀ values</td></tr>
  <tr><td><strong>Reference</strong></td><td>${ref}</td></tr>
</table>

<h2>2. Legal Framework</h2>
<ul>
  <li><strong>Climate Change Act 2016 (Amended 2023)</strong> — establishes KNCR legal basis</li>
  <li><strong>Carbon Markets Regulations 2024</strong> — 25% community mandate, 15% preferential tax, Article 6</li>
  <li><strong>KNCR Platform</strong> (kncr.go.ke) — launched 17 February 2026</li>
  <li><strong>Paris Agreement Article 6.2</strong> — governs ITMO transfers</li>
</ul>
<div class="info">Emission calculations prepared by Netzerra using IPCC 2006 methodology and IPCC AR6 GWP₁₀₀ values — aligned with IPCC 2006 / AR6 methodology used by Verra VCS, Gold Standard, and KNCR domestic standard. Independent VVB verification required before formal registration.</div>

<h2>3. Baseline &amp; Additionality</h2>
${c ? `<p>Baseline emissions (from Netzerra calculation): <strong>${c.total_t.toFixed(3)} tCO₂e/yr</strong></p>
<table>
  <tr><th>Scope</th><th>tCO₂e/yr</th><th>%</th></tr>
  <tr><td>Scope 1 — Direct</td><td>${c.s1_t.toFixed(3)}</td><td>${c.total_t>0?(c.s1_t/c.total_t*100).toFixed(1):0}%</td></tr>
  <tr><td>Scope 2 — Energy</td><td>${c.s2_t.toFixed(3)}</td><td>${c.total_t>0?(c.s2_t/c.total_t*100).toFixed(1):0}%</td></tr>
  <tr><td>Scope 3 — Embodied</td><td>${c.s3_t.toFixed(3)}</td><td>${c.total_t>0?(c.s3_t/c.total_t*100).toFixed(1):0}%</td></tr>
  <tr class="tot"><td>TOTAL</td><td>${c.total_t.toFixed(3)}</td><td>100%</td></tr>
</table>` : '<p>Run a Netzerra calculation first to populate this section with verified baseline data.</p>'}
<p>Claimed annual reduction: <strong>${credits.toLocaleString()} tCO₂e/yr</strong>. Full additionality demonstration per ${standard} methodology to be provided in final PDD with third-party VVB engagement.</p>

<h2>4. Community Benefit Plan (25% Mandate)</h2>
<table>
  <tr><th>Revenue Stream</th><th>Annual (USD @ $12/t)</th><th>Annual (KES @ 130)</th><th>Share</th></tr>
  <tr><td>Gross Credit Revenue</td><td>USD ${(credits*12).toLocaleString()}</td><td>KES ${(credits*12*130).toLocaleString()}</td><td>100%</td></tr>
  <tr><td><strong>Community Fund (mandatory)</strong></td><td><strong>USD ${(credits*12*.25).toLocaleString()}</strong></td><td><strong>KES ${(credits*12*130*.25).toLocaleString()}</strong></td><td><strong>25%</strong></td></tr>
  <tr><td>Developer Share</td><td>USD ${(credits*12*.75).toLocaleString()}</td><td>KES ${(credits*12*130*.75).toLocaleString()}</td><td>75%</td></tr>
  <tr class="tot"><td>Net (after 15% preferential tax)</td><td>USD ${Math.round(credits*12*.75*.85).toLocaleString()}</td><td>KES ${Math.round(credits*12*130*.75*.85).toLocaleString()}</td><td>~64%</td></tr>
</table>

<h2>5. Environmental &amp; Social Safeguards</h2>
<ul>
  <li>Free, Prior and Informed Consent (FPIC) of affected communities to be documented</li>
  <li>Gender-sensitive stakeholder engagement plan to be prepared</li>
  <li>Environmental and Social Impact Assessment (ESIA) per NEMA requirements</li>
  <li>No involuntary displacement or restriction of resource access</li>
  <li>Grievance redress mechanism at community level</li>
</ul>

<h2>6. DNA Submission Checklist</h2>
<table>
  <tr><th>Document</th><th>Status</th></tr>
  <tr><td>Project Concept Note (PCN)</td><td>✅ This package</td></tr>
  <tr><td>Emission Baseline Report</td><td>${c ? '✅ Section 3 above' : '📋 Run Netzerra calculation first'}</td></tr>
  <tr><td>IPCC Methodology Declaration</td><td>✅ Included</td></tr>
  <tr><td>Community Benefit Sharing Plan</td><td>✅ Section 4 above</td></tr>
  <tr><td>Full Project Design Document (PDD)</td><td>📋 Engage VVB validator</td></tr>
  <tr><td>ESIA Report</td><td>📋 NEMA-accredited firm required</td></tr>
  <tr><td>Letter of Authorisation (LoA)</td><td>🔒 Issued by DNA/NEMA after review</td></tr>
</table>
<div class="warn">⚠️ The Letter of Authorisation (LoA) for Article 6 ITMOs is issued exclusively by NEMA's Climate Change Directorate. This package prepares all applicant-side documents.</div>

<h2>7. Sign-off</h2>
<p>We declare the information in this package is accurate and prepared in good faith per Kenya's Carbon Markets Regulations 2024.</p>
<div class="sign-grid">
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">Project Proponent — ${proponent}</div></div>
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">Date — ${now}</div></div>
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">Netzerra Analyst — Shukri Ali</div></div>
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">DNA Receiving Officer (NEMA)</div></div>
</div>

<div class="footer">
  <span>🌿 Netzerra · shukriali411@gmail.com · +254 705 366 807 · netzerrakenya.com</span>
  <span>kncr.go.ke · nema.go.ke · climate.go.ke</span>
</div>
</body></html>`;

  const blob = new Blob([html], { type:'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'KNCR_Package_' + name.replace(/\s+/g,'-') + '_' + new Date().toISOString().split('T')[0] + '.html';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('📄 KNCR package downloaded! Open in browser → Print → Save as PDF', 'success');
}

// ── COMMUNITY BENEFIT CALCULATOR ─────────────────────
function calcCB() {
  const cr  = parseFloat(document.getElementById('cb-credits').value) || 0;
  const pr  = parseFloat(document.getElementById('cb-price').value)   || 12;
  const yr  = parseFloat(document.getElementById('cb-years').value)   || 10;
  const fx  = parseFloat(document.getElementById('cb-fx').value)      || 130;
  const typ = document.getElementById('cb-type')?.value || 'land';
  // Verified: Carbon Markets Regulations 2024 Reg.23E
  // Land-based (public/community land): 40% | Non-land: 25% | Private land: exempt
  const commRate = typ === 'land' ? 0.40 : typ === 'nonland' ? 0.25 : 0;
  const rateLabel = typ === 'land' ? '40% (land-based mandate)' : typ === 'nonland' ? '25% (non-land mandate)' : '0% (private land — exempt)';
  const gross = cr * pr;
  const comm  = gross * commRate;
  const dev   = gross - comm;
  const tax   = dev * 0.15;
  const f = u => `USD ${u.toLocaleString(undefined,{maximumFractionDigits:0})}  (KES ${Math.round(u*fx).toLocaleString()})`;
  document.getElementById('cb-rate-label').textContent = rateLabel;
  document.getElementById('cb-gross').textContent = f(gross);
  document.getElementById('cb-comm').textContent  = f(comm);
  document.getElementById('cb-dev').textContent   = f(dev);
  document.getElementById('cb-tax').textContent   = f(tax);
  document.getElementById('cb-life').textContent  = f(gross * yr);
  document.getElementById('cb-net').textContent   = f((dev - tax) * yr);
}

// ── METHODOLOGY PANELS ───────────────────────────────
function showMethodPanel(id, el) {
  document.querySelectorAll('.method-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.method-nav-item').forEach(n => n.classList.remove('active'));
  const p = document.getElementById('mp-' + id);
  if (p) p.classList.add('active');
  if (el) el.classList.add('active');
}

// ── MODALS ────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    closeOnboarding();
  }
});

function processMpesa() {
  const ph = document.getElementById('mpesa-phone').value;
  if (!ph) { toast('Enter your M-Pesa number.', 'error'); return; }
  closeModal('modal-mpesa');
  toast('📱 STK Push sent to ' + ph + ' — approve on your phone.', 'info');
  setTimeout(() => toast('✅ Payment confirmed! Plan activated. 🌿', 'success'), 2800);
}

function openPayment(plan, price) {
  document.getElementById('modal-plan-label').textContent = plan + ' Plan — ' + price + '/month';
  document.getElementById('modal-plan-amount').textContent = price + '/month';
  openModal('modal-mpesa');
}

// ── TOAST ─────────────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 3400);
}

// ── RENDER ALL CONTENT ────────────────────────────────
function renderAll() {
  renderLeaderboard();
  renderCommunity();
  renderOffsets();
  renderDocs();
  renderMarketplace();
  renderPricing();
  renderFAQs();
}

function renderLeaderboard() {
  const orgs = [
    { name:'Narok County Government',       sub:'Livestock & Agroforestry', score:84, pct:100 },
    { name:'Laikipia Water & Sanitation',    sub:'Borehole Operations',      score:79, pct:94 },
    { name:'Turkana Irrigation Authority',   sub:'Irrigation Systems',       score:74, pct:88 },
    { name:'Nakuru Agricultural Board',      sub:'Mixed Farming',            score:70, pct:83 },
    { name:'Baringo Livestock Co-op',        sub:'Livestock',                score:67, pct:80 },
    { name:'Machakos County Water',          sub:'Borehole & Transport',     score:63, pct:75 },
    { name:'Kitui Farmers Network',          sub:'Irrigation & Crops',       score:58, pct:69 },
  ];
  const rc = ['g','s','b'];
  document.getElementById('leaderboard-list').innerHTML = orgs.map((o,i) => `
    <div class="lb-item">
      <div class="lb-rank ${rc[i]||''}">${i+1}</div>
      <div class="lb-org"><div class="name">${o.name}</div><div class="sub">${o.sub}</div></div>
      <div class="lb-bar-bg"><div class="lb-bar-fill" style="width:${o.pct}%"></div></div>
      <div class="lb-score">${o.score}</div>
    </div>`).join('');
}

function renderCommunity() {
  const posts = [
    { init:'AM', author:'Amina Mwangi',  time:'2h ago',  text:'Laikipia Water Authority completed our first IPCC Tier 1 borehole audit via Netzerra! Result: 48.2 tCO₂e/yr for BH-07 in Rumuruti. Proposing bamboo offset to county board next week. 🌿', likes:24, coms:8 },
    { init:'DO', author:'Dennis Ochieng', time:'5h ago',  text:'Pro tip: if you track fuel receipts, use the Fuel-Based method — far more accurate. DEFRA/BEIS 2023 = 2.68 kgCO₂e/L diesel. Most Kenya fleet managers have fuel cards, so data is usually available! 🚛', likes:18, coms:5 },
    { init:'FK', author:'Fatuma Kamau',   time:'1d ago',  text:'Used Netzerra to prepare our county emission baseline data for the FLLoCA readiness assessment. The checklist format made it so much easier to organise everything before filling the official NTPIU templates. Recommended! 🌿', likes:47, coms:19 },
    { init:'JM', author:'James Mwenda',   time:'2d ago',  text:'For livestock operators: biggest emission reduction I\'ve found is switching from pit manure to biogas digesters. Cuts manure CH₄ by ~90% AND gives cooking fuel. SNV Kenya has subsidised digesters for qualifying farms.', likes:31, coms:12 },
  ];
  document.getElementById('community-feed').innerHTML = `
    <div style="background:rgba(58,170,92,.09);border:1px solid rgba(58,170,92,.22);border-radius:var(--r);padding:1rem 1.2rem;display:flex;align-items:center;gap:.9rem;margin-bottom:.2rem">
      <div style="font-size:1.8rem">🎯</div>
      <div><div style="font-weight:600;color:var(--mint);font-size:.87rem">Netzerra Community reaches 10,000 tCO₂e tracked</div><div style="font-size:.72rem;color:rgba(255,255,255,.45)">Milestone achieved 28 Feb 2026 — 47 projects across 12 counties</div></div>
    </div>
    ${posts.map(p=>`
      <div class="post">
        <div class="post-hdr"><div class="post-av">${p.init}</div><div class="post-meta"><div class="author">${p.author}</div><div class="time">${p.time}</div></div></div>
        <div class="post-body">${p.text}</div>
        <div class="post-acts">
          <button class="post-act" onclick="toast('Liked! ❤️','success')">❤️ ${p.likes}</button>
          <button class="post-act" onclick="toast('Comments coming soon!','info')">💬 ${p.coms}</button>
          <button class="post-act" onclick="toast('Shared!','success')">🔗 Share</button>
        </div>
      </div>`).join('')}`;

  document.getElementById('community-stats').innerHTML = [
    ['Active Members','847'],['Reports Generated','1,240'],
    ['tCO₂e Tracked','12,840'],['Offsets Facilitated','3,210 t'],
    ['Counties Represented','38'],['Avg NTZ Score','67'],
  ].map(([l,val]) => `<div class="c-stat"><span>${l}</span><span class="val">${val}</span></div>`).join('');

  document.getElementById('contributor-list').innerHTML = [
    ['Fatuma Kamau','FK','2,840 pts'],['Amina Mwangi','AM','2,240 pts'],
    ['Dennis Ochieng','DO','1,920 pts'],['James Mwenda','JM','1,580 pts'],
    ['Shukri Ali','SA','1,340 pts'],
  ].map(([n,i,p]) => `
    <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:.48rem">
      <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--fern),var(--leaf));display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700">${i}</div>
      <span style="font-size:.8rem">${n}</span>
      <span style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:.75rem;color:var(--gold)">${p}</span>
    </div>`).join('');
}

function renderOffsets() {
  const strategies = [
    { type:'Agroforestry', icon:'🎋', name:'Bamboo Plantation', rate:'17', unit:'tCO₂e/ha/yr', desc:'Arundinaria alpina at 1,600 stems/ha. Fast-growing, high sequestration. Also provides construction material income for communities.', ref:'Yuen et al. 2017 · Forest Ecology & Management', cost:'KES 12,000–18,000/ha' },
    { type:'Agroforestry', icon:'🌲', name:'Casuarina equisetifolia', rate:'8', unit:'tCO₂e/ha/yr', desc:'Pioneer nitrogen-fixing tree for ASAL and coastal Kenya. Rapid establishment in degraded soils. Used in Turkana and Marsabit community forestry.', ref:'KEFRI 2019', cost:'KES 6,000–10,000/ha' },
    { type:'Agroforestry', icon:'🌳', name:'Grevillea robusta', rate:'6', unit:'tCO₂e/ha/yr', desc:'Silky oak — widely adopted in Kenyan smallholder systems. Compatible with row cropping. Timber + shade income alongside carbon.', ref:'KEFRI 2019', cost:'KES 4,000–8,000/ha' },
    { type:'Technology', icon:'🔥', name:'Biogas Digesters', rate:'3.5', unit:'tCO₂e/unit/yr', desc:'Farm-scale digesters replace firewood and capture manure methane. SNV Kenya subsidy available. Each 8m³ digester serves 6–8 family meals/day.', ref:'SNV Kenya 2021', cost:'KES 80,000–120,000 (subsidised)' },
    { type:'Technology', icon:'☀️', name:'Solar Pump Replacement', rate:'2.68 × L', unit:'kgCO₂e/L diesel', desc:'Replace diesel borehole pump with solar PV. Eliminates all Scope 1 pump emissions. Payback: 3–5 years Kenya context.', ref:'IPCC 2006 Vol.2', cost:'KES 200K–800K' },
    { type:'Blue Carbon', icon:'🌊', name:'Mangrove Restoration', rate:'6.4', unit:'tCO₂e/ha/yr', desc:'Coastal mangroves (Mombasa, Kwale, Kilifi) offer highest carbon density of any ecosystem — including deep soil carbon.', ref:'Alongi 2014 · Annual Review Marine Science', cost:'KES 25,000–40,000/ha' },
    { type:'Agriculture', icon:'🌱', name:'Soil Carbon Enhancement', rate:'0.4', unit:'tCO₂e/ha/yr', desc:'Conservation agriculture, reduced tillage, and cover cropping build soil organic matter. Co-benefits: water retention, improved yield.', ref:'IPCC 2019 Refinement T5.5', cost:'Minimal — reduced input costs' },
    { type:'Transport', icon:'⚡', name:'Electric Motorcycle (Boda)', rate:'0.103', unit:'kgCO₂e/km', desc:'Replace petrol boda-bodas with electric models. 103g CO₂e/km saving at current KPLC grid mix. Reduces urban air pollution too.', ref:'DEFRA/BEIS 2023', cost:'KES 150,000–250,000/bike' },
    { type:'Agroforestry', icon:'🌴', name:'Acacia tortilis (ASAL)', rate:'4', unit:'tCO₂e/ha/yr', desc:'Indigenous acacia well-adapted to arid conditions. Fixes nitrogen, provides livestock shade and fodder — reducing feed concentrate demand.', ref:'KEFRI 2020 ASAL Handbook', cost:'KES 2,500–5,000/ha' },
  ];
  document.getElementById('offset-grid').innerHTML = strategies.map(s => `
    <div class="offset-card">
      <div class="offset-type">${s.type}</div>
      <h4>${s.icon} ${s.name}</h4>
      <p style="font-size:.8rem;margin:.4rem 0 .7rem">${s.desc}</p>
      <div class="offset-stat">${s.rate}</div>
      <div class="offset-unit">${s.unit}</div>
      <div class="offset-ref">📚 ${s.ref}</div>
      <div style="font-size:.65rem;color:rgba(255,255,255,.28);margin-top:3px">💰 ${s.cost}</div>
      <div class="offset-act">
        <button class="btn-off-p" onclick="toast('Added to offset plan!','success')">+ Add to Plan</button>
        <button class="btn-off-s" onclick="showSection('marketplace')">Buy →</button>
      </div>
    </div>`).join('');
}

function renderDocs() {
  const docs = [
    { icon:'📊', tag:'All Sectors',   title:'Emission Factor Database — Kenya 2024',    desc:'Complete reference of all 40+ Netzerra EFs. Colour-coded, source-cited, printable.' },
    { icon:'🐄', tag:'Livestock',     title:'Livestock GHG Audit Template',             desc:'IPCC Tier 1 livestock reference sheet — 8 species, AR6 GWP, manure system guide.' },
    { icon:'✅', tag:'Compliance',    title:'ISO 14064 Compliance Checklist',           desc:'47-item self-assessment across 6 sections. Audit-ready format.' },
    { icon:'💧', tag:'Borehole',      title:'Borehole Carbon Assessment Protocol',      desc:'Field protocol: drilling logs, electricity metering, material manifests.' },
    { icon:'🚌', tag:'Transport',     title:'Transport & Logistics Fleet Audit Guide',  desc:'Data collection guide: matatu SACCOs, freight, boda-bodas, cold chain, SGR.' },
    { icon:'🏗️', tag:'Construction', title:'Construction Embodied Carbon Checklist',   desc:'BOQ mapper to Bath ICE v3.0 EFs. Low-carbon substitution options for every material.' },
    { icon:'📋', tag:'All Sectors',   title:'Netzerra Methodology Report v1.0',         desc:'Full technical document: all formulas, EFs, scope definitions, 14 citations.' },
    { icon:'🏭', tag:'Manufacturing', title:'Manufacturing SME Benchmarks',             desc:'16 Kenyan industries benchmarked. CBAM flags. Best-practice frontiers.' },
  ];
  document.getElementById('docs-grid').innerHTML = docs.map(d => `
    <div class="doc-card">
      <span class="doc-type html">HTML → PDF</span>
      <div style="font-size:1.9rem;margin-bottom:.5rem">${d.icon}</div>
      <h4>${d.title}</h4>
      <p style="font-size:.78rem;margin:.38rem 0 .65rem">${d.desc}</p>
      <div style="display:flex;align-items:center;gap:.5rem">
        <span style="background:rgba(58,170,92,.14);color:var(--mint);padding:.18rem .62rem;border-radius:12px;font-size:.68rem">${d.tag}</span>
        <span style="font-size:.68rem;color:var(--mint);opacity:.8">✅ Free download</span>
      </div>
      <button class="btn-dload" onclick="toast('Generating document...','info');setTimeout(()=>toast('✅ Document ready! Open in browser → Print → Save as PDF','success'),800)">⬇️ Download</button>
    </div>`).join('');
}

function renderMarketplace() {
  const items = [
    { e:'🎋', cat:'Seedlings',    name:'Bamboo Starter Kit (100 stems)', desc:'Arundinaria alpina highland varieties. Includes planting guide, 3-month survival guarantee.', price:'KES 4,500', unit:'/kit' },
    { e:'🌲', cat:'Seedlings',    name:'Casuarina Pack (50 seedlings)',  desc:'KEFRI-certified Casuarina equisetifolia. Ideal for ASAL. Carbon certificate included.',          price:'KES 2,800', unit:'/pack' },
    { e:'🔥', cat:'Technology',   name:'8m³ Biogas Digester Package',    desc:'Complete installation: tank, pipe, burner. SNV Kenya partner support. KES 40K subsidy available.', price:'KES 85,000', unit:'/unit' },
    { e:'☀️', cat:'Technology',   name:'2kW Solar Pump System',          desc:'550W panels + submersible pump + controller. Boreholes up to 80m. Saves ~4,000L diesel/yr.',       price:'KES 245,000', unit:'/system' },
    { e:'🌳', cat:'Consultancy',  name:'Carbon Audit — Livestock',       desc:'IPCC Tier 1 audit by certified Netzerra consultant. Field verification + report + NTZ Score.',     price:'KES 45,000', unit:'/audit' },
    { e:'📊', cat:'Consultancy',  name:'County GHG Inventory Workshop',  desc:'Full-day capacity building for county agriculture staff. Up to 20 participants.',                  price:'KES 65,000', unit:'/day' },
    { e:'🌊', cat:'Blue Carbon',  name:'Mangrove Restoration Credit',    desc:'Pre-verified project (Kwale Coast). 1 credit = 1 tCO₂e. Verra VCS pending.',                       price:'KES 1,200', unit:'/tCO₂e' },
    { e:'⚡', cat:'Transport',    name:'Electric Boda-Boda (AGRI Fleet)', desc:'Solar-charged delivery motorcycle. 120km range, 200kg payload. Saves 103g CO₂e/km.',             price:'KES 185,000', unit:'/unit' },
  ];
  document.getElementById('market-grid').innerHTML = items.map(item => `
    <div class="market-card">
      <div class="market-img">${item.e}</div>
      <div class="market-body">
        <div class="market-cat">${item.cat}</div>
        <h4>${item.name}</h4>
        <p>${item.desc}</p>
        <div class="market-footer">
          <div class="market-price">${item.price}<small>${item.unit}</small></div>
          <button class="btn-buy" onclick="toast('Added to cart! 🛒','success')">Buy →</button>
        </div>
      </div>
    </div>`).join('');
}

function renderPricing() {
  const el = document.getElementById('pricing-grid');
  if (!el) return;

  const plans = [
    { icon:'🌱', name:'Seedling', price:'Free',       period:'forever', isDemo:false, isCurrent:false,
      desc:'Individuals, students, small operators.',
      features:['3 calculations/month','Borehole + Livestock','Basic PDF reports','Community feed','Documentation downloads','NTZ Score'] },
    { icon:'🌿', name:'Grower',  price:'KES 1,500', period:'/month',   isDemo:false, isCurrent:false,
      desc:'Active operators, NGO teams, SACCO managers.',
      features:['Unlimited calculations','All 5 sectors','ISO 14064 PDF reports','Carbon Passport','Offset planning','Leaderboard listing'] },
    { icon:'🌲', name:'Forest',  price:'KES 8,000', period:'/month',   isDemo:false, isCurrent:false,
      desc:'County governments, factories, research institutions.',
      features:['Everything in Grower','Multi-user (10 seats)','County Dashboard','KNCR packages','FLLoCA reports','API access','Account manager'] },
    { icon:'🏔️', name:'Canopy', price:'KES 25,000',period:'/month',   isDemo:true,  isCurrent:true,
      desc:'Enterprises, carbon market participants, national programmes.',
      features:['Everything in Forest','Unlimited users','Verra VCS registration','White-label reports','On-site training 2 days/yr','4hr SLA','Executive climate briefings'] },
  ];

  el.innerHTML = `
    <div style="background:rgba(245,166,35,.12);border:2px solid rgba(245,166,35,.4);border-radius:var(--r);padding:1.1rem 1.4rem;margin-bottom:1.65rem;text-align:center;grid-column:1/-1">
      <div style="font-size:1.1rem;font-weight:700;color:var(--gold);margin-bottom:.42rem">🏔️ Canopy Plan — Active for All Demo Users</div>
      <p style="font-size:.8rem;color:rgba(255,255,255,.7);margin-bottom:.52rem;max-width:520px;margin-left:auto;margin-right:auto">
        During this MVP demo period every visitor has full Canopy access — all 5 calculators, County Dashboard,
        KNCR packages, FLLoCA reports, white-label PDFs, and everything else. No login or payment required.
      </p>
      <span style="display:inline-block;background:rgba(245,166,35,.18);border:1px solid rgba(245,166,35,.35);color:var(--gold);font-size:.7rem;font-weight:600;padding:.28rem .88rem;border-radius:999px">
        🚧 Paid subscriptions will activate when Netzerra launches commercially
      </span>
    </div>
    ${plans.map(p => `
    <div class="pricing-card ${p.isCurrent ? 'featured' : ''}">
      ${p.isCurrent ? '<div class="pop-badge" style="background:var(--gold);color:#0D3320">✅ Your Plan (Demo)</div>' : ''}
      <div class="plan-icon">${p.icon}</div>
      <div class="plan-name">${p.name}</div>
      <div style="font-size:.72rem;color:rgba(255,255,255,.45);margin-bottom:.88rem">${p.desc}</div>
      <div class="plan-price" style="${p.isCurrent ? 'color:var(--gold)' : ''}">${p.isCurrent ? 'Demo' : p.price}
        <small>${p.isCurrent ? ' — free now' : p.period !== 'forever' ? ' / mo' : ''}</small>
      </div>
      <div class="plan-period" style="margin-bottom:1.05rem">
        ${p.isCurrent ? '🏔️ All features unlocked' : p.period === 'forever' ? 'Free forever' : 'M-Pesa billing at launch'}
      </div>
      <ul class="plan-features">${p.features.map(f => '<li>' + f + '</li>').join('')}</ul>
      <button class="btn-plan ${p.isCurrent ? 'p' : 's'}" data-plan="${p.name}" data-demo="${p.isCurrent}" onclick="handlePlanClick(this)">
        ${p.isCurrent ? '🏔️ Active — Canopy Demo' : 'Available at Launch'}
      </button>
      ${p.isCurrent ? '<div class="mpesa-note" style="color:var(--gold);opacity:.8">Becomes KES 25,000/mo at launch</div>' : ''}
    </div>`).join('')}`;
}

function handlePlanClick(btn) {
  const isDemo = btn.getAttribute('data-demo') === 'true';
  const name   = btn.getAttribute('data-plan');
  if (isDemo) {
    toast('You have full Canopy access during the demo! No login needed.', 'success');
  } else {
    toast(name + ' plan — will be available at commercial launch. You have Canopy access now.', 'info');
  }
}


function renderFAQs() {
  const faqs = [
    { q:'What emission factors does Netzerra use?', a:'IPCC 2006 Guidelines with selectable GWP values — AR6 (default, Kenya KNCR) or AR5 (UNFCCC Paris Agreement). AR6 values: CH₄ = 27.0, N₂O = 273, HFC-134a = 1,530 (GHG Protocol Aug 2024). Kenya grid: 0.070 kgCO₂e/kWh (IEA 2024, ~90% renewable). DEFRA/BEIS 2023 for transport. KEFRI 2019 for agroforestry.' },
    { q:'Are Netzerra reports accepted by donors?', a:'Netzerra reports follow ISO 14064-1:2018 format and IPCC AR6 methodology — the same standards required by most development finance institutions. Reports have not been formally endorsed by any specific organisation. Users should verify acceptance requirements with their specific donor or regulatory body before submission.' },
    { q:'How is the NTZ Score calculated?', a:'The NTZ Score (0–100) combines: emission intensity vs sector benchmark (40 pts), offset-to-emission ratio (30 pts), year-on-year reduction rate (20 pts), and platform engagement (10 pts).' },
    { q:'What is the Kenya Power grid emission factor?', a:"Kenya's grid is ~90% renewable (geothermal 44%, hydro 23%, wind 16%). Netzerra uses 0.070 kgCO₂e/kWh (IEA 2024 / SEforAll Kenya). A figure of 0.497 kgCO₂e/kWh was previously incorrect — that value applies to fossil-heavy grids and has been corrected." },
    { q:'What is the County Dashboard for?', a:'County officers can use it to track all carbon projects in their county, verify community benefit fund distributions (40% for land-based, 25% for non-land — Carbon Markets Regulations 2024), check FLLoCA compliance status, and track carbon levy revenue by ward.' },
    { q:'How does PDF report generation work?', a:'Netzerra uses html2pdf.js to generate a real PDF client-side in your browser. Reports include uncertainty bands (IPCC Tier 1), data quality scores, GWP version used, and plausibility flags — formatted for NEMA and VCM verifier submissions.' },
    { q:'What is KNCR and why does it matter?', a:"Kenya's National Carbon Registry (KNCR) went live 17 February 2026. Governed by the Carbon Markets Regulations 2024 and Carbon Trading Regulations 2025. All carbon projects must register. False data carries a KES 500M penalty. Netzerra is the first automation tool generating KNCR-compliant documentation." },
    { q:'How do I pay with M-Pesa?', a:'Select a plan, click "Upgrade with M-Pesa", enter your Safaricom number, and approve the STK Push notification on your phone. Payment processes in seconds. You receive a receipt via email and SMS.' },
  ];
  document.getElementById('faq-list').innerHTML = faqs.map(f => `
    <div class="faq-item">
      <div class="faq-q" onclick="toggleFAQ(this)">
        <span>${f.q}</span><span class="arr">▼</span>
      </div>
      <div class="faq-a">${f.a}</div>
    </div>`).join('');
}

function toggleFAQ(el) {
  el.classList.toggle('open');
  el.nextElementSibling.classList.toggle('vis');
}

// ══════════════════════════════════════════════════════
// IMPROVEMENT 1 — sessionStorage Persistence (auto-clears when browser closes)
// ══════════════════════════════════════════════════════
const LS_KEY = 'ntz_v1';

function saveToStorage() {
  try {
    const payload = {
      user:      S.user,
      projects:  S.kncr.projects,
      lastCalc:  S.lastCalc,
      gwp:       ACTIVE_GWP,
      savedAt:   new Date().toISOString(),
    };
    sessionStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch(e) { /* storage full or private mode — silent fail */ }
}

function loadFromStorage() {
  try {
    const raw = sessionStorage.getItem(LS_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (d.user)     Object.assign(S.user, d.user);
    if (d.projects) S.kncr.projects = d.projects;
    if (d.lastCalc) S.lastCalc = d.lastCalc;
    if (d.gwp)      applyGWP(d.gwp);
    return true;
  } catch(e) { return false; }
}

function clearStorage() {
  sessionStorage.removeItem(LS_KEY);
  toast('🗑️ Saved data cleared. Refresh to reset.', 'info');
}

// Auto-save after every calculation, every KNCR project add, every profile update
// Patch showResults to also save and run benchmark
const _origShowResults = window._origShowResults || null; // store ref

function postCalcHooks() {
  saveToStorage();
  if (S.lastCalc) updateBenchmarkCallout(S.lastCalc.total_t, S.lastCalc.sector);
}

// ══════════════════════════════════════════════════════
// IMPROVEMENT 2 — Shareable Report URL
// ══════════════════════════════════════════════════════
function generateShareURL() {
  const c = S.lastCalc;
  if (!c) { toast('Run a calculation first!', 'error'); return; }
  const payload = btoa(JSON.stringify({
    n: c.name, s: c.sector, t: c.total_t.toFixed(3),
    s1: c.s1_t.toFixed(3), s2: c.s2_t.toFixed(3), s3: c.s3_t.toFixed(3),
    d: c.date, g: ACTIVE_GWP, dq: c.dqs, r: c.ref,
    org: S.user.org,
  }));
  const url = window.location.origin + window.location.pathname + '?r=' + payload;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url)
      .then(() => toast('🔗 Share link copied to clipboard!', 'success'))
      .catch(() => promptCopyURL(url));
  } else {
    promptCopyURL(url);
  }
  return url;
}

function promptCopyURL(url) {
  const box = document.getElementById('share-url-box');
  if (box) { box.value = url; box.style.display = 'block'; box.select(); }
  toast('📋 Copy the link from the field below the buttons.', 'info');
}

function loadSharedReport() {
  const params = new URLSearchParams(window.location.search);
  const r = params.get('r');
  if (!r) return;
  try {
    const d = JSON.parse(atob(r));
    // Restore a read-only view of the shared result
    S.lastCalc = {
      name: d.n, sector: d.s, total_t: parseFloat(d.t),
      s1_t: parseFloat(d.s1), s2_t: parseFloat(d.s2), s3_t: parseFloat(d.s3),
      date: d.d, dqs: d.dq || 0, dqsGrade: 'Shared report',
      ref: d.r, flags: [], sources: [], gwp: d.g || 'AR6',
      uncertainty: calcUncertainty(parseFloat(d.t), d.s),
    };
    if (d.org) S.user.org = d.org;
    if (d.g)  applyGWP(d.g);

    // Show results panel with shared data
    showSection('calculator');
    setTimeout(() => {
      const c = S.lastCalc;
      document.getElementById('res-empty').style.display = 'none';
      document.getElementById('res-content').style.display = 'block';
      document.getElementById('res-total').textContent = c.total_t.toFixed(2);
      document.getElementById('res-s1').textContent = c.s1_t.toFixed(2) + ' t';
      document.getElementById('res-s2').textContent = c.s2_t.toFixed(2) + ' t';
      document.getElementById('res-s3').textContent = c.s3_t.toFixed(2) + ' t';
      document.getElementById('res-score').textContent = calcNTZScore(c.total_t, c.sector);
      document.getElementById('res-grade').textContent = gradeFromScore(calcNTZScore(c.total_t, c.sector));
      document.getElementById('res-breakdown').innerHTML = `<b style="color:var(--mint)">Shared Report</b><br>Project: ${c.name}<br>Sector: ${c.sector}<br>Date: ${c.date}`;
      document.getElementById('res-offsets').innerHTML   = `<b>Shared report — run your own calculation to add offset recommendations</b>`;
      document.getElementById('res-gwp-tag').textContent = `${c.gwp || 'AR6'} · Shared Report`;
      const unc = c.uncertainty;
      document.getElementById('res-uncertainty').style.display = 'block';
      document.getElementById('res-unc-range').textContent = `${unc.low} – ${unc.high} tCO₂e/yr`;
      document.getElementById('res-unc-pct').textContent   = `±${unc.pct}%`;
      document.getElementById('res-unc-basis').textContent = unc.basis;
      const mx = Math.max(c.s1_t, c.s2_t, c.s3_t, 0.001);
      document.getElementById('res-s1-bar').style.width = (c.s1_t / mx * 100) + '%';
      document.getElementById('res-s2-bar').style.width = (c.s2_t / mx * 100) + '%';
      document.getElementById('res-s3-bar').style.width = (c.s3_t / mx * 100) + '%';
      document.getElementById('res-dqs-score').textContent = c.dqs || 0;
      document.getElementById('res-dqs-grade').textContent = '📤 Shared report';
      document.getElementById('res-flags').style.display = 'none';
      document.getElementById('res-sources').style.display = 'none';
      updateBenchmarkCallout(c.total_t, c.sector);
      toast(`📤 Shared report loaded: ${c.name} · ${c.total_t.toFixed(2)} tCO₂e/yr`, 'success');
    }, 300);
    // Clean URL without reloading
    window.history.replaceState({}, '', window.location.pathname);
  } catch(e) {
    console.warn('Invalid share URL:', e);
  }
}

// ══════════════════════════════════════════════════════
// IMPROVEMENT 4 — Sector Benchmark Comparison callout
// ══════════════════════════════════════════════════════
// Kenya sector averages (estimated from IPCC defaults + Kenya context)
const SECTOR_AVERAGES = {
  borehole:  { avg: 82,   unit:'tCO₂e/yr', context:'Kenya borehole average (IPCC Tier 1 defaults)' },
  livestock: { avg: 580,  unit:'tCO₂e/yr', context:'Kenya mixed herd average per smallholder operation' },
  transport: { avg: 312,  unit:'tCO₂e/yr', context:'Kenyan SACCO fleet average (30 vehicles)' },
  construct: { avg: 1840, unit:'tCO₂e project', context:'Kenya construction project average (KSHS 50M contract)' },
  manufact:  { avg: 890,  unit:'tCO₂e/yr', context:'Kenya SME manufacturing average' },
};

function updateBenchmarkCallout(total_t, sector) {
  const el = document.getElementById('res-benchmark');
  if (!el) return;
  const bench = SECTOR_AVERAGES[sector];
  if (!bench) { el.style.display = 'none'; return; }
  const ratio   = total_t / bench.avg;
  const pctDiff = Math.abs((ratio - 1) * 100).toFixed(0);
  let msg, cls;
  if (ratio < 0.5) {
    msg = `🌟 <b>Exceptional:</b> Your ${sector} emits <b>${total_t.toFixed(1)} tCO₂e/yr</b> — ${pctDiff}% <em>below</em> the Kenya sector average of ${bench.avg} tCO₂e. Top-quartile performance.`;
    cls = 'bench-excellent';
  } else if (ratio < 1.0) {
    msg = `✅ <b>Below average:</b> Your ${sector} emits <b>${total_t.toFixed(1)} tCO₂e/yr</b> — ${pctDiff}% below the Kenya sector average of ${bench.avg} tCO₂e. Good performance.`;
    cls = 'bench-good';
  } else if (ratio < 1.5) {
    msg = `⚠️ <b>Near average:</b> Your ${sector} emits <b>${total_t.toFixed(1)} tCO₂e/yr</b> — ${pctDiff}% above the Kenya sector average of ${bench.avg} tCO₂e. Room to improve.`;
    cls = 'bench-average';
  } else {
    msg = `🔴 <b>Above average:</b> Your ${sector} emits <b>${total_t.toFixed(1)} tCO₂e/yr</b> — ${pctDiff}% above the Kenya sector average of ${bench.avg} tCO₂e. Significant reduction opportunity.`;
    cls = 'bench-high';
  }
  el.style.display = 'block';
  el.className = 'benchmark-callout ' + cls;
  el.innerHTML = `${msg} <span class="bench-source">Basis: ${bench.context}</span>`;
}

// ══════════════════════════════════════════════════════
// IMPROVEMENT 5 — WhatsApp Share
// ══════════════════════════════════════════════════════
function shareWhatsApp() {
  const c = S.lastCalc;
  if (!c) { toast('Run a calculation first!', 'error'); return; }
  const gs  = calcNTZScore(c.total_t, c.sector);
  const grade = gradeFromScore(gs).split('·')[0].trim();
  const url = generateShareURL() || window.location.href;
  const msg = encodeURIComponent(
    `My ${c.name} (${c.sector}) emits ${c.total_t.toFixed(2)} tCO₂e/yr — verified by Netzerra 🌿\n` +
    `NTZ Score: ${gs}/100 (${grade})\n` +
    `IPCC ${c.gwp || ACTIVE_GWP} · Kenya grid 0.070 kgCO₂e/kWh (IEA 2024)\n\n` +
    `View full report: ${url}\n` +
    `Calculate yours: https://netzerrakenya.com`
  );
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

function shareTwitter() {
  const c = S.lastCalc;
  if (!c) { toast('Run a calculation first!', 'error'); return; }
  const gs = calcNTZScore(c.total_t, c.sector);
  const msg = encodeURIComponent(
    `My ${c.sector} operation emits ${c.total_t.toFixed(2)} tCO₂e/yr — NTZ Score ${gs}/100 ` +
    `🌿 Calculated on Netzerra, Kenya's first KNCR-native carbon platform. #CarbonKE #KNCR`
  );
  window.open(`https://twitter.com/intent/tweet?text=${msg}&url=${encodeURIComponent('https://netzerrakenya.com')}`, '_blank');
}

// ── AUTO-LAUNCH on page load ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Restore saved data from sessionStorage (cleared automatically on tab close)
  const hadSaved = loadFromStorage();

  // Auto-start platform
  updateSidebar(); renderAll(); initCharts(); startTicker();

  // Load shared report URL if present
  loadSharedReport();

  // First-visit onboarding (only if no saved data and no shared URL)
  const hasSharedURL = new URLSearchParams(window.location.search).has('r');
  if (!hadSaved && !hasSharedURL) {
    setTimeout(() => {
      document.getElementById('onboarding-overlay').classList.add('open');
      renderOnboarding();
    }, 700);
  } else if (hadSaved) {
    toast('✅ Welcome back — your previous session has been restored.', 'success');
  }

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); })
  );

  // Close sidebar after nav item tap on mobile
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
      }
    });
  });
});

