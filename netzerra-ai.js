/* ══════════════════════════════════════════════════════
   NETZERRA AI — netzerra-ai.js  v3.0
   Uses the same Gemini API already in netzerra-enterprise.js
   No extra setup — works out of the box.
══════════════════════════════════════════════════════ */
'use strict';

const _GEMINI_KEY    = 'AIzaSyAWsBmp3w9AlGGrcNQy8NxY-_vMUjUmywQ';
const _GEMINI_MODELS = ['gemini-2.5-flash-lite','gemini-2.5-flash','gemini-2.0-flash-lite','gemini-2.0-flash'];

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
.nai-gen:disabled{opacity:.38;cursor:default}
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
      <div><div class="nai-hname">Netzerra AI</div><div class="nai-hst">Online · Gemini</div></div>
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
          <div class="nai-msg bot"><div class="nai-bub">👋 Habari! I'm Netzerra AI.\n\nI know your emissions data, KNCR projects, and Kenya's carbon regulations. Ask me anything.</div><span class="nai-mt">Now</span></div>
        </div>
        <div class="nai-sugs" id="nai-sugs">
          <button class="nai-sug" onclick="NTZ_AI.qs(this)">How do I register a KNCR project?</button>
          <button class="nai-sug" onclick="NTZ_AI.qs(this)">Best offsets for my emissions?</button>
          <button class="nai-sug" onclick="NTZ_AI.qs(this)">How can ETG use Netzerra?</button>
          <button class="nai-sug" onclick="NTZ_AI.qs(this)">Explain the CDA Fourth Schedule</button>
        </div>
        <div class="nai-inp-row">
          <textarea class="nai-ta" id="nai-inp" rows="1" placeholder="Ask about carbon, KNCR, offsets…" onkeydown="NTZ_AI.key(event)" oninput="NTZ_AI.resize(this)"></textarea>
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
  const u=(typeof S!=='undefined')?S.user:{};
  const lc=(typeof S!=='undefined')?S.lastCalc:null;
  const kp=(typeof S!=='undefined'&&S.kncr)?S.kncr.projects:[];
  return `You are Netzerra AI — the built-in carbon intelligence assistant for Netzerra, Kenya's first KNCR-native carbon compliance platform.

USER: ${u.name||'User'} | Org: ${u.org||'N/A'} | Plan: ${u.plan||'Seedling'}
EMISSIONS: ${u.totalEmissions||0} tCO₂e total | ${u.totalOffsets||0} tCO₂e offset | NTZ Score: ${u.score||0}/100 | Projects: ${u.projects||0}
LAST CALC: ${lc?`${lc.name} (${lc.sector}) · ${lc.total_t} tCO₂e/yr · S1:${lc.s1_t||0} S2:${lc.s2_t||0} S3:${lc.s3_t||0}`:'None yet'}
KNCR PROJECTS (${kp.length}): ${kp.length?kp.map(p=>`${p.id} "${p.name}" Step${p.step}/6 ${p.county}`).join('; '):'None'}

EXPERTISE: Kenya Carbon Markets Regulations 2024 · IPCC AR6 GWP100 · KNCR 6-step registration · CDA Fourth Schedule (40% land-based, 25% non-land) · Grevillea 6 tCO₂e/ha/yr, Casuarina 8, Bamboo 17, Biogas 3.5/unit · Kenya grid 0.3174 kgCO₂/kWh (KNCR) · Article 6 ITMOs (Switzerland, Sweden, Japan, Singapore) · ETG, Agriterra, tea factories, county governments · ISO 14064-1:2018 · FLLoCA compliance.

STYLE: Concise, practical, cite sources. Max 300 words unless writing a full report. Respond in English or Swahili matching the user.`;
}

