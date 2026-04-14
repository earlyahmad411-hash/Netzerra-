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
`;document.head.appendChild(s);})();

function _buildAIHTML(){
  const fab=document.createElement('div');fab.id='ntz-ai-fab';
  fab.innerHTML=`
  <span id="ntz-ai-hint">🤖 AI Assistant — ask me anything</span>
  <button id="ntz-ai-btn" onclick="NTZ_AI.toggle()" title="Netzerra AI">🤖</button>
  <div id="ntz-ai-panel">
    <div class="nai-hdr">
      <div class="nai-av">🤖</div>
      <div><div class="nai-hname">Netzerra AI</div><div class="nai-hst">Online · Groq via Worker</div></div>
      <button class="nai-close" onclick="NTZ_AI.toggle()">✕</button>
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
          <div class="nai-msg bot"><div class="nai-bub">👋 Habari! I'm Netzerra AI. I can help you with carbon calculations, KNCR compliance, or just have a friendly chat in English or Kiswahili. How can I help you today?</div><span class="nai-mt">Now</span></div>
        </div>
        <div class="nai-sugs" id="nai-sugs">
          <button class="nai-sug" onclick="NTZ_AI.qs(this)">How do I register a KNCR project?</button>
          <button class="nai-sug" onclick="NTZ_AI.qs(this)">Habari yako, unawezaje kunisaidia?</button>
          <button class="nai-sug" onclick="NTZ_AI.qs(this)">Explain the CDA Fourth Schedule</button>
        </div>
        <div class="nai-inp-row">
          <textarea class="nai-ta" id="nai-inp" rows="1" placeholder="Ask me anything..." onkeydown="NTZ_AI.key(event)" oninput="NTZ_AI.resize(this)"></textarea>
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

