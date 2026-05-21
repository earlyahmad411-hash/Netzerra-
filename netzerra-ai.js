/* ══════════════════════════════════════════════════════
   NETZERRA AI — netzerra-ai.js  v4.0
   Secure Worker Proxy · No API key in frontend
   Groq Llama 3.3 70B (text) + Llama 3.2 11B Vision (OCR)
   Chat Memory · ZerraQuery global · Swahili + English
══════════════════════════════════════════════════════ */
'use strict';

(function(){const s=document.createElement('style');s.textContent=`
#ntz-ai-fab{position:fixed;bottom:calc(var(--nav-h,58px) + 18px);right:20px;z-index:8000;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
#ntz-ai-btn{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--fern,#27733F),var(--leaf,#3AAA5C));border:none;cursor:pointer;font-size:1.35rem;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(58,170,92,.45);transition:transform .2s;position:relative}
#ntz-ai-btn:hover{transform:translateY(-2px) scale(1.05)}
#ntz-ai-btn::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(109,217,140,.4);animation:nai-ring 2.4s ease-out infinite}
@keyframes nai-ring{0%{transform:scale(1);opacity:.7}70%,100%{transform:scale(1.55);opacity:0}}
#ntz-ai-hint{background:var(--moss,#143820);border:1px solid rgba(109,217,140,.25);color:rgba(255,255,255,.85);font-size:.72rem;padding:.35rem .7rem;border-radius:20px;white-space:nowrap;pointer-events:none;animation:nai-hf 5s ease forwards}
@keyframes nai-hf{0%,70%{opacity:1}100%{opacity:0}}
#ntz-ai-panel{position:fixed;bottom:calc(var(--nav-h,58px) + 84px);right:20px;width:375px;max-height:570px;background:var(--deep,#0D2818);border:1px solid rgba(109,217,140,.18);border-radius:18px;box-shadow:0 24px 64px rgba(0,0,0,.5);display:flex;flex-direction:column;z-index:7999;overflow:hidden;transform:scale(.92) translateY(12px);opacity:0;pointer-events:none;transition:transform .25s cubic-bezier(.4,0,.2,1),opacity .25s}
#ntz-ai-panel.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all}
@media(max-width:440px){#ntz-ai-panel{right:0;left:0;width:100%;bottom:var(--nav-h,58px);border-radius:18px 18px 0 0;max-height:78vh}}
.nai-hdr{padding:.85rem 1rem;border-bottom:1px solid rgba(109,217,140,.1);display:flex;align-items:center;gap:.7rem;flex-shrink:0}
.nai-av{width:34px;height:34px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--fern,#27733F),var(--teal,#00C9A7));display:flex;align-items:center;justify-content:center;font-size:.95rem}
.nai-hname{font-size:.86rem;font-weight:600;color:#fff}
.nai-hst{font-size:.67rem;color:var(--mint,#6DD98C);display:flex;align-items:center;gap:4px}
.nai-hst::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--mint,#6DD98C);animation:nai-blink 2s infinite}
@keyframes nai-blink{0%,100%{opacity:1}50%{opacity:.3}}
.nai-close{background:none;border:none;color:rgba(255,255,255,.38);cursor:pointer;font-size:1.05rem;margin-left:auto}
.nai-close:hover{color:#fff}
.nai-tabs{display:flex;padding:.5rem .75rem 0;gap:.22rem;border-bottom:1px solid rgba(109,217,140,.08);flex-shrink:0}
.nai-tab{font-size:.67rem;font-weight:600;padding:.34rem .62rem;border-radius:7px 7px 0 0;cursor:pointer;border:none;background:transparent;color:rgba(255,255,255,.32);transition:all .15s}
.nai-tab.on{color:var(--mint,#6DD98C);background:rgba(109,217,140,.08)}
.nai-tab:hover:not(.on){color:rgba(255,255,255,.62)}
.nai-body{flex:1;overflow-y:auto;min-height:0;scrollbar-width:thin;scrollbar-color:rgba(109,217,140,.2) transparent}
.nai-pane{display:none;flex-direction:column;height:100%}
.nai-pane.on{display:flex}
.nai-msgs{flex:1;padding:.85rem 1rem;display:flex;flex-direction:column;gap:.7rem;overflow-y:auto;min-height:0}
.nai-msg{display:flex;flex-direction:column;gap:2px}
.nai-msg.user{align-items:flex-end}
.nai-msg.bot{align-items:flex-start}
.nai-bub{max-width:86%;padding:.52rem .82rem;border-radius:14px;font-size:.79rem;line-height:1.62;white-space:pre-wrap}
.nai-msg.user .nai-bub{background:linear-gradient(135deg,var(--fern,#27733F),var(--leaf,#3AAA5C));color:#fff;border-radius:14px 14px 4px 14px}
.nai-msg.bot .nai-bub{background:rgba(255,255,255,.06);color:rgba(255,255,255,.88);border:1px solid rgba(109,217,140,.1);border-radius:14px 14px 14px 4px}
.nai-mt{font-size:.61rem;color:rgba(255,255,255,.22);padding:0 4px}
.nai-typing .nai-bub{display:flex;gap:5px;align-items:center;padding:.58rem .85rem}
.nai-dot{width:7px;height:7px;border-radius:50%;background:rgba(109,217,140,.5);animation:nai-dots .8s infinite}
.nai-dot:nth-child(2){animation-delay:.16s}.nai-dot:nth-child(3){animation-delay:.32s}
@keyframes nai-dots{0%,80%,100%{transform:scale(.6)}40%{transform:scale(1)}}
.nai-sugs{padding:.45rem .95rem .65rem;display:flex;flex-wrap:wrap;gap:.38rem;flex-shrink:0}
.nai-sug{font-size:.67rem;padding:.26rem .55rem;background:rgba(109,217,140,.07);border:1px solid rgba(109,217,140,.16);color:rgba(255,255,255,.6);border-radius:18px;cursor:pointer;transition:all .15s}
.nai-sug:hover{background:rgba(109,217,140,.14);color:#fff}
.nai-inp-row{display:flex;align-items:flex-end;gap:.45rem;padding:.6rem .85rem .85rem;border-top:1px solid rgba(109,217,140,.08);flex-shrink:0}
.nai-ta{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(109,217,140,.17);border-radius:10px;color:#fff;font-size:.79rem;padding:.48rem .72rem;resize:none;max-height:88px;line-height:1.5;transition:border-color .15s;font-family:inherit}
.nai-ta:focus{border-color:var(--leaf,#3AAA5C);outline:none}
.nai-ta::placeholder{color:rgba(255,255,255,.2)}
.nai-send{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--fern,#27733F),var(--leaf,#3AAA5C));border:none;color:#fff;cursor:pointer;font-size:.88rem;flex-shrink:0;transition:opacity .15s}
.nai-send:disabled{opacity:.35;cursor:default}
.nai-cards{padding:.85rem;display:flex;flex-direction:column;gap:.7rem}
.nai-card{background:rgba(255,255,255,.04);border:1px solid rgba(109,217,140,.1);border-radius:11px;padding:.78rem .88rem}
.nai-card h4{font-size:.77rem;color:var(--mint,#6DD98C);margin-bottom:.32rem}
.nai-card p{font-size:.73rem;color:rgba(255,255,255,.68);line-height:1.6;margin:0}
.nai-sbar{margin-top:.42rem;height:5px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden}
.nai-sfill{height:100%;background:linear-gradient(90deg,var(--fern,#27733F),var(--mint,#6DD98C))}
.nai-sitem{background:rgba(255,255,255,.04);border:1px solid rgba(109,217,140,.1);border-left:3px solid var(--leaf,#3AAA5C);border-radius:0 10px 10px 0;padding:.7rem .85rem}
.nai-sitem.high{border-left-color:var(--coral,#EF5350)}.nai-sitem.med{border-left-color:var(--gold,#F5A623)}
.nai-sitem h4{font-size:.76rem;color:#fff;margin-bottom:.2rem}
.nai-sitem p{font-size:.7rem;color:rgba(255,255,255,.58);margin:0;line-height:1.5}
.nai-stag{font-size:.61rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-top:.36rem;display:inline-block;padding:.14rem .45rem;border-radius:4px}
.nai-stag.high{background:rgba(239,83,80,.15);color:var(--coral,#EF5350)}.nai-stag.med{background:rgba(245,166,35,.15);color:var(--gold,#F5A623)}.nai-stag.low{background:rgba(58,170,92,.15);color:var(--leaf,#3AAA5C)}
.nai-rtypes{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin-bottom:.55rem}
.nai-ropt{background:rgba(255,255,255,.04);border:2px solid rgba(109,217,140,.1);border-radius:9px;padding:.68rem;cursor:pointer;text-align:center;transition:all .15s}
.nai-ropt:hover,.nai-ropt.on{background:rgba(109,217,140,.09);border-color:var(--leaf,#3AAA5C)}
.nai-ropt .ri{font-size:1.25rem;margin-bottom:.22rem}
.nai-ropt h4{font-size:.72rem;color:#fff;margin:.16rem 0 .1rem}
.nai-ropt p{font-size:.65rem;color:rgba(255,255,255,.5);margin:0}
.nai-rout{background:rgba(0,0,0,.25);border:1px solid rgba(109,217,140,.1);border-radius:9px;padding:.75rem;font-size:.72rem;color:rgba(255,255,255,.8);line-height:1.7;white-space:pre-wrap;max-height:185px;overflow-y:auto;display:none;margin-bottom:.55rem}
.nai-rout.on{display:block}
.nai-ract{display:flex;gap:.45rem}
.nai-gen{flex:1;padding:.6rem;background:linear-gradient(135deg,var(--fern,#27733F),var(--leaf,#3AAA5C));border:none;color:#fff;border-radius:9px;font-size:.78rem;font-weight:600;cursor:pointer}
.nai-cpy{padding:.6rem .95rem;background:rgba(255,255,255,.06);border:1px solid rgba(109,217,140,.17);color:rgba(255,255,255,.65);border-radius:9px;font-size:.78rem;cursor:pointer}
/* ── VOICE STYLES ── */
.nai-voice-row{display:flex;align-items:center;gap:.5rem;margin-left:auto}
.nai-mic{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(109,217,140,.22);color:rgba(255,255,255,.55);cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;position:relative}
.nai-mic:hover{background:rgba(109,217,140,.14);color:#fff;border-color:var(--leaf,#3AAA5C)}
.nai-mic.listening{background:rgba(239,83,80,.18);border-color:#EF5350;color:#EF5350;animation:nai-mic-pulse 1s ease infinite}
.nai-mic.listening::after{content:'';position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(239,83,80,.5);animation:nai-mic-ring 1s ease-out infinite}
@keyframes nai-mic-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@keyframes nai-mic-ring{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.7);opacity:0}}
.nai-spk{width:28px;height:28px;border-radius:50%;background:transparent;border:1px solid rgba(109,217,140,.15);color:rgba(255,255,255,.3);cursor:pointer;font-size:.75rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}
.nai-spk.on{background:rgba(109,217,140,.12);border-color:var(--leaf,#3AAA5C);color:var(--mint,#6DD98C)}
.nai-spk:hover{border-color:rgba(109,217,140,.4);color:rgba(255,255,255,.7)}
/* Zerra speaking waveform overlay on avatar */
.nai-av.speaking{animation:nai-av-speak .6s ease infinite alternate}
@keyframes nai-av-speak{0%{box-shadow:0 0 0 0 rgba(109,217,140,.6)}100%{box-shadow:0 0 0 8px rgba(109,217,140,0)}}
/* Transcript preview in input */
.nai-ta.listening-mode{border-color:#EF5350;background:rgba(239,83,80,.06)}
/* No-support banner */
#nai-voice-unsupported{font-size:.65rem;color:#F5A623;padding:.3rem .9rem;display:none}
`;document.head.appendChild(s);})();

