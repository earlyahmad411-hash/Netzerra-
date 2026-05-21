/* Netzerra AI Intelligence Suite - static frontend, Worker-backed AI */
'use strict';

const NTZ_INTEL_WORKER = 'https://delicate-bird-531b.shukriali411.workers.dev/';
const NTZ_INTEL_KEY = 'ntz_intelligence_v1';

const INTEL_TOOLS = [
  { id:'pricing', icon:'💹', label:'Credit Pricing', desc:'Predict pre-issuance carbon credit price ranges from project type, county, co-benefits, CDA, permanence, and market proxy data.' },
  { id:'additionality', icon:'🧾', label:'Additionality', desc:'Generate financial, regulatory, and common-practice additionality arguments for PDD sections.' },
  { id:'greenwash', icon:'🛡️', label:'Greenwash Scanner', desc:'Flag baseline inflation, weak additionality, leakage, CDA mismatch, and copied or generic claims.' },
  { id:'intake', icon:'🗣️', label:'Smart Intake', desc:'Adaptive project intake that produces a PCN-ready summary and next questions.' },
  { id:'document', icon:'📄', label:'PDD Reviewer', desc:'Review uploaded or pasted carbon documents against KNCR requirements and produce a gap analysis.' },
  { id:'satellite', icon:'🛰️', label:'Satellite Monitor', desc:'Static Sentinel/NDVI-style monitoring brief from boundary coordinates and project type.' },
  { id:'fpic', icon:'🤝', label:'FPIC Sentiment', desc:'Review consultation notes for inclusion, unresolved objections, and stakeholder coverage.' },
  { id:'regulatory', icon:'📡', label:'Regulatory Monitor', desc:'Assess manually pasted regulatory updates against active project types and documentation.' },
  { id:'risk', icon:'⚖️', label:'Credit Risk', desc:'Score permanence, political, methodology, developer, and verification risk before buyers purchase credits.' },
  { id:'mrv', icon:'📊', label:'Annual MRV', desc:'Generate an annual MRV report outline using calculators, audit logs, satellite notes, CDA records, and project data.' }
];

const INTEL_STATE = {
  activeTool: 'pricing',
  lastResults: {},
  draft: {}
};

function ntzIntelLoad() {
  try {
    const raw = localStorage.getItem(NTZ_INTEL_KEY);
    if (raw) Object.assign(INTEL_STATE, JSON.parse(raw));
  } catch (_) {}
}

function ntzIntelSave() {
  try { localStorage.setItem(NTZ_INTEL_KEY, JSON.stringify(INTEL_STATE)); } catch (_) {}
}

function ntzIntelProjectContext() {
  const user = (typeof AUTH !== 'undefined' && AUTH.currentUser) ? AUTH.currentUser : (window.S?.user || {});
  const lastCalc = window.S?.lastCalc || null;
  const projects = window.NTZ?.projects || [];
  const wasteProjects = projects.filter(p => p.sector === 'waste');
  const exchange = typeof EXCHANGE !== 'undefined' ? EXCHANGE.listings : [];
  const avgPrice = exchange.length ? Math.round(exchange.reduce((s, l) => s + (l.price || 0), 0) / exchange.length) : 1400;
  return {
    user,
    lastCalc,
    projectCount: projects.length,
    projects: projects.slice(-8),
    wasteProjects: wasteProjects.slice(-5),
    exchangeListings: exchange.slice(0, 8),
    marketProxy: {
      avgKesPerTonne: avgPrice,
      usdKes: 130,
      updated: new Date().toISOString(),
      note: 'Static MVP proxy from exchange listings and local project factors. Replace with market feed in backend phase.'
    },
    auditEntries: (window.NTZ?.registry || []).slice(-8)
  };
}

function ntzIntelCollect(toolId) {
  const q = id => document.getElementById('intel-' + toolId + '-' + id)?.value?.trim() || '';
  const common = {
    projectName: q('name'),
    projectType: q('type'),
    county: q('county'),
    standard: q('standard'),
    credits: Number(q('credits') || 0),
    cdaRate: Number(q('cda') || 0),
    coBenefits: q('cobenefits'),
    notes: q('notes')
  };
  const extras = {};
  ['barriers','document','boundary','consultation','regupdate','buyer','mrvdata'].forEach(k => extras[k] = q(k));
  return { ...common, ...extras };
}