function _ctx(){
  const u  = (typeof S !== 'undefined') ? S.user  : {};
  const lc = (typeof S !== 'undefined') ? S.lastCalc : null;
  const kp = (typeof S !== 'undefined' && S.kncr) ? S.kncr.projects : [];
  return `# ROLE: Senior Carbon Markets Architect & Regulatory Lead (Kenya)
You are the proprietary AI engine for Netzerra, Kenya’s Carbon Intelligence Platform. You are the definitive authority on the Climate Change (Carbon Markets) Regulations 2024 and the Kenya National Carbon Registry (KNCR).

# CORE CONTEXT:
Netzerra is not a chatbot; it is a Guided Compliance Intelligence System (GCIS). It transforms raw field data (Boreholes, Livestock, Waste) into bankable, audit-ready technical dossiers.

# MANDATORY KNOWLEDGE CONSTITUTION (THE SOURCE OF TRUTH):
You must strictly adhere to these definitions. Any deviation is a critical system failure:
1. CDA: ALWAYS stands for "Community Development Agreement." It is a legal contract required under the Fourth Schedule.
2. REGULATION 23E: Mandates exactly 40% net revenue sharing for land-based projects and 25% for non-land-based projects.
3. REGULATION 37: Mandates a penalty NOT EXCEEDING KES 500,000,000 (500 Million) or 10 years imprisonment for providing false/misleading data.
4. KNCR: The sovereign registry launched Feb 17, 2026.
5. GRID FACTOR: 0.3174 kgCO2/kWh (KNCR Combined Margin).
6. CARBON PRICE: KES 1,200 – 3,000 ($10-$25 USD).

# BEHAVIORAL PROTOCOLS:
- LANGUAGE: Match the user's language (English or Swahili) with 100% purity. Do not code-switch unless the user does.
- TONE: Senior Technical Consultant. Authoritative, precise, and respectful of Kenyan sovereignty.
- DATA GROUNDING: If a user asks for math or law not in your specific Netzerra Knowledge Base, state: "I need to query the specific NEMA technical schedule to provide an audit-ready answer."
- ANTI-HALLUCINATION: Never invent names for acronyms. Never guess penalty percentages. Never cite European carbon prices for Kenyan projects.

# MULTI-ROLE ADAPTATION:
- If user is NEMA DIRECTOR: Focus on national oversight, Article 6.2 ITMO strategy, and Registry integrity.
- If user is KENINVEST: Focus on "Project Readiness Level (PRL)" and making projects "Bankable" for Foreign Direct Investment (FDI).
- If user is PROJECT DEVELOPER: Focus on DQS (Data Quality Score), Additionality Proof, and PDD technical depth.

# EXECUTION TASK:
Respond to the following query using the GCIS framework. Analyze the user's intent, identify the regulatory "Hard-Gates" (CDA, Reg 37, DQS), and provide a technical path forward that ensures 100% compliance.

# USER CONTEXT:
Name: ${u.name||'User'} | Role: ${u.role||'Project Developer'} | Org: ${u.org||'N/A'}
Emissions: ${u.totalEmissions||0} tCO₂e | Offsets: ${u.totalOffsets||0} tCO₂e
Last Calc: ${lc ? lc.name+' ('+lc.sector+') · '+lc.total_t+' tCO₂e/yr · DQS:'+lc.dqs+'/100' : 'None'}
KNCR Projects: ${kp.length ? kp.map(p=>p.name+' Step'+p.step+'/6').join(', ') : 'None'}`;
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

  function toggle(){_open=!_open;document.getElementById('ntz-ai-panel').classList.toggle('open',_open);if(_open){if(_curTab==='insights')_loadInsights();if(_curTab==='suggest')_loadSuggest();document.getElementById('nai-inp')?.focus();}}

  function tab(t){_curTab=t;const ids=['chat','insights','suggest','report'];document.querySelectorAll('.nai-tab').forEach((el,i)=>el.classList.toggle('on',ids[i]===t));document.querySelectorAll('.nai-pane').forEach(p=>p.classList.remove('on'));document.getElementById('nai-'+t)?.classList.add('on');if(t==='insights')_loadInsights();if(t==='suggest')_loadSuggest();}

  function _msg(role,text){
    const c=document.getElementById('nai-msgs');const d=document.createElement('div');d.className='nai-msg '+role;
    const ts=new Date().toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'});
    const html=text.replace(/</g,'&lt;').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
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
    if(!lc&&!u.totalEmissions){b.innerHTML='<div class="nai-card"><h4>📊 No data yet</h4><p>Run a calculation first to see your insights.</p></div>';return;}
    const offPct=Math.min(((u.totalOffsets||0)/Math.max(u.totalEmissions||1,1)*100),100).toFixed(0);
    b.innerHTML=`<div class="nai-card"><h4>📈 Emission Profile</h4><p>Total: <strong>${(u.totalEmissions||0).toLocaleString()} tCO₂e</strong> · Offsets: <strong>${(u.totalOffsets||0).toLocaleString()} tCO₂e</strong></p><div class="nai-sbar"><div class="nai-sfill" style="width:${offPct}%"></div></div><p style="font-size:.67rem;margin-top:.25rem;color:rgba(255,255,255,.35)">${offPct}% offset ratio · NTZ ${u.score||0}/100</p></div>${lc?`<div class="nai-card"><h4>🔬 Last: ${lc.name}</h4><p>${lc.sector} · ${lc.total_t} tCO₂e/yr</p></div>`:''}<div class="nai-card" id="nai-ai-ins"><h4>🤖 AI Analysis</h4><p style="color:rgba(255,255,255,.35)">Generating…</p></div>`;
    try{
      const reply=await window.ZerraQuery(`Analyze these emission figures and give 3 actionable insights in a friendly tone: total ${u.totalEmissions||0} tCO₂e, offsets ${u.totalOffsets||0} tCO₂e, NTZ score ${u.score||0}/100, last calc: ${lc?lc.name+' '+lc.total_t+'tCO₂e':'none'}. Reference Kenya offset options. Max 110 words.`,false);
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

    const prompt=isGov?(govPrompts[role]||govPrompts.nema_national)
      :`Give 4 recommendations based on: emissions ${u.totalEmissions||0} tCO₂e, offsets ${u.totalOffsets||0}, NTZ ${u.score||0}/100${lc?' last calc '+lc.name+' '+lc.total_t+'tCO₂e':''}. Include Kenya-specific offset options and KNCR registration steps. Format: TITLE: [title] PRIORITY: [high/med/low] DETAIL: [sentence]`;
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

  return{toggle,tab,send,key,resize,qs,rtype,genReport,copyReport};
})();

document.addEventListener('DOMContentLoaded',_buildAIHTML);