function _buildAIHTML(){
  const fab=document.createElement('div');fab.id='ntz-ai-fab';
  fab.innerHTML=`
  <span id="ntz-ai-hint">🤖 AI Assistant — ask me anything</span>
  <button id="ntz-ai-btn" onclick="NTZ_AI.toggle()" title="Netzerra AI">🤖</button>
  <div id="ntz-ai-panel">
    <div class="nai-hdr">
      <div class="nai-av" id="nai-av">🤖</div>
      <div><div class="nai-hname">Netzerra AI</div><div class="nai-hst">Online · Groq via Worker</div></div>
      <div class="nai-voice-row">
        <button class="nai-spk" id="nai-spk" onclick="NTZ_VOICE.toggleSpeak()" title="Toggle Zerra voice">🔇</button>
        <button class="nai-close" onclick="NTZ_AI.toggle()">✕</button>
      </div>
    </div>
    <div class="nai-tabs">
      <button class="nai-tab on" onclick="NTZ_AI.tab('chat')">💬 Chat</button>
      <button class="nai-tab" onclick="NTZ_AI.tab('insights')">📊 Insights</button>
      <button class="nai-tab" onclick="NTZ_AI.tab('suggest')">💡 Suggest</button>
      <button class="nai-tab" onclick="NTZ_AI.tab('report')">📝 Report</button>
    </div>
    <div class="nai-body">
      <div class="nai-pane on" id="nai-chat">
        <div class="nai-msgs" id="nai-msgs">
          <!-- Greeting injected dynamically by _injectRoleGreeting() after auth loads -->
        </div>
        <div class="nai-sugs" id="nai-sugs">
          <button class="nai-sug" onclick="NTZ_AI.qs(this)">How do I register a KNCR project?</button>
          <button class="nai-sug" onclick="NTZ_AI.qs(this)">Habari yako, unawezaje kunisaidia?</button>
          <button class="nai-sug" onclick="NTZ_AI.qs(this)">Explain the CDA Fourth Schedule</button>
        </div>
        <div id="nai-voice-unsupported">⚠️ Voice not supported in this browser. Use Chrome or Edge.</div>
        <div class="nai-inp-row">
          <textarea class="nai-ta" id="nai-inp" rows="1" placeholder="Ask me anything or press 🎤 to speak..." onkeydown="NTZ_AI.key(event)" oninput="NTZ_AI.resize(this)"></textarea>
          <button class="nai-mic" id="nai-mic" onclick="NTZ_VOICE.toggleMic()" title="Speak to Zerra">🎤</button>
          <button class="nai-send" id="nai-send" onclick="NTZ_AI.send()">➤</button>
        </div>
      </div>
      <div class="nai-pane" id="nai-insights"><div class="nai-cards" id="nai-ins-cards"><div class="nai-card"><h4>📊 Insights</h4><p style="color:rgba(255,255,255,.35)">Click this tab to generate AI analysis.</p></div></div></div>
      <div class="nai-pane" id="nai-suggest"><div class="nai-cards" id="nai-sug-cards"><div class="nai-card"><h4>💡 Suggestions</h4><p style="color:rgba(255,255,255,.35)">Click this tab to get AI recommendations.</p></div></div></div>
      <div class="nai-pane" id="nai-report">
        <div class="nai-cards">
          <div style="font-size:.71rem;color:rgba(255,255,255,.45);margin-bottom:.1rem">Choose report type:</div>
          <div class="nai-rtypes">
            <div class="nai-ropt on" data-t="executive" onclick="NTZ_AI.rtype(this)"><div class="ri">📋</div><h4>Executive</h4><p>Board brief</p></div>
            <div class="nai-ropt" data-t="esg" onclick="NTZ_AI.rtype(this)"><div class="ri">🌍</div><h4>ESG</h4><p>Investor/donor</p></div>
            <div class="nai-ropt" data-t="kncr" onclick="NTZ_AI.rtype(this)"><div class="ri">🏛️</div><h4>KNCR Brief</h4><p>Regulator</p></div>
            <div class="nai-ropt" data-t="offset" onclick="NTZ_AI.rtype(this)"><div class="ri">🌳</div><h4>Offset Plan</h4><p>Agroforestry</p></div>
          </div>
          <div class="nai-rout" id="nai-rout"></div>
          <div class="nai-ract">
            <button class="nai-gen" id="nai-gen" onclick="NTZ_AI.genReport()">✨ Generate with AI</button>
            <button class="nai-cpy" id="nai-cpy" onclick="NTZ_AI.copyReport()" style="display:none">Copy</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(fab);
  setTimeout(()=>{const h=document.getElementById('ntz-ai-hint');if(h)h.style.display='none';},5500);
}

const NETZERRA_KNOWLEDGE = {
    official_links: {
        "KNCR Portal": "https://kncr.go.ke",
        "NEMA Kenya": "https://nema.go.ke",
        "Climate Change Directorate": "https://climate.go.ke",
        "Carbon Markets Regulations 2024 (PDF)": "https://www.nema.go.ke/images/Docs/Regulations/Climate_Change_Carbon_Markets_Regulations_2024.pdf"
    },
    regulatory_framework: {
        "Sustainable Waste Management Act 2022": "Establishes Extended Producer Responsibility (EPR) and mandates strict digital traceability of waste streams.",
        "Traceability & dCoC": "Digital Chain of Custody (dCoC) mandates continuous tracking from Source-to-Sink. Any weight variance >10% between source and facility weighbridge triggers an anti-fraud block under Regulation 37.",
        "Climate Change Act 2016 (2023 Amendment)": "The primary law establishing the KNCR and national carbon oversight.",
        "Carbon Markets Regulations 2024": "Governs the registration, trade, and benefit-sharing of carbon projects.",
        "Regulation 37 (The Heavy Penalty)": "Fine not exceeding KES 500 Million or 10 years imprisonment for providing false/misleading data to NEMA/KNCR.",
        "Regulation 23E (CDA mandate)": "Requires a Community Development Agreement (CDA) for all projects on public/community land. 40% net revenue share for land-based; 25% for non-land based.",
        "Regulation 19": "Mandatory 7-year data retention for all primary evidence (meters, logs, receipts).",
        "PCN (Project Concept Note)": "The First Schedule document required for initial NEMA review to get a Letter of No Objection (LoNO).",
        "LoA (Letter of Authorization)": "The final approval issued by NEMA allowing the transfer of credits."
    },
    technical_standards: {
        "Solid Waste EF": "0.58 tCO2e/tonne (IPCC Tier 2 default for unmanaged Solid Waste/landfills in East Africa region).",
        "AFOLU": "Agriculture, Forestry, and Other Land Use (IPCC Sector). Includes Mau Forest, Kajiado rangelands, and coastal mangroves.",
        "Kenya Grid Factor": "0.3174 kgCO2/kWh (The official KNCR Combined Margin for grid-connected projects).",
        "GWP Values (IPCC AR6)": "CH4 = 27.0, N2O = 273. These are used in Netzerra to ensure 2026-standard accuracy.",
        "Sequestration Rates": "Highland Bamboo (17t/ha), Casuarina (8t/ha), Mangroves (9.8t/ha), Grevillea (6t/ha).",
        "DQS (Data Quality Score)": "Netzerra's metric for audit-readiness. DQS 90+ is required for institutional bankability."
    },
    investment_international: {
        "Article 6.2 (Paris Agreement)": "Allows bilateral trades (ITMOs). Kenya has a signed agreement with Switzerland (KL-CH deal).",
        "FLLoCA": "Financing Locally-Led Climate Action. Program for county performance-based grants.",
        "KenInvest Role": "Netzerra provides the 'Project Readiness Level (PRL)' data KenInvest uses to pitch Kenyan projects to Global Green FDI.",
        "Carbon Pricing": "Market range KES 1,200 – 3,000. Netzerra targets high-integrity 'Premium' pricing via verified DQS."
    }
};

/* ── NETZERRA FEATURES MAP — Zerra knows every feature ── */
const NETZERRA_FEATURES = {
  'home':             { icon:'🏠', label:'Home',                    desc:'Landing page with sector cards, platform overview, and key stats.' },
  'dashboard':        { icon:'📊', label:'Dashboard',               desc:'Emission portfolio: total emissions, offsets, NTZ score, 12-month trend, net zero trajectory, waste KPIs.' },
  'calculator':       { icon:'⚡', label:'Emission Calculator',     desc:'5-sector IPCC AR6 calculator: Borehole, Livestock, Transport, Construction, Manufacturing. Includes DQS scoring, uncertainty bands, GWP switching (AR5/AR6), plausibility flags, and PDF report generation.' },
  'waste-management': { icon:'♻️', label:'Waste Management',        desc:'9-step NEMA waste wizard: Identity → Legal Gate → Contractor → Source Stream → AI Vision → GIS Facility → IPCC Baseline → CDA → Registration. Includes the Zerra Waste Compliance Console with Groq Worker AI review, evidence OCR/vision parsing, AI dossier drafting, dCoC simulator, consultant workbench, and NEMA 21(2) compliance.' },
  'kncr':             { icon:'🏛️', label:'KNCR Gateway',            desc:'6-step KNCR pipeline viewer: Concept Note → PDD → Validation → DNA Review → Registered → Credits Live. Shows bilateral market status (Switzerland, Sweden, Singapore).' },
  'gcis-wizard':      { icon:'📝', label:'GCIS Project IDE Wizard', desc:'10-step project application wizard: Project Info → Registration Docs → Scope → Emissions Calc → Sequestration Calc → Baseline/Methodology → Additionality → Monitoring → Site Verification (AI satellite scan + receipt OCR) → CDA → Review & Submit. AI-assisted content generation for baseline, additionality, and monitoring fields.' },
  'my-projects':      { icon:'📁', label:'My Projects',             desc:'Proponent project portfolio with pipeline progress, PRL scores, and document status.' },
  'messages':         { icon:'💬', label:'Messages',                desc:'Two-way communication between proponents and consultants. Message threads per project.' },
  'review-queue':     { icon:'✅', label:'Review Queue',            desc:'Consultant document review workflow. Review submitted PCN/PDD/CDA documents and approve or request changes.' },
  'registry':         { icon:'📋', label:'National Registry Ledger',desc:'Blockchain-style audit ledger showing all KNCR transactions, registrations, and credit issuances.' },
  'enterprise':       { icon:'🏢', label:'Enterprise Dashboard',    desc:'Credit portfolio management: purchased/retired credits, total invested, offset ratio, listed credits for sale.' },
  'exchange':         { icon:'🔄', label:'Carbon Credit Exchange',  desc:'Buy/sell verified carbon credits from 6+ projects. Filters by standard (Verra, Gold Standard, KNCR). Generates retirement certificates with QR verification.' },
  'b2b':              { icon:'🤝', label:'B2B Trading Hub',         desc:'Request-for-Quote board, enterprise contracts, corporate directory. Post RFQs and respond to credit demands.' },
  'nema-oversight':   { icon:'🏛️', label:'NEMA Oversight Portal',   desc:'Regulator dashboard: project compliance status, CDA enforcement, weight fraud detection, pipeline analytics.' },
  'ai-intelligence':  { icon:'🧠', label:'AI Intelligence Suite',    desc:'Netzerra-wide AI tools: predictive credit pricing, additionality argument generator, greenwash scanner, adaptive project intake, PDD reviewer, satellite monitoring brief, FPIC sentiment analysis, regulatory change monitor, carbon credit risk scoring, and automated annual MRV report drafting. All Worker-backed with local static fallbacks.' },
  'county':           { icon:'🏢', label:'County Dashboard',        desc:'County-level carbon data for all 47 counties. FLLoCA performance reports, carbon levy tracking.' },
  'passport':         { icon:'🪪', label:'Carbon Passport',         desc:'Personal carbon identity card with NTZ score, emission history, and offset achievements.' },
  'offsets':          { icon:'🌳', label:'Offset Strategies',       desc:'Kenya-specific offset options: agroforestry (bamboo, casuarina, grevillea, mangroves), biogas digesters, solar pumps.' },
  'sequestration':    { icon:'🌿', label:'Sequestration Calculator',desc:'Tree species sequestration calculator with Kenya-specific rates per hectare.' },
  'methodology':      { icon:'📐', label:'Methodology',             desc:'Full IPCC source documentation: emission factors, GWP tables, uncertainty ranges, data quality framework.' },
  'docs':             { icon:'📁', label:'Documentation Hub',       desc:'Regulatory document templates: PCN, PDD, CDA Fourth Schedule, ESIA checklist.' },
  'marketplace':      { icon:'🛒', label:'Marketplace',             desc:'Carbon offset marketplace with project listings.' },
  'education':        { icon:'🎓', label:'Education Centre',        desc:'Learning resources: carbon accounting fundamentals, KNCR compliance guide, IPCC methodology training.' },
  'leaderboard':      { icon:'🏆', label:'Leaderboard',             desc:'County and organisation carbon rankings with charts.' },
  'community':        { icon:'💬', label:'Community Feed',          desc:'Social feed for the carbon community: share projects, discuss regulations, network.' },
  'membership':       { icon:'💎', label:'Membership Plans',        desc:'Seedling (free), Canopy (pro), Baobab (enterprise) plan tiers with M-Pesa payment.' },
  'about':            { icon:'ℹ️', label:'About & Founder',         desc:'About Netzerra and founder Shukri Ali. Contact: shukriali411@gmail.com, +254 705 366 807.' },
  'disclaimer':       { icon:'📋', label:'Disclaimer & Legal',      desc:'Legal disclaimer, data privacy, terms of use.' },
};

/* ── Platform Context Scanner — reads live state across all modules ── */
function _scanPlatformContext() {
  const scan = { gaps: [], actions: [], stats: {} };
  const u = (typeof AUTH !== 'undefined' && AUTH.currentUser) ? AUTH.currentUser : ((typeof S !== 'undefined') ? S.user : {});
  const role = u.role || 'proponent';

  // 1. Active section detection
  const activeSec = document.querySelector('.section.active');
  scan.activeSection = activeSec ? activeSec.id.replace('-section','') : 'home';

  // 2. Session status
  scan.loggedIn = !!(typeof AUTH !== 'undefined' && AUTH.currentUser);
  if (!scan.loggedIn) scan.gaps.push('⚠️ NOT LOGGED IN — user is browsing as guest. Suggest logging in or creating an account.');

  // 3. Calculator status
  const lc = (typeof S !== 'undefined') ? S.lastCalc : null;
  if (lc) {
    scan.stats.lastCalc = `${lc.name} (${lc.sector}) — ${lc.total_t} tCO₂e/yr — DQS: ${lc.dqs}/100`;
    if (lc.dqs < 70) scan.gaps.push(`⚠️ LOW DATA QUALITY — Last calculation "${lc.name}" has DQS ${lc.dqs}/100 (${lc.dqsGrade}). Recommend declaring verified data sources (receipts, meter readings) to raise score above 70.`);
    if (lc.flags && lc.flags.length > 0) scan.gaps.push(`⚠️ PLAUSIBILITY FLAGS — Last calculation "${lc.name}" has ${lc.flags.length} data flag(s). Review flagged inputs for accuracy.`);
  } else {
    scan.gaps.push('📊 NO CALCULATIONS YET — User has not run any emission calculations. Suggest starting with the Emission Calculator (⚡).');
    scan.actions.push({ label:'⚡ Start a Calculation', section:'calculator' });
  }

  // 4. GCIS Wizard progress
  const gcisProjects = (typeof NTZ !== 'undefined' && NTZ.projects) ? NTZ.projects : [];
  scan.stats.gcisCount = gcisProjects.length;
  if (gcisProjects.length === 0 && ['proponent','developer'].includes(role)) {
    scan.gaps.push('📝 NO GCIS PROJECTS — No carbon projects started. Suggest opening the GCIS Project IDE Wizard to begin a KNCR application.');
    scan.actions.push({ label:'📝 Start GCIS Wizard', section:'gcis-wizard' });
  }
  gcisProjects.forEach(p => {
    const name = p['gcis-proj-name'] || p.name || p.id;
    const step = p.step || 0;
    if (step < 10) scan.gaps.push(`📝 GCIS INCOMPLETE — "${name}" is at Step ${step+1}/10. Next: complete ${(typeof GCIS_STEPS !== 'undefined' && GCIS_STEPS[step]) ? GCIS_STEPS[step].title : 'the next step'}.`);
    if (p['gcis-baseline_ai_generated'] && !p['gcis-baseline_ai_modified']) scan.gaps.push(`🤖 UNREVIEWED AI CONTENT — "${name}" has AI-generated baseline text that has NOT been manually reviewed. Reg.37 risk.`);
    if (p.status === 'pending' || p.status === 'submitted') scan.gaps.push(`⏳ AWAITING REVIEW — "${name}" is pending consultant review.`);
  });

  // 5. Waste projects
  let wasteProjects = [];
  try { if (typeof getWasteProjects === 'function') wasteProjects = getWasteProjects(); } catch(e){}
  scan.stats.wasteCount = wasteProjects.length;
  if (typeof wasteData !== 'undefined') {
    scan.stats.activeWasteDraft = `${wasteData.w_facility_name || wasteData.w_company_name || 'Unnamed waste draft'} | ${wasteData.w_county || 'County missing'} | PRL ${(wasteData.prl_score || (typeof calculatePRL === 'function' ? calculatePRL(wasteData).total : 0))}/100`;
    if (wasteData.ai_compliance_review) {
      scan.stats.lastWasteAI = `${wasteData.ai_compliance_review.decision || 'reviewed'} | score ${wasteData.ai_compliance_review.score || 'N/A'}/100 | ${wasteData.ai_last_mode || 'AI review'}`;
    } else if (['proponent','developer'].includes(role)) {
      scan.gaps.push('♻️ WASTE AI REVIEW NOT RUN — The Waste Compliance Console can check licence, CDA, dCoC, methane baseline, and evidence gaps through the Groq Worker.');
      scan.actions.push({ label:'♻️ Run Waste AI Review', section:'waste-management' });
    }
  }
  if (wasteProjects.length === 0 && ['proponent','developer','nema_national','nema_county'].includes(role)) {
    scan.actions.push({ label:'♻️ Start Waste Wizard', section:'waste-management' });
  }
  wasteProjects.forEach(p => {
    const name = p.name || p.id;
    const step = p.currentStep || p.step || 1;
    if (step < 9) scan.gaps.push(`♻️ WASTE INCOMPLETE — "${name}" at Step ${step}/9. Continue the waste wizard to complete registration.`);
    if (!p.dcocEnabled && step >= 6) scan.gaps.push(`🔗 dCoC NOT ACTIVE — "${name}" needs Digital Chain of Custody enabled (Step 6+).`);
  });

  // 6. Exchange portfolio
  if (typeof EXCHANGE !== 'undefined') {
    scan.stats.creditsPurchased = EXCHANGE.portfolio?.purchased?.reduce((s,p) => s + p.credits, 0) || 0;
    scan.stats.creditsListed = EXCHANGE.portfolio?.listed?.reduce((s,l) => s + l.credits, 0) || 0;
    if (role === 'enterprise' && scan.stats.creditsPurchased === 0) {
      scan.gaps.push('🔄 NO CREDITS PURCHASED — Visit the Carbon Exchange to buy verified credits and build your offset portfolio.');
      scan.actions.push({ label:'🔄 Browse Exchange', section:'exchange' });
    }
  }

  // 7. Feature discovery — sections user likely hasn't visited
  const roleFeatures = {
    proponent: ['calculator','gcis-wizard','waste-management','ai-intelligence','offsets','passport','kncr'],
    consultant: ['review-queue','registry','ai-intelligence','methodology'],
    enterprise: ['exchange','b2b','enterprise','ai-intelligence','offsets'],
    nema_national: ['nema-oversight','registry','waste-management','ai-intelligence'],
    nema_county: ['nema-oversight','registry','waste-management','ai-intelligence'],
    developer: ['calculator','gcis-wizard','waste-management','ai-intelligence','exchange','b2b','nema-oversight'],
  };
  scan.suggestedFeatures = (roleFeatures[role] || roleFeatures.proponent).map(id => NETZERRA_FEATURES[id]).filter(Boolean);

  // 8. Build formatted report
  let report = `Active Page: ${NETZERRA_FEATURES[scan.activeSection]?.label || scan.activeSection}\n`;
  report += `Session: ${scan.loggedIn ? 'Logged in' : 'Guest'} | Role: ${role}\n`;
  report += `Projects: ${scan.stats.gcisCount || 0} GCIS, ${scan.stats.wasteCount || 0} Waste\n`;
  if (scan.stats.lastCalc) report += `Last Calc: ${scan.stats.lastCalc}\n`;
  if (scan.stats.activeWasteDraft) report += `Active Waste Draft: ${scan.stats.activeWasteDraft}\n`;
  if (scan.stats.lastWasteAI) report += `Last Waste AI Review: ${scan.stats.lastWasteAI}\n`;
  if (typeof NTZ_INTEL !== 'undefined') {
    const runs = Object.keys(NTZ_INTEL.state?.lastResults || {}).length;
    report += `AI Intelligence Suite: ${runs} saved run${runs === 1 ? '' : 's'} available. Tools include pricing, additionality, greenwash, PDD review, FPIC, credit risk, and MRV.\n`;
  }
  if (scan.gaps.length > 0) {
    report += `\nGaps & Action Items (${scan.gaps.length}):\n` + scan.gaps.map(g => `  ${g}`).join('\n');
  } else {
    report += '\n✅ No critical gaps detected.';
  }
  scan.report = report;
  return scan;
}

/* ── Compute real regulatory violations from live project data ── */
function _computeViolations() {
  const all = [
    ...((typeof NTZ !== 'undefined' && NTZ.projects) ? NTZ.projects : []),
  ];
  let wProjects = [];
  try {
    if (typeof getWasteProjects === 'function') wProjects = getWasteProjects();
    else wProjects = all.filter(p => p.sector === 'waste');
  } catch(e){}

  const violations = [];
  const today = Date.now();

  // Check GCIS projects
  all.forEach(p => {
    const name = p['gcis-proj-name'] || p.name || p.id;
    const cda = parseFloat(p['gcis-cda-rate'] || p.cda_share_pct || 0);
    const isLand = (p['gcis-land-type']||p.land_type||'').toLowerCase().includes('land');
    if (cda > 0 && cda < 40 && isLand)
      violations.push(`🔴 CDA VIOLATION [Reg.23E] — ${name}: CDA share ${cda}% is below the 40% mandatory threshold for land-based projects.`);
    if (p['gcis-baseline_ai_generated'] && !p['gcis-baseline_ai_modified'])
      violations.push(`🟡 AI-GENERATED BASELINE [Reg.37 Risk] — ${name}: Baseline was AI-generated and has NOT been manually reviewed. This may constitute false data submission.`);
    if (p.pipelineStage === 'mrv' || p.step >= 9) {
      const lastAudit = p.lastAudit ? new Date(p.lastAudit).getTime() : 0;
      if (lastAudit && (today - lastAudit) > 90 * 86400000)
        violations.push(`🟡 MRV OVERDUE [Reg.25] — ${name}: No MRV report filed in ${Math.floor((today-lastAudit)/86400000)} days. 90-day limit exceeded.`);
    }
  });

  // Check waste projects
  wProjects.forEach(p => {
    const name = p.name || p.id;
    const srcW  = parseFloat(p.tonnageSource || p.w_tonnage || 0);
    const facW  = parseFloat(p.tonnageFacility || 0);
    if (srcW > 0 && facW > 0) {
      const variance = Math.abs(srcW - facW) / srcW * 100;
      if (variance > 10)
        violations.push(`🔴 WEIGHT FRAUD [Reg.37 — KES 500M Penalty] — ${name}: Source weight ${srcW}t vs Facility weight ${facW}t = ${variance.toFixed(1)}% variance (threshold: 10%).`);
    }
    const cdaShare = parseFloat(p.cdaShare || p.cda_share_pct || 0);
    if (cdaShare > 0 && cdaShare < 40)
      violations.push(`🔴 CDA VIOLATION [Reg.23E] — ${name}: Community share ${cdaShare}% below 40% threshold.`);
    if (!p.dcocEnabled && (p.currentStep||p.step||1) >= 6)
      violations.push(`🟡 dCoC GAP [SWMA 2022] — ${name}: Digital Chain of Custody not active despite facility assignment at Step ${p.currentStep||p.step}.`);
    if (p.w_nema_license) {
      const expiry = p.w_license_expiry ? new Date(p.w_license_expiry).getTime() : 0;
      if (expiry && expiry < today)
        violations.push(`🔴 LICENSE EXPIRED [EMCA §87] — ${name}: NEMA waste license ${p.w_nema_license} expired ${new Date(expiry).toLocaleDateString('en-KE')}.`);
      else if (expiry && (expiry - today) < 30 * 86400000)
        violations.push(`🟡 LICENSE EXPIRING SOON [EMCA §87] — ${name}: License ${p.w_nema_license} expires in ${Math.floor((expiry-today)/86400000)} days.`);
    }
    const lastMrv = p.lastMrvDate ? new Date(p.lastMrvDate).getTime() : 0;
    if (p.status === 'approved' && lastMrv && (today - lastMrv) > 90 * 86400000)
      violations.push(`🟡 MRV OVERDUE [Reg.25] — ${name}: No waste MRV report in ${Math.floor((today-lastMrv)/86400000)} days.`);
  });

  // Integrate dCoC AI Fraud Detection Engine
  try {
    if (typeof runDcocFraudAnalysis === 'function') {
      const fraud = runDcocFraudAnalysis();
      fraud.patterns.forEach(p => violations.push(`🔴 PATTERN GAMING [Reg.37 AI] — Driver ${p.driverName} (${p.plate}): ${p.tripCount} trips with mean ${p.mean}% variance (σ=${p.stdDev}). Gaming the ${SOVEREIGN_VALUES?.WEIGHT_VARIANCE_THRESHOLD_PCT||10}% threshold.`));
      fraud.ghostTrips.forEach(g => violations.push(`🔴 GHOST TRIP [Reg.37] — ${g.driverName} (${g.plate}) on ${g.route}: ${g.detail}`));
      fraud.collusion.forEach(c => violations.push(`🔴 COLLUSION [Reg.37] — ${c.facilities.join(' ↔ ')}: ${c.detail}`));
      fraud.driverScores.filter(d => d.score < 40).forEach(d => violations.push(`🟡 DRIVER RISK [SWMA] — ${d.driverName} (${d.plate}): Score ${d.score}/100 (Grade ${d.grade}), ${d.flagCount} flags, ${d.ghostTrips} ghost trips.`));
    }
  } catch(e) {}

  if (violations.length === 0) return '  ✅ No active violations detected in live project data.';
  return violations.map(v => `  ${v}`).join('\n');
}

function _ctx(){
  // ── Resolve current user (AUTH takes priority over S) ──
  const u = (typeof AUTH !== 'undefined' && AUTH.currentUser)
    ? AUTH.currentUser
    : ((typeof S !== 'undefined') ? S.user : {});
  const role = u.role || 'proponent';
  const lc   = (typeof S !== 'undefined') ? S.lastCalc : null;

  // ── Pull ALL GCIS/nuclear projects ──
  const gcisProjects = (typeof NTZ !== 'undefined' && NTZ.projects) ? NTZ.projects : [];

  // ── Pull ALL waste management projects ──
  let wasteProjects = [];
  try {
    if (typeof getWasteProjects === 'function') wasteProjects = getWasteProjects();
    else if (typeof window.NTZ !== 'undefined' && window.NTZ.projects)
      wasteProjects = window.NTZ.projects.filter(p => p.sector === 'waste');
  } catch(e) {}

  // ── Format project summaries ──
  const STAGES = ['PCN','PDD','CDA','ESCP','Stakeholder','ESIA','VVB','DNA/LoA','KNCR Reg.','MRV'];
  const fmtGcis = gcisProjects.map(p => {
    const stageIdx = p.pipelineStage ? ['pcn','pdd','cda','escp','stakeholder','esia','validation','dna-approval','kncr-registration','mrv'].indexOf(p.pipelineStage) : (p.step||0);
    const stageName = STAGES[stageIdx] || p.pipelineStage || 'PCN';
    const prl = p.prlScore ? `PRL ${p.prlScore.score}% (${p.prlScore.level})` : 'PRL N/A';
    return `  • [GCIS] ${p['gcis-proj-name']||p.name||p.id} | ${p['gcis-county']||p.county||'?'} County | Stage: ${stageName} | Credits: ${Math.round(p['gcis-credits']||p.credits||0)} tCO₂e/yr | CDA: ${p['gcis-cda-rate']||p.cda_share_pct||0}% | Status: ${p.status||'pending'} | ${prl}`;
  }).join('\n') || '  (none)';

  const fmtWaste = wasteProjects.map(p => {
    const step = p.currentStep||p.step||1;
    const stepNames = ['Identity','Legal Gate','Contractor','Source Stream','AI Vision','GIS Facility','IPCC Baseline','CDA','Registration'];
    const stepName = stepNames[step-1] || `Step ${step}`;
    return `  • [WASTE] ${p.name||p.id} | ${p.county||'?'} County | Wizard Step ${step}/9 (${stepName}) | Tonnage: ${p.tonnageSource||p.w_tonnage||0}t | Credits: ${parseFloat(p.credits||0).toFixed(1)} tCO₂e/yr | dCoC: ${p.dcocEnabled?'Active':'Pending'} | License: ${p.w_nema_license||'N/A'} | Status: ${p.status||'pending'}`;
  }).join('\n') || '  (none)';

  const activeWasteAI = (() => {
    try {
      if (typeof wasteData === 'undefined') return '  No active waste draft loaded.';
      const prl = typeof calculatePRL === 'function' ? calculatePRL(wasteData) : { total: wasteData.prl_score || 0 };
      const review = wasteData.ai_compliance_review;
      let r = `  Active draft: ${wasteData.w_facility_name || wasteData.w_company_name || 'Unnamed waste facility'} | ${wasteData.w_county || 'County missing'} | ${wasteData.w_stream_type || 'Waste stream missing'} | PRL ${prl.total}/100\n`;
      r += `  AI tools available in [GO:waste-management]: AI Review, Draft Dossier, Parse Evidence.\n`;
      if (review) {
        r += `  Last AI review: decision=${review.decision || 'reviewed'} | score=${review.score || 'N/A'}/100 | updated=${wasteData.ai_last_updated || 'unknown'}\n`;
        const flags = review.critical_flags || review.flags || [];
        if (flags.length) r += `  Critical waste AI flags: ${flags.join('; ')}\n`;
        const recs = review.recommendations || review.next_actions || [];
        if (recs.length) r += `  Waste AI recommendations: ${recs.slice(0, 5).join('; ')}\n`;
      } else {
        r += `  Last AI review: not run yet. Recommend using the Waste Compliance Console before submission.\n`;
      }
      if (wasteData.ai_dossier) r += `  AI dossier: drafted and available in waste module output.\n`;
      if (wasteData.ai_evidence?.length) r += `  AI evidence parses stored: ${wasteData.ai_evidence.length}\n`;
      return r;
    } catch(e) {
      return '  Waste AI context unavailable: ' + e.message;
    }
  })();

  // ── Registry audit entries ──
  const recentAudit = (typeof NTZ !== 'undefined' && NTZ.registry)
    ? NTZ.registry.slice(-5).map(e => `  • Block#${e.blockNumber} ${e.action} → ${e.projectId} by ${e.actor}`).join('\n')
    : '  (none)';

  const kObj = JSON.stringify(NETZERRA_KNOWLEDGE, null, 2);

  // ── Role-specific persona & tone ──
  const ROLE_PERSONAS = {
    nema_national: `You are speaking with Dr. Faith Karanja, NEMA National Director. ADOPT THIS PERSONA: You are Zerra acting as a Senior Regulatory Intelligence Officer. Use formal, authoritative language. Lead every response with regulatory risk. Proactively flag CDA violations, weight fraud, and license breaches. Recommend enforcement actions. You have full visibility into ALL projects and their compliance status. Never be lenient about Regulation 37 penalties.`,
    nema_county:   `You are speaking with a NEMA County Officer. ADOPT THIS PERSONA: You are Zerra acting as a County Compliance Advisor. Focus on projects within the officer's county. Highlight local enforcement priorities, community benefit compliance, and county-level monitoring actions. Use professional but practical language.`,
    nema_reviewer: `You are speaking with a NEMA Technical Reviewer. ADOPT THIS PERSONA: You are Zerra acting as a Technical Auditor. Deep-dive into IPCC methodology, MRV quality, PRL scores, and data quality. Flag AI-generated content, unverified baselines, and additionality risks. Use highly technical language.`,
    nema:          `You are speaking with a NEMA Regulator. ADOPT THIS PERSONA: Authoritative regulatory officer tone. Focus on compliance, enforcement, and registry integrity.`,
    consultant:    `You are speaking with ${u.name||'a Carbon Consultant'} from ${u.org||'a consultancy'}. ADOPT THIS PERSONA: You are Zerra acting as a Peer Carbon Expert. Use technical but collaborative language. Help the consultant review project documents, spot weaknesses in methodologies, and prepare projects for NEMA approval. Focus on PRL improvement and document quality.`,
    proponent:     `You are speaking with ${u.name||'a Project Proponent'} from ${u.org||'their organisation'}. ADOPT THIS PERSONA: You are Zerra acting as a Friendly Carbon Compliance Guide. Use encouraging but precise language. Walk them through the 10-stage KNCR pipeline. Explain regulations in plain terms. Alert them to compliance gaps before they become enforcement issues. Celebrate milestones.`,
    developer:     `You are speaking with ${u.name||'a Developer'} (full access). ADOPT THIS PERSONA: You are Zerra in Developer Mode. Be technical, comprehensive, and direct. Share full system context when asked.`,
    enterprise:    `You are speaking with ${u.name||'an Enterprise user'} from ${u.org||'their company'}. ADOPT THIS PERSONA: You are Zerra acting as a Carbon Investment Advisor. Focus on credit portfolio value, offset ratios, Article 6 compliance, and B2B trading opportunities.`,
  };

  const persona = ROLE_PERSONAS[role] || ROLE_PERSONAS.proponent;

  // ── Role-specific instructions ──
  const ROLE_INSTRUCTIONS = {
    nema_national: `NEMA REGULATOR PROTOCOLS:
- You have READ ACCESS to ALL projects in the system, including waste facilities.
- Always lead with compliance status and enforcement risk.
- For every project mentioned, state its CDA compliance, dCoC status, and pipeline stage.
- Recommend "Freeze Credits", "Dispatch Investigator", or "Block PCN" where warranted.
- Cite Regulation 37 (KES 500M) for weight fraud, Regulation 23E for CDA violations.`,
    consultant:    `CONSULTANT PROTOCOLS:
- Help review project documents for quality and NEMA readiness.
- Flag AI-generated content that hasn't been verified by a human expert.
- Guide the consultant on what NEMA reviewers look for at each pipeline stage.
- Suggest specific improvements to PRL scores.`,
    proponent:     `PROPONENT PROTOCOLS:
- Only show the proponent THEIR OWN projects (listed below).
- Guide them step by step through their current pipeline stage.
- Explain what documents they need to prepare for the NEXT stage.
- Warn about CDA obligations before they submit documents.
- Be encouraging about their progress.`,
    enterprise:    `ENTERPRISE PROTOCOLS:
- Focus on credit portfolio, B2B trading, and Article 6 compliance.
- Provide market pricing context (KES 1,200–3,000/tCO₂e range).
- Help with retirement certificate questions and offset ratio calculations.`,
  };
  const roleInstr = ROLE_INSTRUCTIONS[role] || ROLE_INSTRUCTIONS.proponent;

  // ── Platform context scan ──
  const platformScan = _scanPlatformContext();

  // ── Feature map summary for the AI ──
  const featureList = Object.entries(NETZERRA_FEATURES).map(([id, f]) =>
    `  ${f.icon} ${f.label} (section: '${id}'): ${f.desc}`
  ).join('\n');

  const intelContext = (() => {
    try {
      if (typeof NTZ_INTEL === 'undefined') return 'AI Intelligence Suite not loaded.';
      const results = NTZ_INTEL.state?.lastResults || {};
      const lines = Object.entries(results).slice(-6).map(([tool, rec]) => `  • ${tool}: ${rec.source || 'worker'} run at ${rec.ts || 'unknown'}`);
      return lines.length ? lines.join('\n') : '  No Intelligence Suite runs yet. Suggest [GO:ai-intelligence] for pricing, additionality, greenwash, PDD review, credit risk, and MRV.';
    } catch(e) {
      return '  Intelligence context unavailable: ' + e.message;
    }
  })();

  return `# ZERRA AI — CONTEXT-AWARE CARBON INTELLIGENCE ENGINE

## ACTIVE PERSONA
${persona}

## OPERATIONAL PROTOCOLS
1. CITATION: Always cite the specific Regulation when mentioning penalties or mandates.
2. LINKS: For official registration/documents: kncr.go.ke, nema.go.ke, climate.go.ke
3. HONESTY GATE: If outside your knowledge, say "That requires a specialized NEMA Technical Review. Generate a Netzerra DQS report to prepare."
4. LANGUAGE: Respond in the same language the user writes in (English or Kiswahili).
5. NAVIGATION: When suggesting a feature, include the section ID in brackets like [GO:calculator] or [GO:waste-management]. The system will render these as clickable navigation buttons.
6. CONTEXT AWARENESS: You have a live scan of the platform state below. Use it to proactively suggest next steps, flag gaps, and guide the user to features they haven't explored.

## ROLE-SPECIFIC INSTRUCTIONS
${roleInstr}

## 🔍 LIVE PLATFORM CONTEXT SCAN
${platformScan.report}

## 🗺️ NETZERRA FEATURE MAP (all available sections)
When the user asks "what can you do", "what features are available", "where do I find X", or needs navigation help, reference this map:
${featureList}

## REGULATORY KNOWLEDGE BASE
${kObj}

## LIVE PROJECT DATA — ALL GCIS/CARBON PROJECTS
${fmtGcis}

## LIVE PROJECT DATA — ALL WASTE MANAGEMENT PROJECTS
${fmtWaste}

## WASTE AI COMPLIANCE CONSOLE
The static waste module now has direct Groq Worker AI tools. Use these when advising users:
- AI Review: checks licence, CDA, dCoC variance, methane baseline, evidence gaps, and submission readiness.
- Draft Dossier: creates a consultant-ready regulatory memo from the active waste draft.
- Parse Evidence: sends uploaded images/PDF screenshots through Worker vision/OCR and applies extracted fields where possible.
${activeWasteAI}

## NETZERRA AI INTELLIGENCE SUITE
This suite implements the strategic AI upgrades: predictive credit pricing, additionality argument generation, greenwash scanning, adaptive intake, document/PDD review, satellite monitoring brief, FPIC sentiment analysis, regulatory change assessment, credit risk scoring, and annual MRV drafting.
${intelContext}

## RECENT KNCR AUDIT TRAIL (last 5 blocks)
${recentAudit}

## ⚠️ LIVE REGULATORY VIOLATION SCAN (computed from actual project field values)
These are REAL violations derived directly from the project data above. When asked about breach alerts, cite these specifically:
${_computeViolations()}

## 🚨 dCoC AI FRAUD INTELLIGENCE (live analysis of ${(() => { try { return typeof getDcocTripHistory === 'function' ? getDcocTripHistory().length : 0; } catch(e) { return 0; } })()}+ trip records over 30 days)
${(() => {
  try {
    if (typeof runDcocFraudAnalysis !== 'function') return '  Fraud engine not loaded.';
    const f = runDcocFraudAnalysis();
    let r = `Summary: ${f.summary}\n\n`;
    r += `DRIVER BEHAVIOUR SCORES (ranked worst→best):\n`;
    f.driverScores.forEach(d => {
      r += `  • ${d.driverName} (${d.plate}, ${d.driverId}) — Score: ${d.score}/100 (Grade ${d.grade}) | Trips: ${d.tripCount} | Avg Variance: ${d.avgVariance}% | σ: ${d.varStdDev} | Route Adherence: ${d.routeAdherence}% | Ghost Trips: ${d.ghostTrips} | Flags: ${d.flagCount}\n`;
    });
    if (f.patterns.length > 0) {
      r += `\nPATTERN GAMING ALERTS:\n`;
      f.patterns.forEach(p => { r += `  🔴 ${p.driverName} (${p.plate}): ${p.detail}\n`; });
    }
    if (f.ghostTrips.length > 0) {
      r += `\nGHOST TRIP ALERTS:\n`;
      f.ghostTrips.forEach(g => { r += `  🔴 ${g.driverName} (${g.plate}) on ${g.route}: ${g.detail}\n`; });
    }
    if (f.collusion.length > 0) {
      r += `\nCOLLUSION ALERTS:\n`;
      f.collusion.forEach(c => { r += `  🔴 ${c.facilities.join(' ↔ ')}: ${c.detail}\n`; });
    }
    if (f.routeDeviations.length > 0) {
      r += `\nROUTE DEVIATION ALERTS (top 5):\n`;
      f.routeDeviations.slice(0,5).forEach(d => { r += `  🔴 ${d.driverName} (${d.plate}) ${d.route}: Max ${d.maxDevKm}km off corridor. ${d.deviations.length} deviation point(s).\n`; });
    }
    if (f.weightAnomalies.length > 0) {
      r += `\nWEIGHT SIGNATURE ANOMALIES (top 5):\n`;
      f.weightAnomalies.slice(0,5).forEach(w => { r += `  🟡 ${w.driverName} on ${w.route}: Variance ${w.variance}% outside expected ${w.expected}.\n`; });
    }
    r += `\nWEIGHT SIGNATURES (learned baselines per waste type × route):\n`;
    Object.entries(f.weightSignatures).forEach(([key, sig]) => {
      const [type, route] = key.split('|');
      r += `  • ${type} on ${route}: Expected range ${sig.lo}%–${sig.hi}% (μ=${sig.mean}%, σ=${sig.stdDev}, n=${sig.n})\n`;
    });
    return r;
  } catch(e) { return '  Fraud engine error: ' + e.message; }
})()}
When answering fraud or dCoC questions, reference specific driver names, scores, trip counts, and detection results from the data above. Recommend enforcement actions for Grade F/C drivers.

## CURRENT USER SESSION
Name: ${u.name||'Unknown'} | Role: ${role} | Org: ${u.org||'N/A'} | County: ${u.county||'National'}
Last Calculation: ${lc ? `${lc.name} (${lc.sector}) — ${lc.total_t} tCO₂e/yr — DQS: ${lc.dqs}/100` : 'None'}
Session ID: ${Date.now()}`;
}

