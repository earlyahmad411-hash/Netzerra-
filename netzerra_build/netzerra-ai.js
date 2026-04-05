/* ══════════════════════════════════════════════════════
   NETZERRA AI — netzerra-ai.js  v1.0
   Powered by Claude (Anthropic) · Kenya Carbon Intelligence

   HOW TO ADD:
     1. Copy this file to your repo root
     2. In index.html, before </body> add:
        <script src="netzerra-ai.js"></script>
     3. Replace YOUR_ANTHROPIC_API_KEY_HERE below

   ⚠️  PRODUCTION NOTE: For a public GitHub Pages site,
   proxy the API call through a Cloudflare Worker or
   Vercel Edge Function to protect the key.
   For MVP/internal demo, direct usage is fine.
══════════════════════════════════════════════════════ */

'use strict';

const NTZ_AI_KEY   = 'YOUR_ANTHROPIC_API_KEY_HERE'; // ← replace
const NTZ_AI_MODEL = 'claude-sonnet-4-20250514';

/* ─── INJECT STYLES ──────────────────────────────────── */
(function() {
  const s = document.createElement('style');
  s.textContent = `
  #ntz-ai-fab {
    position:fixed; bottom:calc(var(--nav-h,58px) + 18px); right:20px;
    z-index:8000; display:flex; flex-direction:column; align-items:flex-end; gap:10px;
  }
  #ntz-ai-btn {
    width:56px;height:56px; border-radius:50%;
    background:linear-gradient(135deg,var(--fern,#27733F),var(--leaf,#3AAA5C));
    border:none; cursor:pointer; font-size:1.35rem;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 6px 24px rgba(58,170,92,.45),0 2px 8px rgba(0,0,0,.3);
    transition:transform .2s,box-shadow .2s; position:relative;
  }
  #ntz-ai-btn:hover{transform:translateY(-2px) scale(1.05);box-shadow:0 10px 32px rgba(58,170,92,.55);}
  #ntz-ai-btn::after{
    content:'';position:absolute;inset:-4px;border-radius:50%;
    border:2px solid rgba(109,217,140,.4);
    animation:ntz-ring 2.4s ease-out infinite;
  }
  @keyframes ntz-ring{0%{transform:scale(1);opacity:.7}70%,100%{transform:scale(1.55);opacity:0}}
  #ntz-ai-hint{
    background:var(--moss,#143820);border:1px solid rgba(109,217,140,.25);
    color:rgba(255,255,255,.85);font-size:.72rem;padding:.35rem .7rem;
    border-radius:20px;white-space:nowrap;pointer-events:none;
    animation:ntz-hint 5s ease forwards;
  }
  @keyframes ntz-hint{0%,70%{opacity:1}100%{opacity:0}}

  #ntz-ai-panel{
    position:fixed; bottom:calc(var(--nav-h,58px) + 84px); right:20px;
    width:370px; max-height:560px;
    background:var(--deep,#0D2818); border:1px solid rgba(109,217,140,.18);
    border-radius:18px; box-shadow:0 24px 64px rgba(0,0,0,.5);
    display:flex;flex-direction:column; z-index:7999; overflow:hidden;
    transform:scale(.92) translateY(12px); opacity:0; pointer-events:none;
    transition:transform .25s cubic-bezier(.4,0,.2,1),opacity .25s;
  }
  #ntz-ai-panel.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}
  @media(max-width:440px){
    #ntz-ai-panel{right:0;left:0;width:100%;bottom:var(--nav-h,58px);
      border-radius:18px 18px 0 0;max-height:75vh;}
  }
  .nai-header{
    padding:.9rem 1rem;border-bottom:1px solid rgba(109,217,140,.1);
    display:flex;align-items:center;gap:.75rem;flex-shrink:0;
  }
  .nai-avatar{width:36px;height:36px;border-radius:50%;flex-shrink:0;
    background:linear-gradient(135deg,var(--fern,#27733F),var(--teal,#00C9A7));
    display:flex;align-items:center;justify-content:center;font-size:1rem;}
  .nai-hname{font-size:.88rem;font-weight:600;color:#fff;}
  .nai-hstatus{font-size:.68rem;color:var(--mint,#6DD98C);display:flex;align-items:center;gap:5px;}
  .nai-hstatus::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--mint,#6DD98C);animation:ntz-blink 2s infinite;}
  @keyframes ntz-blink{0%,100%{opacity:1}50%{opacity:.3}}
  .nai-close{background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:1.1rem;margin-left:auto;}
  .nai-close:hover{color:#fff;}

  .nai-tabs{display:flex;padding:.5rem .8rem 0;gap:.25rem;border-bottom:1px solid rgba(109,217,140,.08);flex-shrink:0;}
  .nai-tab{font-size:.68rem;font-weight:600;padding:.36rem .65rem;border-radius:7px 7px 0 0;
    cursor:pointer;border:none;background:transparent;color:rgba(255,255,255,.35);
    letter-spacing:.02em;transition:color .15s,background .15s;}
  .nai-tab.active{color:var(--mint,#6DD98C);background:rgba(109,217,140,.08);}
  .nai-tab:hover:not(.active){color:rgba(255,255,255,.65);}

  .nai-body{flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(109,217,140,.2) transparent;}
  .nai-pane{display:none;flex-direction:column;height:100%;}
  .nai-pane.active{display:flex;}

  /* CHAT */
  .nai-msgs{flex:1;padding:.9rem 1rem;display:flex;flex-direction:column;gap:.75rem;overflow-y:auto;min-height:0;}
  .nai-msg{display:flex;flex-direction:column;gap:3px;}
  .nai-msg.user{align-items:flex-end;}
  .nai-msg.bot{align-items:flex-start;}
  .nai-bubble{max-width:85%;padding:.55rem .85rem;border-radius:14px;font-size:.8rem;line-height:1.6;}
  .nai-msg.user .nai-bubble{background:linear-gradient(135deg,var(--fern,#27733F),var(--leaf,#3AAA5C));color:#fff;border-radius:14px 14px 4px 14px;}
  .nai-msg.bot  .nai-bubble{background:rgba(255,255,255,.06);color:rgba(255,255,255,.88);border:1px solid rgba(109,217,140,.1);border-radius:14px 14px 14px 4px;}
  .nai-mtime{font-size:.62rem;color:rgba(255,255,255,.25);padding:0 4px;}
  .nai-typing .nai-bubble{display:flex;gap:5px;align-items:center;padding:.6rem .9rem;}
  .nai-dot{width:7px;height:7px;border-radius:50%;background:rgba(109,217,140,.5);animation:ntz-dots .8s infinite;}
  .nai-dot:nth-child(2){animation-delay:.16s;}.nai-dot:nth-child(3){animation-delay:.32s;}
  @keyframes ntz-dots{0%,80%,100%{transform:scale(.6)}40%{transform:scale(1)}}
  .nai-sugs{padding:.5rem 1rem .7rem;display:flex;flex-wrap:wrap;gap:.4rem;flex-shrink:0;}
  .nai-sug{font-size:.68rem;padding:.28rem .58rem;background:rgba(109,217,140,.07);
    border:1px solid rgba(109,217,140,.17);color:rgba(255,255,255,.62);border-radius:20px;cursor:pointer;transition:all .15s;}
  .nai-sug:hover{background:rgba(109,217,140,.15);color:#fff;}
  .nai-input-row{display:flex;align-items:flex-end;gap:.5rem;padding:.65rem .9rem .88rem;border-top:1px solid rgba(109,217,140,.08);flex-shrink:0;}
  .nai-textarea{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(109,217,140,.18);
    border-radius:10px;color:#fff;font-size:.8rem;padding:.5rem .75rem;resize:none;max-height:90px;line-height:1.5;
    transition:border-color .15s;}
  .nai-textarea:focus{border-color:var(--leaf,#3AAA5C);outline:none;}
  .nai-textarea::placeholder{color:rgba(255,255,255,.22);}
  .nai-send{width:36px;height:36px;border-radius:50%;
    background:linear-gradient(135deg,var(--fern,#27733F),var(--leaf,#3AAA5C));
    border:none;color:#fff;cursor:pointer;font-size:.9rem;flex-shrink:0;transition:opacity .15s;}
  .nai-send:disabled{opacity:.4;cursor:default;}

  /* INSIGHTS */
  .nai-cards{padding:.9rem;display:flex;flex-direction:column;gap:.75rem;}
  .nai-card{background:rgba(255,255,255,.04);border:1px solid rgba(109,217,140,.1);border-radius:12px;padding:.8rem .9rem;}
  .nai-card h4{font-size:.78rem;color:var(--mint,#6DD98C);margin-bottom:.35rem;display:flex;align-items:center;gap:.35rem;}
  .nai-card p{font-size:.74rem;color:rgba(255,255,255,.7);line-height:1.6;margin:0;}
  .nai-card .gen{font-size:.74rem;color:rgba(255,255,255,.35);font-style:italic;}
  .nai-sbar{margin-top:.45rem;height:5px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden;}
  .nai-sfill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--fern,#27733F),var(--mint,#6DD98C));}

  /* SUGGESTIONS */
  .nai-sitem{background:rgba(255,255,255,.04);border:1px solid rgba(109,217,140,.1);
    border-left:3px solid var(--leaf,#3AAA5C);border-radius:0 10px 10px 0;padding:.72rem .88rem;}
  .nai-sitem.high{border-left-color:var(--coral,#EF5350);}
  .nai-sitem.med{border-left-color:var(--gold,#F5A623);}
  .nai-sitem h4{font-size:.77rem;color:#fff;margin-bottom:.22rem;}
  .nai-sitem p{font-size:.71rem;color:rgba(255,255,255,.58);margin:0;line-height:1.5;}
  .nai-stag{font-size:.62rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;
    margin-top:.38rem;display:inline-block;padding:.16rem .48rem;border-radius:4px;}
  .nai-stag.high{background:rgba(239,83,80,.15);color:var(--coral,#EF5350);}
  .nai-stag.med{background:rgba(245,166,35,.15);color:var(--gold,#F5A623);}
  .nai-stag.low{background:rgba(58,170,92,.15);color:var(--leaf,#3AAA5C);}

  /* REPORT */
  .nai-rtype{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.6rem;}
  .nai-ropt{background:rgba(255,255,255,.04);border:1px solid rgba(109,217,140,.12);border-radius:10px;
    padding:.72rem;cursor:pointer;text-align:center;transition:all .15s;}
  .nai-ropt:hover,.nai-ropt.sel{background:rgba(109,217,140,.09);border-color:var(--leaf,#3AAA5C);}
  .nai-ropt .ri{font-size:1.3rem;margin-bottom:.25rem;}
  .nai-ropt h4{font-size:.74rem;color:#fff;margin:.18rem 0 .12rem;}
  .nai-ropt p{font-size:.67rem;color:rgba(255,255,255,.55);margin:0;}
  .nai-rout{background:rgba(0,0,0,.25);border:1px solid rgba(109,217,140,.1);border-radius:10px;
    padding:.8rem;font-size:.73rem;color:rgba(255,255,255,.8);line-height:1.7;
    white-space:pre-wrap;max-height:190px;overflow-y:auto;display:none;margin-bottom:.6rem;}
  .nai-rout.vis{display:block;}
  .nai-ract{display:flex;gap:.5rem;}
  .nai-gen{flex:1;padding:.62rem;background:linear-gradient(135deg,var(--fern,#27733F),var(--leaf,#3AAA5C));
    border:none;color:#fff;border-radius:9px;font-size:.79rem;font-weight:600;cursor:pointer;transition:opacity .15s;}
  .nai-gen:disabled{opacity:.4;cursor:default;}
  .nai-cpy{padding:.62rem 1rem;background:rgba(255,255,255,.06);border:1px solid rgba(109,217,140,.18);
    color:rgba(255,255,255,.7);border-radius:9px;font-size:.79rem;cursor:pointer;transition:all .15s;}
  .nai-cpy:hover{background:rgba(255,255,255,.1);color:#fff;}
  `;
  document.head.appendChild(s);
})();

