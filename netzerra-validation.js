/* ══════════════════════════════════════════════════════
   NETZERRA VALIDATION — netzerra-validation.js  v2.0
   Three features, zero changes to other files:

   1. REAL-TIME PLAUSIBILITY FLAGS  — live inline warnings as user types
   2. UNIT CONVERSION TOGGLES      — L↔gal, t↔bags, ha↔ac, kWh↔MWh
   3. KNCR AUDIT TRAIL             — every change timestamped, CSV export
   4. LIVE EMISSIONS PREVIEW       — running tCO₂e estimate as you type
   5. SMART AUTOSAVE               — saves draft inputs to localStorage
══════════════════════════════════════════════════════ */

'use strict';

/* ─── INJECT STYLES ──────────────────────────────────── */
(function () {
  const s = document.createElement('style');
  s.textContent = `
  /* Live flag dots */
  .nv-inp-wrap { position:relative; display:flex; align-items:center; gap:6px; }
  .nv-dot {
    width:18px; height:18px; border-radius:50%; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:.65rem; font-weight:700; cursor:help;
    transition:all .2s; position:relative;
  }
  .nv-dot.ok    { background:rgba(58,170,92,.15);  border:1px solid rgba(58,170,92,.3);  color:#6DD98C; opacity:.5; }
  .nv-dot.warn  { background:rgba(245,166,35,.18); border:1px solid rgba(245,166,35,.45);color:#F5A623; opacity:1; }
  .nv-dot.error { background:rgba(239,83,80,.18);  border:1px solid rgba(239,83,80,.45); color:#EF5350; opacity:1; }
  .nv-dot::after {
    content: attr(data-tip);
    position:absolute; left:24px; top:50%; transform:translateY(-50%);
    background:#071C0F; border:1px solid rgba(245,166,35,.35);
    color:rgba(255,255,255,.88); font-size:.7rem; font-weight:400;
    line-height:1.5; padding:.5rem .75rem; border-radius:8px;
    white-space:normal; min-width:200px; max-width:280px;
    box-shadow:0 8px 24px rgba(0,0,0,.5); z-index:9999;
    opacity:0; pointer-events:none; transition:opacity .15s;
  }
  .nv-dot:hover::after { opacity:1; }

  /* Live flag summary bar */
  #nv-bar {
    display:flex; align-items:center; gap:.6rem;
    padding:.42rem .9rem; border-radius:8px; margin-bottom:.65rem;
    font-size:.74rem; transition:all .3s;
    background:rgba(245,166,35,.07); border:1px solid rgba(245,166,35,.2);
  }
  #nv-bar.ok { background:rgba(58,170,92,.07); border-color:rgba(58,170,92,.2); }
  #nv-bar .nv-bar-ico { font-size:.95rem; flex-shrink:0; }
  #nv-bar .nv-bar-txt { flex:1; color:rgba(255,255,255,.7); }
  #nv-bar .nv-bar-tag {
    font-size:.68rem; font-weight:700; font-family:'JetBrains Mono',monospace;
    padding:.1rem .5rem; border-radius:10px;
    background:rgba(245,166,35,.15); color:#F5A623;
  }
  #nv-bar.ok .nv-bar-tag { background:rgba(58,170,92,.12); color:#6DD98C; }

  /* Live emission preview */
  #nv-preview {
    font-size:.72rem; color:rgba(255,255,255,.45);
    padding:.3rem .7rem; background:rgba(255,255,255,.03);
    border-radius:6px; margin-bottom:.5rem;
    display:none; font-family:'JetBrains Mono',monospace;
  }
  #nv-preview.vis { display:block; }
  #nv-preview span { color:var(--mint,#6DD98C); font-weight:600; }

  /* Unit toggle pills */
  .nv-unit {
    display:inline-flex; border-radius:5px; overflow:hidden;
    border:1px solid rgba(109,217,140,.18); flex-shrink:0;
  }
  .nv-u {
    font-size:.6rem; font-weight:700; padding:.2rem .48rem;
    background:transparent; border:none; color:rgba(255,255,255,.32);
    cursor:pointer; transition:all .15s;
  }
  .nv-u.on { background:rgba(109,217,140,.13); color:var(--mint,#6DD98C); }
  .nv-u:hover:not(.on) { color:rgba(255,255,255,.6); }

  /* Audit trail panel */
  #nv-audit-fab {
    position:fixed; bottom:calc(var(--nav-h,58px) + 90px); left:14px;
    z-index:7800; display:flex; flex-direction:column; align-items:flex-start; gap:8px;
  }
  #nv-audit-open {
    width:40px; height:40px; border-radius:11px;
    background:rgba(13,40,24,.92); border:1px solid rgba(109,217,140,.22);
    color:rgba(255,255,255,.5); cursor:pointer; font-size:.9rem;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 14px rgba(0,0,0,.3); transition:all .2s; position:relative;
  }
  #nv-audit-open:hover { border-color:var(--leaf,#3AAA5C); color:#fff; }
  #nv-abadge {
    position:absolute; top:-5px; right:-5px; width:15px; height:15px;
    background:#F5A623; color:#071C0F; border-radius:50%;
    font-size:.55rem; font-weight:800; display:none;
    align-items:center; justify-content:center;
  }
  #nv-audit-panel {
    position:fixed; bottom:calc(var(--nav-h,58px) + 136px); left:14px;
    width:320px; max-height:420px; background:var(--deep,#0D2818);
    border:1px solid rgba(109,217,140,.18); border-radius:13px;
    box-shadow:0 20px 60px rgba(0,0,0,.55);
    display:flex; flex-direction:column; z-index:7799; overflow:hidden;
    transform:scale(.92) translateY(8px); opacity:0; pointer-events:none;
    transition:transform .22s cubic-bezier(.4,0,.2,1),opacity .22s;
  }
  #nv-audit-panel.open { transform:scale(1) translateY(0); opacity:1; pointer-events:all; }
  @media(max-width:440px){
    #nv-audit-panel{ left:0;right:0;width:auto;border-radius:13px 13px 0 0;bottom:var(--nav-h,58px); }
  }
  .nap-hdr {
    padding:.65rem .85rem; border-bottom:1px solid rgba(109,217,140,.1);
    display:flex; align-items:center; gap:.5rem; flex-shrink:0;
  }
  .nap-hdr h4 { font-size:.8rem; color:#fff; flex:1; margin:0; }
  .nap-cnt { font-size:.65rem; font-family:'JetBrains Mono',monospace; color:var(--mint,#6DD98C); }
  .nap-x { background:none;border:none;color:rgba(255,255,255,.32);cursor:pointer;font-size:.95rem; }
  .nap-x:hover{color:#fff;}
  .nap-list { flex:1; overflow-y:auto; padding:.4rem; scrollbar-width:thin; scrollbar-color:rgba(109,217,140,.2) transparent; }
  .nap-row {
    padding:.42rem .58rem; border-radius:6px; margin-bottom:2px;
    background:rgba(255,255,255,.03); border-left:2px solid rgba(109,217,140,.2);
    font-size:.68rem; line-height:1.5;
  }
  .nap-row.calc { border-left-color:var(--teal,#00C9A7); }
  .nap-row.bad  { border-left-color:#F5A623; background:rgba(245,166,35,.04); }
  .nap-ts  { color:rgba(255,255,255,.25); font-family:'JetBrains Mono',monospace; font-size:.6rem; }
  .nap-fld { color:var(--mint,#6DD98C); font-weight:600; }
  .nap-val { color:rgba(255,255,255,.65); }
  .nap-who { color:rgba(255,255,255,.25); font-size:.6rem; }
  .nap-empty { text-align:center; padding:1.8rem; color:rgba(255,255,255,.22); font-size:.75rem; }
  .nap-foot {
    padding:.48rem .65rem; border-top:1px solid rgba(109,217,140,.08);
    display:flex; gap:.4rem; flex-shrink:0;
  }
  .nap-btn {
    flex:1; font-size:.7rem; padding:.35rem;
    background:rgba(255,255,255,.05); border:1px solid rgba(109,217,140,.14);
    color:rgba(255,255,255,.55); border-radius:6px; cursor:pointer; transition:all .15s;
  }
  .nap-btn:hover { background:rgba(109,217,140,.1); color:#fff; }
  .nap-btn.pri { background:rgba(58,170,92,.1); border-color:rgba(58,170,92,.28); color:var(--mint,#6DD98C); }
  `;
  document.head.appendChild(s);
})();