/* ── WORKER URL — single source of truth, no API key in frontend ── */
const _WORKER = 'https://delicate-bird-531b.shukriali411.workers.dev/';

/* ── Global chat history — persists across tab switches ── */
const chatHistory = [];

/**
 * _postWorker(messages)
 * Low-level POST to the CF Worker.
 * Worker inspects messages: if any message has image_url content → picks vision model.
 * Otherwise picks llama-3.3-70b-versatile. No model specified from frontend.
 */
async function _postWorker(messages) {
  const r = await fetch(_WORKER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });
  if (!r.ok) {
    let msg = `Worker ${r.status}`;
    try { const e = await r.json(); msg = e.error?.message || msg; } catch(_) {}
    throw new Error(msg);
  }
  const d = await r.json();
  const text = d.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Worker');
  return text;
}

/**
 * window.ZerraQuery(prompt, useHistory)
 * Global AI query function — exposed for enterprise.js and app.js to call.
 * useHistory: if true, sends the full chatHistory for context-aware responses.
 * Always prepends the system prompt as the first message.
 */
window.ZerraQuery = async function(prompt, useHistory = false) {
  const systemMsg = { role: 'system', content: _ctx() };
  let messages;

  if (useHistory && chatHistory.length > 0) {
    // System + last 10 history entries + current prompt
    messages = [systemMsg, ...chatHistory.slice(-10), { role: 'user', content: prompt }];
  } else {
    // Stateless call — system + single user message
    messages = [systemMsg, { role: 'user', content: prompt }];
  }

  return await _postWorker(messages);
};