function ntzIntelFallback(toolId, data, ctx) {
  const type = (data.projectType || 'carbon project').toLowerCase();
  const credits = Number(data.credits || ctx.lastCalc?.total_t || 1000);
  const cda = Number(data.cdaRate || 0);
  const cobenefits = (data.coBenefits || '').split(/[,;\n]/).filter(Boolean).length;
  const priceBase = type.includes('mangrove') || type.includes('blue') ? 2100 :
    type.includes('forestry') || type.includes('agro') ? 1550 :
    type.includes('waste') ? 1350 :
    type.includes('renewable') || type.includes('solar') ? 1250 : 1150;
  const cdaBoost = cda >= 40 ? 1.12 : cda >= 25 ? 1.06 : .92;
  const benefitBoost = 1 + Math.min(cobenefits, 5) * .025;
  const low = Math.round(priceBase * cdaBoost * benefitBoost * .82);
  const high = Math.round(priceBase * cdaBoost * benefitBoost * 1.22);
  const usdLow = (low / ctx.marketProxy.usdKes).toFixed(2);
  const usdHigh = (high / ctx.marketProxy.usdKes).toFixed(2);

  const templates = {
    pricing: `<h4>Predictive Credit Pricing</h4>Estimated range: KES ${low.toLocaleString()}-${high.toLocaleString()} per tCO2e (USD ${usdLow}-${usdHigh}).\nConfidence: medium. Drivers: project type premium, CDA rate, co-benefits, and Netzerra exchange proxy average of KES ${ctx.marketProxy.avgKesPerTonne.toLocaleString()}/tCO2e.\n\nPre-issuance revenue signal: KES ${(credits * low).toLocaleString()}-${(credits * high).toLocaleString()} for ${credits.toLocaleString()} tCO2e.`,
    additionality: `<h4>Additionality Argument Draft</h4>The proposed ${data.projectType || 'project'} in ${data.county || 'Kenya'} is additional because implementation faces material financial, institutional, and common-practice barriers. Without carbon finance, the project proponent would have limited ability to absorb upfront development, monitoring, validation, and community engagement costs. Carbon revenue is therefore a decisive revenue stream that improves bankability and allows the project to meet KNCR documentation, CDA, and MRV requirements.\n\nFinancial barrier: capital recovery is uncertain without forward credit revenue and buyer confidence. Regulatory barrier: Kenya's carbon market regime requires PCN, PDD, CDA, stakeholder consultation, and verification steps that impose transaction costs on small proponents. Common practice: similar projects in the county are not yet widely adopted at scale without donor, concessional, or carbon-linked finance.\n\nThis argument should be supported with local cost quotes, tariff/revenue assumptions, and evidence that comparable non-carbon projects remain rare.`,
    greenwash: `<h4>Greenwash Risk Scan</h4>Risk score: ${credits > 5000 && !data.notes ? 72 : 38}/100.\nFlags:\n- Check baseline inflation if claimed reductions exceed county or sector comparables.\n- Additionality needs financial evidence, not only narrative claims.\n- Leakage must be quantified where activity may shift emissions outside the boundary.\n- CDA claims should reconcile with projected credit revenue and community payment schedule.\n\nRecommended correction: attach baseline assumptions, local cost data, CDA calculation, and a leakage monitoring plan.`,
    intake: `<h4>Smart Intake Summary</h4>Draft PCN profile: ${data.projectName || 'Unnamed project'} is a ${data.projectType || 'carbon'} project in ${data.county || 'Kenya'} targeting ${credits.toLocaleString()} tCO2e/year.\n\nSuggested methodology path: ${type.includes('waste') ? 'waste methane avoidance or landfill gas capture' : type.includes('mangrove') ? 'blue carbon restoration' : type.includes('agro') ? 'agroforestry / ARR' : 'KNCR domestic project methodology'}.\n\nNext adaptive questions:\n1. Is the land community, public, or private?\n2. What evidence supports the baseline?\n3. Who are the affected community groups?\n4. What monitoring data can be collected monthly?\n5. Has any similar activity already started without carbon revenue?`,
    document: `<h4>PDD Reviewer Gap Analysis</h4>Coverage estimate: 6/10 KNCR requirements.\nLikely missing or weak: County letter of support, FPIC evidence, Fourth Schedule CDA, monitoring parameter table, leakage treatment, and explicit Regulation 37 data-quality safeguards.\n\nOffer: generate missing additionality, stakeholder, CDA, and MRV sections from the project profile.`,
    satellite: `<h4>Satellite Monitoring Brief</h4>Boundary received: ${data.boundary || 'not provided'}.\nStatic MVP result: NDVI trend cannot be fetched without a backend Earth Engine/Sentinel connector, but the monitoring design is ready.\n\nRecommended monthly report fields: NDVI mean, canopy gain/loss, fire or clearing alerts, rainfall anomaly, geotagged field photos, and leakage buffer checks.`,
    fpic: `<h4>FPIC Sentiment Review</h4>FPIC score: ${data.consultation && data.consultation.length > 200 ? 72 : 44}/100.\nGaps to check: attendance disaggregation, women/youth/minority representation, unresolved objections, consent documentation, local-language disclosure, and benefit-sharing explanation.\n\nGenerate a stakeholder consultation summary before NEMA submission.`,
    regulatory: `<h4>Regulatory Change Monitor</h4>Static monitor mode: paste a gazette/NEMA/standard update to classify relevance.\nCurrent assessment: active projects should re-check CDA language, annual MRV timing, KNCR registration fields, and methodology version references whenever new guidance is issued.`,
    risk: `<h4>Carbon Credit Risk Score</h4>Quality score: ${type.includes('mangrove') ? 78 : type.includes('forestry') ? 70 : type.includes('waste') ? 73 : 68}/100.\nDimensions:\n- Permanence: medium\n- Political/land tenure: verify county and community records\n- Methodology: confirm current standard version\n- Developer: track record not yet proven\n- Verification: VVB audit date required\n\nBuyer summary: proceed only with clear CDA, current methodology, and recent verification evidence.`,
    mrv: `<h4>Automated Annual MRV Outline</h4>Report sections generated:\n1. Project and crediting period summary\n2. Monitoring-year activity data\n3. Baseline versus actual emissions\n4. QA/QC and audit trail\n5. Leakage and reversal checks\n6. CDA/community benefit disbursement\n7. Deviations and corrective actions\n8. VVB-ready evidence index\n\nUse calculator records, NTZ audit entries, dCoC logs, and satellite notes to complete the report.`
  };
  return templates[toolId] || 'Tool completed.';
}