/* ─── FIELD REGISTRY ─────────────────────────────────── */
const NV_FIELDS = {
  // BOREHOLE
  'bh-diesel-drill':{ lbl:'Drilling diesel',      unit:'L',     min:0, max:8000,    tip:'Typical 60–150m borehole: 200–3,000 L. Flag if >8,000 L without deep/hard formation.' },
  'bh-diesel-pump': { lbl:'Annual pump diesel',   unit:'L/yr',  min:0, max:25000,   tip:'3kW diesel pump 6h/day: 500–8,000 L/yr. Flag if >25,000 L.' },
  'bh-diesel-gen':  { lbl:'Generator diesel',     unit:'L/yr',  min:0, max:30000,   tip:'Site backup generator: up to ~10,000 L/yr typical.' },
  'bh-kwh':         { lbl:'Annual grid kWh',      unit:'kWh',   min:0, max:80000,   tip:'Electric submersible 1–5 kW: 1,000–15,000 kWh/yr typical.' },
  'bh-solar':       { lbl:'Solar %',              unit:'%',     min:0, max:100,     tip:'Must be 0–100%.' },
  'bh-steel':       { lbl:'Steel casing',         unit:'kg',    min:0, max:15000,   tip:'60–150m borehole: 400–4,000 kg typical.' },
  'bh-pvc':         { lbl:'PVC/HDPE pipe',        unit:'kg',    min:0, max:5000,    tip:'Rising main for 150m: ~50–300 kg.' },
  'bh-cement':      { lbl:'Cement grout',         unit:'kg',    min:0, max:20000,   tip:'Annular grout 150m: ~1,500–9,000 kg.' },
  'bh-tkm':         { lbl:'Transport t-km',       unit:'t-km',  min:0, max:2000,    tip:'Nairobi to most counties: 100–900 km one-way.' },
  // LIVESTOCK
  'ls-dairy':  { lbl:'Dairy cattle',    unit:'heads',  min:0, max:50000,   tip:'Kenya smallholder: 2–20. Commercial: up to 2,000.' },
  'ls-beef':   { lbl:'Beef cattle',     unit:'heads',  min:0, max:200000,  tip:'Pastoralist: 50–5,000. Large ranch: up to 50,000.' },
  'ls-goats':  { lbl:'Goats',           unit:'heads',  min:0, max:500000,  tip:'Household: 5–50. Commercial: up to 10,000.' },
  'ls-sheep':  { lbl:'Sheep',           unit:'heads',  min:0, max:200000,  tip:'Household: 5–30 heads.' },
  'ls-camels': { lbl:'Camels',          unit:'heads',  min:0, max:50000,   tip:'Typical herd: 30–500. Significant in ASAL counties.' },
  'ls-pigs':   { lbl:'Pigs',            unit:'heads',  min:0, max:100000,  tip:'Commercial farm: 100–5,000 heads.' },
  'ls-donkeys':{ lbl:'Donkeys/mules',   unit:'heads',  min:0, max:50000,   tip:'Working animals: 1–20 per household typical.' },
  'ls-poultry':{ lbl:'Poultry (×100)',  unit:'×100',   min:0, max:10000,   tip:'1 unit = 100 birds. Large flock: up to 100,000 birds.' },
  'ls-feed':   { lbl:'Feed concentrate',unit:'t/yr',   min:0, max:5000,    tip:'100 dairy cows: ~50–200 t/yr.' },
  'ls-kwh':    { lbl:'Electricity',     unit:'kWh/yr', min:0, max:200000,  tip:'Milking/cooling equipment: 5,000–50,000 kWh/yr.' },
  // TRANSPORT
  'tr-heavy':  { lbl:'Heavy truck diesel', unit:'L/yr', min:0, max:8000000, tip:'Per HGV: 30,000–80,000 L/yr. 10 trucks: ~500,000 L.' },
  'tr-matatu': { lbl:'Matatu diesel',      unit:'L/yr', min:0, max:5000000, tip:'Per matatu: 3,600–5,400 L/yr. 100 matatus: ~450,000 L.' },
  'tr-bus':    { lbl:'Bus diesel',         unit:'L/yr', min:0, max:5000000, tip:'Per bus: 15,000–30,000 L/yr.' },
  'tr-light':  { lbl:'Light vehicle diesel',unit:'L/yr',min:0, max:2000000, tip:'Per pickup: 3,000–6,000 L/yr.' },
  'tr-moto':   { lbl:'Motorcycle petrol',  unit:'L/yr', min:0, max:1000000, tip:'Per boda-boda: 600–900 L/yr.' },
  'tr-car':    { lbl:'Car petrol',         unit:'L/yr', min:0, max:2000000, tip:'Per private car: 1,200–2,400 L/yr.' },
  'tr-hfc':    { lbl:'HFC-134a leaked',    unit:'kg/yr',min:0, max:500,     tip:'Cold van: 0.5–5 kg/yr. GWP=1,530.' },
  'tr-r404':   { lbl:'R-404A leaked',      unit:'kg/yr',min:0, max:500,     tip:'Industrial freezer: 1–20 kg/yr. GWP=4,180.' },
  // CONSTRUCTION
  'con-cement':  { lbl:'Cement',          unit:'t',     min:0, max:500000,  tip:'Small building ~500m²: ~80t. 1km road: ~300t.' },
  'con-concrete':{ lbl:'Concrete',        unit:'t',     min:0, max:1000000, tip:'Density ~2.4 t/m³. 1,000m² slab: ~2,000t.' },
  'con-steel':   { lbl:'Structural steel',unit:'t',     min:0, max:100000,  tip:'Multi-storey: 50–500t. Small structure: 5–50t.' },
  'con-rebar':   { lbl:'Rebar',           unit:'t',     min:0, max:100000,  tip:'Typical: 100–150 kg rebar/m³ concrete.' },
  'con-asphalt': { lbl:'Asphalt',         unit:'t',     min:0, max:200000,  tip:'1km two-lane road: 2,500–5,000t.' },
  'con-timber':  { lbl:'Timber',          unit:'t',     min:0, max:10000,   tip:'Timber-framed structure: 5–50t typical.' },
  'con-excav':   { lbl:'Excavator diesel',unit:'L/mo',  min:0, max:60000,   tip:'20-tonne excavator: 800–2,500 L/day working.' },
  'con-gen':     { lbl:'Generator diesel',unit:'L/mo',  min:0, max:10000,   tip:'50kVA site generator: ~1,500–4,000 L/mo.' },
  'con-kwh':     { lbl:'Site grid kWh',   unit:'kWh/mo',min:0, max:50000,   tip:'Temporary connection: 500–10,000 kWh/mo typical.' },
  'con-tkm':     { lbl:'Materials t-km',  unit:'t-km',  min:0, max:5000000, tip:'1,000t cement Mombasa→Nairobi (500km) = 500,000 t-km.' },
  // MANUFACTURING
  'mfg-diesel': { lbl:'Annual diesel',    unit:'L/yr',  min:0, max:5000000,  tip:'Small factory: 5,000–50,000 L/yr. Large: up to 500,000 L/yr.' },
  'mfg-hfo':    { lbl:'Heavy fuel oil',   unit:'L/yr',  min:0, max:5000000,  tip:'Industrial boiler: 50,000–500,000 L/yr.' },
  'mfg-lpg':    { lbl:'LPG',             unit:'L/yr',  min:0, max:2000000,  tip:'Commercial kitchen: 2,000–20,000 L/yr.' },
  'mfg-kwh':    { lbl:'Annual grid kWh', unit:'kWh/yr',min:0, max:10000000, tip:'Small SME: 20,000–200,000 kWh/yr. Large factory: up to 2M kWh.' },
  'mfg-solar':  { lbl:'On-site solar',   unit:'kWh/yr',min:0, max:5000000,  tip:'Cannot exceed total grid kWh.' },
  'mfg-hfc':    { lbl:'HFC-134a leaked', unit:'kg/yr', min:0, max:1000,     tip:'Cold store: 2–20 kg/yr. GWP=1,530.' },
  'mfg-r404':   { lbl:'R-404A leaked',   unit:'kg/yr', min:0, max:1000,     tip:'Cold storage: 2–30 kg/yr. GWP=4,180.' },
  'mfg-ww':     { lbl:'Wastewater',      unit:'m³/yr', min:0, max:1000000,  tip:'Food processing: 10,000–200,000 m³/yr.' },
  'mfg-waste':  { lbl:'Solid waste',     unit:'t/yr',  min:0, max:100000,   tip:'Small factory: 5–50t/yr.' },
};