/* ─── INJECT HTML ────────────────────────────────────── */
function _buildAIHTML() {
  const fab = document.createElement('div');
  fab.id = 'ntz-ai-fab';
  fab.innerHTML = `
    <span id="ntz-ai-hint">✨ AI powered by Claude — ask me anything</span>
    <button id="ntz-ai-btn" onclick="NTZ_AI.toggle()" title="Netzerra AI Assistant">🤖</button>
    <div id="ntz-ai-panel">
      <div class="nai-header">
        <div class="nai-avatar">🤖</div>
        <div>
          <div class="nai-hname">Netzerra AI</div>
          <div class="nai-hstatus">Online · Powered by Claude</div>
        </div>
        <button class="nai-close" onclick="NTZ_AI.toggle()">✕</button>
      </div>
      <div class="nai-tabs">
        <button class="nai-tab active"  onclick="NTZ_AI.tab('chat')">💬 Chat</button>
        <button class="nai-tab"         onclick="NTZ_AI.tab('insights')">📊 Insights</button>
        <button class="nai-tab"         onclick="NTZ_AI.tab('suggest')">💡 Suggest</button>
        <button class="nai-tab"         onclick="NTZ_AI.tab('report')">📝 Report</button>
      </div>
      <div class="nai-body">

        <!-- CHAT -->
        <div class="nai-pane active" id="nai-chat">
          <div class="nai-msgs" id="nai-msgs">
            <div class="nai-msg bot">
              <div class="nai-bubble">👋 Hi! I'm your Netzerra AI assistant — powered by Claude.\n\nI know your emissions data, KNCR projects, and Kenya's carbon regulations inside out. How can I help?</div>
              <span class="nai-mtime">Now</span>
            </div>
          </div>
          <div class="nai-sugs" id="nai-sugs">
            <button class="nai-sug" onclick="NTZ_AI.qs(this)">How do I register a KNCR project?</button>
            <button class="nai-sug" onclick="NTZ_AI.qs(this)">Best offsets for my emissions?</button>
            <button class="nai-sug" onclick="NTZ_AI.qs(this)">How can ETG/Agriterra use Netzerra?</button>
            <button class="nai-sug" onclick="NTZ_AI.qs(this)">Explain the CDA Fourth Schedule</button>
          </div>
          <div class="nai-input-row">
            <textarea class="nai-textarea" id="nai-inp" rows="1"
              placeholder="Ask about carbon, KNCR, offsets…"
              onkeydown="NTZ_AI.key(event)" oninput="NTZ_AI.resize(this)"></textarea>
            <button class="nai-send" id="nai-send" onclick="NTZ_AI.send()">➤</button>
          </div>
        </div>

        <!-- INSIGHTS -->
        <div class="nai-pane" id="nai-insights">
          <div class="nai-cards" id="nai-insight-cards">
            <div class="nai-card"><h4>📊 Loading…</h4><p class="gen">Analysing your data…</p></div>
          </div>
        </div>

        <!-- SUGGEST -->
        <div class="nai-pane" id="nai-suggest">
          <div class="nai-cards" id="nai-sug-cards">
            <div class="nai-card"><h4>💡 Loading…</h4><p class="gen">Building recommendations…</p></div>
          </div>
        </div>

        <!-- REPORT -->
        <div class="nai-pane" id="nai-report">
          <div class="nai-cards">
            <div style="font-size:.73rem;color:rgba(255,255,255,.5);margin-bottom:.15rem">Select report type:</div>
            <div class="nai-rtype">
              <div class="nai-ropt sel" data-t="executive" onclick="NTZ_AI.rtype(this)">
                <div class="ri">📋</div><h4>Executive</h4><p>Board-ready brief</p>
              </div>
              <div class="nai-ropt" data-t="esg" onclick="NTZ_AI.rtype(this)">
                <div class="ri">🌍</div><h4>ESG Narrative</h4><p>Investor/donor</p>
              </div>
              <div class="nai-ropt" data-t="kncr" onclick="NTZ_AI.rtype(this)">
                <div class="ri">🏛️</div><h4>KNCR Brief</h4><p>Regulator-ready</p>
              </div>
              <div class="nai-ropt" data-t="offset" onclick="NTZ_AI.rtype(this)">
                <div class="ri">🌳</div><h4>Offset Plan</h4><p>Agroforestry roadmap</p>
              </div>
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
  setTimeout(() => { const h = document.getElementById('ntz-ai-hint'); if(h) h.style.display='none'; }, 5500);
}

/* ─── MODULE ─────────────────────────────────────────── */
const NTZ_AI = (() => {
  let _open=false, _tab='chat', _busy=false, _rtype='executive', _rtext='';
  const _hist = [];

  function _sys() {
    const u  = typeof S!=='undefined' ? S.user     : {};
    const lc = typeof S!=='undefined' ? S.lastCalc : null;
    const kp = typeof S!=='undefined' && S.kncr ? S.kncr.projects : [];
    return `You are Netzerra AI — the built-in carbon intelligence assistant for Netzerra, Kenya's first KNCR-native carbon compliance platform. Powered by Claude (Anthropic).

USER: ${u.name||'User'} | Org: ${u.org||'N/A'} | Plan: ${u.plan||'Seedling'}
EMISSIONS: ${u.totalEmissions||0} tCO₂e total | ${u.totalOffsets||0} tCO₂e offset | NTZ Score: ${u.score||0}/100 | Projects: ${u.projects||0}
LAST CALC: ${lc?`${lc.name} (${lc.sector}) · ${lc.total_t} tCO₂e/yr · S1:${lc.s1||0} S2:${lc.s2||0} S3:${lc.s3||0} · ${lc.county||''}`:' None yet'}
KNCR PROJECTS (${kp.length}): ${kp.length?kp.map(p=>`${p.id} "${p.name}" Step${p.step}/6`).join(', '):'None'}

EXPERTISE: Kenya Carbon Markets Regulations 2024 · IPCC AR6 GWP100 · KNCR 6-step registration · CDA Fourth Schedule (40% land-based/25% non-land) · Offset strategies (Grevillea 6 tCO₂e/ha/yr, Casuarina 8, Bamboo 17, Biogas 3.5/unit) · Article 6 ITMO bilateral (Switzerland, Sweden, Japan, Singapore) · Enterprise carbon for agri-business (ETG, Agriterra, tea factories, logistics) · ISO 14064-1:2018 · FLLoCA/NEMA compliance.

STYLE: Concise, practical, action-oriented. Cite sources. For enterprise/ETG queries: focus on Scope 3 supply chains, agroforestry credit generation, KNCR registration & ITMO sales. Max 280 words unless writing a full report.`;
  }

  async function _call(msgs) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:NTZ_AI_MODEL, max_tokens:1000, system:_sys(), messages:msgs })
    });
    if (!r.ok) throw new Error('API '+r.status);
    const d = await r.json();
    return d.content.map(b=>b.text||'').join('');
  }

  function toggle() {
    _open = !_open;
    document.getElementById('ntz-ai-panel').classList.toggle('open', _open);
    if (_open) {
      if (_tab==='insights') _loadInsights();
      if (_tab==='suggest')  _loadSuggest();
      document.getElementById('nai-inp')?.focus();
    }
  }

  function tab(t) {
    _tab = t;
    ['chat','insights','suggest','report'].forEach((id,i) => {
      document.querySelectorAll('.nai-tab')[i]?.classList.toggle('active', id===t);
      document.getElementById('nai-'+id)?.classList.toggle('active', id===t);
    });
    if (t==='insights') _loadInsights();
    if (t==='suggest')  _loadSuggest();
  }

  function _addMsg(role, text) {
    const c = document.getElementById('nai-msgs');
    const d = document.createElement('div');
    d.className = 'nai-msg '+role;
    const t = new Date().toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'});
    d.innerHTML = `<div class="nai-bubble">${text.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div><span class="nai-mtime">${t}</span>`;
    c.appendChild(d); c.scrollTop=c.scrollHeight; return d;
  }

  function _typing() {
    const c=document.getElementById('nai-msgs');
    const d=document.createElement('div'); d.className='nai-msg bot nai-typing'; d.id='nai-typing';
    d.innerHTML='<div class="nai-bubble"><span class="nai-dot"></span><span class="nai-dot"></span><span class="nai-dot"></span></div>';
    c.appendChild(d); c.scrollTop=c.scrollHeight;
  }

  function key(e) { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} }
  function resize(el) { el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,90)+'px'; }
  function qs(btn) { document.getElementById('nai-inp').value=btn.textContent; send(); }

  async function send() {
    if (_busy) return;
    const inp=document.getElementById('nai-inp');
    const txt=inp.value.trim(); if(!txt) return;
    inp.value=''; inp.style.height='auto';
    document.getElementById('nai-sugs').style.display='none';
    _addMsg('user',txt); _hist.push({role:'user',content:txt});
    _busy=true; document.getElementById('nai-send').disabled=true; _typing();
    try {
      const r = await _call(_hist.slice(-10));
      document.getElementById('nai-typing')?.remove();
      _addMsg('bot',r); _hist.push({role:'assistant',content:r});
    } catch(e) {
      document.getElementById('nai-typing')?.remove();
      _addMsg('bot','⚠️ Could not reach AI. Check NTZ_AI_KEY in netzerra-ai.js or your connection.');
    }
    _busy=false; document.getElementById('nai-send').disabled=false;
  }

  async function _loadInsights() {
    const b=document.getElementById('nai-insight-cards'); if(!b) return;
    const u=typeof S!=='undefined'?S.user:{};
    const lc=typeof S!=='undefined'?S.lastCalc:null;
    if (!lc && !u.totalEmissions) {
      b.innerHTML='<div class="nai-card"><h4>📊 No data yet</h4><p>Run a calculation first to see AI insights.</p></div>'; return;
    }
    const offRatio = Math.min((u.totalOffsets||0)/Math.max(u.totalEmissions||1,1)*100,100).toFixed(0);
    b.innerHTML = `
      <div class="nai-card">
        <h4>📈 Emission Overview</h4>
        <p>Total: <strong>${(u.totalEmissions||0).toLocaleString()} tCO₂e</strong> · Offsets: <strong>${(u.totalOffsets||0).toLocaleString()} tCO₂e</strong></p>
        <div class="nai-sbar"><div class="nai-sfill" style="width:${offRatio}%"></div></div>
        <p style="font-size:.67rem;margin-top:.28rem;color:rgba(255,255,255,.38)">${offRatio}% offset ratio · NTZ Score ${u.score||0}/100</p>
      </div>
      ${lc?`<div class="nai-card"><h4>🔬 Last: ${lc.name}</h4><p>${lc.sector} · ${lc.total_t} tCO₂e/yr<br>Scope 1: ${lc.s1||0} · S2: ${lc.s2||0} · S3: ${lc.s3||0} · ${lc.county||''}</p></div>`:''}
      <div class="nai-card" id="nai-ai-ins"><h4>🤖 AI Analysis</h4><p class="gen">Generating…</p></div>`;
    try {
      const r = await _call([{role:'user',content:`3 sharp insights for: emissions ${u.totalEmissions||0} tCO₂e, offsets ${u.totalOffsets||0}, NTZ score ${u.score||0}/100, last calc: ${lc?lc.sector+' '+lc.total_t+' tCO₂e':'none'}, projects: ${u.projects||0}. Mention KNCR. Max 100 words.`}]);
      const c=document.getElementById('nai-ai-ins'); if(c) c.querySelector('p').textContent=r;
    } catch(e) {
      const c=document.getElementById('nai-ai-ins'); if(c) c.querySelector('p').textContent='Could not load. Check API key.';
    }
  }

  async function _loadSuggest() {
    const b=document.getElementById('nai-sug-cards'); if(!b) return;
    const u=typeof S!=='undefined'?S.user:{};
    const lc=typeof S!=='undefined'?S.lastCalc:null;
    b.innerHTML='<div class="nai-card"><h4>💡 Generating…</h4><p class="gen">Building recommendations…</p></div>';
    try {
      const r = await _call([{role:'user',content:`Give exactly 4 recommendations. Format each:\nTITLE: [title]\nPRIORITY: [high/medium/low]\nDETAIL: [1-2 sentences]\n\nData: emissions ${u.totalEmissions||0} tCO₂e, offsets ${u.totalOffsets||0}, score ${u.score||0}/100, last calc: ${lc?lc.sector+' '+lc.total_t:' none'}, KNCR projects: ${typeof S!=='undefined'&&S.kncr?S.kncr.projects.length:0}`}]);
      const items=r.split(/(?=TITLE:)/g).filter(s=>s.trim());
      if(items.length){
        b.innerHTML=items.map(item=>{
          const T=item.match(/TITLE:\s*(.+)/)?.[1]?.trim()||'Recommendation';
          const P=(item.match(/PRIORITY:\s*(\w+)/i)?.[1]||'med').toLowerCase().replace('medium','med').replace('high','high').replace('low','low');
          const D=item.match(/DETAIL:\s*([\s\S]+)/)?.[1]?.trim()||'';
          const L=P==='high'?'🔴 High Priority':P==='med'?'🟡 Medium':'🟢 Quick Win';
          return `<div class="nai-sitem ${P}"><h4>${T}</h4><p>${D}</p><span class="nai-stag ${P}">${L}</span></div>`;
        }).join('');
      } else {
        b.innerHTML=`<div class="nai-card"><h4>💡 Recommendations</h4><p>${r.replace(/\n/g,'<br>')}</p></div>`;
      }
    } catch(e){ b.innerHTML='<div class="nai-card"><h4>⚠️ Error</h4><p>Check API key.</p></div>'; }
  }

  function rtype(el) {
    document.querySelectorAll('.nai-ropt').forEach(o=>o.classList.remove('sel'));
    el.classList.add('sel'); _rtype=el.dataset.t;
    document.getElementById('nai-rout').classList.remove('vis');
    document.getElementById('nai-cpy').style.display='none';
  }

  async function genReport() {
    const u=typeof S!=='undefined'?S.user:{};
    const lc=typeof S!=='undefined'?S.lastCalc:null;
    const kp=typeof S!=='undefined'&&S.kncr?S.kncr.projects:[];
    const btn=document.getElementById('nai-gen'), out=document.getElementById('nai-rout');
    btn.disabled=true; btn.textContent='⏳ Generating…'; out.classList.remove('vis');
    const ha=Math.ceil((u.totalEmissions||100)/8);
    const prompts={
      executive:`200-word Executive Summary for ${u.org||'organisation'}: emissions ${u.totalEmissions||0} tCO₂e, NTZ Score ${u.score||0}/100, main source ${lc?lc.sector+' '+lc.total_t+' tCO₂e':' N/A'}, offset ratio ${u.totalOffsets||0}/${u.totalEmissions||1} tCO₂e. Next steps. Board-ready tone.`,
      esg:`220-word ESG Disclosure for ${u.org||'organisation'}: GHG inventory, totals, IPCC AR6 methodology, ISO 14064, KNCR compliance, offsets, forward targets. Cite IPCC AR6 and UNFCCC. Investor/donor audience.`,
      kncr:`180-word KNCR Brief: ${kp.length} projects registered, step progress, CDA community benefit, next milestone under Kenya Carbon Markets Regulations 2024, DNA submission readiness.`,
      offset:`200-word Agroforestry Offset Roadmap targeting ${ha} hectares to neutralise ${u.totalEmissions||0} tCO₂e for ${u.org||'organisation'}. Species mix (Grevillea/Casuarina/Bamboo), sequestration rates, KNCR registration path, CDA structure, expected revenue at USD 20/tCO₂e.`,
    };
    try {
      _rtext=await _call([{role:'user',content:prompts[_rtype]}]);
      out.textContent=_rtext; out.classList.add('vis');
      document.getElementById('nai-cpy').style.display='block';
    } catch(e){ out.textContent='⚠️ Could not generate. Check NTZ_AI_KEY in netzerra-ai.js.'; out.classList.add('vis'); }
    btn.disabled=false; btn.textContent='✨ Generate with AI';
  }

  function copyReport() {
    if(!_rtext) return;
    navigator.clipboard.writeText(_rtext).then(()=>{
      const b=document.getElementById('nai-cpy');
      b.textContent='✅ Copied!'; setTimeout(()=>b.textContent='Copy',2000);
    });
  }

  return {toggle,tab,send,key,resize,qs,rtype,genReport,copyReport};
})();

document.addEventListener('DOMContentLoaded', _buildAIHTML);