const NTZ_AI=(()=>{
  let _open=false,_curTab='chat',_busy=false,_rtype='executive',_rtext='';
  // chatHistory is defined globally above — shared with ZerraQuery

  let _greeted = false; // only inject greeting once per session

  function _injectRoleGreeting() {
    // Defer if AUTH hasn't resolved yet (e.g. page just loaded)
    const u = (typeof AUTH !== 'undefined' && AUTH.currentUser)
      ? AUTH.currentUser : ((typeof S !== 'undefined') ? S.user : null);
    if (!u || !u.role) {
      // Retry once after 800ms — auth may still be initialising
      setTimeout(_injectRoleGreeting, 800);
      return;
    }
    if (_greeted) return;
    _greeted = true;
    const role = u.role || 'proponent';
    const name = u.name ? u.name.split(' ')[0] : null;

    // Run live platform scan for context-aware greeting
    const scan = _scanPlatformContext();

    const GREETINGS = {
      nema_national: `🏛️ **Director ${name||''}** — I have full visibility into all KNCR projects and waste facilities. I'll flag enforcement priorities, weight fraud alerts, and CDA violations automatically. How can I assist?`,
      nema_county:   `🏛️ **Officer ${name||''}** — I can see all projects within your county scope. Ask me about compliance status, enforcement actions, or community benefit checks.`,
      nema_reviewer: `🔬 **Reviewer ${name||''}** — Ready for technical auditing. I can analyse methodology gaps, IPCC factor alignment, PRL scores, and MRV risks across all projects.`,
      nema:          `🏛️ **${name||'NEMA Regulator'}** — I'm briefed on all active projects. Ask me about compliance, enforcement, or registry integrity.`,
      consultant:    `📋 **${name||'Consultant'}** — I'm your peer review partner. I can help analyse project documents, improve PRL scores, and prepare submissions for NEMA approval.`,
      proponent:     `🌱 **${name||'Hello'}!** — I'm Zerra, your context-aware KNCR guide. I can see your projects, calculations, and documents in real-time. Ask me what's missing, what to do next, or explore any Netzerra feature!`,
      developer:     `⚙️ **Dev mode** — Full platform scan loaded. ${(typeof NTZ!=='undefined'?NTZ.projects.length:0)} GCIS projects, ${scan.stats.wasteCount||0} waste projects. ${scan.gaps.length} gap(s) detected.`,
      enterprise:    `💼 **${name||'Hello'}** — I can help with your credit portfolio, B2B trading opportunities, Article 6 compliance, and retirement certificates.`,
    };

    // Build context-aware greeting addendum
    let contextNote = '';
    if (scan.gaps.length > 0 && scan.gaps.length <= 3) {
      contextNote = '\n\n📋 **Quick status:**\n' + scan.gaps.slice(0, 3).map(g => `• ${g.replace(/^[⚠️📊📝♻️🤖⏳🔗🔄]+\s*/,'')}`).join('\n');
    } else if (scan.gaps.length > 3) {
      contextNote = `\n\n📋 I've detected **${scan.gaps.length} items** that need attention. Ask me "what am I missing?" for the full report.`;
    }

    // Dynamic quick suggestions based on scan
    const QUICK_BASE = {
      nema_national: ['Show all CDA non-compliant projects','Which waste projects have dCoC gaps?','What projects are at risk of Regulation 37 action?'],
      nema_county:   ['Show projects in my county','Which projects need enforcement action?','Check CDA compliance for my county'],
      nema_reviewer: ['List projects with AI-generated baselines','Which projects have MRV overdue?','Analyse PRL scores across all projects'],
      consultant:    ['Review my current project submissions','What should I check before sending to NEMA?','How do I improve a low PRL score?'],
      proponent:     ['Run waste AI review','What am I missing?','What features does Netzerra have?','Explain CDA Fourth Schedule requirements'],
      enterprise:    ['What is my current credit portfolio?','What am I missing?','Explain the retirement certificate process'],
      developer:     ['Run waste AI review','What is the full system status?','Show all feature capabilities','Run compliance scan'],
    };
    let quickList = QUICK_BASE[role] || QUICK_BASE.proponent;
    // Prepend scan-derived dynamic actions
    if (scan.actions.length > 0) {
      const dynActions = scan.actions.slice(0, 2).map(a => a.label);
      quickList = [...dynActions, ...quickList.slice(0, 3 - dynActions.length)];
    }

    const greeting = (GREETINGS[role] || GREETINGS.proponent) + contextNote;

    // Replace the static greeting message
    const msgs = document.getElementById('nai-msgs');
    if (msgs) {
      msgs.innerHTML = '';
      const d = document.createElement('div');
      d.className = 'nai-msg bot';
      const html = greeting.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
      d.innerHTML = `<div class="nai-bub">${html}</div><span class="nai-mt">Now</span>`;
      msgs.appendChild(d);
    }

    // Replace quick suggestion buttons — include nav actions
    const sugs = document.getElementById('nai-sugs');
    if (sugs) {
      let sugHTML = '';
      // Add scan-derived nav buttons first
      scan.actions.slice(0, 2).forEach(a => {
        sugHTML += `<button class="nai-sug" style="border-color:rgba(74,222,128,.35);color:#4ade80" onclick="showSection('${a.section}');NTZ_AI.toggle()">${a.label}</button>`;
      });
      // Then add text-based quick questions
      quickList.forEach(q => {
        if (!scan.actions.find(a => a.label === q)) {
          sugHTML += `<button class="nai-sug" onclick="NTZ_AI.qs(this)">${q}</button>`;
        }
      });
      sugs.innerHTML = sugHTML;
      sugs.style.display = '';
    }
  }

  function toggle(){
    _open=!_open;
    document.getElementById('ntz-ai-panel').classList.toggle('open',_open);
    if(_open){
      _injectRoleGreeting();
      if(_curTab==='insights')_loadInsights();
      if(_curTab==='suggest')_loadSuggest();
      document.getElementById('nai-inp')?.focus();
    }
  }

  function tab(t){_curTab=t;const ids=['chat','insights','suggest','report'];document.querySelectorAll('.nai-tab').forEach((el,i)=>el.classList.toggle('on',ids[i]===t));document.querySelectorAll('.nai-pane').forEach(p=>p.classList.remove('on'));document.getElementById('nai-'+t)?.classList.add('on');if(t==='insights')_loadInsights();if(t==='suggest')_loadSuggest();}


  function _msg(role,text){
    const c=document.getElementById('nai-msgs');const d=document.createElement('div');d.className='nai-msg '+role;
    const ts=new Date().toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'});
    let html=text.replace(/</g,'&lt;').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
    // Parse [GO:section] navigation commands into clickable buttons
    html = html.replace(/\[GO:([a-z-]+)\]/g, (match, sectionId) => {
      const feat = NETZERRA_FEATURES[sectionId];
      if (!feat) return match;
      return `<button class="nai-nav-btn" onclick="showSection('${sectionId}');NTZ_AI.toggle()" style="display:inline-flex;align-items:center;gap:4px;margin:3px 2px;padding:3px 10px;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.3);border-radius:14px;color:#4ade80;font-size:.7rem;cursor:pointer;font-weight:600;transition:all .15s" onmouseover="this.style.background='rgba(74,222,128,.22)'" onmouseout="this.style.background='rgba(74,222,128,.12)'">${feat.icon} ${feat.label}</button>`;
    });
    d.innerHTML=`<div class="nai-bub">${html}</div><span class="nai-mt">${ts}</span>`;
    c.appendChild(d);c.scrollTop=c.scrollHeight;
  }

  function _typing(){const c=document.getElementById('nai-msgs');const d=document.createElement('div');d.className='nai-msg bot nai-typing';d.id='nai-typing';d.innerHTML='<div class="nai-bub"><span class="nai-dot"></span><span class="nai-dot"></span><span class="nai-dot"></span></div>';c.appendChild(d);c.scrollTop=c.scrollHeight;}

  function key(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}
  function resize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,88)+'px';}
  function qs(btn){document.getElementById('nai-inp').value=btn.textContent;send();}

  async function send(){
    if(_busy)return;const inp=document.getElementById('nai-inp');const txt=inp.value.trim();if(!txt)return;
    inp.value='';inp.style.height='auto';document.getElementById('nai-sugs').style.display='none';
    _msg('user',txt);
    // Add to global chatHistory for memory
    chatHistory.push({role:'user', content:txt});
    _busy=true;document.getElementById('nai-send').disabled=true;
    _typing();
    try{
      // useHistory=true so the model sees the full conversation context
      const reply=await window.ZerraQuery(txt, true);
      document.getElementById('nai-typing')?.remove();
      _msg('bot',reply);
      chatHistory.push({role:'assistant', content:reply});
    }catch(e){document.getElementById('nai-typing')?.remove();_msg('bot','⚠️ '+e.message);}
    _busy=false;document.getElementById('nai-send').disabled=false;
  }

  async function _loadInsights(){
    const b=document.getElementById('nai-ins-cards');if(!b)return;
    const u=(typeof AUTH!=='undefined'&&AUTH.currentUser)?AUTH.currentUser:((typeof S!=='undefined')?S.user:{});
    const role=u.role||'developer';
    const lc=(typeof S!=='undefined')?S.lastCalc:null;
    const isGov=['nema_national','nema_county','nema_reviewer','county_floca'].includes(role);

    // ── GOVERNMENT ROLES: State of the Registry / County ──────────────
    if(isGov){
      const projects=(typeof NEMA_DATA!=='undefined')?NEMA_DATA.projects:[];
      const county=u.county;
      const myProjects=county?projects.filter(p=>p.county===county):projects;

      // Red-flag detection (Change 4)
      const nonCompliant=myProjects.filter(p=>!p.cdaCompliant);
      const stalledDNA=myProjects.filter(p=>p.step===4&&p.lastAudit&&((new Date()-new Date(p.lastAudit))/(1000*60*60*24))>30);
      const conceptStalled=myProjects.filter(p=>p.step===1&&!p.lastAudit);

      let flagHTML='';
      if(nonCompliant.length>0){
        flagHTML+=nonCompliant.map(p=>`<div class="nai-sitem high"><h4>🚨 CDA Non-Compliant: ${p.name}</h4><p>${p.county} · ${p.cda}% CDA declared — requires minimum 40% for land-based projects. Developer must amend CDA or face Regulation 23E enforcement action.</p><span class="nai-stag high">Action Required</span></div>`).join('');
      }
      if(stalledDNA.length>0){
        flagHTML+=stalledDNA.map(p=>`<div class="nai-sitem med"><h4>⚠️ DNA Review Stalled: ${p.name}</h4><p>${p.county} · Entered DNA Review ${p.lastAudit}. Over 30 days elapsed. Regulations require the ad hoc committee to complete review within 30 days. Issue a formal notice to the developer.</p><span class="nai-stag med">Follow Up</span></div>`).join('');
      }
      if(conceptStalled.length>0){
        flagHTML+=conceptStalled.map(p=>`<div class="nai-sitem med"><h4>⏳ Concept Note Inactive: ${p.name}</h4><p>${p.county} · No audit activity recorded. Developer has 12 months from LoNO to submit PDD. Verify LoNO issue date and send reminder.</p><span class="nai-stag med">Monitor</span></div>`).join('');
      }

      const totalCredits=myProjects.reduce((s,p)=>s+p.credits,0);
      const compliantCount=myProjects.filter(p=>p.cdaCompliant).length;
      const registeredCount=myProjects.filter(p=>p.step>=5).length;
      const scope=county?county+' County':'National Registry';

      b.innerHTML=`
        <div class="nai-card"><h4>📊 ${scope} — State of the Registry</h4>
          <p>Projects: <strong>${myProjects.length}</strong> · Credits tracked: <strong>${totalCredits.toLocaleString()} tCO₂e</strong><br>
          CDA compliant: <strong>${compliantCount}/${myProjects.length}</strong> · Registered on KNCR: <strong>${registeredCount}</strong></p>
          <div class="nai-sbar"><div class="nai-sfill" style="width:${myProjects.length>0?Math.round(compliantCount/myProjects.length*100):0}%"></div></div>
          <p style="font-size:.67rem;margin-top:.25rem;color:rgba(255,255,255,.35)">${compliantCount}/${myProjects.length} CDA compliant · ${nonCompliant.length+stalledDNA.length} flags requiring action</p>
        </div>
        ${flagHTML?`<div style="font-size:.71rem;font-weight:700;color:var(--coral,#EF5350);padding:.4rem .1rem">🚩 Regulatory Red Flags</div>${flagHTML}`:'<div class="nai-card"><h4>✅ No Red Flags</h4><p>All projects within this scope are CDA compliant and progressing normally through the pipeline.</p></div>'}
        <div class="nai-card" id="nai-ai-ins"><h4>🤖 AI Registry Analysis</h4><p style="color:rgba(255,255,255,.35)">Generating…</p></div>`;

      const prompt=role==='nema_national'
        ?`As Senior Policy Advisor, give a 3-point State of the National Carbon Registry summary: ${myProjects.length} projects, ${totalCredits.toLocaleString()} tCO₂e tracked, ${nonCompliant.length} CDA non-compliant, ${stalledDNA.length} stalled in DNA Review. Focus on national sovereignty and Article 6 readiness. Max 120 words.`
        :role==='nema_reviewer'
        ?`As Technical Auditor, identify the top 3 MRV and methodology risks from this project list: ${myProjects.map(p=>p.name+' ('+p.sector+', Step '+p.step+', CDA '+p.cda+'%)').join('; ')}. Max 120 words, technical tone.`
        :`As County Compliance Officer for ${county||'your county'}, summarise compliance status: ${myProjects.length} projects, ${nonCompliant.length} CDA violations, ${stalledDNA.length} stalled reviews. Give top 2 enforcement actions. Max 100 words.`;

      try{
        const reply=await window.ZerraQuery(prompt,false);
        const card=document.getElementById('nai-ai-ins');
        if(card)card.querySelector('p').innerHTML=reply.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
      }catch(e){const card=document.getElementById('nai-ai-ins');if(card)card.querySelector('p').textContent='⚠️ '+e.message;}
      return;
    }

    // ── STANDARD ROLES: Personal footprint analysis ────────────────────
    const myGcisProjects = (typeof NTZ !== 'undefined') ? NTZ.projects : [];
    const prlStats = myGcisProjects.length > 0 ? myGcisProjects.map(p => `${p['gcis-proj-name']||'Unnamed'}: PRL ${p.prlScore?.score||0}/100 (${p.prlScore?.level||'LOW'})`).join(', ') : 'None';
    const prlHtml = myGcisProjects.length > 0 ? myGcisProjects.map(p => `<div class="nai-card"><h4>🛡️ Project PRL: ${p['gcis-proj-name']||'Unnamed'}</h4><p>Readiness Score: <strong>${p.prlScore?.score||0}/100</strong> (${p.prlScore?.level||'LOW'} Risk)</p><div class="nai-sbar"><div class="nai-sfill" style="width:${p.prlScore?.score||0}%"></div></div></div>`).join('') : '';

    if(!lc&&!u.totalEmissions&&myGcisProjects.length===0){b.innerHTML='<div class="nai-card"><h4>📊 No data yet</h4><p>Run a calculation or start a GCIS application to see your insights.</p></div>';return;}
    const offPct=Math.min(((u.totalOffsets||0)/Math.max(u.totalEmissions||1,1)*100),100).toFixed(0);
    b.innerHTML=`<div class="nai-card"><h4>📈 Emission Profile</h4><p>Total: <strong>${(u.totalEmissions||0).toLocaleString()} tCO₂e</strong> · Offsets: <strong>${(u.totalOffsets||0).toLocaleString()} tCO₂e</strong></p><div class="nai-sbar"><div class="nai-sfill" style="width:${offPct}%"></div></div><p style="font-size:.67rem;margin-top:.25rem;color:rgba(255,255,255,.35)">${offPct}% offset ratio · NTZ ${u.score||0}/100</p></div>${lc?`<div class="nai-card"><h4>🔬 Last: ${lc.name}</h4><p>${lc.sector} · ${lc.total_t} tCO₂e/yr</p></div>`:''}${prlHtml}<div class="nai-card" id="nai-ai-ins"><h4>🤖 AI Analysis</h4><p style="color:rgba(255,255,255,.35)">Generating…</p></div>`;
    try{
      const reply=await window.ZerraQuery(`Analyze these metrics and provide 3 actionable insights in a friendly tone: Emissions: ${u.totalEmissions||0} tCO₂e, Offsets: ${u.totalOffsets||0} tCO₂e. GCIS Project PRLs: ${prlStats}. How can the user improve their Project Readiness Level (PRL) and make their project more bankable and KNCR-compliant? State clear next steps like CDA compliance. Max 140 words.`,false);
      const card=document.getElementById('nai-ai-ins');if(card)card.querySelector('p').innerHTML=reply.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
    }catch(e){const card=document.getElementById('nai-ai-ins');if(card)card.querySelector('p').textContent='⚠️ '+e.message;}
  }

  async function _loadSuggest(){
    const b=document.getElementById('nai-sug-cards');if(!b)return;
    b.innerHTML='<div class="nai-card"><h4>💡 Loading…</h4><p style="color:rgba(255,255,255,.35)">Generating…</p></div>';
    const u=(typeof AUTH!=='undefined'&&AUTH.currentUser)?AUTH.currentUser:((typeof S!=='undefined')?S.user:{});
    const role=u.role||'developer';
    const lc=(typeof S!=='undefined')?S.lastCalc:null;
    const projects=(typeof NEMA_DATA!=='undefined')?NEMA_DATA.projects:[];
    const county=u.county;
    const myProjects=county?projects.filter(p=>p.county===county):projects;
    const isGov=['nema_national','nema_county','nema_reviewer','county_floca'].includes(role);

    const govPrompts={
      nema_national:`Give 4 strategic actions for the NEMA National Director based on: ${myProjects.length} projects nationwide, ${myProjects.filter(p=>!p.cdaCompliant).length} CDA violations, ${myProjects.filter(p=>p.step===4).length} in DNA Review. Focus on national carbon sovereignty, Article 6 ITMO transfers, and registry governance. Format: TITLE: [title] PRIORITY: [high/med/low] DETAIL: [sentence]`,
      nema_reviewer:`Give 4 technical audit recommendations for a NEMA Reviewer based on projects: ${myProjects.map(p=>p.name+' ('+p.sector+', Step '+p.step+')').join('; ')}. Focus on IPCC methodology gaps, MRV risks, PDD quality issues. Format: TITLE: [title] PRIORITY: [high/med/low] DETAIL: [sentence]`,
      nema_county:`Give 4 enforcement actions for the NEMA County Officer in ${county||'this county'}: ${myProjects.length} local projects, ${myProjects.filter(p=>!p.cdaCompliant).length} CDA non-compliant. Focus on Regulation 23E enforcement, community disbursement verification, and developer compliance. Format: TITLE: [title] PRIORITY: [high/med/low] DETAIL: [sentence]`,
      county_floca:`Give 4 revenue and compliance actions for the County Government: FLLoCA reporting, carbon levy collection, community benefit tracking. Format: TITLE: [title] PRIORITY: [high/med/low] DETAIL: [sentence]`,
    };

    const wasteAIState = (typeof wasteData !== 'undefined')
      ? ` Active waste draft: ${wasteData.w_facility_name || wasteData.w_company_name || 'unnamed'}; AI review: ${wasteData.ai_compliance_review ? (wasteData.ai_compliance_review.decision || 'reviewed') + ' score ' + (wasteData.ai_compliance_review.score || 'N/A') : 'not run'};`
      : '';
    const prompt=isGov?(govPrompts[role]||govPrompts.nema_national)
      :`Give 4 recommendations based on: emissions ${u.totalEmissions||0} tCO₂e, offsets ${u.totalOffsets||0}, NTZ ${u.score||0}/100${lc?' last calc '+lc.name+' '+lc.total_t+'tCO₂e':''}.${wasteAIState} Include Kenya-specific offset options, KNCR registration steps, and waste AI review/dossier actions when relevant. Format: TITLE: [title] PRIORITY: [high/med/low] DETAIL: [sentence]`;
    try{
      const reply=await window.ZerraQuery(prompt,false);
      const items=reply.split(/(?=TITLE:)/g).filter(s=>s.trim());
      if(items.length){b.innerHTML=items.map(item=>{const T=(item.match(/TITLE:\s*(.+)/)?.[1]||'').trim();const P=(item.match(/PRIORITY:\s*(\w+)/i)?.[1]||'med').toLowerCase();const D=(item.match(/DETAIL:\s*([\s\S]+)/)?.[1]||'').trim();const L=P==='high'?'🔴 High':P==='med'?'🟡 Med':'🟢 Quick';return `<div class="nai-sitem ${P}"><h4>${T}</h4><p>${D}</p><span class="nai-stag ${P}">${L}</span></div>`;}).join('');}
      else b.innerHTML=`<div class="nai-card"><h4>💡</h4><p>${reply}</p></div>`;
    }catch(e){b.innerHTML=`<div class="nai-card"><h4>⚠️</h4><p>${e.message}</p></div>`;}
  }

  function rtype(el){document.querySelectorAll('.nai-ropt').forEach(o=>o.classList.remove('on'));el.classList.add('on');_rtype=el.dataset.t;document.getElementById('nai-rout').classList.remove('on');document.getElementById('nai-cpy').style.display='none';}

  async function genReport(){
    const u=(typeof S!=='undefined')?S.user:{};
    const btn=document.getElementById('nai-gen');const out=document.getElementById('nai-rout');
    btn.disabled=true;btn.textContent='⏳ Generating…';out.classList.remove('on');
    const prompts={
      executive:`Professional 200-word Executive Summary for ${u.org||'this org'}: emissions ${u.totalEmissions||0} tCO2e, NTZ ${u.score||0}/100.`,
      esg:`220-word ESG Disclosure for ${u.org||'this org'}: GHG inventory, IPCC AR6, KNCR status.`,
      kncr:`180-word KNCR Brief for ${u.org||'this org'}: Registration status, CDA obligations.`,
      offset:`200-word Agroforestry Roadmap for ${u.org||'this org'}: targeting ${u.totalEmissions||0} tCO2e/yr.`
    };
    try{_rtext=await window.ZerraQuery(prompts[_rtype]);out.textContent=_rtext;out.classList.add('on');document.getElementById('nai-cpy').style.display='block';}
    catch(e){out.textContent='⚠️ '+e.message;out.classList.add('on');}
    btn.disabled=false;btn.textContent='✨ Generate with AI';
  }

  function copyReport(){if(!_rtext)return;navigator.clipboard.writeText(_rtext).then(()=>{const b=document.getElementById('nai-cpy');b.textContent='✅ Copied!';setTimeout(()=>b.textContent='Copy',2000);});}

  function resetGreeting(){ _greeted = false; _injectRoleGreeting(); }

  return{toggle,tab,send,key,resize,qs,rtype,genReport,copyReport,resetGreeting};
})();

document.addEventListener('DOMContentLoaded', _buildAIHTML);

// Expose global reset hook — called by auth system on login/logout
window.NTZ_AI_resetGreeting = function() {
  if (typeof NTZ_AI !== 'undefined' && NTZ_AI.resetGreeting) NTZ_AI.resetGreeting();
};