/* ─── UNIT CONVERSIONS ───────────────────────────────── */
const NV_CONV = {
  'L→gal':   { nL:'L',     cL:'gal',       nF:1,        cF:0.264172  },
  't→bags':  { nL:'t',     cL:'bags(50kg)',nF:1,        cF:20        },
  't→kg':    { nL:'t',     cL:'kg',        nF:1,        cF:1000      },
  'kWh→MWh': { nL:'kWh',   cL:'MWh',       nF:1,        cF:0.001     },
};
const NV_UNIT_MAP = {
  'bh-diesel-drill':'L→gal','bh-diesel-pump':'L→gal','bh-diesel-gen':'L→gal',
  'tr-heavy':'L→gal','tr-matatu':'L→gal','tr-bus':'L→gal','tr-light':'L→gal','tr-moto':'L→gal','tr-car':'L→gal',
  'mfg-diesel':'L→gal','mfg-hfo':'L→gal','mfg-lpg':'L→gal',
  'con-excav':'L→gal','con-gen':'L→gal',
  'con-cement':'t→bags','con-steel':'t→kg','con-rebar':'t→kg',
  'con-concrete':'t→kg','con-asphalt':'t→kg','con-timber':'t→kg',
  'bh-kwh':'kWh→MWh','mfg-kwh':'kWh→MWh','mfg-solar':'kWh→MWh','con-kwh':'kWh→MWh','ls-kwh':'kWh→MWh',
};
const _unitOn = {}; // fieldId → boolean (converted?)