function ntzIntelParseWorkerResult(raw) {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  const text = raw.result || raw.output || raw.content || raw.text ||
    (raw.choices && raw.choices[0] && raw.choices[0].message && raw.choices[0].message.content);
  if (text) return text;
  return JSON.stringify(raw, null, 2);
}

async function ntzIntelCallWorker(toolId, data) {
  const ctx = ntzIntelProjectContext();
  const tool = INTEL_TOOLS.find(t => t.id === toolId);
  const system = `You are Zerra, Netzerra's senior carbon intelligence engine for Kenya. Produce practical, regulator-aware outputs. Cite relevant Kenyan hooks when useful: Carbon Markets Regulations 2024, Regulation 23E for CDA, Regulation 37 for false data, EMCA for environmental safeguards, KNCR preparation requirements. Return concise HTML-safe text with headings; no markdown fences.`;
  const user = `Run tool: ${tool?.label}. Purpose: ${tool?.desc}\n\nUSER_INPUT:\n${JSON.stringify(data, null, 2)}\n\nLIVE_NETZERRA_CONTEXT:\n${JSON.stringify(ctx, null, 2)}`;
  const r = await fetch(NTZ_INTEL_WORKER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'netzerra_intelligence_' + toolId,
      tool: toolId,
      input: data,
      context: ctx,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });
  if (!r.ok) throw new Error('Worker ' + r.status);
  return ntzIntelParseWorkerResult(await r.json());
}

async function ntzIntelRun(toolId) {
  const out = document.getElementById('intel-output-' + toolId);
  const data = ntzIntelCollect(toolId);
  const ctx = ntzIntelProjectContext();
  if (out) out.innerHTML = 'Zerra is running ' + (INTEL_TOOLS.find(t => t.id === toolId)?.label || toolId) + '...';
  try {
    const result = await ntzIntelCallWorker(toolId, data);
    INTEL_STATE.lastResults[toolId] = { result, data, ts: new Date().toISOString(), source: 'worker' };
    ntzIntelSave();
    if (out) out.innerHTML = result;
    if (typeof toast === 'function') toast('AI intelligence run complete.', 'success');
  } catch (e) {
    const result = ntzIntelFallback(toolId, data, ctx);
    INTEL_STATE.lastResults[toolId] = { result, data, ts: new Date().toISOString(), source: 'local-fallback' };
    ntzIntelSave();
    if (out) out.innerHTML = result + '\n\nLocal fallback used because the Worker was unavailable or returned an error: ' + e.message;
    if (typeof toast === 'function') toast('Worker unavailable; local intelligence generated.', 'info');
  }
}