async function _callGemini(prompt){
  const body=JSON.stringify({contents:[{role:'user',parts:[{text:_ctx()+'\n\nUser message: '+prompt}]}],generationConfig:{maxOutputTokens:800,temperature:0.7}});
  for(const model of _GEMINI_MODELS){
    try{
      const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${_GEMINI_KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body});
      if(!r.ok){console.warn(`[NTZ AI] ${model} failed (${r.status})`);continue;}
      const d=await r.json();
      const text=d.candidates?.[0]?.content?.parts?.[0]?.text;
      if(text)return text;
    }catch(e){console.warn(`[NTZ AI] ${model}:`,e.message);continue;}
  }
  throw new Error('Gemini quota exceeded. Check console.cloud.google.com');
}

const NTZ_AI=(()=>{
  let _open=false,_curTab='chat',_busy=false,_rtype='executive',_rtext='';
  const _hist=[];

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
    _msg('user',txt);_hist.push('User: '+txt);
    _busy=true;document.getElementById('nai-send').disabled=true;_typing();
    try{const reply=await _callGemini(_hist.slice(-8).join('\n'));document.getElementById('nai-typing')?.remove();_msg('bot',reply);_hist.push('Assistant: '+reply);}
    catch(e){document.getElementById('nai-typing')?.remove();_msg('bot','⚠️ '+e.message);}
    _busy=false;document.getElementById('nai-send').disabled=false;
  }

  async function _loadInsights(){
    const b=document.getElementById('nai-ins-cards');if(!b)return;
    const u=(typeof S!=='undefined')?S.user:{};const lc=(typeof S!=='undefined')?S.lastCalc:null;
    if(!lc&&!u.totalEmissions){b.innerHTML='<div class="nai-card"><h4>📊 No data yet</h4><p>Run a calculation first.</p></div>';return;}
    const offPct=Math.min(((u.totalOffsets||0)/Math.max(u.totalEmissions||1,1)*100),100).toFixed(0);
    b.innerHTML=`<div class="nai-card"><h4>📈 Emission Profile</h4><p>Total: <strong>${(u.totalEmissions||0).toLocaleString()} tCO₂e</strong> · Offsets: <strong>${(u.totalOffsets||0).toLocaleString()} tCO₂e</strong></p><div class="nai-sbar"><div class="nai-sfill" style="width:${offPct}%"></div></div><p style="font-size:.67rem;margin-top:.25rem;color:rgba(255,255,255,.35)">${offPct}% offset ratio · NTZ ${u.score||0}/100</p></div>${lc?`<div class="nai-card"><h4>🔬 Last: ${lc.name}</h4><p>${lc.sector} · ${lc.total_t} tCO₂e/yr<br>S1:${lc.s1_t||0} · S2:${lc.s2_t||0} · S3:${lc.s3_t||0}</p></div>`:''}<div class="nai-card" id="nai-ai-ins"><h4>🤖 AI Analysis</h4><p style="color:rgba(255,255,255,.35)">Generating…</p></div>`;
    try{
      const reply=await _callGemini(`3 sharp actionable insights for: emissions ${u.totalEmissions||0} tCO₂e, offsets ${u.totalOffsets||0}, NTZ ${u.score||0}/100, last calc: ${lc?lc.sector+' '+lc.total_t+' tCO₂e/yr':'none'}, KNCR projects: ${(typeof S!=='undefined'&&S.kncr)?S.kncr.projects.length:0}. Cite KNCR opportunities. Max 110 words.`);
      const card=document.getElementById('nai-ai-ins');if(card)card.querySelector('p').innerHTML=reply.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
    }catch(e){const card=document.getElementById('nai-ai-ins');if(card)card.querySelector('p').textContent='⚠️ '+e.message;}
  }

  async function _loadSuggest(){
    const b=document.getElementById('nai-sug-cards');if(!b)return;
    b.innerHTML='<div class="nai-card"><h4>💡 Loading…</h4><p style="color:rgba(255,255,255,.35)">Generating…</p></div>';
    const u=(typeof S!=='undefined')?S.user:{};const lc=(typeof S!=='undefined')?S.lastCalc:null;
    try{
      const reply=await _callGemini(`Give exactly 4 recommendations. Format:\nTITLE: [title]\nPRIORITY: [high/medium/low]\nDETAIL: [1-2 sentences]\n\nData: emissions ${u.totalEmissions||0} tCO₂e, offsets ${u.totalOffsets||0}, NTZ ${u.score||0}/100, last calc: ${lc?lc.sector+' '+lc.total_t:' none'}, KNCR projects: ${(typeof S!=='undefined'&&S.kncr)?S.kncr.projects.length:0}`);
      const items=reply.split(/(?=TITLE:)/g).filter(s=>s.trim());
      if(items.length){b.innerHTML=items.map(item=>{const T=(item.match(/TITLE:\s*(.+)/)?.[1]||'').trim();const P=(item.match(/PRIORITY:\s*(\w+)/i)?.[1]||'med').toLowerCase().replace('medium','med');const D=(item.match(/DETAIL:\s*([\s\S]+)/)?.[1]||'').trim();const L=P==='high'?'🔴 High Priority':P==='med'?'🟡 Medium':'🟢 Quick Win';return `<div class="nai-sitem ${P}"><h4>${T}</h4><p>${D}</p><span class="nai-stag ${P}">${L}</span></div>`;}).join('');}
      else b.innerHTML=`<div class="nai-card"><h4>💡</h4><p>${reply.replace(/\n/g,'<br>')}</p></div>`;
    }catch(e){b.innerHTML=`<div class="nai-card"><h4>⚠️</h4><p>${e.message}</p></div>`;}
  }

  function rtype(el){document.querySelectorAll('.nai-ropt').forEach(o=>o.classList.remove('on'));el.classList.add('on');_rtype=el.dataset.t;document.getElementById('nai-rout').classList.remove('on');document.getElementById('nai-cpy').style.display='none';}

  async function genReport(){
    const u=(typeof S!=='undefined')?S.user:{};const lc=(typeof S!=='undefined')?S.lastCalc:null;const kp=(typeof S!=='undefined'&&S.kncr)?S.kncr.projects:[];
    const ha=Math.ceil((u.totalEmissions||100)/8);
    const btn=document.getElementById('nai-gen');const out=document.getElementById('nai-rout');
    btn.disabled=true;btn.textContent='⏳ Generating…';out.classList.remove('on');
    const prompts={
      executive:`Write a 200-word Executive Summary for ${u.org||'this organisation'}: emissions ${u.totalEmissions||0} tCO₂e, NTZ ${u.score||0}/100, main source ${lc?lc.sector+' '+lc.total_t+' tCO₂e/yr':'N/A'}, offsets ${u.totalOffsets||0} tCO₂e. Board-ready tone, include next steps.`,
      esg:`Write a 220-word ESG Disclosure for ${u.org||'this organisation'}: GHG inventory, totals, IPCC AR6, ISO 14064, KNCR status, offsets, targets. Investor/donor audience.`,
      kncr:`Write a 180-word KNCR Brief for ${u.org||'this organisation'}: ${kp.length} projects (${kp.map(p=>p.name+' Step'+p.step+'/6').join(', ')||'none'}), CDA obligations, next milestone under Kenya Carbon Markets Regulations 2024.`,
      offset:`Write a 200-word Agroforestry Roadmap for ${u.org||'this organisation'}: ${ha} hectares targeting ${u.totalEmissions||0} tCO₂e/yr. Species mix (Grevillea/Casuarina/Bamboo), KNCR path, CDA, revenue at USD 20/tCO₂e.`
    };
    try{_rtext=await _callGemini(prompts[_rtype]);out.textContent=_rtext;out.classList.add('on');document.getElementById('nai-cpy').style.display='block';}
    catch(e){out.textContent='⚠️ '+e.message;out.classList.add('on');}
    btn.disabled=false;btn.textContent='✨ Generate with AI';
  }

  function copyReport(){if(!_rtext)return;navigator.clipboard.writeText(_rtext).then(()=>{const b=document.getElementById('nai-cpy');b.textContent='✅ Copied!';setTimeout(()=>b.textContent='Copy',2000);});}

  return{toggle,tab,send,key,resize,qs,rtype,genReport,copyReport};
})();

document.addEventListener('DOMContentLoaded',_buildAIHTML);