/* ─── AUDIT ──────────────────────────────────────────── */
const _AK = 'ntz_audit_v2';
const _SID = 'SES-' + Date.now().toString(36).toUpperCase();

function _aLog(field, oldV, newV, type='edit') {
  if (String(oldV) === String(newV) && type === 'edit') return;
  const u = (typeof S!=='undefined'&&S.user) ? S.user : {};
  const entry = {
    ts: new Date().toISOString(), field, lbl: NV_FIELDS[field]?.lbl || field,
    old: oldV, val: newV, unit: NV_FIELDS[field]?.unit||'',
    user: u.name||'User', org: u.org||'', session: _SID, type
  };
  try {
    const log = JSON.parse(localStorage.getItem(_AK)||'[]');
    log.push(entry);
    localStorage.setItem(_AK, JSON.stringify(log.slice(-500)));
  } catch(e){}
  _aBadge(); _aRender();
}

function _aGet()  { try{ return JSON.parse(localStorage.getItem(_AK)||'[]'); }catch{ return []; } }
function _aBadge(){ const b=document.getElementById('nv-abadge'); if(!b)return; const n=_aGet().length; b.textContent=n>9?'9+':n; b.style.display=n?'flex':'none'; }
function _aRender(){
  const list=document.getElementById('nap-list'); const cnt=document.getElementById('nap-cnt');
  if(!list)return;
  const log=_aGet().slice().reverse();
  if(cnt) cnt.textContent=log.length+' entries';
  if(!log.length){ list.innerHTML='<div class="nap-empty">No changes yet.<br>Edit fields to build the audit trail.</div>'; return; }
  list.innerHTML=log.slice(0,80).map(e=>{
    const d=new Date(e.ts);
    const ts=d.toLocaleDateString('en-KE',{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const isC=e.type==='calc'; const isB=e.type==='flag';
    return `<div class="nap-row ${isC?'calc':isB?'bad':''}">
      <span class="nap-ts">${ts}</span>
      <span class="nap-fld"> ${isC?'⚡':'✏️'} ${e.lbl}</span>
      <span class="nap-val"> ${isC?'= '+e.val+' tCO₂e/yr':e.old+'→'+e.val+' '+e.unit}</span>
      <br><span class="nap-who">👤 ${e.user}${e.org?' · '+e.org:''} · ${e.session}</span>
    </div>`;
  }).join('');
}

window.nvExportCSV = function() {
  const log=_aGet(); if(!log.length){ if(typeof toast==='function') toast('No audit entries.','info'); return; }
  const h=['Timestamp','Field','Label','Old','New','Unit','User','Org','Session','Type'];
  const rows=log.map(e=>[e.ts,e.field,e.lbl,e.old,e.val,e.unit,e.user,e.org,e.session,e.type].map(v=>`"${String(v||'').replace(/"/g,'""')}"`));
  const csv=[h.join(','),...rows.map(r=>r.join(','))].join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='netzerra_audit_'+new Date().toISOString().split('T')[0]+'.csv'; a.click();
  if(typeof toast==='function') toast(`📥 Exported ${log.length} entries`,'success');
};

window.nvClearAudit = function() {
  if(!confirm('Clear entire audit log?')) return;
  localStorage.removeItem(_AK); _aBadge(); _aRender();
  if(typeof toast==='function') toast('Audit log cleared.','info');
};

let _auditOpen = false;
window.nvAuditToggle = function() {
  _auditOpen=!_auditOpen;
  document.getElementById('nv-audit-panel')?.classList.toggle('open',_auditOpen);
  if(_auditOpen) _aRender();
};

/* ─── VALIDATION ENGINE ──────────────────────────────── */
const _flags = {}; // fieldId → severity

function _check(id, val) {
  const m = NV_FIELDS[id]; if(!m) return {sev:'ok',msg:null};
  if(val===''||val===null||isNaN(parseFloat(val))) return {sev:'ok',msg:null};
  const v=parseFloat(val);
  if(v<0) return {sev:'error', msg:`❌ ${m.lbl} cannot be negative.`};
  if(id==='bh-solar'&&v>100) return {sev:'error', msg:'❌ Solar % must be 0–100%.'};
  if(id==='mfg-solar'){
    const g=parseFloat(document.getElementById('mfg-kwh')?.value)||0;
    if(v>g) return {sev:'error', msg:`❌ Solar (${v.toLocaleString()} kWh) exceeds grid (${g.toLocaleString()} kWh).`};
  }
  if(v>m.max) return {sev:'warn', msg:`⚠️ ${m.lbl}: ${v.toLocaleString()} ${m.unit} above typical max ${m.max.toLocaleString()}. ${m.tip}`};
  return {sev:'ok', msg:m.tip};
}

function _updateDot(id, sev, msg) {
  const dot=document.querySelector(`[data-nvid="${id}"]`); if(!dot) return;
  dot.className='nv-dot '+sev;
  dot.textContent=sev==='error'?'✕':sev==='warn'?'!':'✓';
  dot.setAttribute('data-tip', msg||(sev==='ok'?'✓ Within expected range':''));
}

function _updateBar() {
  const warnCount=Object.values(_flags).filter(s=>s!=='ok').length;
  const bar=document.getElementById('nv-bar'); if(!bar) return;
  bar.className=warnCount?'':'ok';
  bar.querySelector('.nv-bar-ico').textContent=warnCount?'⚠️':'✅';
  bar.querySelector('.nv-bar-txt').textContent=warnCount
    ?`${warnCount} plausibility flag${warnCount>1?'s':''} — check highlighted fields`
    :'All values look plausible — ready to calculate';
  bar.querySelector('.nv-bar-tag').textContent=warnCount?warnCount+' flag'+(warnCount>1?'s':''):'✓ Clear';
}

/* ─── LIVE PREVIEW ESTIMATE ──────────────────────────── */
const _EF = { diesel:2.68, petrol:2.31, kplc:0.3174, steel:1.85, cement:0.83 };
function _livePreview(sector) {
  const el=document.getElementById('nv-preview'); if(!el) return;
  const v=id=>parseFloat(document.getElementById(id)?.value)||0;
  let est=0;
  if(sector==='borehole') {
    est=((v('bh-diesel-drill')*_EF.diesel/20)+(v('bh-diesel-pump')*_EF.diesel)+(v('bh-kwh')*_EF.kplc*(1-v('bh-solar')/100))+(v('bh-steel')*_EF.steel))/1000;
  } else if(sector==='transport') {
    est=((v('tr-heavy')+v('tr-matatu')+v('tr-bus')+v('tr-light'))*_EF.diesel+(v('tr-moto')+v('tr-car'))*_EF.petrol)/1000;
  } else if(sector==='construct') {
    est=(v('con-cement')*830+v('con-steel')*1850+(v('con-excav')+v('con-gen'))*(v('con-months')||12)*_EF.diesel)/1000000;
  } else if(sector==='manufact') {
    est=((v('mfg-diesel')*_EF.diesel+Math.max(0,v('mfg-kwh')-v('mfg-solar'))*_EF.kplc))/1000;
  }
  if(est>0) {
    el.classList.add('vis');
    el.innerHTML=`📊 Live estimate: <span>${est.toFixed(2)} tCO₂e/yr</span> (partial — click Calculate for full result)`;
  }
}

/* ─── UNIT TOGGLE ────────────────────────────────────── */
window.nvUnitToggle = function(id, toConv, btn) {
  const key=NV_UNIT_MAP[id]; if(!key) return;
  const cv=NV_CONV[key]; const inp=document.getElementById(id); if(!inp) return;
  if((_unitOn[id]||false)===toConv) return;
  const cur=parseFloat(inp.value);
  if(!isNaN(cur)&&cur!==0) inp.value=parseFloat((cur*(toConv?cv.cF:(1/cv.cF))).toFixed(4));
  _unitOn[id]=toConv;
  const grp=btn?.closest('.nv-unit'); if(!grp) return;
  grp.querySelectorAll('.nv-u').forEach(b=>b.classList.toggle('on',b.dataset.m===(toConv?'c':'n')));
  if(typeof toast==='function') toast(`Unit: ${id} → ${toConv?cv.cL:cv.nL}`,'info');
};

/* ─── DOM INJECTION ──────────────────────────────────── */
function _injectBar() {
  const calc = document.getElementById('calculator-section'); if(!calc) return;
  if(calc.querySelector('#nv-bar')) return;
  const bar = document.createElement('div'); bar.id='nv-bar'; bar.className='ok';
  bar.innerHTML='<span class="nv-bar-ico">✅</span><span class="nv-bar-txt">All values look plausible — ready to calculate</span><span class="nv-bar-tag">✓ Clear</span>';
  const tabs = calc.querySelector('.calc-tabs');
  tabs ? calc.insertBefore(bar,tabs) : calc.prepend(bar);

  const prev=document.createElement('div'); prev.id='nv-preview';
  bar.parentNode.insertBefore(prev, bar.nextSibling);
}

function _injectAuditFAB() {
  if(document.getElementById('nv-audit-fab')) return;
  const fab=document.createElement('div'); fab.id='nv-audit-fab';
  fab.innerHTML=`
    <div id="nv-audit-panel">
      <div class="nap-hdr">
        <span style="font-size:.95rem">📋</span>
        <h4>KNCR Audit Trail</h4>
        <span class="nap-cnt" id="nap-cnt">0 entries</span>
        <button class="nap-x" onclick="nvAuditToggle()">✕</button>
      </div>
      <div class="nap-list" id="nap-list"><div class="nap-empty">No changes yet.</div></div>
      <div class="nap-foot">
        <button class="nap-btn pri" onclick="nvExportCSV()">⬇ CSV</button>
        <button class="nap-btn" onclick="nvClearAudit()">🗑 Clear</button>
      </div>
    </div>
    <button id="nv-audit-open" onclick="nvAuditToggle()" title="KNCR Audit Trail">
      📋<span id="nv-abadge"></span>
    </button>`;
  document.body.appendChild(fab);
  _aBadge();
}

function _wrapField(id) {
  const inp = document.getElementById(id); if(!inp) return;
  if(inp.closest('.nv-inp-wrap')) return; // already wrapped

  const wrap = document.createElement('span');
  wrap.className = 'nv-inp-wrap';
  wrap.style.cssText = 'display:inline-flex;align-items:center;width:100%;gap:5px;';
  inp.parentNode.insertBefore(wrap, inp);
  wrap.appendChild(inp);

  // Dot
  const dot = document.createElement('span');
  dot.className = 'nv-dot ok'; dot.textContent = '✓';
  dot.setAttribute('data-nvid', id); dot.setAttribute('data-tip','✓ Within expected range');
  wrap.appendChild(dot);

  // Unit toggle
  const key = NV_UNIT_MAP[id];
  if(key) {
    const cv = NV_CONV[key];
    const ug = document.createElement('span'); ug.className='nv-unit';
    ug.innerHTML=`<button class="nv-u on" data-m="n" onclick="nvUnitToggle('${id}',false,this)">${cv.nL}</button><button class="nv-u" data-m="c" onclick="nvUnitToggle('${id}',true,this)">${cv.cL}</button>`;
    wrap.appendChild(ug);
  }
}

/* ─── ATTACH LISTENERS ───────────────────────────────── */
function _attachListeners() {
  Object.keys(NV_FIELDS).forEach(id => {
    const inp=document.getElementById(id); if(!inp) return;
    let _prev=inp.value;

    // Initial validation
    const {sev,msg}=_check(id,inp.value);
    _flags[id]=sev; _updateDot(id,sev,msg);

    // Live validation
    let _t;
    inp.addEventListener('input',()=>{
      clearTimeout(_t);
      _t=setTimeout(()=>{
        const {sev:s,msg:m}=_check(id,inp.value);
        const old=_flags[id]||'ok'; _flags[id]=s; _updateDot(id,s,m);
        if(old!==s) _updateBar();
        // Live preview
        const sector=inp.closest('[id^="panel-"]')?.id?.replace('panel-','');
        if(sector) _livePreview(sector);
      },380);
    });

    // Audit on blur
    inp.addEventListener('blur',()=>{
      if(_prev!==inp.value){ _aLog(id,_prev,inp.value,'edit'); _prev=inp.value; }
    });
  });
  _updateBar();
}

/* ─── PATCH CALC FUNCTIONS FOR AUDIT ────────────────── */
function _patchCalcs() {
  ['calcBorehole','calcLivestock','calcTransport','calcConstruction','calcManufacturing'].forEach(fn=>{
    if(typeof window[fn]!=='function') return;
    const orig=window[fn];
    window[fn]=function(...a){
      const r=orig.apply(this,a);
      setTimeout(()=>{
        const lc=(typeof S!=='undefined')&&S.lastCalc;
        if(lc) _aLog('CALC-'+lc.sector,'—',lc.total_t.toFixed(3),'calc');
      },80);
      return r;
    };
  });
}

/* ─── AUTOSAVE DRAFT ─────────────────────────────────── */
const _DRAFT_KEY='ntz_draft_v1';
function _autosaveDraft() {
  const data={};
  Object.keys(NV_FIELDS).forEach(id=>{
    const el=document.getElementById(id); if(el) data[id]=el.value;
  });
  try{ localStorage.setItem(_DRAFT_KEY,JSON.stringify({data,ts:Date.now()})); }catch(e){}
}
function _restoreDraft() {
  try{
    const raw=localStorage.getItem(_DRAFT_KEY); if(!raw) return;
    const d=JSON.parse(raw);
    // Only restore if <24h old
    if(Date.now()-d.ts > 86400000) return;
    Object.entries(d.data||{}).forEach(([id,val])=>{
      const el=document.getElementById(id); if(el&&el.value===''||el?.value==='0') el.value=val;
    });
  }catch(e){}
}

/* ─── INIT ───────────────────────────────────────────── */
function _init() {
  _injectBar();
  _injectAuditFAB();
  Object.keys(NV_FIELDS).forEach(_wrapField);
  _attachListeners();
  _patchCalcs();
  _restoreDraft();

  // Autosave every 30s
  setInterval(_autosaveDraft, 30000);

  // Re-run validation on tab switch
  document.querySelectorAll('.calc-tab').forEach(tab=>{
    tab.addEventListener('click', ()=>setTimeout(()=>{ Object.keys(NV_FIELDS).forEach(id=>{ const el=document.getElementById(id); if(el){ const {sev,msg}=_check(id,el.value); _flags[id]=sev; _updateDot(id,sev,msg); } }); _updateBar(); },100));
  });

  console.log('[Netzerra Validation v2] ✅ Live flags + unit toggles + audit trail + autosave active');
}

// Robust init — wait for app.js + DOM
if(document.readyState==='loading') {
  document.addEventListener('DOMContentLoaded',()=>setTimeout(_init,700));
} else {
  setTimeout(_init,700);
}