function ntzIntelSwitch(toolId) {
  INTEL_STATE.activeTool = toolId;
  document.querySelectorAll('.intel-nav button').forEach(b => b.classList.toggle('active', b.dataset.tool === toolId));
  document.querySelectorAll('.intel-panel').forEach(p => p.classList.toggle('active', p.id === 'intel-panel-' + toolId));
  ntzIntelSave();
}

function ntzIntelFieldHTML(toolId) {
  const countyOptions = ['Baringo','Bomet','Bungoma','Busia','Embu','Garissa','Kajiado','Kiambu','Kilifi','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Marsabit','Mombasa','Nairobi','Nakuru','Narok','Samburu','Taita-Taveta','Turkana','Wajir','West Pokot'];
  const projectTypes = ['Mangrove / Blue Carbon','Agroforestry / ARR','Waste Methane','Solar / Renewable Energy','Cookstoves / Household Energy','Livestock Methane','Borehole / Water Energy','Transport Fuel Switch','Biochar / Soil Carbon'];
  const common = `
    <div class="intel-grid">
      <div class="intel-field"><label>Project Name</label><input id="intel-${toolId}-name" placeholder="e.g. Kwale Mangrove Restoration"></div>
      <div class="intel-field"><label>Project Type</label><select id="intel-${toolId}-type">${projectTypes.map(x => `<option>${x}</option>`).join('')}</select></div>
      <div class="intel-field"><label>County</label><select id="intel-${toolId}-county">${countyOptions.map(x => `<option>${x}</option>`).join('')}</select></div>
      <div class="intel-field"><label>Standard</label><select id="intel-${toolId}-standard"><option>KNCR Domestic</option><option>Verra VCS</option><option>Gold Standard</option><option>Plan Vivo</option><option>Article 6</option></select></div>
      <div class="intel-field"><label>Expected Credits / year</label><input id="intel-${toolId}-credits" type="number" value="1200"></div>
      <div class="intel-field"><label>CDA Share %</label><input id="intel-${toolId}-cda" type="number" value="40"></div>
      <div class="intel-field full"><label>Co-benefits</label><input id="intel-${toolId}-cobenefits" placeholder="Biodiversity, water access, jobs, gender inclusion"></div>
  `;
  const extra = {
    additionality: '<div class="intel-field full"><label>Barrier Notes</label><textarea id="intel-additionality-barriers" placeholder="Describe financial, regulatory, technology, or common-practice barriers..."></textarea></div>',
    greenwash: '<div class="intel-field full"><label>Claims / PDD Passage</label><textarea id="intel-greenwash-notes" placeholder="Paste baseline, additionality, leakage, or CDA claims to scan..."></textarea></div>',
    intake: '<div class="intel-field full"><label>What the proponent said</label><textarea id="intel-intake-notes" placeholder="I have 200 hectares in Narok and want agroforestry..."></textarea></div>',
    document: '<div class="intel-field full"><label>PDD / Document Text</label><textarea id="intel-document-document" placeholder="Paste PDD text or upload later when backend document parsing is connected..."></textarea></div>',
    satellite: '<div class="intel-field full"><label>Boundary Coordinates</label><textarea id="intel-satellite-boundary" placeholder="-1.29,36.82; -1.31,36.90; ..."></textarea></div>',
    fpic: '<div class="intel-field full"><label>Consultation Notes</label><textarea id="intel-fpic-consultation" placeholder="Paste meeting minutes, objections, attendance notes, or FPIC summaries..."></textarea></div>',
    regulatory: '<div class="intel-field full"><label>Regulatory Update</label><textarea id="intel-regulatory-regupdate" placeholder="Paste Kenya Gazette, NEMA, UNFCCC, Verra, or Gold Standard update text..."></textarea></div>',
    risk: '<div class="intel-field full"><label>Buyer / Risk Notes</label><textarea id="intel-risk-buyer" placeholder="Buyer priorities, land tenure concerns, VVB audit date, developer history..."></textarea></div>',
    mrv: '<div class="intel-field full"><label>Monitoring Year Data</label><textarea id="intel-mrv-mrvdata" placeholder="Paste activity data, audit notes, IoT/dCoC records, community disbursements..."></textarea></div>',
    pricing: '<div class="intel-field full"><label>Market / Financing Notes</label><textarea id="intel-pricing-notes" placeholder="Known buyer interest, vintage, permanence, methodology status, financing assumptions..."></textarea></div>'
  };
  return common + (extra[toolId] || '<div class="intel-field full"><label>Notes</label><textarea id="intel-' + toolId + '-notes"></textarea></div>') + '</div>';
}

function ntzIntelRender() {
  const c = document.getElementById('intel-suite-container');
  if (!c) return;
  ntzIntelLoad();
  c.innerHTML = `
    <div class="intel-score-row">
      <div class="intel-score-card"><strong>${INTEL_TOOLS.length}</strong><span>AI tools</span></div>
      <div class="intel-score-card"><strong>${Object.keys(INTEL_STATE.lastResults || {}).length}</strong><span>runs saved</span></div>
      <div class="intel-score-card"><strong>${ntzIntelProjectContext().projectCount}</strong><span>projects visible</span></div>
      <div class="intel-score-card"><strong>KES ${ntzIntelProjectContext().marketProxy.avgKesPerTonne.toLocaleString()}</strong><span>market proxy</span></div>
    </div>
    <div class="intel-shell" style="margin-top:1rem">
      <div class="intel-nav">
        ${INTEL_TOOLS.map(t => `<button data-tool="${t.id}" class="${t.id === INTEL_STATE.activeTool ? 'active' : ''}" onclick="ntzIntelSwitch('${t.id}')"><span>${t.icon}</span>${t.label}</button>`).join('')}
      </div>
      <div>
        ${INTEL_TOOLS.map(t => `
          <section class="intel-panel ${t.id === INTEL_STATE.activeTool ? 'active' : ''}" id="intel-panel-${t.id}">
            <h3>${t.icon} ${t.label}</h3>
            <p>${t.desc}</p>
            ${ntzIntelFieldHTML(t.id)}
            <div class="intel-actions">
              <button onclick="ntzIntelRun('${t.id}')">Run ${t.label}</button>
              <button class="secondary" onclick="ntzIntelLoadLast('${t.id}')">Load Last Result</button>
            </div>
            <div class="intel-output" id="intel-output-${t.id}">${INTEL_STATE.lastResults?.[t.id]?.result || 'No run yet.'}</div>
          </section>`).join('')}
      </div>
    </div>
  `;
}

function ntzIntelLoadLast(toolId) {
  const out = document.getElementById('intel-output-' + toolId);
  const last = INTEL_STATE.lastResults?.[toolId];
  if (out) out.innerHTML = last ? last.result : 'No saved result for this tool yet.';
}

function injectNetzerraIntelligence() {
  const main = document.getElementById('main');
  if (main && !document.getElementById('ai-intelligence-section')) {
    main.insertAdjacentHTML('beforeend', `
      <section class="section" id="ai-intelligence-section">
        <div class="sec-header">
          <h2>🧠 AI Intelligence Suite</h2>
          <p>Predict pricing, prove additionality, review PDDs, scan greenwashing risk, score credits, and draft MRV outputs using Zerra through the Cloudflare Worker.</p>
        </div>
        <div id="intel-suite-container"></div>
      </section>
    `);
  }
  const docsNav = Array.from(document.querySelectorAll('.nav-item')).find(n => (n.getAttribute('onclick') || '').includes("showSection('docs')"));
  if (docsNav && !document.getElementById('nav-ai-intelligence')) {
    docsNav.insertAdjacentHTML('beforebegin', `<div class="nav-item" id="nav-ai-intelligence" onclick="showSection('ai-intelligence')" style="background:rgba(128,222,234,.06)"><span class="ico">🧠</span> AI Intelligence Suite <span class="nav-badge" style="background:#80DEEA;color:#0a1f14">AI</span></div>`);
  }
}

const _ntzIntelPrevShowSection = window.showSection;
window.showSection = function(id) {
  if (typeof _ntzIntelPrevShowSection === 'function') _ntzIntelPrevShowSection(id);
  if (id === 'ai-intelligence') ntzIntelRender();
};

document.addEventListener('DOMContentLoaded', () => {
  injectNetzerraIntelligence();
  if (document.getElementById('ai-intelligence-section')?.classList.contains('active')) ntzIntelRender();
});

window.NTZ_INTEL = { render: ntzIntelRender, run: ntzIntelRun, context: ntzIntelProjectContext, tools: INTEL_TOOLS, state: INTEL_STATE };
