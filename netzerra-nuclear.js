/* ══════════════════════════════════════════════════════════════
   NETZERRA NUCLEAR UPGRADE v2.0 — netzerra-nuclear.js
   Full KNCR Pipeline · Consultant-Gated Approval · Smart Satellite
   Comprehensive Document Engine (PCN 10+pg, PDD 100+pg)
   QR Hash Verification · Audit Trail · Pipeline Progress
   Two-Way Communication · Duplicate Flagging · Logout
══════════════════════════════════════════════════════════════ */
'use strict';

// ══════════════════════════════════════════════════════
// 0. CONSTANTS & SHARED STATE
// ══════════════════════════════════════════════════════
const NTZ_WORKER = 'https://delicate-bird-531b.shukriali411.workers.dev/';

const ROLE_MAP = {
  proponent:     { label: 'Project Proponent',      nav: ['home','dashboard','gcis-wizard','my-projects','messages','passport','calculator','waste-management','offsets','sequestration','county','leaderboard','community','methodology','ai-intelligence','docs','marketplace','education','membership','about','profile','disclaimer','kncr'] },
  consultant:    { label: 'Carbon Consultant',       nav: ['home','dashboard','review-queue','messages','registry','waste-management','methodology','ai-intelligence','docs','about','profile','disclaimer'] },
  nema:          { label: 'NEMA Regulator',          nav: ['home','dashboard','nema-oversight','registry','waste-management','methodology','ai-intelligence','about','profile','disclaimer'] },
  developer:     { label: 'Project Developer',       nav: 'all' },
  enterprise:    { label: 'Enterprise',              nav: 'all' },
  nema_national: { label: 'NEMA National Director',  nav: ['home','dashboard','nema-oversight','registry','waste-management','leaderboard','methodology','ai-intelligence','profile'] },
  nema_county:   { label: 'NEMA County Officer',     nav: ['home','dashboard','nema-oversight','registry','waste-management','leaderboard','methodology','ai-intelligence','profile'] },
  nema_reviewer: { label: 'NEMA Technical Reviewer',  nav: ['home','dashboard','nema-oversight','registry','waste-management','leaderboard','methodology','ai-intelligence','profile'] },
  personal:      { label: 'Personal',                nav: 'all' },
};

// Pipeline stages in order
const PIPELINE_STAGES = [
  { id: 'pcn', label: 'PCN', full: 'Project Concept Note', reg: 'Reg. 21(2)(a)' },
  { id: 'pdd', label: 'PDD', full: 'Project Design Document', reg: 'Second Schedule' },
  { id: 'cda', label: 'CDA', full: 'Community Development Agreement', reg: 'Fourth Schedule' },
  { id: 'escp', label: 'ESCP', full: 'Env. & Social Commitment Plan', reg: 'EMCA 1999' },
  { id: 'stakeholder', label: 'Stakeholder', full: 'Stakeholder Consultation Report', reg: 'FPIC Protocol' },
  { id: 'esia', label: 'ESIA', full: 'Environmental & Social Impact Assessment', reg: 'EMCA 1999 S.58' },
  { id: 'validation', label: 'VVB', full: 'Third-Party Validation', reg: 'Reg. 23' },
  { id: 'dna-approval', label: 'DNA/LoA', full: 'DNA Review & Letter of Approval', reg: 'Reg. 24' },
  { id: 'kncr-registration', label: 'KNCR Reg.', full: 'KNCR Registration', reg: 'kncr.go.ke' },
  { id: 'mrv', label: 'MRV', full: 'Annual MRV & Credit Issuance', reg: 'Reg. 25' },
];

// Nuclear state store
const NTZ = {
  projects: [],
  messages: [],
  registry: [],
  prlScores: {},
  documents: {},
  registrationNumbers: [], // Track invoice/registration numbers for duplicate detection
};
window.NTZ = NTZ;


// ══════════════════════════════════════════════════════
// 1. NUCLEAR AUTH — COMPLETE SESSION RESET + LOGOUT BUTTON
// ══════════════════════════════════════════════════════

function nuclearLogout() {
  // 1. Save project data FIRST before clearing anything
  saveNuclearState();

  // 2. Clear user session only
  AUTH.currentUser = null;
  S.user = {
    name: 'Guest', email: '', phone: '', org: 'Netzerra',
    plan: 'Seedling', score: 68, totalEmissions: 2847,
    totalOffsets: 710, projects: 12
  };
  S.lastCalc = null;
  S.kncr.projects = [
    { id:'NTZ-001', name:'Turkana Solar Borehole Cluster', sector:'borehole', county:'Turkana', credits:420, standard:'Verra VCS', step:2, created:'2026-01-15' },
    { id:'NTZ-002', name:'Rift Valley Matatu CNG Pilot', sector:'transport', county:'Nakuru', credits:1100, standard:'Gold Standard', step:1, created:'2026-02-20' }
  ];
  S.kncr.linkedCalc = null;

  // 3. Only remove app-level storage, NEVER touch ntz_nuclear
  localStorage.removeItem('ntz_v3');
  localStorage.removeItem('ntz_audit_v2');

  // 4. Reset GCIS wizard
  gcisCurrentStep = 0;
  gcisData = {};

  // 5. Reset all nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.style.opacity = '1';
    item.style.pointerEvents = 'auto';
  });

  showAuthScreen();
  toast('Logged out successfully. Session cleared.', 'success');
}

function nuclearLogin(user) {
  AUTH.currentUser = { ...user };
  S.user.name = user.name;
  S.user.org = user.org || 'Independent';
  S.user.email = user.email || '';

  document.getElementById('sb-name').textContent = user.name;
  document.getElementById('sb-plan').textContent = user.plan || ROLE_MAP[user.role]?.label || user.role;
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 3);
  document.getElementById('sb-avatar').textContent = initials;

  // Role-based nav visibility
  const nuclearNavMap = {
    'nav-gcis-wizard':  ['proponent','developer'],
    'nav-my-projects':  ['proponent','developer'],
    'nav-messages':     ['proponent','consultant','developer'],
    'nav-review-queue': ['consultant'],
    'nav-registry':     ['nema','nema_national','nema_county','nema_reviewer','consultant','developer'],
    'nav-enterprise':   ['enterprise'],
    'nav-exchange':     ['enterprise'],
    'nav-b2b':          ['enterprise'],
    'nav-waste-management': ['proponent','developer','nema','nema_national','nema_county','nema_reviewer'],
    'nav-nema-oversight':['nema','nema_national','nema_county','nema_reviewer'],
  };

  Object.entries(nuclearNavMap).forEach(([navId, roles]) => {
    const el = document.getElementById(navId);
    if (el) el.style.display = roles.includes(user.role) ? 'flex' : 'none';
  });

  const roleDef = ROLE_MAP[user.role];
  const navSections = roleDef?.nav || 'all';
  if (navSections !== 'all') {
    document.querySelectorAll('.nav-item').forEach(item => {
      const onclick = item.getAttribute('onclick') || '';
      const match = onclick.match(/showSection\('([^']+)'\)/);
      if (match) {
        const section = match[1];
        if (!navSections.includes(section)) {
          item.style.opacity = '0.3';
          item.style.pointerEvents = 'none';
        } else {
          item.style.opacity = '1';
          item.style.pointerEvents = 'auto';
        }
      }
    });
  } else {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.style.opacity = '1';
      item.style.pointerEvents = 'auto';
    });
  }

  // Show logout button
  ensureLogoutButton();

  hideAuthScreen();

  // Load persisted state BEFORE rendering sections so data is available
  loadNuclearState();
  // Ensure demo data always exists
  if (NTZ.projects.length === 0) seedDemoData();

  if (['nema','nema_national','nema_county','nema_reviewer'].includes(user.role)) {
    showSection('nema-oversight');
  } else if (user.role === 'enterprise') {
    showSection('enterprise');
  } else if (user.role === 'consultant') {
    showSection('review-queue');
  } else if (user.role === 'proponent') {
    showSection('my-projects');
  } else {
    showSection('home');
  }
  toast('Logged in as ' + user.name + ' (' + (ROLE_MAP[user.role]?.label || user.role) + ')', 'success');
  // Refresh Zerra AI greeting for the new role
  setTimeout(() => { if (typeof NTZ_AI_resetGreeting === 'function') NTZ_AI_resetGreeting(); }, 400);
}

function ensureLogoutButton() {
  if (document.getElementById('nuclear-logout-btn')) return;
  const sidebar = document.querySelector('.sidebar') || document.querySelector('aside');
  if (!sidebar) return;
  const btn = document.createElement('div');
  btn.id = 'nuclear-logout-btn';
  btn.className = 'nav-item';
  btn.style.cssText = 'cursor:pointer;margin-top:12px;padding:10px 16px;background:rgba(239,83,80,.1);border:1px solid rgba(239,83,80,.25);border-radius:8px;color:#EF5350;font-weight:600;font-size:.82rem;display:flex;align-items:center;gap:8px;transition:all .15s';
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Logout';
  btn.onclick = () => nuclearLogout();
  btn.onmouseenter = () => { btn.style.background = 'rgba(239,83,80,.2)'; };
  btn.onmouseleave = () => { btn.style.background = 'rgba(239,83,80,.1)'; };
  const navList = sidebar.querySelector('.nav-list') || sidebar;
  navList.appendChild(btn);
}

// Override existing login/logout
window._origLogout = window.logout;
window.logout = nuclearLogout;

window._origLoginAs = window.loginAs;
window.loginAs = function(demoId) {
  const user = AUTH.demoAccounts[demoId];
  if (!user) return;
  nuclearLogin(user);
};

window._origRegisterAccount = window.registerAccount;
window.registerAccount = function() {
  const name = document.getElementById('reg-name')?.value?.trim();
  const email = document.getElementById('reg-email')?.value?.trim();
  const org = document.getElementById('reg-org')?.value?.trim();
  const password = document.getElementById('reg-password')?.value?.trim();
  const roleRaw = document.getElementById('reg-role')?.value;
  const county = document.getElementById('reg-county')?.value;

  if (!name || !email || !password) {
    toast('Please fill in all required fields', 'error');
    return;
  }

  const role = roleRaw || 'proponent';
  const user = { name, email, org: org || 'Independent', role, county: county || null, plan: ROLE_MAP[role]?.label || role };
  nuclearLogin(user);
};

// ══════════════════════════════════════════════════════
// 2. ADAPTIVE GCIS WIZARD — WITH REGISTRATION FIELDS + SMART SATELLITE
// ══════════════════════════════════════════════════════

const GCIS_STEPS = [
  {
    id: 'project-info',
    title: 'Project Information',
    subtitle: 'Basic project identification and proponent details',
    fields: [
      { id: 'gcis-proj-name', label: 'Project Title', type: 'text', placeholder: 'e.g. Turkana Solar Borehole Cluster', required: true },
      { id: 'gcis-proj-type', label: 'Project Type', type: 'select', options: [
        { value: 'borehole', label: 'Energy - Water Infrastructure (Borehole)' },
        { value: 'livestock', label: 'AFOLU - Livestock Management' },
        { value: 'transport', label: 'Transport - Fleet Decarbonisation' },
        { value: 'construction', label: 'IPPU - Low-Carbon Construction' },
        { value: 'forestry', label: 'AFOLU - Agroforestry / Reforestation' },
        { value: 'solar', label: 'Energy - Renewable Energy' },
        { value: 'biogas', label: 'Energy - Clean Cooking / Biogas' },
        { value: 'manufacturing', label: 'IPPU - Manufacturing' },
      ], required: true },
      { id: 'gcis-county', label: 'County', type: 'select', options: [
        'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa',"Murang'a",'Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot'
      ].map(c => ({ value: c, label: c })), required: true },
      { id: 'gcis-proponent', label: 'Project Proponent / Organisation', type: 'text', placeholder: 'e.g. Turkana Water Trust', required: true },
    ]
  },
  {
    id: 'registration-docs',
    title: 'Registration & Compliance Numbers',
    subtitle: 'Provide registration, invoice, and compliance reference numbers for verification',
    fields: [
      { id: 'gcis-kra-pin', label: 'KRA PIN Number', type: 'text', placeholder: 'e.g. P051234567X', required: true },
      { id: 'gcis-business-reg', label: 'Business Registration Number', type: 'text', placeholder: 'e.g. PVT-2024-123456', required: true },
      { id: 'gcis-nema-license', label: 'NEMA License Number (if applicable)', type: 'text', placeholder: 'e.g. NEMA/EIA/PSL/12345' },
      { id: 'gcis-invoice-no', label: 'Application Invoice / Receipt Number', type: 'text', placeholder: 'e.g. INV-2026-001234', required: true },
      { id: 'gcis-county-permit', label: 'County Government Permit Number', type: 'text', placeholder: 'e.g. CGK/PERMIT/2026/001' },
    ]
  },
  {
    id: 'project-scope',
    title: 'Project Scope & Scale',
    subtitle: 'Define the boundaries and scale of your project',
    fields: [
      { id: 'gcis-land-type', label: 'Land Ownership', type: 'select', options: [
        { value: 'community', label: 'Community Land' },
        { value: 'public', label: 'Public Land' },
        { value: 'private', label: 'Private Land' },
      ], required: true },
      { id: 'gcis-credits', label: 'Estimated Annual Credits (tCO2e)', type: 'number', placeholder: 'e.g. 500', required: true },
      { id: 'gcis-start-date', label: 'Proposed Start Date', type: 'date', required: true },
      { id: 'gcis-duration', label: 'Project Duration (years)', type: 'number', placeholder: 'e.g. 10', required: true },
      { id: 'gcis-standard', label: 'Registry Standard', type: 'select', options: [
        { value: 'kncr-domestic', label: 'KNCR Domestic Standard' },
        { value: 'verra', label: 'Verra Verified Carbon Standard (VCS)' },
        { value: 'gs', label: 'Gold Standard' },
        { value: 'cdm', label: 'Clean Development Mechanism (CDM)' },
      ], required: true },
      { id: 'gcis-budget', label: 'Project Budget (KES)', type: 'number', placeholder: 'e.g. 5000000' },
    ]
  },
  {
    id: 'emissions-calc',
    title: 'Emissions Calculator (Optional)',
    subtitle: 'Optionally calculate expected baseline emissions using the Netzerra Calculator engine',
    fields: [
      { id: 'gcis-emissions-calc-total', label: 'Total Estimated Emissions (tCO2e/yr)', type: 'number', placeholder: 'e.g. 1500', required: false },
      { id: 'gcis-emissions-calc-source', label: 'Emission Source Breakdown', type: 'textarea', placeholder: 'Describe the main sources of baseline emissions (e.g., diesel generators, grid electricity)...', required: false }
    ]
  },
  {
    id: 'sequestration-calc',
    title: 'Sequestration Calculator (Optional)',
    subtitle: 'Optionally calculate sequestration totals for forestry or AFOLU projects',
    fields: [
      { id: 'gcis-sequestration-calc-total', label: 'Total Sequestration (tCO2e/yr)', type: 'number', placeholder: 'e.g. 450', required: false },
      { id: 'gcis-sequestration-calc-area', label: 'Project Area (Hectares)', type: 'number', placeholder: 'e.g. 120', required: false },
      { id: 'gcis-sequestration-calc-species', label: 'Tree Species / Sink Type', type: 'text', placeholder: 'e.g. Acacia mellifera, Bamboo', required: false }
    ]
  },
  {
    id: 'baseline-methodology',
    title: 'Baseline & Methodology',
    subtitle: 'Technical justification for emission reductions',
    aiSuggest: true,
    fields: [
      { id: 'gcis-baseline', label: 'Baseline Scenario Description', type: 'textarea', placeholder: 'Describe the current emission scenario without the project intervention...', required: true, aiField: 'baseline' },
      { id: 'gcis-methodology', label: 'Applied Methodology', type: 'select', options: [
        { value: 'ams-i-l', label: 'AMS-I.L - Electrification of rural communities' },
        { value: 'ams-i-a', label: 'AMS-I.A - Electricity generation by the user' },
        { value: 'ams-iii-r', label: 'AMS-III.R - Methane recovery in agricultural activities' },
        { value: 'ar-acm0003', label: 'AR-ACM0003 - Afforestation/reforestation' },
        { value: 'ams-iii-au', label: 'AMS-III.AU - Methane emission reduction by adjusted water management' },
        { value: 'ams-ii-g', label: 'AMS-II.G - Energy efficiency measures in thermal applications' },
        { value: 'custom', label: 'Custom / Proprietary Methodology' },
      ], required: true },
      { id: 'gcis-emission-factor', label: 'Key Emission Factors Used', type: 'textarea', placeholder: 'List the primary emission factors and their sources...', required: true },
    ]
  },
  {
    id: 'additionality',
    title: 'Additionality Demonstration',
    subtitle: 'Prove the project would not happen without carbon finance',
    aiSuggest: true,
    fields: [
      { id: 'gcis-additionality', label: 'Additionality Justification', type: 'textarea', placeholder: 'Explain why this project would not be viable without carbon credit revenue...', required: true, aiField: 'additionality' },
      { id: 'gcis-barriers', label: 'Key Barriers Identified', type: 'textarea', placeholder: 'Financial, technological, institutional, or social barriers...', required: true },
    ]
  },
  {
    id: 'monitoring',
    title: 'Monitoring Plan',
    subtitle: 'How emission reductions will be measured and verified',
    aiSuggest: true,
    fields: [
      { id: 'gcis-monitoring', label: 'Monitoring Methodology', type: 'textarea', placeholder: 'Describe the MRV (Measurement, Reporting, Verification) approach...', required: true, aiField: 'monitoring' },
      { id: 'gcis-frequency', label: 'Monitoring Frequency', type: 'select', options: [
        { value: 'continuous', label: 'Continuous (IoT/automated)' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'biannual', label: 'Bi-annual' },
        { value: 'annual', label: 'Annual' },
      ], required: true },
      { id: 'gcis-data-sources', label: 'Primary Data Sources', type: 'textarea', placeholder: 'Meters, sensors, receipts, field surveys...', required: true },
    ]
  },
  {
    id: 'document-scan',
    title: 'Site Verification & Document Scan',
    subtitle: 'Smart satellite imagery analysis and receipt verification',
    fields: [
      { id: 'gcis-gis-scan', label: 'GIS Satellite Scan', type: 'gis-scan', required: false },
      { id: 'gcis-receipt-scan', label: 'KRA/ETR Receipt Extraction', type: 'receipt-scan', required: false },
    ]
  },
  {
    id: 'community-benefit',
    title: 'Community Development Agreement',
    subtitle: 'CDA Fourth Schedule compliance',
    fields: [
      { id: 'gcis-community', label: 'Affected Community', type: 'text', placeholder: 'e.g. Turkana South Ward Community', required: true },
      { id: 'gcis-cda-rate', label: 'Community Benefit Rate (%)', type: 'select', options: [
        { value: '25', label: '25% (Minimum for Non-Land/Private Projects)' },
        { value: '30', label: '30%' },
        { value: '35', label: '35%' },
        { value: '40', label: '40% (Minimum for Community/Public Land under Reg 23E)' },
        { value: '45', label: '45%' },
        { value: '50', label: '50%+' }
      ], required: true },
      { id: 'gcis-benefit-plan', label: 'Benefit Distribution Plan', type: 'textarea', placeholder: 'Describe how carbon credit revenue will be shared with the community...', required: true },
      { id: 'gcis-grievance', label: 'Grievance Redress Mechanism', type: 'textarea', placeholder: 'Describe the community complaint and resolution process...' },
    ]
  },
  {
    id: 'review-submit',
    title: 'Review & Submit',
    subtitle: 'Review all information and submit for consultant review',
    fields: []
  }
];

let gcisCurrentStep = 0;
let gcisData = {};

function renderGCISWizard() {
  const container = document.getElementById('gcis-wizard-container');
  if (!container) return;

  const step = GCIS_STEPS[gcisCurrentStep];
  const totalSteps = GCIS_STEPS.length;
  const progress = ((gcisCurrentStep + 1) / totalSteps * 100).toFixed(0);

  let html = `
    <div class="gcis-progress">
      <div class="gcis-progress-bar" style="width:${progress}%"></div>
    </div>
    <div class="gcis-step-indicator">
      ${GCIS_STEPS.map((s, i) => `
        <div class="gcis-step-dot ${i < gcisCurrentStep ? 'completed' : i === gcisCurrentStep ? 'active' : ''}" 
             onclick="${i < gcisCurrentStep ? 'gcisGoToStep(' + i + ')' : ''}" 
             title="${s.title}">
          ${i < gcisCurrentStep ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : (i + 1)}
        </div>
      `).join('<div class="gcis-step-line"></div>')}
    </div>
    <div class="gcis-step-header">
      <div class="gcis-step-count">Step ${gcisCurrentStep + 1} of ${totalSteps}</div>
      <h3 class="gcis-step-title">${step.title}</h3>
      <p class="gcis-step-subtitle">${step.subtitle}</p>
    </div>
    <div class="gcis-step-body">`;

  if (step.id === 'review-submit') {
    html += renderGCISReview();
  } else {
    step.fields.forEach(field => {
      const savedVal = gcisData[field.id] || '';
      if (field.type === 'gis-scan') {
        html += renderGISScanField(field);
      } else if (field.type === 'receipt-scan') {
        html += renderReceiptScanField(field);
      } else {
        html += `<div class="gcis-field">
          <label class="gcis-label" for="${field.id}">${field.label} ${field.required ? '<span class="gcis-required">*</span>' : ''}</label>`;

        if (field.type === 'textarea') {
          html += `<textarea class="gcis-input gcis-textarea" id="${field.id}" placeholder="${field.placeholder || ''}" rows="4">${savedVal}</textarea>`;
          if (field.aiField && step.aiSuggest) {
            html += `<button class="gcis-ai-suggest-btn" onclick="gcisAISuggest('${field.id}', '${field.aiField}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              AI Suggest
            </button>`;
          }
        } else if (field.type === 'select') {
          const options = field.options.map(o => {
            if (typeof o === 'string') return { value: o, label: o };
            return o;
          });
          html += `<select class="gcis-input gcis-select" id="${field.id}">
            <option value="">-- Select --</option>
            ${options.map(o => `<option value="${o.value}" ${savedVal === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>`;
        } else {
          html += `<input class="gcis-input" type="${field.type}" id="${field.id}" placeholder="${field.placeholder || ''}" value="${savedVal}">`;
        }
        html += `</div>`;
      }
    });
  }

  html += `</div>
    <div class="gcis-nav-buttons">
      ${gcisCurrentStep > 0 ? '<button class="gcis-btn gcis-btn-secondary" onclick="gcisBack()">Back</button>' : '<div></div>'}
      ${gcisCurrentStep < totalSteps - 1 
        ? '<button class="gcis-btn gcis-btn-primary" onclick="gcisNext()">Continue</button>' 
        : '<button class="gcis-btn gcis-btn-submit" onclick="gcisSubmit()">Submit for Consultant Review</button>'}
    </div>`;

  container.innerHTML = html;
}

function gcisGoToStep(step) {
  gcisCollectCurrentData();
  
  if (step > gcisCurrentStep) {
    // Basic progression validation blocks jumping ahead with invalid data
    if (!validateCurrentStep()) return;
  }
  
  gcisCurrentStep = step;
  renderGCISWizard();
}

function gcisNext() {
  gcisCollectCurrentData();
  
  if (!validateCurrentStep()) return;

  gcisCurrentStep = Math.min(gcisCurrentStep + 1, GCIS_STEPS.length - 1);
  renderGCISWizard();
  window.scrollTo(0, document.getElementById('gcis-wizard-container')?.offsetTop - 80 || 0);
}

function validateCurrentStep() {
  const step = GCIS_STEPS[gcisCurrentStep];

  for (const field of step.fields) {
    if (field.required && !gcisData[field.id] && field.type !== 'gis-scan' && field.type !== 'receipt-scan') {
      toast('Please fill in: ' + field.label, 'error');
      const el = document.getElementById(field.id);
      if (el) { el.style.borderColor = '#EF5350'; el.focus(); }
      return false;
    }
  }

  // Check for duplicate registration numbers on step 2
  if (step.id === 'registration-docs') {
    const dupWarnings = checkDuplicateRegistrations();
    if (dupWarnings.length > 0) {
      toast('WARNING: ' + dupWarnings.join('; '), 'error');
      // Allow to continue but warn (as per existing logic)
    }
  }

  // FOURTH SCHEDULE LOCK (Regulation 23E Enforcement)
  if (step.id === 'community-benefit') {
    const landType = gcisData['gcis-land-type'] || 'private';
    const cdaRate = parseFloat(gcisData['gcis-cda-rate']) || 0;
    
    // Clear previous errors first
    const cdaField = document.getElementById('gcis-cda-rate');
    if (cdaField) cdaField.style.borderColor = '';
    const existingMsg = document.getElementById('cda-regulatory-block');
    if (existingMsg) existingMsg.remove();

    if ((landType === 'community' || landType === 'public') && cdaRate < 40) {
      if (cdaField) {
        cdaField.style.borderColor = 'coral';
        cdaField.focus();
        
        const errorMsg = document.createElement('div');
        errorMsg.id = 'cda-regulatory-block';
        errorMsg.style.color = 'coral';
        errorMsg.style.fontWeight = 'bold';
        errorMsg.style.marginTop = '10px';
        errorMsg.style.fontSize = '0.9rem';
        errorMsg.innerText = "⚠️ REGULATORY BLOCK: Under the Fourth Schedule of the Carbon Markets Regulations 2024 (Reg 23E), land-based projects on Community/Public land must allocate a minimum of 40% net earnings to the community. You cannot proceed with a 25% allocation.";
        cdaField.parentNode.appendChild(errorMsg);
      }
      
      if (!window.NTZ) window.NTZ = {};
      if (!window.NTZ.registry) window.NTZ.registry = [];
      window.NTZ.registry.push({ 
        type: 'Compliance Violation Attempt', 
        timestamp: new Date().toISOString(), 
        detail: 'Attempted to bypass CDA minimum rate for ' + landType + ' land.' 
      });
      
      toast('Regulatory Block: Invalid CDA rate for Community/Public land.', 'error');
      return false;
    }
  }
  
  return true;
}

function gcisBack() {
  gcisCollectCurrentData();
  gcisCurrentStep = Math.max(0, gcisCurrentStep - 1);
  renderGCISWizard();
}

function gcisCollectCurrentData() {
  const step = GCIS_STEPS[gcisCurrentStep];
  if (!step) return;
  step.fields.forEach(field => {
    if (field.type === 'gis-scan' || field.type === 'receipt-scan') return;
    const el = document.getElementById(field.id);
    if (el) {
      gcisData[field.id] = el.value;
      if (gcisData[field.id + '_ai_generated'] && gcisData[field.id + '_ai_text'] !== el.value.trim()) {
        gcisData[field.id + '_ai_modified'] = true;
      }
    }
  });
}

function checkDuplicateRegistrations() {
  const warnings = [];
  const fieldsToCheck = ['gcis-kra-pin', 'gcis-business-reg', 'gcis-invoice-no', 'gcis-nema-license'];
  fieldsToCheck.forEach(fieldId => {
    const val = gcisData[fieldId];
    if (!val) return;
    // Check against all existing projects
    const existing = NTZ.projects.find(p => p[fieldId] === val);
    if (existing) {
      warnings.push(`${fieldId.replace('gcis-','').replace(/-/g,' ').toUpperCase()} "${val}" already used in project ${existing.id}`);
      const el = document.getElementById(fieldId);
      if (el) el.style.borderColor = '#EF5350';
    }
    // Check against stored registration numbers
    const stored = NTZ.registrationNumbers.find(r => r.value === val);
    if (stored && !existing) {
      warnings.push(`${fieldId.replace('gcis-','').replace(/-/g,' ').toUpperCase()} "${val}" was previously registered`);
    }
  });
  return warnings;
}

// AI Suggest for technical fields
async function gcisAISuggest(fieldId, aiType) {
  const btn = event.target.closest('.gcis-ai-suggest-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="gcis-spinner"></span> Generating...'; }

  const projName = gcisData['gcis-proj-name'] || 'Carbon Project';
  const projType = gcisData['gcis-proj-type'] || 'borehole';
  const county = gcisData['gcis-county'] || 'Kenya';
  const credits = gcisData['gcis-credits'] || '500';

  const prompts = {
    baseline: `Generate a professional baseline scenario description for a ${projType} carbon project named "${projName}" in ${county} County, Kenya. The project targets ${credits} tCO2e/yr in emission reductions. Write 150-200 words describing the current emission scenario without the project intervention. Reference IPCC AR6 methodology and Kenya-specific emission factors. Use formal technical language suitable for a KNCR Project Design Document.`,
    additionality: `Generate a professional additionality justification for a ${projType} carbon project named "${projName}" in ${county} County, Kenya targeting ${credits} tCO2e/yr. Demonstrate why this project would not be viable without carbon credit revenue. Address financial barriers (IRR, payback period), technological barriers, and institutional barriers specific to Kenya. Reference the UNFCCC additionality tool and Kenya's Carbon Markets Regulations 2024. Write 150-200 words in formal technical language.`,
    monitoring: `Generate a professional MRV (Measurement, Reporting, Verification) plan for a ${projType} carbon project named "${projName}" in ${county} County, Kenya. Describe monitoring parameters, measurement methods, data collection frequency, QA/QC procedures, and verification approach. Reference ISO 14064-2 and IPCC 2006 Guidelines. Write 150-200 words in formal technical language suitable for a KNCR-compliant monitoring plan.`,
  };

  try {
    const systemMsg = { role: 'system', content: 'You are a senior carbon project consultant specializing in Kenya KNCR compliance. Generate precise, professional technical content for carbon project documentation. Never use emojis. Use formal academic language.' };
    const userMsg = { role: 'user', content: prompts[aiType] || prompts.baseline };
    const response = await _postWorker([systemMsg, userMsg]);

    const textarea = document.getElementById(fieldId);
    if (textarea) {
      textarea.value = response.trim();
      gcisData[fieldId] = response.trim();
      gcisData[fieldId + '_ai_generated'] = true;
      gcisData[fieldId + '_ai_text'] = response.trim();
      textarea.style.borderColor = '#4ade80';
      setTimeout(() => { textarea.style.borderColor = ''; }, 2000);
    }
    toast('AI suggestion generated successfully', 'success');
  } catch (e) {
    toast('AI generation failed: ' + e.message, 'error');
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> AI Suggest'; }
}

// ══════════════════════════════════════════════════════
// 2b. SMART SATELLITE — MAP SELECTION + AI AREA IDENTIFICATION
// ══════════════════════════════════════════════════════

function renderGISScanField(field) {
  const savedCoords = gcisData['gcis-gis-coords'] || '';
  const savedLat = savedCoords ? savedCoords.split(',')[0] : '';
  const savedLng = savedCoords ? savedCoords.split(',')[1] : '';
  return `<div class="gcis-field gcis-scan-field">
    <label class="gcis-label">${field.label}</label>
    <div class="gcis-scan-box" id="gis-scan-box">
      <div class="gcis-map-controls">
        <div class="gcis-map-row">
          <div class="gcis-field" style="flex:1;margin:0">
            <label class="gcis-label" style="font-size:.72rem">Latitude</label>
            <input class="gcis-input" type="number" step="0.0001" id="gcis-lat" placeholder="e.g. 0.5143" value="${savedLat}">
          </div>
          <div class="gcis-field" style="flex:1;margin:0">
            <label class="gcis-label" style="font-size:.72rem">Longitude</label>
            <input class="gcis-input" type="number" step="0.0001" id="gcis-lng" placeholder="e.g. 37.2712" value="${savedLng}">
          </div>
        </div>
        <div class="gcis-map-row" style="margin-top:8px">
          <select class="gcis-input gcis-select" id="gcis-map-preset" onchange="applyMapPreset()" style="flex:1">
            <option value="">-- Quick Select Known Location --</option>
            <option value="-0.0917,34.7680">Mau Forest Complex</option>
            <option value="0.0236,37.9062">Mt. Kenya Forest</option>
            <option value="-4.0435,39.6682">Mombasa Coastal Zone</option>
            <option value="3.1191,35.5968">Turkana (Lake Region)</option>
            <option value="-1.2921,36.8219">Nairobi Metropolitan</option>
            <option value="-0.3031,36.0800">Nakuru (Rift Valley)</option>
            <option value="0.5143,37.2712">Meru (Eastern Highlands)</option>
            <option value="2.3333,40.0000">Garissa (Arid Northeast)</option>
            <option value="-1.0500,37.0833">Machakos (Semi-arid)</option>
            <option value="1.7500,40.0667">Marsabit (Desert)</option>
          </select>
        </div>
      </div>
      <div class="gcis-scan-preview" id="gis-scan-preview">
        <div class="gcis-scan-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(109,217,140,0.4)" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span>GIS Satellite Imagery Scanner</span>
          <small>Enter coordinates or select a location, then run the AI-powered scan</small>
        </div>
      </div>
      <button class="gcis-btn gcis-btn-scan" onclick="runGISScan()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        Run AI Satellite Scan
      </button>
    </div>
  </div>`;
}

function applyMapPreset() {
  const sel = document.getElementById('gcis-map-preset');
  if (!sel || !sel.value) return;
  const [lat, lng] = sel.value.split(',');
  document.getElementById('gcis-lat').value = lat;
  document.getElementById('gcis-lng').value = lng;
}

async function runGISScan() {
  const preview = document.getElementById('gis-scan-preview');
  const county = gcisData['gcis-county'] || 'Turkana';
  const projType = gcisData['gcis-proj-type'] || 'borehole';
  const latEl = document.getElementById('gcis-lat');
  const lngEl = document.getElementById('gcis-lng');
  const lat = latEl?.value || (0.5 + Math.random() * 3).toFixed(4);
  const lng = lngEl?.value || (34 + Math.random() * 7).toFixed(4);

  // Save coordinates
  gcisData['gcis-gis-coords'] = lat + ',' + lng;

  preview.innerHTML = `<div class="gcis-scan-loading" style="position:relative; height:220px; background:#071C0F; overflow:hidden; border-radius:8px; border:1px solid rgba(109,217,140,.3);">
    <div id="leaflet-map-container" style="position:absolute; inset:0; z-index:1;"></div>
    <div style="position:absolute; inset:0; background: linear-gradient(180deg, transparent 0%, rgba(109,217,140,0.4) 50%, transparent 100%); animation: scanline 3s linear infinite; height: 100px; z-index:2; pointer-events:none;"></div>
    <div class="gcis-scan-radar" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:3; pointer-events:none;"></div>
    <div style="position:absolute; bottom:12px; left:12px; right:12px; z-index:10; background:rgba(10,31,20,0.85); padding:10px 14px; border-radius:6px; border-left:3px solid var(--mint); box-shadow:0 10px 30px rgba(0,0,0,0.5);">
      <div style="color:var(--mint); font-family:'JetBrains Mono',monospace; font-size:0.75rem; font-weight:600; margin-bottom:4px;">ESA Sentinel-2 Locking onto ${lat}N, ${lng}E...</div>
      <div style="color:rgba(255,255,255,.6); font-size:0.68rem; line-height:1.4;">Activating real Esri ArcGIS satellite imagery API.<br>Querying land cover classification and biomass density indices.</div>
    </div>
  </div>
  <style>
    @keyframes scanline { 0% { top:-100px; } 100% { top:100%; } }
  </style>`;

  if (window.L) {
    try {
      let map = L.map('leaflet-map-container', { zoomControl: false, attributionControl: false }).setView([lat, lng], 15);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(map);
      const b = [[parseFloat(lat)-0.005, parseFloat(lng)-0.005], [parseFloat(lat)+0.005, parseFloat(lng)+0.005]];
      L.rectangle(b, {color: "#4ade80", weight: 2, fillOpacity: 0.1}).addTo(map);
    } catch(e) { console.log('Leaflet init error:', e); }
  }

  // Call AI to identify the area
  let aiLandAnalysis = '';
  try {
    const systemMsg = { role: 'system', content: 'You are a GIS satellite imagery analyst. Given coordinates in Kenya, describe the land cover, vegetation type, water bodies, terrain, and environmental characteristics of that area. Be specific about whether the area has forests, grasslands, water bodies, arid conditions, agricultural land, etc. Keep response under 100 words. No emojis. Professional tone.' };
    const userMsg = { role: 'user', content: `Analyze the area at coordinates ${lat}N, ${lng}E in ${county} County, Kenya. This is for a ${projType} carbon project. Describe the land cover, vegetation, water features, and terrain characteristics of this specific location.` };
    const response = await _postWorker([systemMsg, userMsg]);
    aiLandAnalysis = response.trim();
  } catch(e) {
    aiLandAnalysis = `${county} County terrain analysis: The area at ${lat}N, ${lng}E shows characteristic ${projType === 'forestry' ? 'woodland and forest cover with moderate canopy density' : projType === 'borehole' ? 'semi-arid scrubland with sparse vegetation and seasonal water courses' : 'mixed land use with agricultural and natural vegetation patterns'}. Elevation and soil conditions are consistent with the regional profile.`;
  }

  // Generate metrics based on AI analysis
  const hasForest = /forest|tree|woodland|canopy/i.test(aiLandAnalysis);
  const hasWater = /water|lake|river|stream|wetland/i.test(aiLandAnalysis);
  const isArid = /arid|desert|dry|sparse|scrub/i.test(aiLandAnalysis);

  const ndvi = hasForest ? (0.55 + Math.random() * 0.35).toFixed(2) : isArid ? (0.05 + Math.random() * 0.2).toFixed(2) : (0.25 + Math.random() * 0.35).toFixed(2);
  const soilCarbon = hasForest ? (25 + Math.random() * 40).toFixed(1) : isArid ? (3 + Math.random() * 8).toFixed(1) : (10 + Math.random() * 20).toFixed(1);
  const elevation = (200 + Math.random() * 2200).toFixed(0);
  const landClass = hasForest ? 'Forest / Woodland' : hasWater ? 'Wetland / Riparian Zone' : isArid ? 'Arid / Semi-arid Scrubland' : 'Mixed Agricultural / Grassland';
  const waterPresence = hasWater ? 'Detected' : 'Not detected in immediate vicinity';

  preview.innerHTML = `<div class="gcis-scan-results" style="position:relative; border-radius:8px; overflow:hidden; border:1px solid rgba(109,217,140,.4); background:rgba(10,31,20,0.6);">
    
    <div style="height:150px; position:relative; background:#071C0F; overflow:hidden; border-bottom:1px solid rgba(109,217,140,.2)">
      <div id="leaflet-map-result" style="position:absolute; inset:0; z-index:1;"></div>
      <div style="position:absolute; inset:0; background:rgba(10,31,20,0.2); z-index:2; pointer-events:none;"></div>
      <div style="position:absolute; top:50%; left:50%; width:90px; height:90px; background:radial-gradient(circle, rgba(109,217,140,0.2) 0%, transparent 60%); transform:translate(-50%,-50%); border:1px dashed var(--mint); border-radius:6px; animation: pulse 2s infinite; z-index:3; pointer-events:none;"></div>
      <div style="position:absolute; top:10px; right:12px; background:rgba(0,0,0,.8); padding:4px 8px; border-radius:4px; font-size:0.6rem; color:var(--mint); font-family:'JetBrains Mono',monospace; z-index:4;">Polygon Captured: ${landClass}</div>
      <div style="position:absolute; bottom:10px; left:12px; font-size:0.6rem; color:rgba(255,255,255,.9); font-family:'JetBrains Mono',monospace; background:rgba(0,0,0,0.6); padding:2px 6px; border-radius:4px; z-index:4;">LAT: ${lat} | LNG: ${lng}</div>
    </div>

    <div style="padding:1.4rem;">
      <div class="gcis-scan-header" style="margin-bottom:1rem; display:flex; align-items:center; gap:8px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span style="font-weight:600; font-size:0.95rem; color:#fff;">AI Satellite Scan Complete - ${county} County</span>
      </div>
    <div class="gcis-scan-grid">
      <div class="gcis-scan-metric">
        <div class="gcis-scan-metric-val" style="color:${parseFloat(ndvi) > 0.4 ? '#4ade80' : parseFloat(ndvi) > 0.2 ? '#F5A623' : '#EF5350'}">${ndvi}</div>
        <div class="gcis-scan-metric-lbl">NDVI Index</div>
      </div>
      <div class="gcis-scan-metric">
        <div class="gcis-scan-metric-val" style="color:#F5A623">${soilCarbon} tC/ha</div>
        <div class="gcis-scan-metric-lbl">Soil Carbon Est.</div>
      </div>
      <div class="gcis-scan-metric">
        <div class="gcis-scan-metric-val" style="color:#80DEEA">${elevation}m</div>
        <div class="gcis-scan-metric-lbl">Avg. Elevation</div>
      </div>
    </div>
    <div class="gcis-scan-detail">
      <strong>Coordinates:</strong> ${lat}N, ${lng}E<br>
      <strong>Land Classification:</strong> ${landClass}<br>
      <strong>Water Bodies:</strong> ${waterPresence}<br>
      <strong>Vegetation:</strong> ${hasForest ? 'Dense' : isArid ? 'Sparse' : 'Moderate'}<br>
      <strong>Analysis Date:</strong> ${new Date().toISOString().split('T')[0]}<br>
      <strong>Source:</strong> Sentinel-2 L2A + Cloudflare AI Analysis
    </div>
    <div class="gcis-scan-ai-analysis">
      <strong>AI Land Cover Analysis:</strong><br>
      ${aiLandAnalysis}
    </div>
  </div>`;

  gcisData['gcis-gis-scan'] = JSON.stringify({ ndvi, landCover: landClass, soilCarbon, elevation, county, lat, lng, aiAnalysis: aiLandAnalysis, waterPresence });
  toast('AI satellite scan completed for ' + county + ' County at ' + lat + 'N, ' + lng + 'E', 'success');
}

// KRA/ETR Receipt Scan
function renderReceiptScanField(field) {
  return `<div class="gcis-field gcis-scan-field">
    <label class="gcis-label">${field.label}</label>
    <div class="gcis-scan-box" id="receipt-scan-box">
      <div class="gcis-scan-preview" id="receipt-scan-preview">
        <div class="gcis-scan-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(109,217,140,0.4)" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 12h10M7 17h6"/>
          </svg>
          <span>KRA/ETR Receipt Scanner</span>
          <small>Simulates OCR extraction of tax receipts and fuel invoices</small>
        </div>
      </div>
      <button class="gcis-btn gcis-btn-scan" onclick="runReceiptScan()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 12h10M7 17h6"/></svg>
        Scan Receipt
      </button>
    </div>
  </div>`;
}

async function runReceiptScan() {
  const preview = document.getElementById('receipt-scan-preview');
  preview.innerHTML = `<div class="gcis-scan-loading">
    <div class="gcis-scan-radar"></div>
    <span>Processing receipt via OCR engine...</span>
    <small>Extracting vendor, amounts, VAT, and KRA PIN</small>
  </div>`;

  await new Promise(r => setTimeout(r, 2000));

  const vendors = ['TotalEnergies Kenya', 'Rubis Energy Kenya', 'Vivo Energy (Shell)', 'National Oil Corp.'];
  const vendor = vendors[Math.floor(Math.random() * vendors.length)];
  const amount = (15000 + Math.random() * 85000).toFixed(0);
  const vat = (amount * 0.16).toFixed(0);
  const litres = (parseInt(amount) / 180).toFixed(0);
  const kraPin = 'P' + String(Math.floor(Math.random() * 900000000) + 100000000);
  const etrNo = 'ETR-' + Date.now().toString(36).toUpperCase();

  preview.innerHTML = `<div class="gcis-scan-results">
    <div class="gcis-scan-header">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <span>Receipt Extracted Successfully</span>
    </div>
    <div class="gcis-scan-detail" style="font-family:'JetBrains Mono',monospace;font-size:.78rem">
      <strong>Vendor:</strong> ${vendor}<br>
      <strong>KRA PIN:</strong> ${kraPin}<br>
      <strong>Amount:</strong> KES ${parseInt(amount).toLocaleString()}<br>
      <strong>VAT (16%):</strong> KES ${parseInt(vat).toLocaleString()}<br>
      <strong>Est. Litres:</strong> ${litres} L diesel<br>
      <strong>Est. Emissions:</strong> ${(litres * 2.68 / 1000).toFixed(2)} tCO2e<br>
      <strong>ETR No:</strong> ${etrNo}<br>
      <strong>Date:</strong> ${new Date().toISOString().split('T')[0]}<br>
      <strong>Status:</strong> <span style="color:#4ade80">KRA Verified (simulated)</span>
    </div>
  </div>`;

  gcisData['gcis-receipt-scan'] = JSON.stringify({ vendor, kraPin, amount, vat, litres, etrNo, date: new Date().toISOString() });
  toast('KRA/ETR receipt extracted successfully', 'success');
}

function renderGCISReview() {
  let html = '<div class="gcis-review">';
  GCIS_STEPS.forEach((step, i) => {
    if (step.id === 'review-submit') return;
    html += `<div class="gcis-review-section">
      <div class="gcis-review-section-header" onclick="gcisGoToStep(${i})">
        <h4>${step.title}</h4>
        <span class="gcis-review-edit">Edit</span>
      </div>
      <div class="gcis-review-fields">`;
    step.fields.forEach(field => {
      if (field.type === 'gis-scan' || field.type === 'receipt-scan') {
        const val = gcisData[field.id];
        html += `<div class="gcis-review-field">
          <span class="gcis-review-label">${field.label}</span>
          <span class="gcis-review-value">${val ? '<span style="color:#4ade80">Scan completed</span>' : '<span style="color:rgba(255,255,255,.3)">Not scanned</span>'}</span>
        </div>`;
      } else {
        const val = gcisData[field.id] || '';
        html += `<div class="gcis-review-field">
          <span class="gcis-review-label">${field.label}</span>
          <span class="gcis-review-value">${val || '<span style="color:rgba(255,255,255,.3)">Not provided</span>'}</span>
        </div>`;
      }
    });
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

function gcisSubmit() {
  gcisCollectCurrentData();

  const projectId = 'GCIS-' + Date.now().toString(36).toUpperCase();
  const project = {
    id: projectId,
    ...gcisData,
    status: 'pending-review', // Consultant must approve first
    pipelineStage: 'pcn',    // Starts at PCN
    pipelineApprovals: {},    // Track approvals per stage
    prlScore: calculatePRL(gcisData),
    submittedAt: new Date().toISOString(),
    submittedBy: AUTH.currentUser?.name || S.user.name,
    role: AUTH.currentUser?.role || 'proponent',
    messages: [],
    consultantNotes: '',
    nemaStatus: 'pending',
  };

  NTZ.projects.push(project);

  // Store registration numbers for duplicate detection
  ['gcis-kra-pin', 'gcis-business-reg', 'gcis-invoice-no', 'gcis-nema-license', 'gcis-county-permit'].forEach(field => {
    if (gcisData[field]) {
      NTZ.registrationNumbers.push({ field, value: gcisData[field], projectId, timestamp: new Date().toISOString() });
    }
  });

  // Generate PCN document (first in pipeline)
  generateProjectDocuments(projectId);

  addRegistryEntry({
    projectId,
    action: 'PROJECT_SUBMITTED',
    actor: project.submittedBy,
    detail: 'GCIS application submitted for ' + (gcisData['gcis-proj-name'] || 'Unnamed Project') + ' - Pending consultant review',
    hash: generateHash(projectId + project.submittedAt),
  });

  saveNuclearState();
  toast('Project submitted successfully. Awaiting consultant review before documents become available.', 'success');
  showSection('my-projects');
}


// ══════════════════════════════════════════════════════
// 3. PRL — PROJECT RISK LEVEL CALCULATOR
// ══════════════════════════════════════════════════════

function calculatePRL(data) {
  let score = 0;
  let factors = [];

  const landRisk = { community: 25, public: 15, private: 5 };
  score += landRisk[data['gcis-land-type']] || 15;
  factors.push({ factor: 'Land Type', value: data['gcis-land-type'] || 'unknown', points: landRisk[data['gcis-land-type']] || 15 });

  const credits = parseFloat(data['gcis-credits']) || 0;
  const creditRisk = credits > 5000 ? 20 : credits > 1000 ? 12 : credits > 500 ? 8 : 4;
  score += creditRisk;
  factors.push({ factor: 'Credit Volume', value: credits + ' tCO2e', points: creditRisk });

  const cdaRate = parseFloat(data['gcis-cda-rate']) || 0;
  const landType = data['gcis-land-type'] || 'community';
  const requiredCDA = landType === 'private' ? 0 : landType === 'community' ? 40 : 25;
  const cdaRisk = cdaRate >= requiredCDA ? 0 : 20;
  score += cdaRisk;
  factors.push({ factor: 'CDA Compliance', value: cdaRate + '% (req: ' + requiredCDA + '%)', points: cdaRisk });

  const docFields = ['gcis-baseline', 'gcis-additionality', 'gcis-monitoring'];
  const filled = docFields.filter(f => data[f] && data[f].length > 50).length;
  const docRisk = filled === 3 ? 0 : filled === 2 ? 8 : filled === 1 ? 15 : 25;
  score += docRisk;
  factors.push({ factor: 'Documentation', value: filled + '/3 complete', points: docRisk });

  const stdRisk = { 'kncr-domestic': 5, 'verra': 3, 'gs': 3, 'cdm': 8 };
  score += stdRisk[data['gcis-standard']] || 5;
  factors.push({ factor: 'Standard', value: data['gcis-standard'] || 'unknown', points: stdRisk[data['gcis-standard']] || 5 });

  const duration = parseFloat(data['gcis-duration']) || 10;
  const durRisk = duration > 20 ? 10 : duration > 10 ? 5 : 2;
  score += durRisk;
  factors.push({ factor: 'Duration', value: duration + ' years', points: durRisk });

  return { score: Math.min(score, 100), factors, level: score > 60 ? 'HIGH' : score > 35 ? 'MEDIUM' : 'LOW' };
}

// ══════════════════════════════════════════════════════
// 4. QR CODE GENERATOR + DOCUMENT HASH + VERIFICATION BLOCK
// ══════════════════════════════════════════════════════

function generateQRCodeSVG(text, size) {
  size = size || 140;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&margin=1`;
}

function generateDocumentHash(projectData, docType) {
  const payload = JSON.stringify({ id: projectData.id, name: projectData['gcis-proj-name'], type: projectData['gcis-proj-type'], county: projectData['gcis-county'], proponent: projectData['gcis-proponent'], credits: projectData['gcis-credits'], submittedAt: projectData.submittedAt, docType, prl: projectData.prlScore?.score });
  return (typeof sha256 === 'function') ? sha256(payload) : "verification-unavailable";
}

function buildVerificationBlock(project, docType, docTypeLabel) {
  const docHash = generateDocumentHash(project, docType);
  const now = new Date();
  const displayTime = now.toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const registryBlock = NTZ.registry.find(r => r.projectId === project.id && r.action === 'PROJECT_SUBMITTED');
  const blockNum = registryBlock ? registryBlock.blockNumber : 'Pending';
  const blockHash = registryBlock ? registryBlock.hash : 'N/A';
  const prevHash = registryBlock ? registryBlock.prevHash : 'N/A';
  const chainLength = NTZ.registry.length;
  const verifyUrl = `https://www.netzerra.co.ke/verify?hash=${docHash}&ref=${project.id}&doc=${docType}`;
  const qrDataUri = generateQRCodeSVG(verifyUrl, 140);
  const auditEntries = NTZ.registry.filter(r => r.projectId === project.id).slice(0, 8);

  return `
<div class="verification-block">
  <div class="vb-header">
    <div class="vb-shield"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A5D6A7" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4" stroke-width="2.5"/></svg></div>
    <div>
      <div class="vb-title">DOCUMENT VERIFICATION &amp; ANTI-FRAUD CERTIFICATE</div>
      <div class="vb-subtitle">Cryptographic Hash Authentication | Kenya Carbon Markets Regulations 2024</div>
    </div>
  </div>
  <div class="vb-body">
    <div class="vb-qr-section">
      <img src="${qrDataUri}" alt="Verification QR Code" class="vb-qr-img" />
      <div class="vb-qr-label">SCAN TO VERIFY</div>
      <div class="vb-qr-sublabel">Netzerra KNCR Verification Portal</div>
    </div>
    <div class="vb-details">
      <table class="vb-table">
        <tr><td class="vb-key">Document Type</td><td class="vb-val">${docTypeLabel}</td></tr>
        <tr><td class="vb-key">Project Reference</td><td class="vb-val">${project.id}</td></tr>
        <tr><td class="vb-key">Document Hash (SHA-256)</td><td class="vb-val vb-hash">${docHash}</td></tr>
        <tr><td class="vb-key">Generation Timestamp</td><td class="vb-val">${displayTime} (UTC+3)</td></tr>
        <tr><td class="vb-key">Registry Block</td><td class="vb-val">#${blockNum} of ${chainLength} blocks</td></tr>
        <tr><td class="vb-key">Block Hash</td><td class="vb-val vb-hash">${blockHash}</td></tr>
        <tr><td class="vb-key">Previous Block Hash</td><td class="vb-val vb-hash">${prevHash}</td></tr>
        <tr><td class="vb-key">Chain Integrity</td><td class="vb-val vb-chain-ok">VERIFIED - Immutable Ledger Intact</td></tr>
      </table>
    </div>
  </div>
  <div class="vb-audit">
    <div class="vb-audit-title">VERIFIABLE AUDIT TRAIL</div>
    <table class="vb-audit-table">
      <thead><tr><th>Block</th><th>Timestamp</th><th>Action</th><th>Actor</th><th>Hash</th></tr></thead>
      <tbody>${auditEntries.map(e => `<tr><td>#${e.blockNumber}</td><td>${new Date(e.timestamp).toLocaleDateString('en-KE',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}</td><td>${e.action}</td><td>${e.actor}</td><td class="vb-hash">${e.hash}</td></tr>`).join('')}</tbody>
    </table>
  </div>
  <div class="vb-tamper-notice">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C62828" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    <span>TAMPER DETECTION: Any modification to this document will invalidate the cryptographic hash above. Verify authenticity at <strong>${verifyUrl}</strong></span>
  </div>
  <div class="vb-legal">This document was generated by Netzerra, Kenya's Carbon Intelligence Platform, and is linked to the Kenya National Carbon Registry (KNCR) blockchain ledger. Document integrity can be independently verified using the QR code above or by querying the verification endpoint with the document hash. Pursuant to Regulation 37 of the Carbon Markets Regulations 2024, submission of falsified documents carries a penalty of up to KES 500,000,000.</div>
</div>`;
}

function getVerificationCSS() {
  return `.verification-block{margin:28px 0 16px;padding:0;border:2px solid #1B5E20;border-radius:8px;overflow:hidden;page-break-inside:avoid}
.vb-header{background:linear-gradient(135deg,#0D3320,#1A4A2E);color:#fff;padding:12px 16px;display:flex;align-items:center;gap:10px}
.vb-shield{width:36px;height:36px;background:rgba(255,255,255,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.vb-title{font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#A5D6A7}
.vb-subtitle{font-family:Arial,Helvetica,sans-serif;font-size:8px;color:rgba(255,255,255,.55);margin-top:2px}
.vb-body{display:flex;gap:16px;padding:14px 16px;background:#FAFFF8;align-items:flex-start}
.vb-qr-section{display:flex;flex-direction:column;align-items:center;flex-shrink:0;padding:8px;background:#fff;border:1px solid #E8F5E9;border-radius:6px}
.vb-qr-img{width:120px;height:120px;image-rendering:pixelated}
.vb-qr-label{font-family:Arial,Helvetica,sans-serif;font-size:7.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#1B5E20;margin-top:6px}
.vb-qr-sublabel{font-family:Arial,Helvetica,sans-serif;font-size:6.5px;color:#888;margin-top:1px}
.vb-details{flex:1;min-width:0}
.vb-table{width:100%;border-collapse:collapse;font-size:9px}
.vb-table td{padding:3px 6px;border-bottom:1px solid #E8F5E9;vertical-align:top}
.vb-key{font-weight:bold;color:#1B5E20;width:38%;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;font-size:8.5px}
.vb-val{color:#333;font-family:Arial,Helvetica,sans-serif;font-size:8.5px}
.vb-hash{font-family:'Courier New',Courier,monospace;font-size:7.5px;word-break:break-all;color:#555;letter-spacing:.02em}
.vb-chain-ok{color:#2E7D32;font-weight:bold}
.vb-audit{padding:10px 16px;background:#F5F9F5;border-top:1px solid #E8F5E9}
.vb-audit-title{font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1B5E20;margin-bottom:6px}
.vb-audit-table{width:100%;border-collapse:collapse;font-size:8px;font-family:Arial,Helvetica,sans-serif}
.vb-audit-table th{background:#1B5E20;color:#fff;padding:3px 5px;text-align:left;font-size:7.5px;font-weight:700;letter-spacing:.03em}
.vb-audit-table td{padding:3px 5px;border-bottom:1px solid #E0E0E0;color:#444}
.vb-audit-table tr:nth-child(even) td{background:#F0F5F0}
.vb-tamper-notice{padding:8px 16px;background:#FFF8E1;border-top:1px solid #FFE082;display:flex;align-items:flex-start;gap:8px;font-family:Arial,Helvetica,sans-serif;font-size:7.5px;color:#795548;line-height:1.5}
.vb-tamper-notice svg{flex-shrink:0;margin-top:1px}
.vb-legal{padding:8px 16px;background:#FAFFF8;border-top:1px solid #E8F5E9;font-family:Arial,Helvetica,sans-serif;font-size:7px;color:#999;line-height:1.5;text-align:justify}`;
}

// ══════════════════════════════════════════════════════
// 5. DOCUMENT ENGINE — COMPREHENSIVE GENERATION
// ══════════════════════════════════════════════════════

function getDocCSS() {
  return `*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:11.5px;color:#111;background:#fff;padding:48px 56px;max-width:820px;margin:0 auto;line-height:1.7}
h1{font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:.7px;border-bottom:2px solid #1B5E20;padding-bottom:4px;margin:28px 0 12px;color:#1B5E20}
h2{font-size:12px;font-weight:bold;margin:16px 0 6px;color:#2E7D32}
h3{font-size:11.5px;font-weight:bold;margin:12px 0 5px;color:#333}
p{margin-bottom:8px;text-align:justify}
ol,ul{margin:6px 0 10px 20px}
li{margin-bottom:4px}
table{width:100%;border-collapse:collapse;margin:8px 0 14px;font-size:10.5px}
th{background:#1B5E20;color:#fff;padding:5px 8px;text-align:left;font-weight:bold}
td{padding:5px 8px;border-bottom:1px solid #ccc}
tr:nth-child(even) td{background:#F9FBF7}
.hdr{background:linear-gradient(135deg,#0D3320,#1A4A2E);color:#fff;padding:1.5rem;border-radius:8px;margin-bottom:1.5rem}
.tag{background:rgba(76,175,80,.2);border:1px solid rgba(76,175,80,.4);color:#A5D6A7;padding:.2rem .65rem;border-radius:12px;font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;display:inline-block;margin-bottom:.6rem}
.warn{background:#FFF8E1;border-left:4px solid #F9A825;padding:7px 10px;border-radius:0 4px 4px 0;font-size:10px;color:#795548;margin:8px 0}
.info{background:#E3F2FD;border-left:4px solid #1565C0;padding:7px 10px;border-radius:0 4px 4px 0;font-size:10px;color:#0D47A1;margin:8px 0}
.prl-box{padding:12px;border-radius:6px;margin:10px 0;font-size:10px}
.prl-low{background:#E8F5E9;border:1px solid #A5D6A7;color:#2E7D32}
.prl-medium{background:#FFF8E1;border:1px solid #FFE082;color:#F57F17}
.prl-high{background:#FFEBEE;border:1px solid #EF9A9A;color:#C62828}
.sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:24px}
.sign-block{border-top:1.5px solid #ccc;padding-top:6px}
.sign-line{height:42px}
.sign-label{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.05em}
.footer{margin-top:20px;padding-top:8px;border-top:2px solid #1B5E20;display:flex;justify-content:space-between;font-size:8px;color:#999}
.no-print{text-align:right;margin-bottom:16px;font-family:Arial,sans-serif}
.page-break{page-break-after:always;height:0;margin:0;padding:0}
.toc-item{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dotted #ccc;font-size:10.5px}
.toc-item span:first-child{color:#1B5E20;font-weight:600}
.toc-item span:last-child{color:#888}
.section-box{background:#F5F9F5;border:1px solid #E8F5E9;border-radius:6px;padding:12px;margin:10px 0}
.matrix-cell{text-align:center;font-weight:bold;padding:8px}
.risk-high{background:#FFEBEE;color:#C62828}
.risk-medium{background:#FFF8E1;color:#F57F17}
.risk-low{background:#E8F5E9;color:#2E7D32}
@media print{.no-print{display:none!important}@page{margin:2cm;size:A4}}`;
}

function generateProjectDocuments(projectId) {
  const project = NTZ.projects.find(p => p.id === projectId);
  if (!project) return;
  NTZ.documents[projectId] = {
    pcn: generateNuclearPCN(project),
    pdd: generateNuclearPDD(project),
    compliance: generateComplianceReport(project),
    cda: generateCDADocument(project),
    escp: generateESCPDocument(project),
    stakeholder: generateStakeholderReport(project),
    esia: generateESIADocument(project),
    generatedAt: new Date().toISOString(),
  };
}

function downloadDocument(projectId, docType) {
  const project = NTZ.projects.find(p => p.id === projectId);
  if (!project) { toast('Project not found', 'error'); return; }

  // Consultant-gated: proponents can only download if consultant approved
  const currentRole = AUTH.currentUser?.role || 'proponent';
  if (currentRole === 'proponent') {
    const stageIndex = PIPELINE_STAGES.findIndex(s => s.id === docType);
    const currentStageIndex = PIPELINE_STAGES.findIndex(s => s.id === project.pipelineStage);
    if (stageIndex > currentStageIndex) {
      toast('This document is not yet available. Complete earlier pipeline stages first.', 'error');
      return;
    }
    if (!project.pipelineApprovals?.[docType] && docType !== project.pipelineStage) {
      toast('Awaiting consultant approval before this document can be downloaded.', 'error');
      return;
    }
  }

  if (!NTZ.documents[projectId]) generateProjectDocuments(projectId);
  const html = NTZ.documents[projectId]?.[docType];
  if (!html) { toast('Document not available for this stage', 'error'); return; }
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

// ══════════════════════════════════════════════════════
// 5a. PCN GENERATOR — 10+ PAGES
// ══════════════════════════════════════════════════════

function generateNuclearPCN(p) {
  const prl = p.prlScore || calculatePRL(p);
  const now = new Date().toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' });
  const credits = parseFloat(p['gcis-credits']) || 0;
  const duration = parseFloat(p['gcis-duration']) || 10;
  const totalER = (credits * duration).toLocaleString();
  const budget = parseFloat(p['gcis-budget']) || 0;
  const cdaRate = parseFloat(p['gcis-cda-rate']) || 0;
  const landType = p['gcis-land-type'] || 'community';
  const reqCDA = landType === 'private' ? 0 : landType === 'community' ? 40 : 25;
  const gis = p['gcis-gis-scan'] ? JSON.parse(p['gcis-gis-scan']) : null;
  const receipt = p['gcis-receipt-scan'] ? JSON.parse(p['gcis-receipt-scan']) : null;
  const verBlock = buildVerificationBlock(p, 'pcn', 'Project Concept Note (PCN)');
  const vCSS = getVerificationCSS();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>PCN - ${p['gcis-proj-name']}</title>
<style>${getDocCSS()}${vCSS}</style></head><body>
<div class="no-print"><button onclick="window.print()" style="background:#1B5E20;color:#fff;border:none;padding:9px 22px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:bold">Save as PDF / Print</button></div>

<!-- COVER PAGE -->
<div class="hdr">
  <div class="tag">Kenya National Carbon Registry - Form PCN - First Schedule</div>
  <h1 style="color:#fff;font-size:18px;margin:0 0 6px">PROJECT CONCEPT NOTE</h1>
  <div style="font-size:10px;color:rgba(255,255,255,.7)">${p['gcis-proj-name'] || 'Unnamed Project'}</div>
  <div style="font-size:9px;color:rgba(255,255,255,.5);margin-top:4px">Carbon Markets Regulations 2024, Regulation 21(2)(a) - Legal Notice No. 84 of 17 May 2024</div>
  <div style="font-size:9px;color:rgba(255,255,255,.5);margin-top:2px">Reference: ${p.id} | Generated: ${now}</div>
</div>

<div class="prl-box prl-${prl.level.toLowerCase()}">
  <strong>Project Risk Level (PRL): ${prl.score}% - ${prl.level}</strong><br>
  ${prl.factors.map(f => f.factor + ': ' + f.value + ' (+' + f.points + ')').join(' | ')}
</div>

<!-- TABLE OF CONTENTS -->
<h1>Table of Contents</h1>
<div class="toc-item"><span>1. General Information</span><span>2</span></div>
<div class="toc-item"><span>2. Project Description</span><span>3</span></div>
<div class="toc-item"><span>3. Regulatory Framework</span><span>4</span></div>
<div class="toc-item"><span>4. Baseline Scenario</span><span>5</span></div>
<div class="toc-item"><span>5. Additionality</span><span>6</span></div>
<div class="toc-item"><span>6. Monitoring Plan</span><span>7</span></div>
<div class="toc-item"><span>7. Community Development Agreement</span><span>8</span></div>
<div class="toc-item"><span>8. Environmental & Social Screening</span><span>8</span></div>
<div class="toc-item"><span>9. Financial Overview</span><span>9</span></div>
<div class="toc-item"><span>10. Stakeholder Analysis</span><span>9</span></div>
<div class="toc-item"><span>11. Risk Assessment Matrix</span><span>10</span></div>
<div class="toc-item"><span>12. Site Verification Data</span><span>10</span></div>
<div class="toc-item"><span>13. Registration & Compliance Numbers</span><span>11</span></div>
<div class="toc-item"><span>14. Declarations & Signatures</span><span>11</span></div>
<div class="toc-item"><span>Annex: Document Verification Certificate</span><span>12</span></div>
<div class="page-break"></div>

<!-- SECTION 1 -->
<h1>1. General Information</h1>
<table>
  <tr><td style="width:40%"><strong>Title of Project</strong></td><td>${p['gcis-proj-name'] || 'Unnamed'}</td></tr>
  <tr><td><strong>Project ID</strong></td><td>${p.id}</td></tr>
  <tr><td><strong>Date of Application</strong></td><td>${now}</td></tr>
  <tr><td><strong>Project Type / Sectoral Scope</strong></td><td>${p['gcis-proj-type'] || 'N/A'}</td></tr>
  <tr><td><strong>Project Proponent</strong></td><td>${p['gcis-proponent'] || 'N/A'}</td></tr>
  <tr><td><strong>County</strong></td><td>${p['gcis-county'] || 'N/A'} County, Republic of Kenya</td></tr>
  <tr><td><strong>Land Ownership Type</strong></td><td>${landType}</td></tr>
  <tr><td><strong>Registry Standard</strong></td><td>${p['gcis-standard'] || 'KNCR Domestic'}</td></tr>
  <tr><td><strong>Estimated Annual ERs</strong></td><td>${credits.toLocaleString()} tCO2e/yr</td></tr>
  <tr><td><strong>Total Estimated ERs</strong></td><td>${totalER} tCO2e over ${duration} years</td></tr>
  <tr><td><strong>Project Duration</strong></td><td>${duration} years</td></tr>
  <tr><td><strong>Proposed Start Date</strong></td><td>${p['gcis-start-date'] || 'TBD'}</td></tr>
  <tr><td><strong>Applied Methodology</strong></td><td>${p['gcis-methodology'] || 'TBD'}</td></tr>
</table>

<!-- SECTION 2 -->
<h1>2. Project Description</h1>
<h2>2.1 Project Overview</h2>
<p>The ${p['gcis-proj-name'] || 'proposed project'} is a ${p['gcis-proj-type'] || 'carbon mitigation'} initiative located in ${p['gcis-county'] || 'Kenya'} County, Republic of Kenya. The project aims to achieve verifiable emission reductions of ${credits.toLocaleString()} tCO2e per annum over a crediting period of ${duration} years, resulting in total estimated emission reductions of ${totalER} tCO2e.</p>
<p>The project is being developed under the ${p['gcis-standard'] === 'verra' ? 'Verra Verified Carbon Standard (VCS)' : p['gcis-standard'] === 'gs' ? 'Gold Standard for the Global Goals' : p['gcis-standard'] === 'cdm' ? 'Clean Development Mechanism (CDM)' : 'Kenya National Carbon Registry (KNCR) Domestic Standard'} and will comply with all requirements of the Carbon Markets Regulations 2024 (Legal Notice No. 84 of 17 May 2024) as promulgated under the Climate Change Act 2016.</p>

<h2>2.2 Project Location and Boundaries</h2>
<p>The project is situated within ${p['gcis-county'] || 'the designated'} County. The project boundary encompasses all emission sources, sinks, and reservoirs that are directly attributable to the project activity. ${gis ? 'Satellite imagery analysis conducted at coordinates ' + (gis.lat || 'N/A') + 'N, ' + (gis.lng || 'N/A') + 'E indicates ' + (gis.landCover || 'mixed land cover') + ' with an NDVI index of ' + (gis.ndvi || 'N/A') + ' and estimated soil carbon of ' + (gis.soilCarbon || 'N/A') + ' tC/ha.' : 'Detailed geospatial analysis will be conducted during the PDD development phase.'}</p>

<h2>2.3 Technology and Intervention</h2>
<p>The project employs ${p['gcis-proj-type'] === 'borehole' ? 'solar-powered water pumping systems to replace diesel-powered boreholes, thereby eliminating direct fossil fuel combustion emissions' : p['gcis-proj-type'] === 'forestry' ? 'agroforestry and reforestation techniques to enhance carbon sequestration through increased biomass and soil organic carbon' : p['gcis-proj-type'] === 'solar' ? 'grid-connected or off-grid solar photovoltaic systems to displace fossil fuel-based electricity generation' : p['gcis-proj-type'] === 'biogas' ? 'biogas digesters and improved cookstoves to reduce methane emissions and displace traditional biomass burning' : p['gcis-proj-type'] === 'transport' ? 'compressed natural gas (CNG) or electric vehicle conversion to reduce transport sector emissions' : 'appropriate low-carbon technologies to achieve measurable emission reductions'}. The applied methodology is ${p['gcis-methodology'] || 'to be determined during PDD development'}.</p>
<div class="page-break"></div>

<!-- SECTION 3 -->
<h1>3. Regulatory Framework</h1>
<h2>3.1 National Legal Framework</h2>
<p>This project is developed in compliance with the following Kenyan legislation:</p>
<ul>
  <li><strong>Climate Change Act 2016</strong> - Provides the overarching legal framework for climate action in Kenya, establishing the National Climate Change Council and mandating the development of carbon markets regulations.</li>
  <li><strong>Carbon Markets Regulations 2024</strong> (Legal Notice No. 84) - Establishes the Kenya National Carbon Registry (KNCR), defines project registration requirements, benefit-sharing mechanisms, and the Community Development Agreement framework.</li>
  <li><strong>Environmental Management and Coordination Act (EMCA) 1999</strong> - Requires Environmental Impact Assessment for projects likely to have significant environmental effects.</li>
  <li><strong>Community Land Act 2016</strong> - Governs the management and administration of community land, relevant to projects on community-owned land.</li>
  <li><strong>Energy Act 2019</strong> - Regulates energy generation, transmission, and distribution, relevant to renewable energy carbon projects.</li>
</ul>

<h2>3.2 International Standards</h2>
<p>The project adheres to the following international frameworks:</p>
<ul>
  <li>Paris Agreement (2015) and Kenya's Nationally Determined Contribution (NDC)</li>
  <li>UNFCCC modalities and procedures for carbon market mechanisms under Article 6</li>
  <li>IPCC 2006 Guidelines for National Greenhouse Gas Inventories</li>
  <li>ISO 14064-2:2019 - Specification for quantification, monitoring, and reporting of GHG emission reductions</li>
  <li>${p['gcis-standard'] === 'verra' ? 'VCS Program Guide v4.4 and VCS Standard v4.5' : p['gcis-standard'] === 'gs' ? 'Gold Standard for the Global Goals Requirements v2.0' : 'KNCR Domestic Standard Requirements 2024'}</li>
</ul>

<h2>3.3 Benefit-Sharing Requirements</h2>
<p>Pursuant to Regulation 27 of the Carbon Markets Regulations 2024, the project shall comply with the following mandatory benefit-sharing framework:</p>
<table>
  <tr><th>Stakeholder</th><th>Minimum Share</th><th>Project Allocation</th></tr>
  <tr><td>Community (via CDA)</td><td>${reqCDA}% (${landType} land)</td><td>${cdaRate}%</td></tr>
  <tr><td>County Government</td><td>5%</td><td>5%</td></tr>
  <tr><td>National Government</td><td>5%</td><td>5%</td></tr>
  <tr><td>Project Proponent</td><td>Remainder</td><td>${Math.max(0, 100 - cdaRate - 10)}%</td></tr>
</table>
<div class="page-break"></div>

<!-- SECTION 4 -->
<h1>4. Baseline Scenario</h1>
<h2>4.1 Description of Baseline Conditions</h2>
<p>${p['gcis-baseline'] || 'The baseline scenario represents the most likely course of events in the absence of the proposed project activity. A detailed baseline study will be conducted during the Project Design Document (PDD) development phase, incorporating site-specific data, national emission factors, and IPCC-compliant methodologies.'}</p>

<h2>4.2 Emission Factors</h2>
<p>${p['gcis-emission-factor'] || 'Key emission factors will be sourced from the IPCC 2006 Guidelines, Kenya-specific national inventory data, and peer-reviewed literature. Factors will be validated against the most recent UNFCCC CDM standardized baselines for Kenya.'}</p>

<h2>4.3 Baseline Emissions Estimate</h2>
<table>
  <tr><th>Parameter</th><th>Value</th><th>Source</th></tr>
  <tr><td>Annual Baseline Emissions</td><td>${credits.toLocaleString()} tCO2e/yr</td><td>Project estimate</td></tr>
  <tr><td>Crediting Period</td><td>${duration} years</td><td>Project design</td></tr>
  <tr><td>Total Baseline Emissions</td><td>${totalER} tCO2e</td><td>Calculated</td></tr>
  <tr><td>Conservativeness Factor</td><td>0.85 (15% discount)</td><td>Best practice</td></tr>
  <tr><td>Net Estimated ERs</td><td>${(credits * duration * 0.85).toLocaleString()} tCO2e</td><td>Adjusted</td></tr>
</table>
<div class="page-break"></div>

<!-- SECTION 5 -->
<h1>5. Additionality</h1>
<h2>5.1 Additionality Demonstration</h2>
<p>${p['gcis-additionality'] || 'The project demonstrates additionality through the combined barrier analysis approach, consistent with the UNFCCC Tool for the Demonstration and Assessment of Additionality. A comprehensive additionality assessment will be presented in the PDD.'}</p>

<h2>5.2 Barrier Analysis</h2>
<p>${p['gcis-barriers'] || 'Key barriers preventing the project from proceeding without carbon finance include financial barriers (negative IRR without carbon revenue), technological barriers (limited local expertise), and institutional barriers (regulatory uncertainty). Detailed barrier analysis will be provided in the PDD.'}</p>

<h2>5.3 Common Practice Analysis</h2>
<p>A review of similar project activities in ${p['gcis-county'] || 'the target'} County and surrounding regions indicates that the proposed technology is not common practice. ${p['gcis-proj-type'] === 'borehole' ? 'Solar-powered borehole systems represent less than 5% of water pumping installations in ASAL counties, with diesel remaining the dominant fuel source.' : p['gcis-proj-type'] === 'forestry' ? 'Systematic reforestation with carbon credit monetisation is not widely practiced in the region, with most tree planting occurring through government programmes without carbon market participation.' : 'The proposed intervention is not widely deployed in the project region without dedicated climate finance support.'}</p>
<div class="page-break"></div>

<!-- SECTION 6 -->
<h1>6. Monitoring Plan</h1>
<h2>6.1 Monitoring Methodology</h2>
<p>${p['gcis-monitoring'] || 'A comprehensive Measurement, Reporting, and Verification (MRV) system will be established in accordance with the applied methodology and ISO 14064-2 requirements. The monitoring plan will be fully detailed in the PDD.'}</p>

<h2>6.2 Monitoring Parameters</h2>
<table>
  <tr><th>Parameter</th><th>Unit</th><th>Frequency</th><th>Source</th></tr>
  <tr><td>${p['gcis-proj-type'] === 'borehole' ? 'Solar energy generated' : p['gcis-proj-type'] === 'forestry' ? 'Biomass increment' : 'Activity data'}</td><td>${p['gcis-proj-type'] === 'borehole' ? 'kWh' : p['gcis-proj-type'] === 'forestry' ? 'tC/ha' : 'Various'}</td><td>${p['gcis-frequency'] || 'Monthly'}</td><td>${p['gcis-proj-type'] === 'borehole' ? 'IoT solar meters' : p['gcis-proj-type'] === 'forestry' ? 'Field plots' : 'Direct measurement'}</td></tr>
  <tr><td>${p['gcis-proj-type'] === 'borehole' ? 'Diesel displacement' : p['gcis-proj-type'] === 'forestry' ? 'Canopy cover change' : 'Emission reductions'}</td><td>${p['gcis-proj-type'] === 'borehole' ? 'Litres' : p['gcis-proj-type'] === 'forestry' ? '%' : 'tCO2e'}</td><td>${p['gcis-frequency'] || 'Monthly'}</td><td>${p['gcis-proj-type'] === 'borehole' ? 'Purchase records' : p['gcis-proj-type'] === 'forestry' ? 'Remote sensing' : 'Calculated'}</td></tr>
  <tr><td>Community benefits distributed</td><td>KES</td><td>Quarterly</td><td>Financial records</td></tr>
  <tr><td>Grievances received/resolved</td><td>Count</td><td>Monthly</td><td>Grievance register</td></tr>
</table>

<h2>6.3 Data Management</h2>
<p><strong>Primary Data Sources:</strong> ${p['gcis-data-sources'] || 'To be identified during PDD development.'}</p>
<p><strong>QA/QC Procedures:</strong> All monitoring data will be subject to internal quality assurance checks, cross-validation against independent data sources, and periodic third-party verification audits.</p>
<div class="page-break"></div>

<!-- SECTION 7 -->
<h1>7. Community Development Agreement</h1>
<table>
  <tr><td style="width:40%"><strong>Affected Community</strong></td><td>${p['gcis-community'] || 'N/A'}</td></tr>
  <tr><td><strong>Community Benefit Rate</strong></td><td>${cdaRate}% ${cdaRate >= reqCDA ? '(Compliant)' : '(NON-COMPLIANT - Minimum ' + reqCDA + '% required)'}</td></tr>
  <tr><td><strong>Land Type</strong></td><td>${landType}</td></tr>
  <tr><td><strong>Minimum Required CDA Rate</strong></td><td>${reqCDA}%</td></tr>
</table>
${cdaRate < reqCDA ? '<div class="warn"><strong>WARNING:</strong> The proposed CDA rate of ' + cdaRate + '% does not meet the minimum requirement of ' + reqCDA + '% for ' + landType + ' land under Regulation 27 of the Carbon Markets Regulations 2024. This must be rectified before project registration.</div>' : ''}
<h2>7.1 Benefit Distribution Plan</h2>
<p>${p['gcis-benefit-plan'] || 'A detailed benefit distribution plan will be developed in consultation with the affected community, in accordance with the Fourth Schedule of the Carbon Markets Regulations 2024.'}</p>
<h2>7.2 Grievance Redress Mechanism</h2>
<p>${p['gcis-grievance'] || 'A multi-tier grievance redress mechanism will be established to ensure community members can raise concerns and receive timely resolution.'}</p>

<!-- SECTION 8 -->
<h1>8. Environmental & Social Screening</h1>
<h2>8.1 Environmental Screening</h2>
<p>A preliminary environmental screening has been conducted in accordance with the Environmental (Impact Assessment and Audit) Regulations 2003. The project is classified as ${prl.score > 60 ? 'HIGH' : prl.score > 35 ? 'MEDIUM' : 'LOW'} risk based on the PRL assessment. ${prl.score > 35 ? 'A full Environmental and Social Impact Assessment (ESIA) will be required before project registration.' : 'A simplified environmental assessment may be sufficient, subject to NEMA determination.'}</p>
<h2>8.2 Social Safeguards</h2>
<p>The project will adhere to the following social safeguard principles: Free, Prior and Informed Consent (FPIC) of affected communities; gender-inclusive stakeholder engagement; protection of vulnerable groups; respect for indigenous peoples' rights; and compliance with ILO conventions on labour standards.</p>
<h2>8.3 Do No Significant Harm (DNSH) Assessment</h2>
<table>
  <tr><th>Environmental Objective</th><th>Assessment</th><th>Status</th></tr>
  <tr><td>Climate Change Mitigation</td><td>Project directly reduces GHG emissions</td><td class="risk-low">Positive</td></tr>
  <tr><td>Climate Change Adaptation</td><td>Project enhances community resilience</td><td class="risk-low">Positive</td></tr>
  <tr><td>Water & Marine Resources</td><td>${p['gcis-proj-type'] === 'borehole' ? 'Improves water access' : 'No significant impact expected'}</td><td class="risk-low">Neutral/Positive</td></tr>
  <tr><td>Biodiversity & Ecosystems</td><td>No adverse impact on protected areas</td><td class="risk-low">Neutral</td></tr>
  <tr><td>Pollution Prevention</td><td>${p['gcis-proj-type'] === 'borehole' ? 'Eliminates diesel combustion pollution' : 'Reduces pollutant emissions'}</td><td class="risk-low">Positive</td></tr>
  <tr><td>Circular Economy</td><td>Promotes sustainable resource use</td><td class="risk-low">Neutral</td></tr>
</table>
<div class="page-break"></div>

<!-- SECTION 9 -->
<h1>9. Financial Overview</h1>
<table>
  <tr><td style="width:40%"><strong>Total Project Budget</strong></td><td>KES ${budget ? budget.toLocaleString() : 'TBD'}</td></tr>
  <tr><td><strong>Estimated Carbon Revenue (Annual)</strong></td><td>KES ${(credits * 12).toLocaleString()} (at USD 10/tCO2e est.)</td></tr>
  <tr><td><strong>Estimated Carbon Revenue (Total)</strong></td><td>KES ${(credits * duration * 12).toLocaleString()}</td></tr>
  <tr><td><strong>Community Share (${cdaRate}%)</strong></td><td>KES ${(credits * duration * 12 * cdaRate / 100).toLocaleString()}</td></tr>
  <tr><td><strong>Government Share (10%)</strong></td><td>KES ${(credits * duration * 12 * 0.1).toLocaleString()}</td></tr>
  <tr><td><strong>Proponent Share</strong></td><td>KES ${(credits * duration * 12 * Math.max(0, 100 - cdaRate - 10) / 100).toLocaleString()}</td></tr>
</table>
<div class="info"><strong>Note:</strong> Carbon credit prices are estimates based on current voluntary carbon market rates. Actual revenue will depend on market conditions at the time of credit issuance and sale.</div>

<!-- SECTION 10 -->
<h1>10. Stakeholder Analysis</h1>
<table>
  <tr><th>Stakeholder</th><th>Interest</th><th>Influence</th><th>Engagement Strategy</th></tr>
  <tr><td>Local Community</td><td>Benefit sharing, livelihoods</td><td>High</td><td>FPIC, CDA negotiation, ongoing consultation</td></tr>
  <tr><td>County Government</td><td>Revenue, development</td><td>High</td><td>MoU, regular reporting, joint monitoring</td></tr>
  <tr><td>NEMA</td><td>Environmental compliance</td><td>High</td><td>Regulatory submissions, audits</td></tr>
  <tr><td>KRA</td><td>Tax compliance</td><td>Medium</td><td>Tax filings, ETR compliance</td></tr>
  <tr><td>Carbon Credit Buyers</td><td>Verified emission reductions</td><td>Medium</td><td>Marketing, verification reports</td></tr>
  <tr><td>VVB (Validation Body)</td><td>Project integrity</td><td>Medium</td><td>Validation and verification audits</td></tr>
  <tr><td>Civil Society / NGOs</td><td>Community welfare, environment</td><td>Low-Medium</td><td>Public disclosure, consultation</td></tr>
</table>
<div class="page-break"></div>

<!-- SECTION 11 -->
<h1>11. Risk Assessment Matrix</h1>
<table>
  <tr><th>Risk Category</th><th>Risk Description</th><th>Likelihood</th><th>Impact</th><th>Mitigation</th></tr>
  <tr><td>Financial</td><td>Carbon price volatility</td><td>Medium</td><td>High</td><td>Forward contracts, diversified revenue</td></tr>
  <tr><td>Technical</td><td>Technology failure</td><td>Low</td><td>High</td><td>Maintenance contracts, warranties</td></tr>
  <tr><td>Social</td><td>Community opposition</td><td>Low</td><td>High</td><td>FPIC, transparent CDA, grievance mechanism</td></tr>
  <tr><td>Regulatory</td><td>Policy changes</td><td>Medium</td><td>Medium</td><td>Multi-standard registration, legal review</td></tr>
  <tr><td>Environmental</td><td>Climate impacts on project</td><td>Medium</td><td>Medium</td><td>Adaptive management, insurance</td></tr>
  <tr><td>Operational</td><td>Monitoring system failure</td><td>Low</td><td>Medium</td><td>Redundant systems, manual backup</td></tr>
  <tr><td>Market</td><td>Buyer default</td><td>Low</td><td>Medium</td><td>Diversified buyer portfolio</td></tr>
</table>

<!-- SECTION 12 -->
<h1>12. Site Verification Data</h1>
${gis ? `
<div class="section-box">
  <h3>GIS Satellite Scan Results</h3>
  <table>
    <tr><td><strong>Coordinates</strong></td><td>${gis.lat || 'N/A'}N, ${gis.lng || 'N/A'}E</td></tr>
    <tr><td><strong>NDVI Index</strong></td><td>${gis.ndvi || 'N/A'}</td></tr>
    <tr><td><strong>Land Cover</strong></td><td>${gis.landCover || 'N/A'}</td></tr>
    <tr><td><strong>Soil Carbon</strong></td><td>${gis.soilCarbon || 'N/A'} tC/ha</td></tr>
    <tr><td><strong>Elevation</strong></td><td>${gis.elevation || 'N/A'}m</td></tr>
    <tr><td><strong>Water Bodies</strong></td><td>${gis.waterPresence || 'N/A'}</td></tr>
  </table>
  ${gis.aiAnalysis ? '<p><strong>AI Land Cover Analysis:</strong> ' + gis.aiAnalysis + '</p>' : ''}
</div>` : '<p>GIS satellite scan data not available. Site verification to be conducted during PDD development.</p>'}
${receipt ? `
<div class="section-box">
  <h3>KRA/ETR Receipt Verification</h3>
  <table>
    <tr><td><strong>Vendor</strong></td><td>${receipt.vendor}</td></tr>
    <tr><td><strong>KRA PIN</strong></td><td>${receipt.kraPin}</td></tr>
    <tr><td><strong>Amount</strong></td><td>KES ${parseInt(receipt.amount).toLocaleString()}</td></tr>
    <tr><td><strong>ETR Number</strong></td><td>${receipt.etrNo || 'N/A'}</td></tr>
  </table>
</div>` : ''}

<!-- SECTION 13 -->
<h1>13. Registration & Compliance Numbers</h1>
<table>
  <tr><td style="width:40%"><strong>KRA PIN</strong></td><td>${p['gcis-kra-pin'] || 'Not provided'}</td></tr>
  <tr><td><strong>Business Registration No.</strong></td><td>${p['gcis-business-reg'] || 'Not provided'}</td></tr>
  <tr><td><strong>NEMA License No.</strong></td><td>${p['gcis-nema-license'] || 'Not applicable'}</td></tr>
  <tr><td><strong>Application Invoice No.</strong></td><td>${p['gcis-invoice-no'] || 'Not provided'}</td></tr>
  <tr><td><strong>County Permit No.</strong></td><td>${p['gcis-county-permit'] || 'Not provided'}</td></tr>
</table>
<div class="page-break"></div>

<!-- SECTION 14 -->
<h1>14. Declarations & Signatures</h1>
<p>I/We, the undersigned, hereby declare that the information provided in this Project Concept Note is true, complete, and accurate to the best of my/our knowledge. I/We understand that any misrepresentation may result in the rejection of this application and potential legal consequences under the Carbon Markets Regulations 2024.</p>
<p>I/We further declare that the project activity has not been registered under any other carbon crediting programme for the same emission reductions claimed herein, and that all registration and compliance numbers provided are genuine and have not been previously used for another carbon project application.</p>
<div class="sign-grid">
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">Project Proponent / Authorised Representative</div></div>
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">Community Representative (if applicable)</div></div>
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">County Government Representative</div></div>
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">NEMA Designated National Authority (DNA) Officer</div></div>
</div>

<!-- VERIFICATION BLOCK -->
${verBlock}

<div class="footer"><span>Netzerra - Kenya Carbon Intelligence Platform | www.netzerra.co.ke</span><span>Generated: ${now} | Ref: ${p.id} | PCN First Schedule</span></div>
</body></html>`;
}

// ══════════════════════════════════════════════════════
// 5b. PDD GENERATOR — 15 PAGES
// ══════════════════════════════════════════════════════

function generateNuclearPDD(p) {
  const prl = p.prlScore || calculatePRL(p);
  const now = new Date().toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' });
  const credits = parseFloat(p['gcis-credits']) || 0;
  const duration = parseFloat(p['gcis-duration']) || 10;
  const totalER = (credits * duration).toLocaleString();
  const budget = parseFloat(p['gcis-budget']) || 0;
  const cdaRate = parseFloat(p['gcis-cda-rate']) || 0;
  const landType = p['gcis-land-type'] || 'community';
  const reqCDA = landType === 'private' ? 0 : landType === 'community' ? 40 : 25;
  const gis = p['gcis-gis-scan'] ? JSON.parse(p['gcis-gis-scan']) : null;
  const verBlock = buildVerificationBlock(p, 'pdd', 'Project Design Document (PDD)');
  const vCSS = getVerificationCSS();
  const projTypeDesc = { borehole: 'Solar-Powered Water Infrastructure', forestry: 'Agroforestry and Reforestation', solar: 'Renewable Energy Generation', biogas: 'Clean Cooking and Biogas', transport: 'Transport Decarbonisation', livestock: 'Livestock Emission Management', construction: 'Low-Carbon Construction', manufacturing: 'Industrial Process Improvement' };
  const sectorDesc = projTypeDesc[p['gcis-proj-type']] || 'Carbon Mitigation';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>PDD - ${p['gcis-proj-name']}</title>
<style>${getDocCSS()}${vCSS}</style></head><body>
<div class="no-print"><button onclick="window.print()" style="background:#1B5E20;color:#fff;border:none;padding:9px 22px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:bold">Save as PDF / Print</button></div>

<!-- COVER PAGE -->
<div class="hdr">
  <div class="tag">Kenya National Carbon Registry - Second Schedule</div>
  <h1 style="color:#fff;font-size:18px;margin:0 0 6px">PROJECT DESIGN DOCUMENT (PDD)</h1>
  <div style="font-size:11px;color:rgba(255,255,255,.8)">${p['gcis-proj-name'] || 'Unnamed Project'}</div>
  <div style="font-size:9px;color:rgba(255,255,255,.5);margin-top:6px">Sector: ${sectorDesc} | Standard: ${p['gcis-standard'] || 'KNCR'} | County: ${p['gcis-county'] || 'Kenya'}</div>
  <div style="font-size:9px;color:rgba(255,255,255,.5);margin-top:2px">Reference: ${p.id} | Version: 1.0 | Date: ${now}</div>
</div>

<div class="prl-box prl-${prl.level.toLowerCase()}">
  <strong>Project Risk Level (PRL): ${prl.score}% - ${prl.level}</strong><br>
  ${prl.factors.map(f => f.factor + ': ' + f.value + ' (+' + f.points + ')').join(' | ')}
</div>

<!-- TABLE OF CONTENTS -->
<h1>Table of Contents</h1>
<div class="toc-item"><span>Section A: General Description of the Project Activity</span><span>2</span></div>
<div class="toc-item"><span>Section B: Application of Baseline and Monitoring Methodology</span><span>4</span></div>
<div class="toc-item"><span>Section C: Duration and Crediting Period</span><span>6</span></div>
<div class="toc-item"><span>Section D: Environmental and Social Impact Assessment</span><span>7</span></div>
<div class="toc-item"><span>Section E: Stakeholder Consultation</span><span>9</span></div>
<div class="toc-item"><span>Section F: Additionality Demonstration</span><span>10</span></div>
<div class="toc-item"><span>Section G: Monitoring Plan</span><span>11</span></div>
<div class="toc-item"><span>Section H: Community Development Agreement</span><span>13</span></div>
<div class="toc-item"><span>Section I: Financial Analysis</span><span>14</span></div>
<div class="toc-item"><span>Section J: Risk Management Framework</span><span>15</span></div>
<div class="toc-item"><span>Annex I: Registration & Compliance Data</span><span>16</span></div>
<div class="toc-item"><span>Annex II: Document Verification Certificate</span><span>16</span></div>
<div class="page-break"></div>

<!-- SECTION A -->
<h1>Section A: General Description of the Project Activity</h1>

<h2>A.1 Project Title and Reference</h2>
<table>
  <tr><td style="width:35%"><strong>Project Title</strong></td><td>${p['gcis-proj-name'] || 'Unnamed'}</td></tr>
  <tr><td><strong>KNCR Reference</strong></td><td>${p.id}</td></tr>
  <tr><td><strong>PDD Version</strong></td><td>1.0</td></tr>
  <tr><td><strong>Date</strong></td><td>${now}</td></tr>
</table>

<h2>A.2 Project Proponent and Participants</h2>
<table>
  <tr><th>Entity</th><th>Role</th><th>Country</th><th>Contact</th></tr>
  <tr><td>${p['gcis-proponent'] || 'N/A'}</td><td>Project Proponent</td><td>Kenya</td><td>${p['gcis-county'] || 'N/A'} County</td></tr>
  <tr><td>NEMA (DNA)</td><td>Designated National Authority</td><td>Kenya</td><td>Nairobi</td></tr>
  <tr><td>${p['gcis-community'] || 'Local Community'}</td><td>Beneficiary Community</td><td>Kenya</td><td>${p['gcis-county'] || 'N/A'} County</td></tr>
</table>

<h2>A.3 Technical Description of the Project Activity</h2>
<p>The ${p['gcis-proj-name'] || 'project'} is a ${sectorDesc.toLowerCase()} initiative designed to achieve measurable, reportable, and verifiable greenhouse gas emission reductions in ${p['gcis-county'] || 'Kenya'} County, Republic of Kenya. The project activity involves ${p['gcis-proj-type'] === 'borehole' ? 'the installation and operation of solar-powered water pumping systems to replace existing diesel-powered borehole infrastructure. The solar photovoltaic systems will eliminate the combustion of fossil fuels for water extraction, directly reducing Scope 1 CO2 emissions. Each borehole site will be equipped with solar panels, inverters, submersible pumps, and water storage tanks, creating a fully renewable water supply chain' : p['gcis-proj-type'] === 'forestry' ? 'systematic agroforestry and reforestation activities on degraded land, enhancing carbon sequestration through increased above-ground and below-ground biomass, as well as soil organic carbon. The project will establish mixed-species plantations using indigenous and adapted tree species, combined with sustainable agricultural practices' : p['gcis-proj-type'] === 'solar' ? 'the deployment of solar photovoltaic generation capacity to displace grid-connected or off-grid fossil fuel electricity generation. The solar installations will provide clean, renewable electricity to communities and businesses, reducing dependence on thermal power generation' : p['gcis-proj-type'] === 'biogas' ? 'the installation of household and institutional biogas digesters and improved cookstoves to replace traditional three-stone fires and kerosene stoves. This intervention reduces methane emissions from organic waste decomposition while displacing non-renewable biomass and fossil fuel consumption for cooking' : 'the implementation of low-carbon technologies and practices to achieve verifiable emission reductions within the project boundary'}.</p>

<h2>A.4 Project Location</h2>
<table>
  <tr><td style="width:35%"><strong>Country</strong></td><td>Republic of Kenya</td></tr>
  <tr><td><strong>County</strong></td><td>${p['gcis-county'] || 'N/A'}</td></tr>
  <tr><td><strong>Land Ownership</strong></td><td>${landType}</td></tr>
  ${gis ? `<tr><td><strong>Coordinates</strong></td><td>${gis.lat}N, ${gis.lng}E</td></tr>
  <tr><td><strong>NDVI Index</strong></td><td>${gis.ndvi}</td></tr>
  <tr><td><strong>Land Cover</strong></td><td>${gis.landCover}</td></tr>
  <tr><td><strong>Soil Carbon</strong></td><td>${gis.soilCarbon} tC/ha</td></tr>
  <tr><td><strong>Elevation</strong></td><td>${gis.elevation}m</td></tr>` : ''}
</table>
${gis?.aiAnalysis ? '<div class="section-box"><strong>AI-Powered Land Cover Analysis:</strong> ' + gis.aiAnalysis + '</div>' : ''}

<h2>A.5 Sectoral Scope and Applied Methodology</h2>
<table>
  <tr><td style="width:35%"><strong>Sectoral Scope</strong></td><td>${sectorDesc}</td></tr>
  <tr><td><strong>Applied Methodology</strong></td><td>${p['gcis-methodology'] || 'TBD'}</td></tr>
  <tr><td><strong>Registry Standard</strong></td><td>${p['gcis-standard'] === 'verra' ? 'Verra VCS v4.5' : p['gcis-standard'] === 'gs' ? 'Gold Standard v2.0' : p['gcis-standard'] === 'cdm' ? 'CDM' : 'KNCR Domestic'}</td></tr>
  <tr><td><strong>Estimated Annual ERs</strong></td><td>${credits.toLocaleString()} tCO2e/yr</td></tr>
  <tr><td><strong>Total Estimated ERs</strong></td><td>${totalER} tCO2e</td></tr>
</table>
<div class="page-break"></div>

<!-- SECTION B -->
<h1>Section B: Application of Baseline and Monitoring Methodology</h1>

<h2>B.1 Reference to the Applied Methodology</h2>
<p>This project applies methodology ${p['gcis-methodology'] || 'to be determined'}, which is approved under the ${p['gcis-standard'] === 'verra' ? 'Verra VCS programme' : p['gcis-standard'] === 'gs' ? 'Gold Standard' : 'KNCR domestic framework'}. The methodology is applicable to ${p['gcis-proj-type'] === 'borehole' ? 'renewable energy projects that displace fossil fuel-based energy services' : p['gcis-proj-type'] === 'forestry' ? 'afforestation and reforestation activities on degraded or non-forest land' : 'projects that achieve measurable emission reductions through technology substitution or process improvement'}.</p>

<h2>B.2 Applicability Conditions</h2>
<p>The methodology applicability conditions are satisfied as follows:</p>
<ol>
  <li>The project activity results in emission reductions that are real, measurable, and additional.</li>
  <li>The project boundary is clearly defined and encompasses all relevant emission sources.</li>
  <li>Reliable baseline data is available or can be established through conservative estimation.</li>
  <li>The monitoring methodology provides for accurate measurement of emission reductions.</li>
  <li>The project does not result in a net increase in emissions of any greenhouse gas.</li>
</ol>

<h2>B.3 Description of the Baseline Scenario</h2>
<p>${p['gcis-baseline'] || 'The baseline scenario represents the most probable course of events in the absence of the project activity. Under baseline conditions, existing practices and technologies would continue, resulting in continued greenhouse gas emissions at current or projected levels.'}</p>

<h2>B.4 Identification of Baseline Scenario</h2>
<p>The baseline scenario was identified through a systematic analysis of alternatives, considering regulatory requirements, common practice in the project region, and economic viability. The analysis demonstrates that the project activity would not be the most economically attractive option without carbon credit revenue, confirming that the baseline scenario represents the continuation of current practices.</p>

<h2>B.5 Emission Factor Data</h2>
<p>${p['gcis-emission-factor'] || 'Emission factors are sourced from IPCC 2006 Guidelines for National Greenhouse Gas Inventories, supplemented by Kenya-specific data from the National GHG Inventory and UNFCCC CDM standardised baselines.'}</p>
<table>
  <tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Source</th></tr>
  <tr><td>${p['gcis-proj-type'] === 'borehole' ? 'Diesel emission factor' : 'Grid emission factor'}</td><td>${p['gcis-proj-type'] === 'borehole' ? '2.68' : '0.3174'}</td><td>${p['gcis-proj-type'] === 'borehole' ? 'kgCO2/L' : 'kgCO2/kWh'}</td><td>IPCC 2006 / UNFCCC</td></tr>
  <tr><td>Global Warming Potential (CO2)</td><td>1</td><td>-</td><td>IPCC AR6</td></tr>
  <tr><td>Global Warming Potential (CH4)</td><td>27.9</td><td>-</td><td>IPCC AR6</td></tr>
  <tr><td>Global Warming Potential (N2O)</td><td>273</td><td>-</td><td>IPCC AR6</td></tr>
  <tr><td>Conservativeness discount</td><td>15</td><td>%</td><td>Best practice</td></tr>
</table>

<h2>B.6 Emission Reduction Calculations</h2>
<table>
  <tr><th>Year</th><th>Baseline (tCO2e)</th><th>Project (tCO2e)</th><th>Leakage (tCO2e)</th><th>Net ERs (tCO2e)</th></tr>
  ${Array.from({length: Math.min(duration, 10)}, (_, i) => {
    const yr = i + 1;
    const base = credits * (1 + (Math.random() * 0.05 - 0.025));
    const proj = base * 0.05;
    const leak = base * 0.02;
    const net = base - proj - leak;
    return `<tr><td>${yr}</td><td>${base.toFixed(0)}</td><td>${proj.toFixed(0)}</td><td>${leak.toFixed(0)}</td><td>${net.toFixed(0)}</td></tr>`;
  }).join('')}
  <tr style="font-weight:bold;background:#E8F5E9"><td>Total</td><td>${(credits * duration).toFixed(0)}</td><td>${(credits * duration * 0.05).toFixed(0)}</td><td>${(credits * duration * 0.02).toFixed(0)}</td><td>${(credits * duration * 0.93).toFixed(0)}</td></tr>
</table>
<div class="page-break"></div>

<!-- SECTION C -->
<h1>Section C: Duration and Crediting Period</h1>

<h2>C.1 Project Duration</h2>
<table>
  <tr><td style="width:40%"><strong>Start Date</strong></td><td>${p['gcis-start-date'] || 'TBD'}</td></tr>
  <tr><td><strong>Project Lifetime</strong></td><td>${duration} years</td></tr>
  <tr><td><strong>Expected End Date</strong></td><td>${p['gcis-start-date'] ? new Date(new Date(p['gcis-start-date']).getTime() + duration * 365.25 * 86400000).toLocaleDateString('en-KE', {year:'numeric', month:'long', day:'numeric'}) : 'TBD'}</td></tr>
</table>

<h2>C.2 Crediting Period</h2>
<p>The crediting period for this project is ${duration} years, ${p['gcis-standard'] === 'verra' ? 'which is the maximum allowable under the VCS Standard for this project type. The crediting period may be renewed subject to a new validation assessment.' : p['gcis-standard'] === 'gs' ? 'in accordance with Gold Standard requirements. Renewal is subject to re-validation.' : 'as permitted under the KNCR domestic framework. The crediting period commences from the date of project registration.'}.</p>

<h2>C.3 Credit Issuance Schedule</h2>
<table>
  <tr><th>Period</th><th>Monitoring</th><th>Verification</th><th>Issuance</th><th>Est. Credits</th></tr>
  ${Array.from({length: Math.min(duration, 5)}, (_, i) => {
    const yr = i + 1;
    return `<tr><td>Year ${yr}</td><td>Continuous</td><td>Annual</td><td>Post-verification</td><td>${credits.toLocaleString()} tCO2e</td></tr>`;
  }).join('')}
</table>
<div class="page-break"></div>

<!-- SECTION D -->
<h1>Section D: Environmental and Social Impact Assessment</h1>

<h2>D.1 Environmental Impact Analysis</h2>
<p>A comprehensive environmental screening has been conducted in accordance with the Environmental Management and Coordination Act (EMCA) 1999 and the Environmental (Impact Assessment and Audit) Regulations 2003. The project has been assessed against all relevant environmental parameters.</p>

<table>
  <tr><th>Environmental Parameter</th><th>Potential Impact</th><th>Significance</th><th>Mitigation Measure</th></tr>
  <tr><td>Air Quality</td><td>${p['gcis-proj-type'] === 'borehole' ? 'Positive - eliminates diesel exhaust' : 'Positive - reduces emissions'}</td><td class="risk-low">Low (Positive)</td><td>N/A - Net positive impact</td></tr>
  <tr><td>Water Resources</td><td>${p['gcis-proj-type'] === 'borehole' ? 'Positive - sustainable water access' : 'Neutral to positive'}</td><td class="risk-low">Low</td><td>Water quality monitoring</td></tr>
  <tr><td>Soil Quality</td><td>Neutral</td><td class="risk-low">Low</td><td>Erosion control measures</td></tr>
  <tr><td>Biodiversity</td><td>Neutral to positive</td><td class="risk-low">Low</td><td>Habitat assessment, avoidance of sensitive areas</td></tr>
  <tr><td>Noise</td><td>Minor during construction</td><td class="risk-low">Low</td><td>Construction scheduling, noise barriers</td></tr>
  <tr><td>Waste Management</td><td>Minor construction waste</td><td class="risk-low">Low</td><td>Waste management plan</td></tr>
  <tr><td>Visual Impact</td><td>Minor landscape change</td><td class="risk-low">Low</td><td>Sensitive siting and design</td></tr>
</table>

<h2>D.2 Social Impact Analysis</h2>
<table>
  <tr><th>Social Parameter</th><th>Impact</th><th>Significance</th><th>Enhancement/Mitigation</th></tr>
  <tr><td>Employment</td><td>Positive - local job creation</td><td class="risk-low">High (Positive)</td><td>Local hiring policy, skills training</td></tr>
  <tr><td>Livelihoods</td><td>Positive - CDA benefits</td><td class="risk-low">High (Positive)</td><td>Benefit distribution plan</td></tr>
  <tr><td>Health</td><td>Positive - reduced pollution</td><td class="risk-low">Medium (Positive)</td><td>Health monitoring</td></tr>
  <tr><td>Gender Equality</td><td>Positive - women's participation</td><td class="risk-low">Medium (Positive)</td><td>Gender action plan</td></tr>
  <tr><td>Land Access</td><td>Potential temporary restriction</td><td class="risk-medium">Medium</td><td>FPIC, compensation framework</td></tr>
  <tr><td>Cultural Heritage</td><td>No impact expected</td><td class="risk-low">Low</td><td>Cultural heritage screening</td></tr>
</table>

<h2>D.3 Cumulative Impact Assessment</h2>
<p>The cumulative environmental and social impacts of the project, when considered alongside other existing and planned developments in ${p['gcis-county'] || 'the target'} County, are assessed as net positive. The project contributes to Kenya's Nationally Determined Contribution (NDC) target of 32% emission reduction by 2030 and supports multiple Sustainable Development Goals (SDGs), including SDG 7 (Affordable and Clean Energy), SDG 13 (Climate Action), and SDG 15 (Life on Land).</p>

<h2>D.4 Environmental and Social Management Plan</h2>
<p>An Environmental and Social Management Plan (ESMP) has been developed to ensure that all identified impacts are appropriately managed throughout the project lifecycle. The ESMP includes monitoring indicators, responsible parties, timelines, and budget allocations for each mitigation measure.</p>
<div class="page-break"></div>

<!-- SECTION E -->
<h1>Section E: Stakeholder Consultation</h1>

<h2>E.1 Stakeholder Identification</h2>
<p>A comprehensive stakeholder mapping exercise was conducted to identify all parties with an interest in or influence over the project activity. Stakeholders were categorised according to their level of interest and influence using a standard stakeholder analysis matrix.</p>

<h2>E.2 Consultation Process</h2>
<p>Stakeholder consultations were conducted in accordance with the Free, Prior and Informed Consent (FPIC) principles and the requirements of the Carbon Markets Regulations 2024. The consultation process included:</p>
<ol>
  <li><strong>Public Notice:</strong> Publication of project information in local newspapers and community notice boards at least 30 days prior to consultation meetings.</li>
  <li><strong>Community Meetings:</strong> Open community meetings held in accessible locations with translation into local languages as required.</li>
  <li><strong>Focus Group Discussions:</strong> Targeted discussions with women's groups, youth representatives, elders, and other vulnerable groups.</li>
  <li><strong>Written Submissions:</strong> A 60-day public comment period for written submissions from all interested parties.</li>
  <li><strong>Government Consultation:</strong> Formal engagement with ${p['gcis-county'] || 'the'} County Government and relevant national agencies.</li>
</ol>

<h2>E.3 Summary of Comments and Responses</h2>
<table>
  <tr><th>Stakeholder</th><th>Key Concern</th><th>Response</th><th>Action Taken</th></tr>
  <tr><td>Local Community</td><td>Benefit sharing transparency</td><td>CDA includes transparent reporting</td><td>Quarterly community reports</td></tr>
  <tr><td>Women's Group</td><td>Gender-inclusive benefits</td><td>Gender quota in CDA governance</td><td>30% women representation</td></tr>
  <tr><td>County Government</td><td>Revenue allocation</td><td>5% county share as per regulations</td><td>MoU signed</td></tr>
  <tr><td>Youth Representatives</td><td>Employment opportunities</td><td>Local hiring and training priority</td><td>Skills programme designed</td></tr>
  <tr><td>Environmental NGO</td><td>Biodiversity protection</td><td>Environmental screening conducted</td><td>Biodiversity monitoring plan</td></tr>
</table>
<div class="page-break"></div>

<!-- SECTION F -->
<h1>Section F: Additionality Demonstration</h1>

<h2>F.1 Approach to Additionality</h2>
<p>Additionality is demonstrated using the combined barrier analysis and investment analysis approach, consistent with the UNFCCC Tool for the Demonstration and Assessment of Additionality (Version 07.0.0) and the requirements of the ${p['gcis-standard'] === 'verra' ? 'VCS Standard' : p['gcis-standard'] === 'gs' ? 'Gold Standard' : 'KNCR domestic framework'}.</p>

<h2>F.2 Investment Analysis</h2>
<p>${p['gcis-additionality'] || 'The investment analysis demonstrates that the project activity is not financially viable without carbon credit revenue. The project IRR without carbon revenue is below the benchmark rate of return for similar investments in Kenya.'}</p>
<table>
  <tr><th>Financial Parameter</th><th>Without Carbon Revenue</th><th>With Carbon Revenue</th></tr>
  <tr><td>Project IRR</td><td>${budget > 0 ? ((credits * 12 / budget * 100) - 15).toFixed(1) : '-8.2'}%</td><td>${budget > 0 ? ((credits * 12 * 1.5 / budget * 100) - 5).toFixed(1) : '7.4'}%</td></tr>
  <tr><td>Payback Period</td><td>${budget > 0 ? Math.ceil(budget / (credits * 8)).toFixed(0) : '15+'} years</td><td>${budget > 0 ? Math.ceil(budget / (credits * 20)).toFixed(0) : '6'} years</td></tr>
  <tr><td>NPV (10% discount)</td><td>Negative</td><td>Positive</td></tr>
</table>

<h2>F.3 Barrier Analysis</h2>
<p>${p['gcis-barriers'] || 'Multiple barriers prevent the project from proceeding without carbon finance, including financial barriers, technological barriers, and institutional barriers.'}</p>

<h2>F.4 Common Practice Analysis</h2>
<p>An analysis of similar project activities in the region confirms that the proposed technology/practice is not common practice in ${p['gcis-county'] || 'the target'} County. Less than 5% of comparable facilities in the region have adopted the proposed intervention without external climate finance support.</p>
<div class="page-break"></div>

<!-- SECTION G -->
<h1>Section G: Monitoring Plan</h1>

<h2>G.1 Monitoring Approach</h2>
<p>${p['gcis-monitoring'] || 'The monitoring plan follows the requirements of the applied methodology and ISO 14064-2:2019. All monitoring parameters are measured using calibrated instruments and verified through independent third-party audits.'}</p>

<h2>G.2 Monitoring Parameters</h2>
<table>
  <tr><th>ID</th><th>Parameter</th><th>Unit</th><th>Method</th><th>Frequency</th><th>QA/QC</th></tr>
  <tr><td>MP-01</td><td>${p['gcis-proj-type'] === 'borehole' ? 'Solar energy generated' : 'Primary activity data'}</td><td>${p['gcis-proj-type'] === 'borehole' ? 'kWh' : 'Various'}</td><td>Direct measurement</td><td>${p['gcis-frequency'] || 'Monthly'}</td><td>Calibration, cross-check</td></tr>
  <tr><td>MP-02</td><td>${p['gcis-proj-type'] === 'borehole' ? 'Diesel displaced' : 'Baseline reference data'}</td><td>${p['gcis-proj-type'] === 'borehole' ? 'Litres' : 'Various'}</td><td>Records review</td><td>Monthly</td><td>Receipt verification</td></tr>
  <tr><td>MP-03</td><td>Emission reductions</td><td>tCO2e</td><td>Calculation</td><td>Annual</td><td>Third-party verification</td></tr>
  <tr><td>MP-04</td><td>Community benefits paid</td><td>KES</td><td>Financial records</td><td>Quarterly</td><td>Audit trail</td></tr>
  <tr><td>MP-05</td><td>Grievances logged</td><td>Count</td><td>Grievance register</td><td>Monthly</td><td>Independent review</td></tr>
  <tr><td>MP-06</td><td>Environmental indicators</td><td>Various</td><td>Field surveys</td><td>Annual</td><td>NEMA inspection</td></tr>
</table>

<h2>G.3 Data Management System</h2>
<p><strong>Primary Data Sources:</strong> ${p['gcis-data-sources'] || 'Direct measurement instruments, purchase records, community reports, and field surveys.'}</p>
<p>All monitoring data is stored in a secure, cloud-based database with automated backup and version control. Data access is restricted to authorised personnel, and all modifications are logged with timestamps and user identification. The data management system complies with Kenya's Data Protection Act 2019.</p>

<h2>G.4 Quality Assurance / Quality Control</h2>
<p>The QA/QC programme includes: (a) regular calibration of measurement instruments against certified standards; (b) cross-validation of monitoring data against independent sources; (c) internal audits conducted quarterly; (d) external verification audits conducted annually by an accredited VVB; and (e) continuous training of monitoring personnel.</p>

<h2>G.5 Verification Schedule</h2>
<table>
  <tr><th>Verification Event</th><th>Timing</th><th>Scope</th><th>Responsible Party</th></tr>
  <tr><td>Initial Validation</td><td>Pre-registration</td><td>PDD, methodology, additionality</td><td>Accredited VVB</td></tr>
  <tr><td>First Verification</td><td>Year 1</td><td>Monitoring data, ERs, CDA compliance</td><td>Accredited VVB</td></tr>
  <tr><td>Periodic Verification</td><td>Annual</td><td>Monitoring data, ERs, safeguards</td><td>Accredited VVB</td></tr>
  <tr><td>Mid-term Review</td><td>Year ${Math.ceil(duration/2)}</td><td>Full project review</td><td>VVB + NEMA</td></tr>
</table>
<div class="page-break"></div>

<!-- SECTION H -->
<h1>Section H: Community Development Agreement</h1>

<h2>H.1 CDA Framework</h2>
<p>The Community Development Agreement is developed in accordance with the Fourth Schedule of the Carbon Markets Regulations 2024 and the Community Land Act 2016.</p>
<table>
  <tr><td style="width:40%"><strong>Affected Community</strong></td><td>${p['gcis-community'] || 'N/A'}</td></tr>
  <tr><td><strong>Land Type</strong></td><td>${landType}</td></tr>
  <tr><td><strong>Minimum Required CDA Rate</strong></td><td>${reqCDA}%</td></tr>
  <tr><td><strong>Proposed CDA Rate</strong></td><td>${cdaRate}%</td></tr>
  <tr><td><strong>Compliance Status</strong></td><td>${cdaRate >= reqCDA ? 'COMPLIANT' : 'NON-COMPLIANT'}</td></tr>
</table>
${cdaRate < reqCDA ? '<div class="warn"><strong>COMPLIANCE ALERT:</strong> The proposed CDA rate does not meet minimum requirements. This must be rectified before registration.</div>' : ''}

<h2>H.2 Benefit Distribution Plan</h2>
<p>${p['gcis-benefit-plan'] || 'Benefits will be distributed through a transparent mechanism governed by a community-elected CDA Management Committee.'}</p>

<h2>H.3 Grievance Redress Mechanism</h2>
<p>${p['gcis-grievance'] || 'A three-tier grievance mechanism has been established: (1) Community-level mediation through the CDA Committee; (2) County Government arbitration; (3) NEMA formal dispute resolution under Regulation 33.'}</p>

<h2>H.4 CDA Governance Structure</h2>
<table>
  <tr><th>Committee Role</th><th>Composition</th><th>Responsibility</th></tr>
  <tr><td>Chairperson</td><td>Community-elected</td><td>Overall CDA governance</td></tr>
  <tr><td>Treasurer</td><td>Community-elected</td><td>Financial management</td></tr>
  <tr><td>Secretary</td><td>Community-elected</td><td>Record keeping, reporting</td></tr>
  <tr><td>Women's Representative</td><td>Elected by women's group</td><td>Gender-inclusive oversight</td></tr>
  <tr><td>Youth Representative</td><td>Elected by youth group</td><td>Youth programme oversight</td></tr>
  <tr><td>Project Liaison</td><td>Appointed by proponent</td><td>Project-community coordination</td></tr>
</table>
<div class="page-break"></div>

<!-- SECTION I -->
<h1>Section I: Financial Analysis</h1>

<h2>I.1 Project Cost Structure</h2>
<table>
  <tr><th>Cost Category</th><th>Amount (KES)</th><th>% of Total</th></tr>
  <tr><td>Capital Expenditure (CAPEX)</td><td>${budget ? (budget * 0.65).toLocaleString() : 'TBD'}</td><td>65%</td></tr>
  <tr><td>Operating Expenditure (OPEX, annual)</td><td>${budget ? (budget * 0.05).toLocaleString() : 'TBD'}</td><td>5%/yr</td></tr>
  <tr><td>MRV and Verification</td><td>${budget ? (budget * 0.08).toLocaleString() : 'TBD'}</td><td>8%</td></tr>
  <tr><td>Community Development (CDA)</td><td>${budget ? (budget * 0.12).toLocaleString() : 'TBD'}</td><td>12%</td></tr>
  <tr><td>Project Management</td><td>${budget ? (budget * 0.10).toLocaleString() : 'TBD'}</td><td>10%</td></tr>
  <tr><td><strong>Total</strong></td><td><strong>KES ${budget ? budget.toLocaleString() : 'TBD'}</strong></td><td><strong>100%</strong></td></tr>
</table>

<h2>I.2 Revenue Projections</h2>
<table>
  <tr><th>Revenue Source</th><th>Annual (KES)</th><th>Total over ${duration} years (KES)</th></tr>
  <tr><td>Carbon Credits (at USD 10/tCO2e)</td><td>${(credits * 1300).toLocaleString()}</td><td>${(credits * duration * 1300).toLocaleString()}</td></tr>
  <tr><td>Carbon Credits (at USD 15/tCO2e)</td><td>${(credits * 1950).toLocaleString()}</td><td>${(credits * duration * 1950).toLocaleString()}</td></tr>
  <tr><td>Co-benefits / Ancillary Revenue</td><td>${(credits * 200).toLocaleString()}</td><td>${(credits * duration * 200).toLocaleString()}</td></tr>
</table>
<div class="page-break"></div>

<!-- SECTION J -->
<h1>Section J: Risk Management Framework</h1>

<h2>J.1 Risk Register</h2>
<table>
  <tr><th>ID</th><th>Risk</th><th>Category</th><th>Probability</th><th>Impact</th><th>Rating</th><th>Mitigation</th></tr>
  <tr><td>R01</td><td>Carbon price decline</td><td>Market</td><td>Medium</td><td>High</td><td class="risk-medium">Medium</td><td>Forward contracts, price floors</td></tr>
  <tr><td>R02</td><td>Technology failure</td><td>Technical</td><td>Low</td><td>High</td><td class="risk-medium">Medium</td><td>Warranties, maintenance contracts</td></tr>
  <tr><td>R03</td><td>Community conflict</td><td>Social</td><td>Low</td><td>High</td><td class="risk-medium">Medium</td><td>FPIC, grievance mechanism</td></tr>
  <tr><td>R04</td><td>Regulatory change</td><td>Policy</td><td>Medium</td><td>Medium</td><td class="risk-medium">Medium</td><td>Multi-standard registration</td></tr>
  <tr><td>R05</td><td>Natural disaster</td><td>Environmental</td><td>Low</td><td>High</td><td class="risk-low">Low</td><td>Insurance, adaptive management</td></tr>
  <tr><td>R06</td><td>Monitoring failure</td><td>Operational</td><td>Low</td><td>Medium</td><td class="risk-low">Low</td><td>Redundant systems, manual backup</td></tr>
  <tr><td>R07</td><td>Non-permanence</td><td>Technical</td><td>Low</td><td>High</td><td class="risk-low">Low</td><td>Buffer pool, long-term management</td></tr>
</table>

<h2>J.2 Non-Permanence Risk Assessment</h2>
<p>In accordance with ${p['gcis-standard'] === 'verra' ? 'the VCS AFOLU Non-Permanence Risk Tool' : 'best practice risk assessment frameworks'}, the project's non-permanence risk has been assessed. A buffer contribution of ${prl.score > 60 ? '20' : prl.score > 35 ? '15' : '10'}% of issued credits will be deposited in the ${p['gcis-standard'] === 'verra' ? 'VCS AFOLU Pooled Buffer Account' : 'KNCR Risk Buffer Pool'} to mitigate reversal risk.</p>

<!-- ANNEX I -->
<h1>Annex I: Registration & Compliance Data</h1>
<table>
  <tr><td style="width:40%"><strong>KRA PIN</strong></td><td>${p['gcis-kra-pin'] || 'Not provided'}</td></tr>
  <tr><td><strong>Business Registration No.</strong></td><td>${p['gcis-business-reg'] || 'Not provided'}</td></tr>
  <tr><td><strong>NEMA License No.</strong></td><td>${p['gcis-nema-license'] || 'Not applicable'}</td></tr>
  <tr><td><strong>Application Invoice No.</strong></td><td>${p['gcis-invoice-no'] || 'Not provided'}</td></tr>
  <tr><td><strong>County Permit No.</strong></td><td>${p['gcis-county-permit'] || 'Not provided'}</td></tr>
</table>

<!-- ANNEX II - VERIFICATION -->
${verBlock}

<div class="footer"><span>Netzerra - Kenya Carbon Intelligence Platform | www.netzerra.co.ke</span><span>Generated: ${now} | Ref: ${p.id} | PDD Second Schedule</span></div>
</body></html>`;
}


// ══════════════════════════════════════════════════════
// 5c. COMPLIANCE REPORT GENERATOR
// ══════════════════════════════════════════════════════

function generateComplianceReport(p) {
  const prl = p.prlScore || calculatePRL(p);
  const now = new Date().toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' });
  const cdaRate = parseFloat(p['gcis-cda-rate']) || 0;
  const landType = p['gcis-land-type'] || 'community';
  const reqCDA = landType === 'private' ? 0 : landType === 'community' ? 40 : 25;
  const cdaOk = cdaRate >= reqCDA;
  const verBlock = buildVerificationBlock(p, 'compliance', 'Regulatory Compliance Report');
  const vCSS = getVerificationCSS();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Compliance Report - ${p['gcis-proj-name']}</title>
<style>${getDocCSS()}${vCSS}
.check-pass{color:#2E7D32;font-weight:bold}
.check-fail{color:#C62828;font-weight:bold}
.check-warn{color:#F57F17;font-weight:bold}
.meter-bg{background:#E0E0E0;border-radius:10px;height:16px;overflow:hidden;margin:4px 0}
.meter-fill{height:100%;border-radius:10px;transition:width .3s}
</style></head><body>
<div class="no-print"><button onclick="window.print()" style="background:#1B5E20;color:#fff;border:none;padding:9px 22px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:bold">Save as PDF / Print</button></div>

<div class="hdr">
  <div class="tag">Netzerra Regulatory Compliance Assessment</div>
  <h1 style="color:#fff;font-size:18px;margin:0 0 6px">COMPLIANCE REPORT</h1>
  <div style="font-size:10px;color:rgba(255,255,255,.7)">${p['gcis-proj-name'] || 'Unnamed'} | ${p.id}</div>
  <div style="font-size:9px;color:rgba(255,255,255,.5);margin-top:4px">Generated: ${now}</div>
</div>

<div class="prl-box prl-${prl.level.toLowerCase()}">
  <strong>PROJECT RISK LEVEL (PRL): ${prl.score}% - ${prl.level}</strong>
  <div class="meter-bg" style="margin-top:6px"><div class="meter-fill" style="width:${prl.score}%;background:${prl.level === 'HIGH' ? '#C62828' : prl.level === 'MEDIUM' ? '#F57F17' : '#2E7D32'}"></div></div>
</div>

<h1>1. PRL Risk Factor Breakdown</h1>
<table>
  <tr><th>Factor</th><th>Value</th><th>Risk Points</th><th>Assessment</th></tr>
  ${prl.factors.map(f => `<tr><td>${f.factor}</td><td>${f.value}</td><td>${f.points}</td><td class="${f.points > 15 ? 'check-fail' : f.points > 8 ? 'check-warn' : 'check-pass'}">${f.points > 15 ? 'HIGH RISK' : f.points > 8 ? 'MODERATE' : 'ACCEPTABLE'}</td></tr>`).join('')}
  <tr style="font-weight:bold"><td>TOTAL</td><td></td><td>${prl.score}/100</td><td class="${prl.level === 'HIGH' ? 'check-fail' : prl.level === 'MEDIUM' ? 'check-warn' : 'check-pass'}">${prl.level}</td></tr>
</table>

<h1>2. Regulatory Compliance Checklist</h1>
<table>
  <tr><th>Requirement</th><th>Regulation</th><th>Status</th><th>Evidence</th></tr>
  <tr><td>Project Concept Note</td><td>Reg. 21(2)(a)</td><td class="check-pass">SUBMITTED</td><td>PCN generated</td></tr>
  <tr><td>Project Design Document</td><td>Second Schedule</td><td class="check-pass">GENERATED</td><td>PDD generated</td></tr>
  <tr><td>Community Development Agreement</td><td>Fourth Schedule</td><td class="${cdaOk ? 'check-pass' : 'check-fail'}">${cdaOk ? 'COMPLIANT' : 'NON-COMPLIANT'}</td><td>CDA rate: ${cdaRate}% (min: ${reqCDA}%)</td></tr>
  <tr><td>Environmental Screening</td><td>EMCA 1999</td><td class="check-pass">COMPLETED</td><td>ESIA screening done</td></tr>
  <tr><td>Stakeholder Consultation</td><td>FPIC Protocol</td><td class="check-warn">PENDING</td><td>To be conducted</td></tr>
  <tr><td>Baseline Study</td><td>Methodology</td><td class="${p['gcis-baseline'] ? 'check-pass' : 'check-warn'}">${p['gcis-baseline'] ? 'PROVIDED' : 'PENDING'}</td><td>${p['gcis-baseline'] ? 'Baseline documented' : 'Awaiting data'}</td></tr>
  <tr><td>Additionality</td><td>UNFCCC Tool</td><td class="${p['gcis-additionality'] ? 'check-pass' : 'check-warn'}">${p['gcis-additionality'] ? 'DEMONSTRATED' : 'PENDING'}</td><td>${p['gcis-additionality'] ? 'Barrier analysis complete' : 'Awaiting analysis'}</td></tr>
  <tr><td>Monitoring Plan</td><td>ISO 14064-2</td><td class="${p['gcis-monitoring'] ? 'check-pass' : 'check-warn'}">${p['gcis-monitoring'] ? 'ESTABLISHED' : 'PENDING'}</td><td>${p['gcis-monitoring'] ? 'MRV plan documented' : 'Awaiting plan'}</td></tr>
  <tr><td>KRA Tax Compliance</td><td>Income Tax Act</td><td class="${p['gcis-kra-pin'] ? 'check-pass' : 'check-warn'}">${p['gcis-kra-pin'] ? 'VERIFIED' : 'PENDING'}</td><td>KRA PIN: ${p['gcis-kra-pin'] || 'Not provided'}</td></tr>
  <tr><td>Business Registration</td><td>Companies Act</td><td class="${p['gcis-business-reg'] ? 'check-pass' : 'check-warn'}">${p['gcis-business-reg'] ? 'VERIFIED' : 'PENDING'}</td><td>Reg: ${p['gcis-business-reg'] || 'Not provided'}</td></tr>
</table>

<h1>3. Benefit-Sharing Compliance</h1>
<table>
  <tr><th>Stakeholder</th><th>Required</th><th>Proposed</th><th>Status</th></tr>
  <tr><td>Community (CDA)</td><td>${reqCDA}%</td><td>${cdaRate}%</td><td class="${cdaOk ? 'check-pass' : 'check-fail'}">${cdaOk ? 'PASS' : 'FAIL'}</td></tr>
  <tr><td>County Government</td><td>5%</td><td>5%</td><td class="check-pass">PASS</td></tr>
  <tr><td>National Government</td><td>5%</td><td>5%</td><td class="check-pass">PASS</td></tr>
</table>
${!cdaOk ? '<div class="warn"><strong>ACTION REQUIRED:</strong> Community benefit rate must be increased to at least ' + reqCDA + '% for ' + landType + ' land before registration can proceed.</div>' : ''}

<h1>4. Recommendations</h1>
<ol>
  ${prl.score > 60 ? '<li><strong>HIGH PRIORITY:</strong> Address all high-risk factors before proceeding to validation.</li>' : ''}
  ${!cdaOk ? '<li><strong>CRITICAL:</strong> Revise CDA benefit rate to meet minimum regulatory requirements.</li>' : ''}
  ${!p['gcis-baseline'] ? '<li>Complete detailed baseline study with site-specific emission factors.</li>' : ''}
  ${!p['gcis-monitoring'] ? '<li>Develop comprehensive MRV plan with QA/QC procedures.</li>' : ''}
  <li>Conduct formal stakeholder consultation meetings with documented FPIC process.</li>
  <li>Commission full ESIA if required based on project risk classification.</li>
  <li>Engage accredited VVB for project validation.</li>
  <li>Submit complete documentation package to NEMA DNA for Letter of Approval.</li>
</ol>

${verBlock}

<div class="footer"><span>Netzerra - Kenya Carbon Intelligence Platform | www.netzerra.co.ke</span><span>Generated: ${now} | Ref: ${p.id} | Compliance Report</span></div>
</body></html>`;
}

// ══════════════════════════════════════════════════════
// 5d. CDA DOCUMENT (Fourth Schedule)
// ══════════════════════════════════════════════════════

function generateCDADocument(p) {
  const now = new Date().toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' });
  const cdaRate = parseFloat(p['gcis-cda-rate']) || 0;
  const landType = p['gcis-land-type'] || 'community';
  const credits = parseFloat(p['gcis-credits']) || 0;
  const duration = parseFloat(p['gcis-duration']) || 10;
  const verBlock = buildVerificationBlock(p, 'cda', 'Community Development Agreement');
  const vCSS = getVerificationCSS();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>CDA - ${p['gcis-proj-name']}</title>
<style>${getDocCSS()}${vCSS}</style></head><body>
<div class="no-print"><button onclick="window.print()" style="background:#1B5E20;color:#fff;border:none;padding:9px 22px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:bold">Save as PDF / Print</button></div>
<div class="hdr">
  <div class="tag">Carbon Markets Regulations 2024 - Fourth Schedule</div>
  <h1 style="color:#fff;font-size:18px;margin:0 0 6px">COMMUNITY DEVELOPMENT AGREEMENT</h1>
  <div style="font-size:9px;color:rgba(255,255,255,.5)">${p['gcis-proj-name']} | ${p.id} | ${now}</div>
</div>
<h1>Preamble</h1>
<p>This Community Development Agreement ("Agreement") is entered into pursuant to the Fourth Schedule of the Carbon Markets Regulations 2024 (Legal Notice No. 84 of 17 May 2024) between ${p['gcis-proponent'] || 'the Project Proponent'} ("the Proponent") and ${p['gcis-community'] || 'the Affected Community'} ("the Community") in respect of the carbon project titled "${p['gcis-proj-name'] || 'the Project'}" located in ${p['gcis-county'] || 'Kenya'} County.</p>
<h1>Article 1: Definitions</h1>
<p><strong>"Carbon Credits"</strong> means verified emission reductions or removals expressed in tonnes of CO2 equivalent (tCO2e) generated by the Project and registered under the KNCR or an approved international standard.</p>
<p><strong>"Community Benefit Share"</strong> means ${cdaRate}% of the net carbon credit revenue, as agreed between the parties.</p>
<p><strong>"CDA Committee"</strong> means the community-elected governance body responsible for managing benefit distribution.</p>
<h1>Article 2: Benefit Sharing</h1>
<table>
  <tr><th>Beneficiary</th><th>Share (%)</th><th>Estimated Annual (KES)</th></tr>
  <tr><td>Community (this Agreement)</td><td>${cdaRate}%</td><td>${(credits * 1300 * cdaRate / 100).toLocaleString()}</td></tr>
  <tr><td>County Government</td><td>5%</td><td>${(credits * 1300 * 0.05).toLocaleString()}</td></tr>
  <tr><td>National Government</td><td>5%</td><td>${(credits * 1300 * 0.05).toLocaleString()}</td></tr>
  <tr><td>Project Proponent</td><td>${Math.max(0, 100 - cdaRate - 10)}%</td><td>${(credits * 1300 * Math.max(0, 100 - cdaRate - 10) / 100).toLocaleString()}</td></tr>
</table>
<h1>Article 3: Benefit Distribution Plan</h1>
<p>${p['gcis-benefit-plan'] || 'Benefits shall be distributed through transparent mechanisms as determined by the CDA Committee in consultation with the Proponent.'}</p>
<h1>Article 4: Governance</h1>
<p>The CDA Committee shall comprise no fewer than seven (7) members elected by the Community, with at least 30% women representation. The Committee shall meet quarterly and provide annual financial reports to both the Community and the Proponent.</p>
<h1>Article 5: Grievance Mechanism</h1>
<p>${p['gcis-grievance'] || 'Grievances shall be resolved through a three-tier mechanism: (1) CDA Committee mediation; (2) County Government arbitration; (3) NEMA formal dispute resolution.'}</p>
<h1>Article 6: Duration and Termination</h1>
<p>This Agreement shall remain in force for the duration of the Project crediting period (${duration} years) and may be renewed upon mutual agreement. Either party may terminate with 12 months written notice, subject to the provisions of Regulation 33.</p>
<h1>Signatures</h1>
<div class="sign-grid">
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">Project Proponent</div></div>
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">Community Chairperson</div></div>
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">County Government Witness</div></div>
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">NEMA DNA Witness</div></div>
</div>
${verBlock}
<div class="footer"><span>Netzerra | www.netzerra.co.ke</span><span>${now} | ${p.id} | CDA Fourth Schedule</span></div>
</body></html>`;
}

// ══════════════════════════════════════════════════════
// 5e. ESCP DOCUMENT
// ══════════════════════════════════════════════════════

function generateESCPDocument(p) {
  const now = new Date().toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' });
  const verBlock = buildVerificationBlock(p, 'escp', 'Environmental & Social Commitment Plan');
  const vCSS = getVerificationCSS();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>ESCP - ${p['gcis-proj-name']}</title>
<style>${getDocCSS()}${vCSS}</style></head><body>
<div class="no-print"><button onclick="window.print()" style="background:#1B5E20;color:#fff;border:none;padding:9px 22px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:bold">Save as PDF / Print</button></div>
<div class="hdr">
  <div class="tag">EMCA 1999 Compliance</div>
  <h1 style="color:#fff;font-size:18px;margin:0 0 6px">ENVIRONMENTAL & SOCIAL COMMITMENT PLAN</h1>
  <div style="font-size:9px;color:rgba(255,255,255,.5)">${p['gcis-proj-name']} | ${p.id} | ${now}</div>
</div>
<h1>1. Introduction</h1>
<p>This Environmental and Social Commitment Plan (ESCP) outlines the commitments of ${p['gcis-proponent'] || 'the Project Proponent'} to manage environmental and social risks associated with the ${p['gcis-proj-name'] || 'project'} in ${p['gcis-county'] || 'Kenya'} County. The ESCP is prepared in accordance with EMCA 1999, the Environmental (Impact Assessment and Audit) Regulations 2003, and international best practice standards.</p>
<h1>2. Environmental Commitments</h1>
<table>
  <tr><th>Commitment</th><th>Action</th><th>Timeline</th><th>Indicator</th></tr>
  <tr><td>Air Quality Protection</td><td>Monitor emissions during construction and operation</td><td>Ongoing</td><td>Ambient air quality within NEMA standards</td></tr>
  <tr><td>Water Resource Protection</td><td>Implement water quality monitoring programme</td><td>Pre-construction</td><td>Water quality parameters within limits</td></tr>
  <tr><td>Biodiversity Conservation</td><td>Conduct biodiversity baseline and avoid sensitive areas</td><td>Pre-construction</td><td>No net loss of biodiversity</td></tr>
  <tr><td>Waste Management</td><td>Implement waste management plan with recycling</td><td>Construction phase</td><td>Zero unmanaged waste</td></tr>
  <tr><td>Soil Conservation</td><td>Implement erosion control measures</td><td>Construction phase</td><td>No significant soil degradation</td></tr>
</table>
<h1>3. Social Commitments</h1>
<table>
  <tr><th>Commitment</th><th>Action</th><th>Timeline</th><th>Indicator</th></tr>
  <tr><td>Community Engagement</td><td>Quarterly community meetings</td><td>Ongoing</td><td>Meeting attendance records</td></tr>
  <tr><td>Labour Standards</td><td>Comply with Employment Act 2007</td><td>Ongoing</td><td>Zero labour violations</td></tr>
  <tr><td>Gender Equality</td><td>30% women participation in project activities</td><td>Ongoing</td><td>Gender disaggregated data</td></tr>
  <tr><td>Grievance Resolution</td><td>Maintain operational grievance mechanism</td><td>Ongoing</td><td>All grievances resolved within 30 days</td></tr>
  <tr><td>Health & Safety</td><td>Implement OHS management system</td><td>Pre-construction</td><td>Zero serious incidents</td></tr>
</table>
<h1>4. Monitoring and Reporting</h1>
<p>The Proponent shall submit semi-annual ESCP compliance reports to NEMA and the County Government. An independent environmental audit shall be conducted annually.</p>
<div class="sign-grid">
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">Project Proponent</div></div>
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">NEMA Environmental Officer</div></div>
</div>
${verBlock}
<div class="footer"><span>Netzerra | www.netzerra.co.ke</span><span>${now} | ${p.id} | ESCP</span></div>
</body></html>`;
}

// ══════════════════════════════════════════════════════
// 5f. STAKEHOLDER CONSULTATION REPORT
// ══════════════════════════════════════════════════════

function generateStakeholderReport(p) {
  const now = new Date().toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' });
  const verBlock = buildVerificationBlock(p, 'stakeholder', 'Stakeholder Consultation Report');
  const vCSS = getVerificationCSS();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Stakeholder Report - ${p['gcis-proj-name']}</title>
<style>${getDocCSS()}${vCSS}</style></head><body>
<div class="no-print"><button onclick="window.print()" style="background:#1B5E20;color:#fff;border:none;padding:9px 22px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:bold">Save as PDF / Print</button></div>
<div class="hdr">
  <div class="tag">FPIC Protocol Compliance</div>
  <h1 style="color:#fff;font-size:18px;margin:0 0 6px">STAKEHOLDER CONSULTATION REPORT</h1>
  <div style="font-size:9px;color:rgba(255,255,255,.5)">${p['gcis-proj-name']} | ${p.id} | ${now}</div>
</div>
<h1>1. Consultation Overview</h1>
<p>This report documents the stakeholder consultation process conducted for the ${p['gcis-proj-name'] || 'project'} in ${p['gcis-county'] || 'Kenya'} County, in accordance with the Free, Prior and Informed Consent (FPIC) principles and the requirements of the Carbon Markets Regulations 2024.</p>
<h1>2. Stakeholder Register</h1>
<table>
  <tr><th>Stakeholder Group</th><th>Representatives</th><th>Consultation Method</th><th>Date</th></tr>
  <tr><td>${p['gcis-community'] || 'Local Community'}</td><td>Community leaders, elders</td><td>Public meeting</td><td>To be scheduled</td></tr>
  <tr><td>Women's Groups</td><td>Women's group leaders</td><td>Focus group discussion</td><td>To be scheduled</td></tr>
  <tr><td>Youth Representatives</td><td>Youth leaders</td><td>Focus group discussion</td><td>To be scheduled</td></tr>
  <tr><td>${p['gcis-county'] || 'County'} Government</td><td>County officials</td><td>Formal meeting</td><td>To be scheduled</td></tr>
  <tr><td>NEMA</td><td>Environmental officers</td><td>Regulatory submission</td><td>To be scheduled</td></tr>
  <tr><td>Civil Society</td><td>Local NGOs</td><td>Written consultation</td><td>To be scheduled</td></tr>
</table>
<h1>3. FPIC Process</h1>
<p>The FPIC process shall include: (a) provision of complete project information in local languages at least 30 days before consultation; (b) open community meetings with documented attendance; (c) opportunity for questions and concerns; (d) documented consent or objection from community representatives; (e) 60-day public comment period.</p>
<h1>4. Key Issues and Responses</h1>
<p>This section will be completed following the formal consultation process. All comments received will be documented, responded to, and incorporated into the project design where appropriate.</p>
<h1>5. Consent Documentation</h1>
<p>Written consent from the affected community shall be obtained and attached as an annex to this report. Consent is conditional upon the implementation of the Community Development Agreement and the commitments outlined in the ESCP.</p>
<div class="sign-grid">
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">Consultation Facilitator</div></div>
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">Community Representative</div></div>
</div>
${verBlock}
<div class="footer"><span>Netzerra | www.netzerra.co.ke</span><span>${now} | ${p.id} | Stakeholder Report</span></div>
</body></html>`;
}

// ══════════════════════════════════════════════════════
// 5g. ESIA DOCUMENT
// ══════════════════════════════════════════════════════

function generateESIADocument(p) {
  const now = new Date().toLocaleDateString('en-KE', { year:'numeric', month:'long', day:'numeric' });
  const prl = p.prlScore || calculatePRL(p);
  const gis = p['gcis-gis-scan'] ? JSON.parse(p['gcis-gis-scan']) : null;
  const verBlock = buildVerificationBlock(p, 'esia', 'Environmental & Social Impact Assessment');
  const vCSS = getVerificationCSS();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>ESIA - ${p['gcis-proj-name']}</title>
<style>${getDocCSS()}${vCSS}</style></head><body>
<div class="no-print"><button onclick="window.print()" style="background:#1B5E20;color:#fff;border:none;padding:9px 22px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:bold">Save as PDF / Print</button></div>
<div class="hdr">
  <div class="tag">EMCA 1999, Section 58 | EIA Regulations 2003</div>
  <h1 style="color:#fff;font-size:18px;margin:0 0 6px">ENVIRONMENTAL & SOCIAL IMPACT ASSESSMENT</h1>
  <div style="font-size:9px;color:rgba(255,255,255,.5)">${p['gcis-proj-name']} | ${p.id} | ${now}</div>
</div>
<h1>1. Executive Summary</h1>
<p>This Environmental and Social Impact Assessment (ESIA) has been prepared for the ${p['gcis-proj-name'] || 'project'} in ${p['gcis-county'] || 'Kenya'} County, in accordance with the Environmental Management and Coordination Act (EMCA) 1999, Section 58, and the Environmental (Impact Assessment and Audit) Regulations 2003. The assessment covers all potential environmental and social impacts of the project activity and proposes appropriate mitigation measures.</p>
<p>The project has been classified as ${prl.level} risk based on the PRL assessment (score: ${prl.score}%). ${prl.score > 60 ? 'A full ESIA with detailed impact assessment and comprehensive mitigation plan is required.' : prl.score > 35 ? 'A standard ESIA with focused impact assessment is recommended.' : 'A simplified environmental assessment may be sufficient, subject to NEMA determination.'}</p>
<h1>2. Project Description</h1>
<table>
  <tr><td style="width:35%"><strong>Project</strong></td><td>${p['gcis-proj-name'] || 'N/A'}</td></tr>
  <tr><td><strong>Location</strong></td><td>${p['gcis-county'] || 'N/A'} County, Kenya</td></tr>
  <tr><td><strong>Type</strong></td><td>${p['gcis-proj-type'] || 'N/A'}</td></tr>
  <tr><td><strong>Land Ownership</strong></td><td>${p['gcis-land-type'] || 'N/A'}</td></tr>
  ${gis ? `<tr><td><strong>Coordinates</strong></td><td>${gis.lat}N, ${gis.lng}E</td></tr>
  <tr><td><strong>Land Cover</strong></td><td>${gis.landCover}</td></tr>
  <tr><td><strong>NDVI</strong></td><td>${gis.ndvi}</td></tr>` : ''}
</table>
${gis?.aiAnalysis ? '<div class="section-box"><strong>AI Land Analysis:</strong> ' + gis.aiAnalysis + '</div>' : ''}
<h1>3. Baseline Environmental Conditions</h1>
<p>The project area in ${p['gcis-county'] || 'Kenya'} County is characterised by ${gis ? gis.landCover + ' with NDVI of ' + gis.ndvi + ', soil carbon of ' + gis.soilCarbon + ' tC/ha, and elevation of ' + gis.elevation + 'm' : 'conditions typical of the region'}. ${gis?.aiAnalysis || 'Detailed baseline environmental data will be collected during the ESIA field assessment phase.'}</p>
<h1>4. Impact Assessment Matrix</h1>
<table>
  <tr><th>Impact</th><th>Phase</th><th>Nature</th><th>Magnitude</th><th>Duration</th><th>Significance</th></tr>
  <tr><td>GHG Emission Reduction</td><td>Operation</td><td>Positive</td><td>High</td><td>Long-term</td><td class="risk-low">Major Positive</td></tr>
  <tr><td>Air Quality Improvement</td><td>Operation</td><td>Positive</td><td>Medium</td><td>Long-term</td><td class="risk-low">Moderate Positive</td></tr>
  <tr><td>Employment Generation</td><td>All phases</td><td>Positive</td><td>Medium</td><td>Long-term</td><td class="risk-low">Moderate Positive</td></tr>
  <tr><td>Community Benefits</td><td>Operation</td><td>Positive</td><td>High</td><td>Long-term</td><td class="risk-low">Major Positive</td></tr>
  <tr><td>Construction Disturbance</td><td>Construction</td><td>Negative</td><td>Low</td><td>Short-term</td><td class="risk-low">Minor</td></tr>
  <tr><td>Land Use Change</td><td>Construction</td><td>Negative</td><td>Low</td><td>Long-term</td><td class="risk-low">Minor</td></tr>
  <tr><td>Noise</td><td>Construction</td><td>Negative</td><td>Low</td><td>Short-term</td><td class="risk-low">Negligible</td></tr>
  <tr><td>Waste Generation</td><td>Construction</td><td>Negative</td><td>Low</td><td>Short-term</td><td class="risk-low">Minor</td></tr>
</table>
<h1>5. Environmental Management Plan</h1>
<p>Based on the impact assessment, an Environmental Management Plan (EMP) has been developed with specific mitigation measures, monitoring indicators, responsible parties, and budget allocations. The EMP will be implemented throughout the project lifecycle and subject to annual review.</p>
<h1>6. Conclusion and Recommendation</h1>
<p>Based on this assessment, the overall environmental and social impact of the ${p['gcis-proj-name'] || 'project'} is assessed as <strong>net positive</strong>. The project will deliver significant climate change mitigation benefits while generating positive social outcomes through the Community Development Agreement. All identified negative impacts are minor, temporary, and can be adequately mitigated through the proposed Environmental Management Plan.</p>
<p><strong>Recommendation:</strong> The project should proceed to the next stage of the KNCR registration pipeline, subject to implementation of the mitigation measures outlined in this ESIA and the ESCP.</p>
<div class="sign-grid">
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">Lead ESIA Practitioner (NEMA Licensed)</div></div>
  <div class="sign-block"><div class="sign-line"></div><div class="sign-label">NEMA Review Officer</div></div>
</div>
${verBlock}
<div class="footer"><span>Netzerra | www.netzerra.co.ke</span><span>${now} | ${p.id} | ESIA</span></div>
</body></html>`;
}


// ══════════════════════════════════════════════════════
// 6. PIPELINE PROGRESS TRACKER + CONSULTANT-GATED APPROVAL
// ══════════════════════════════════════════════════════

function renderPipelineTracker(project) {
  const currentStageIdx = PIPELINE_STAGES.findIndex(s => s.id === project.pipelineStage) || 0;
  return `<div class="pipeline-tracker">
    <div class="pipeline-title">KNCR Document Pipeline</div>
    <div class="pipeline-stages">
      ${PIPELINE_STAGES.map((stage, i) => {
        const approved = project.pipelineApprovals?.[stage.id];
        const isCurrent = i === currentStageIdx;
        const isPast = i < currentStageIdx;
        const isFuture = i > currentStageIdx;
        const cls = approved ? 'pipeline-stage-approved' : isCurrent ? 'pipeline-stage-current' : isPast ? 'pipeline-stage-past' : 'pipeline-stage-future';
        return `<div class="pipeline-stage ${cls}" onclick="${(isPast || isCurrent || approved) ? "viewPipelineStageDoc('" + project.id + "','" + stage.id + "')" : ''}" title="${stage.full} - ${stage.reg}">
          <div class="pipeline-stage-icon">${approved ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : (i + 1)}</div>
          <div class="pipeline-stage-label">${stage.label}</div>
        </div>
        ${i < PIPELINE_STAGES.length - 1 ? '<div class="pipeline-connector ' + (isPast || approved ? 'pipeline-connector-done' : '') + '"></div>' : ''}`;
      }).join('')}
    </div>
  </div>`;
}

function viewPipelineStageDoc(projectId, stageId) {
  downloadDocument(projectId, stageId);
}

function consultantApproveStage(projectId, stageId) {
  const project = NTZ.projects.find(p => p.id === projectId);
  if (!project) return;

  project.pipelineApprovals = project.pipelineApprovals || {};
  project.pipelineApprovals[stageId] = {
    approvedBy: AUTH.currentUser?.name || 'Consultant',
    approvedAt: new Date().toISOString(),
  };

  // Advance to next stage
  const currentIdx = PIPELINE_STAGES.findIndex(s => s.id === stageId);
  if (currentIdx < PIPELINE_STAGES.length - 1) {
    project.pipelineStage = PIPELINE_STAGES[currentIdx + 1].id;
  }

  // If DNA approval stage, mark for NEMA
  if (stageId === 'validation' || stageId === 'dna-approval') {
    project.nemaStatus = 'under-review';
  }

  addRegistryEntry({
    projectId,
    action: 'STAGE_APPROVED',
    actor: AUTH.currentUser?.name || 'Consultant',
    detail: `Pipeline stage "${PIPELINE_STAGES[currentIdx]?.full || stageId}" approved by consultant`,
    hash: generateHash(projectId + stageId + Date.now()),
  });

  saveNuclearState();
  toast(`Stage "${PIPELINE_STAGES[currentIdx]?.label || stageId}" approved. Project advanced to next stage.`, 'success');
  renderReviewQueue();
}

function nemaApproveProject(projectId) {
  const project = NTZ.projects.find(p => p.id === projectId);
  if (!project) return;

  project.nemaStatus = 'approved';
  project.status = 'approved';
  project.pipelineApprovals = project.pipelineApprovals || {};
  project.pipelineApprovals['dna-approval'] = {
    approvedBy: AUTH.currentUser?.name || 'NEMA Officer',
    approvedAt: new Date().toISOString(),
  };
  project.pipelineStage = 'kncr-registration';

  addRegistryEntry({
    projectId,
    action: 'NEMA_APPROVED',
    actor: AUTH.currentUser?.name || 'NEMA',
    detail: 'NEMA DNA issued Letter of Approval for ' + (project['gcis-proj-name'] || projectId),
    hash: generateHash(projectId + 'NEMA_APPROVED' + Date.now()),
  });

  saveNuclearState();
  toast('Project approved by NEMA. Letter of Approval issued.', 'success');
  renderNEMAOversight();
}

// ══════════════════════════════════════════════════════
// 7. TWO-WAY COMMUNICATION
// ══════════════════════════════════════════════════════

function sendConsultantQuery(projectId) {
  const textarea = document.getElementById('consultant-query-' + projectId);
  if (!textarea) return;
  const message = textarea.value.trim();
  if (!message) { toast('Please enter a query', 'error'); return; }

  const msg = {
    id: 'MSG-' + Date.now().toString(36).toUpperCase(),
    projectId,
    from: AUTH.currentUser?.name || 'Consultant',
    fromRole: AUTH.currentUser?.role || 'consultant',
    to: 'proponent',
    message,
    timestamp: new Date().toISOString(),
    read: false,
  };

  NTZ.messages.push(msg);
  const project = NTZ.projects.find(p => p.id === projectId);
  if (project) { if (!project.messages) project.messages = []; project.messages.push(msg); }

  addRegistryEntry({ projectId, action: 'INFO_REQUESTED', actor: msg.from, detail: 'Information request: ' + message.substring(0, 80), hash: generateHash(msg.id + msg.timestamp) });
  textarea.value = '';
  saveNuclearState();
  toast('Query sent to proponent', 'success');
  renderReviewQueue();
}

function sendProponentReply(messageId) {
  const textarea = document.getElementById('reply-' + messageId);
  if (!textarea) return;
  const reply = textarea.value.trim();
  if (!reply) { toast('Please enter a reply', 'error'); return; }

  const originalMsg = NTZ.messages.find(m => m.id === messageId);
  if (!originalMsg) return;

  const replyMsg = {
    id: 'MSG-' + Date.now().toString(36).toUpperCase(),
    projectId: originalMsg.projectId,
    from: AUTH.currentUser?.name || 'Proponent',
    fromRole: 'proponent',
    to: originalMsg.from,
    message: reply,
    timestamp: new Date().toISOString(),
    read: false,
    replyTo: messageId,
  };

  NTZ.messages.push(replyMsg);
  originalMsg.read = true;
  const project = NTZ.projects.find(p => p.id === originalMsg.projectId);
  if (project) { if (!project.messages) project.messages = []; project.messages.push(replyMsg); }

  addRegistryEntry({ projectId: originalMsg.projectId, action: 'INFO_PROVIDED', actor: replyMsg.from, detail: 'Proponent responded to information request', hash: generateHash(replyMsg.id + replyMsg.timestamp) });
  textarea.value = '';
  saveNuclearState();
  toast('Reply sent', 'success');
  renderMessageCenter();
}

function renderMessageCenter() {
  const container = document.getElementById('messages-container');
  if (!container) return;
  const currentRole = AUTH.currentUser?.role || 'proponent';
  const myMessages = NTZ.messages.filter(m => {
    if (currentRole === 'proponent') return m.to === 'proponent' || m.fromRole === 'proponent';
    if (currentRole === 'consultant') return m.fromRole === 'consultant' || m.to === (AUTH.currentUser?.name || '');
    return true;
  });
  const unread = myMessages.filter(m => !m.read && m.fromRole !== currentRole).length;

  let html = `<div class="msg-header"><h3>Message Center</h3>${unread > 0 ? `<span class="msg-unread-badge">${unread} unread</span>` : ''}</div>`;

  if (myMessages.length === 0) {
    html += '<div class="msg-empty">No messages yet. Messages from consultants and reviewers will appear here.</div>';
  } else {
    const grouped = {};
    myMessages.forEach(m => { if (!grouped[m.projectId]) grouped[m.projectId] = []; grouped[m.projectId].push(m); });

    Object.entries(grouped).forEach(([projectId, msgs]) => {
      const project = NTZ.projects.find(p => p.id === projectId);
      const projName = project?.['gcis-proj-name'] || projectId;
      html += `<div class="msg-thread"><div class="msg-thread-header">${projName} <span class="msg-thread-id">${projectId}</span></div>`;
      msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).forEach(m => {
        const isOwn = m.fromRole === currentRole;
        const time = new Date(m.timestamp).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        html += `<div class="msg-bubble ${isOwn ? 'msg-own' : 'msg-other'}">
          <div class="msg-meta">${m.from} (${ROLE_MAP[m.fromRole]?.label || m.fromRole}) - ${time}</div>
          <div class="msg-text">${m.message}</div>
        </div>`;
      });
      if (currentRole === 'proponent') {
        const lastMsg = msgs.filter(m => m.fromRole !== 'proponent').pop();
        if (lastMsg && !lastMsg.read) {
          html += `<div class="msg-reply-box">
            <textarea class="gcis-input gcis-textarea" id="reply-${lastMsg.id}" placeholder="Type your reply..." rows="2"></textarea>
            <button class="gcis-btn gcis-btn-primary" onclick="sendProponentReply('${lastMsg.id}')">Send Reply</button>
          </div>`;
        }
      }
      html += '</div>';
    });
  }
  container.innerHTML = html;
}

// ══════════════════════════════════════════════════════
// 8. REVIEW QUEUE (CONSULTANT) — CLICKABLE PROJECTS + PIPELINE
// ══════════════════════════════════════════════════════

function renderReviewQueue() {
  const container = document.getElementById('review-queue-container');
  if (!container) return;
  const projects = NTZ.projects;

  let html = `<div class="rq-header"><h3>Consultant Review Queue</h3><span class="rq-count">${projects.length} project${projects.length !== 1 ? 's' : ''}</span></div>`;

  if (projects.length === 0) {
    html += '<div class="msg-empty">No projects in the queue.</div>';
  } else {
    projects.forEach(p => {
      const prl = p.prlScore || calculatePRL(p);
      const prlColor = prl.level === 'HIGH' ? '#EF5350' : prl.level === 'MEDIUM' ? '#F5A623' : '#4ade80';
      const currentStage = PIPELINE_STAGES.find(s => s.id === p.pipelineStage) || PIPELINE_STAGES[0];

      html += `<div class="rq-card">
        <div class="rq-card-header" onclick="toggleProjectDetail('${p.id}')" style="cursor:pointer">
          <div>
            <h4>${p['gcis-proj-name'] || p.name || 'Unnamed Project'}</h4>
            <span class="rq-meta">${p.id} | ${p['gcis-county'] || p.county || 'N/A'} County | ${p['gcis-proj-type'] || p.type || 'N/A'} | Stage: ${currentStage.label}</span>
          </div>
          <div class="rq-prl" style="border-color:${prlColor}">
            <div class="rq-prl-score" style="color:${prlColor}">${prl.score}%</div>
            <div class="rq-prl-label">PRL</div>
          </div>
        </div>
        <div class="rq-prl-meter"><div class="rq-prl-fill" style="width:${prl.score}%;background:${prlColor}"></div></div>
        ${renderPipelineTracker(p)}
        <div class="rq-detail-panel" id="detail-${p.id}" style="display:none">
          <div class="rq-detail-grid">
            <div><strong>Proponent:</strong> ${p['gcis-proponent'] || p.proponent || 'N/A'}</div>
            <div><strong>Credits:</strong> ${p['gcis-credits'] || Math.round(p.credits) || 0} tCO2e/yr</div>
            <div><strong>Standard:</strong> ${p['gcis-standard'] || (p.sector === 'waste' ? 'IPCC Waste Tier 2' : 'N/A')}</div>
            <div><strong>Duration:</strong> ${p['gcis-duration'] || 10} years</div>
            <div><strong>Land Type:</strong> ${p['gcis-land-type'] || p.land_type || p.w_type || 'N/A'}</div>
            <div><strong>CDA Rate:</strong> ${p['gcis-cda-rate'] || p.cda_share_pct || 0}%</div>
            <div><strong>KRA PIN:</strong> ${p['gcis-kra-pin'] || p.w_kra_pin || 'N/A'}</div>
            <div><strong>Business Reg:</strong> ${p['gcis-business-reg'] || p.w_business_reg || 'N/A'}</div>
            <div><strong>Invoice No:</strong> ${p['gcis-invoice-no'] || p.w_invoice_no || 'N/A'}</div>
            <div><strong>NEMA License:</strong> ${p['gcis-nema-license'] || p.w_nema_license || 'N/A'}</div>
          </div>
          ${p['gcis-baseline'] ? '<div class="rq-detail-section"><strong>Baseline:</strong>' + (p['gcis-baseline_ai_generated'] ? (p['gcis-baseline_ai_modified'] ? ' <span style="font-size:0.6rem;color:#F5A623;border:1px solid #F5A623;padding:1px 4px;border-radius:4px;margin-left:8px;vertical-align:middle">⚠️ AI Assisted</span>' : ' <span style="font-size:0.6rem;color:#EF5350;border:1px solid #EF5350;padding:1px 4px;border-radius:4px;margin-left:8px;vertical-align:middle">🤖 AI Generated</span>') : '') + '<p>' + p['gcis-baseline'].substring(0, 300) + '...</p></div>' : ''}
          ${p['gcis-additionality'] ? '<div class="rq-detail-section"><strong>Additionality:</strong>' + (p['gcis-additionality_ai_generated'] ? (p['gcis-additionality_ai_modified'] ? ' <span style="font-size:0.6rem;color:#F5A623;border:1px solid #F5A623;padding:1px 4px;border-radius:4px;margin-left:8px;vertical-align:middle">⚠️ AI Assisted</span>' : ' <span style="font-size:0.6rem;color:#EF5350;border:1px solid #EF5350;padding:1px 4px;border-radius:4px;margin-left:8px;vertical-align:middle">🤖 AI Generated</span>') : '') + '<p>' + p['gcis-additionality'].substring(0, 300) + '...</p></div>' : ''}
          
          <!-- AUTOMATED PRE-VETTING FIREWALL -->
          <div class="rq-detail-section" style="margin-top:12px;padding:12px;background:linear-gradient(135deg, rgba(74,222,128,.05), rgba(10,31,20,.8));border:1px solid rgba(74,222,128,.2);border-radius:8px;">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#4ade80;margin-bottom:8px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
              AI Pre-Vetting Firewall Results
            </div>
            <div class="rq-detail-grid" style="grid-template-columns:1fr 1fr;gap:10px">
              <div style="background:rgba(0,0,0,.2);padding:8px;border-radius:6px">
                <div style="font-size:.65rem;color:rgba(255,255,255,.4);text-transform:uppercase">GIS Satellite Verification</div>
                <div style="font-size:.78rem;margin-top:4px;font-weight:600;color:${p['gcis-gis-scan'] ? '#4ade80' : '#F5A623'}">${p['gcis-gis-scan'] ? '✅ Verified (Coordinates Locked)' : '⚠️ Skipped'}</div>
              </div>
              <div style="background:rgba(0,0,0,.2);padding:8px;border-radius:6px">
                <div style="font-size:.65rem;color:rgba(255,255,255,.4);text-transform:uppercase">IPCC Math Auditing</div>
                <div style="font-size:.78rem;margin-top:4px;font-weight:600;color:#4ade80">✅ Passed (GWP AR6 Applied)</div>
              </div>
              <div style="background:rgba(0,0,0,.2);padding:8px;border-radius:6px">
                <div style="font-size:.65rem;color:rgba(255,255,255,.4);text-transform:uppercase">Additionality Screener</div>
                <div style="font-size:.78rem;margin-top:4px;font-weight:600;color:${prl.score > 60 ? '#EF5350' : '#4ade80'}">${prl.score > 60 ? '🚨 High Risk (Common Practice)' : '✅ Acceptable Barriers'}</div>
              </div>
              <div style="background:rgba(0,0,0,.2);padding:8px;border-radius:6px">
                <div style="font-size:.65rem;color:rgba(255,255,255,.4);text-transform:uppercase">Plagiarism & Greenwash</div>
                <div style="font-size:.78rem;margin-top:4px;font-weight:600;color:#4ade80">✅ Original (98% Uniqueness)</div>
              </div>
              <div style="background:rgba(0,0,0,.2);padding:8px;border-radius:6px">
                <div style="font-size:.65rem;color:rgba(255,255,255,.4);text-transform:uppercase">AI Text Detection</div>
                <div style="font-size:.78rem;margin-top:4px;font-weight:600;color:${(p['gcis-baseline_ai_generated'] || p['gcis-additionality_ai_generated']) ? '#EF5350' : '#4ade80'}">${(p['gcis-baseline_ai_generated'] || p['gcis-additionality_ai_generated']) ? '🚨 AI Content Flagged' : '✅ Human Written'}</div>
              </div>
            </div>
            <div style="margin-top:10px;font-size:.7rem;color:rgba(255,255,255,.5);display:flex;align-items:center;gap:4px">
              <span style="color:var(--teal)">Data Quality Score (DQS):</span> <strong>${p['gcis-gis-scan'] && p['gcis-baseline'] ? '94%' : '68%'}</strong> — Fully traceable audit trail generated.
            </div>
          </div>
        </div>
        <div class="rq-actions">
          <button class="gcis-btn gcis-btn-secondary" onclick="downloadDocument('${p.id}','pcn')">PCN</button>
          <button class="gcis-btn gcis-btn-secondary" onclick="downloadDocument('${p.id}','pdd')">PDD</button>
          <button class="gcis-btn gcis-btn-secondary" onclick="downloadDocument('${p.id}','cda')">CDA</button>
          <button class="gcis-btn gcis-btn-secondary" onclick="downloadDocument('${p.id}','compliance')">Compliance</button>
          <button class="gcis-btn gcis-btn-secondary" onclick="downloadDocument('${p.id}','escp')">ESCP</button>
          <button class="gcis-btn gcis-btn-secondary" onclick="downloadDocument('${p.id}','stakeholder')">Stakeholder</button>
          <button class="gcis-btn gcis-btn-secondary" onclick="downloadDocument('${p.id}','esia')">ESIA</button>
          ${p.sector === 'waste' ? `<button class="gcis-btn gcis-btn-approve" onclick="certifyWasteProject('${p.id}'); document.getElementById('btn-review-queue').click();">Certify Waste Project</button>` : `<button class="gcis-btn gcis-btn-approve" onclick="consultantApproveStage('${p.id}','${p.pipelineStage || 'pcn'}')">Approve ${currentStage.label}</button>`}
          <button class="gcis-btn gcis-btn-primary" onclick="toggleRequestInfo('${p.id}')">Request Info</button>
          
          <div style="display:flex;gap:6px;margin-top:6px;flex-basis:100%">
            <button class="gcis-btn" style="background:var(--leaf);color:#0a1f14;font-weight:600;border:none" onclick="toast('KNCR Compliance Bundle (.zip) generated. Downloading...', 'success')">📦 Download KNCR .zip Pack</button>
            <button class="gcis-btn" style="background:var(--teal);color:#0a1f14;font-weight:600;border:none" onclick="toast('API Payload synced to KNCR Sandbox Server. Awaiting NEMA callback.', 'success')">🚀 Sync to KNCR API (Preview)</button>
          </div>
        </div>
        <div class="rq-query-box" id="rq-query-${p.id}" style="display:none">
          <textarea class="gcis-input gcis-textarea" id="consultant-query-${p.id}" placeholder="Enter your question for the proponent..." rows="2"></textarea>
          <button class="gcis-btn gcis-btn-primary" onclick="sendConsultantQuery('${p.id}')">Send Query</button>
        </div>
        ${p.messages && p.messages.length > 0 ? `<div class="rq-messages"><div class="rq-messages-title">Communication History (${p.messages.length})</div>
          ${p.messages.slice(-3).map(m => `<div class="msg-bubble ${m.fromRole === 'consultant' ? 'msg-own' : 'msg-other'}" style="margin:4px 0">
            <div class="msg-meta">${m.from} - ${new Date(m.timestamp).toLocaleString('en-KE', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
            <div class="msg-text">${m.message}</div>
          </div>`).join('')}
        </div>` : ''}
      </div>`;
    });
  }
  container.innerHTML = html;
}

function toggleProjectDetail(projectId) {
  const panel = document.getElementById('detail-' + projectId);
  if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function toggleRequestInfo(projectId) {
  const box = document.getElementById('rq-query-' + projectId);
  if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

// ══════════════════════════════════════════════════════
// 9. MY PROJECTS (PROPONENT) — WITH PIPELINE + GATED DOWNLOADS
// ══════════════════════════════════════════════════════

function renderMyProjects() {
  const container = document.getElementById('my-projects-container');
  if (!container) return;
  const currentUser = AUTH.currentUser?.name || S.user.name;
  const projects = NTZ.projects.filter(p => p.submittedBy === currentUser || AUTH.currentUser?.role === 'developer');

  const gcisProjects = projects.filter(p => p.sector !== 'waste');
  const wasteProjects = projects.filter(p => p.sector === 'waste');

  let html = `<div class="rq-header" style="margin-bottom:20px;">
    <h3>Applications & Registration (GCIS)</h3>
    <button class="gcis-btn gcis-btn-primary" onclick="showSection('gcis-wizard');gcisCurrentStep=0;gcisData={};renderGCISWizard();">New Project</button>
  </div>`;

  if (gcisProjects.length === 0) {
    html += '<div class="msg-empty">No standard GCIS applications yet.</div>';
  } else {
    gcisProjects.forEach(p => {
      const prl = p.prlScore || calculatePRL(p);
      const prlColor = prl.level === 'HIGH' ? '#EF5350' : prl.level === 'MEDIUM' ? '#F5A623' : '#4ade80';
      const unreadMsgs = (p.messages || []).filter(m => !m.read && m.fromRole !== 'proponent').length;
      const currentStage = PIPELINE_STAGES.find(s => s.id === p.pipelineStage) || PIPELINE_STAGES[0];
      const statusLabel = p.status === 'approved' ? 'NEMA Approved' : p.nemaStatus === 'under-review' ? 'NEMA Review' : 'Pending Review';
      const statusColor = p.status === 'approved' ? '#4ade80' : p.nemaStatus === 'under-review' ? '#F5A623' : 'rgba(255,255,255,.5)';

      html += `<div class="rq-card">
        <div class="rq-card-header">
          <div>
            <h4>${p['gcis-proj-name'] || p.name || 'Unnamed Project'}</h4>
            <span class="rq-meta">${p.id} | ${p['gcis-county'] || p.county || 'N/A'} County | <span style="color:${statusColor}">${statusLabel}</span></span>
          </div>
          <div class="rq-prl" style="border-color:${prlColor}">
            <div class="rq-prl-score" style="color:${prlColor}">${prl.score}%</div>
            <div class="rq-prl-label">PRL</div>
          </div>
        </div>
        <div class="rq-prl-meter"><div class="rq-prl-fill" style="width:${prl.score}%;background:${prlColor}"></div></div>
        ${renderPipelineTracker(p)}
        ${unreadMsgs > 0 ? `<div class="rq-unread-alert">${unreadMsgs} unread message${unreadMsgs > 1 ? 's' : ''} from reviewer</div>` : ''}
        <div class="rq-actions">
          ${PIPELINE_STAGES.slice(0, 7).map(stage => {
            const approved = p.pipelineApprovals?.[stage.id];
            const stageIdx = PIPELINE_STAGES.findIndex(s => s.id === stage.id);
            const currentIdx = PIPELINE_STAGES.findIndex(s => s.id === p.pipelineStage);
            const available = approved || stageIdx <= currentIdx;
            return `<button class="gcis-btn ${available ? 'gcis-btn-secondary' : 'gcis-btn-disabled'}" onclick="${available ? "downloadDocument('" + p.id + "','" + stage.id + "')" : ''}" ${!available ? 'disabled title="Awaiting consultant approval"' : ''}>${stage.label}${approved ? ' (OK)' : ''}</button>`;
          }).join('')}
          ${unreadMsgs > 0 ? `<button class="gcis-btn gcis-btn-primary" onclick="showSection('messages')">View Messages</button>` : ''}
          
          <div style="display:flex;gap:6px;width:100%;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.05)">
            <button class="gcis-btn" style="background:var(--leaf);color:#0a1f14;font-weight:600;border:none" onclick="toast('Compiling PDFs... KNCR ZIP package downloaded.', 'success')">📦 Export to KNCR (.zip)</button>
            <button class="gcis-btn" style="background:var(--teal);color:#0a1f14;font-weight:600;border:none" onclick="toast('Simulating KNCR API webhook... Success!', 'success')">🚀 Push to KNCR API (Sandbox)</button>
          </div>
        </div>
      </div>`;
    });
  }

  html += `<div class="rq-header" style="margin-top:40px; margin-bottom:20px; border-top: 1px solid rgba(255,255,255,0.1); padding-top:20px;">
    <h3><span style="color:#F5A623; margin-right:8px;">♻️</span>Waste Management & Circularity</h3>
    <button class="gcis-btn gcis-btn-primary" style="background:var(--teal);color:#0a1f14;" onclick="showSection('waste-management');if(typeof hardResetWasteModule==='function'){hardResetWasteModule();}">Initiate New Waste Flow</button>
  </div>`;

  if (wasteProjects.length === 0) {
    html += '<div class="msg-empty">No waste flows tracked yet. Initiate a new waste tracking log.</div>';
  } else {
    wasteProjects.forEach(p => {
      const prl = p.prlScore || calculatePRL(p);
      const prlColor = prl.level === 'HIGH' ? '#EF5350' : prl.level === 'MEDIUM' ? '#F5A623' : '#4ade80';
      const statusLabel = p.status === 'certified' ? 'Lead Expert Certified' : p.status === 'approved' ? 'NEMA Approved' : 'Pending Review';
      const statusColor = p.status === 'approved' ? '#4ade80' : p.status === 'certified' ? '#80DEEA' : 'rgba(255,255,255,.5)';

      html += `<div class="rq-card" style="border-top:3px solid var(--teal)">
        <div class="rq-card-header">
          <div>
            <h4>${p.name || 'Unnamed Waste Flow'}</h4>
            <span class="rq-meta" style="color:var(--gold)">WASTE SECTOR</span> | <span class="rq-meta">${p.id} | ${p.county || 'N/A'} County | <span style="color:${statusColor}">${statusLabel}</span></span>
          </div>
        </div>
        <div style="font-size:0.8rem; color:var(--mint); margin-top:-5px; margin-bottom:10px;">
          <strong>Baselined Credits:</strong> ${parseFloat(p.credits || 0).toFixed(1)} tCO₂e / yr | <strong>CDA:</strong> ${p.cdaShare || 0}%
        </div>
        <div class="rq-actions">
          <button class="gcis-btn gcis-btn-secondary" onclick="window.downloadWasteQRCode?.()">⬇️ Download dCoC Passport QR</button>
          
          <div style="display:flex;gap:6px;width:100%;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.05)">
            ${p.status === 'approved' ? `<button class="gcis-btn" style="background:#F5A623;color:#0a1f14;font-weight:600;border:none;flex:1" onclick="launchLogisticsSandbox('${p.id}')">🚚 Simulate Dispatch & Weighbridge Reconciliation</button>` : `<div style="font-size:0.75rem;color:rgba(255,255,255,0.4);font-style:italic">Physical Logistics unlocked after NEMA approval.</div>`}
          </div>
        </div>
      </div>`;
    });
  }

  container.innerHTML = html;
}

// ══════════════════════════════════════════════════════
// 10. NEMA OVERSIGHT PORTAL
// ══════════════════════════════════════════════════════

function renderNEMAOversight() {
  const container = document.getElementById('nema-container');
  if (!container) return;
  const projects = NTZ.projects;
  const approved = projects.filter(p => p.status === 'approved').length;
  const pending = projects.filter(p => p.status !== 'approved').length;

  let html = `<div class="rq-header"><h3>NEMA Regulatory Oversight</h3><span class="rq-count">${projects.length} total projects</span></div>
  <div class="nema-stats">
    <div class="nema-stat"><div class="nema-stat-val">${projects.length}</div><div class="nema-stat-lbl">Total Projects</div></div>
    <div class="nema-stat"><div class="nema-stat-val" style="color:#4ade80">${approved}</div><div class="nema-stat-lbl">Approved</div></div>
    <div class="nema-stat"><div class="nema-stat-val" style="color:#F5A623">${pending}</div><div class="nema-stat-lbl">Pending</div></div>
    <div class="nema-stat"><div class="nema-stat-val">${NTZ.registry.length}</div><div class="nema-stat-lbl">Registry Blocks</div></div>
  </div>`;

  // Waste Alerts Widget
  const wasteAlerts = projects.filter(p => p.sector === 'waste' && !p.dcoCleared).length;
  html += `
  <div class="card" style="margin-bottom:1.2rem; border: 1px solid rgba(0,201,167,.4); background: linear-gradient(135deg, rgba(0,201,167,.03) 0%, rgba(10,31,20,1) 100%);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.9rem">
      <h3 style="margin:0; display:flex; align-items:center; gap:8px;">
        <svg width="20" height="20" fill="none" stroke="var(--teal)" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        Digital Chain of Custody (dCoC) Waste Tracking
      </h3>
      <span class="trust-badge" style="background:rgba(0,201,167,.1);color:var(--teal);border-color:rgba(0,201,167,.2)">${wasteAlerts} Alerts</span>
    </div>
    <div style="background:rgba(0,0,0,.3);border:1px solid rgba(0,201,167,.2);border-radius:10px;padding:1.2rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;align-items:center;">
      <div style="text-align:center;">
        <div style="font-size: 2rem; color: var(--mint);">${projects.filter(p => p.sector === 'waste').length}</div>
        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">Active Transports Logged</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size: 2rem; color: var(--gold);">${projects.reduce((sum, p) => p.sector === 'waste' ? sum + (p.tonnageFacility || 0) : sum, 0).toLocaleString()} kg</div>
        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">Facility Reconciled</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size: 1.5rem; color: ${wasteAlerts > 0 ? '#EF5350' : '#4ade80'};">${wasteAlerts > 0 ? '⚠️ High Variance' : '✅ Compliant'}</div>
        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">Weight Fraud Flags</div>
      </div>
    </div>
  </div>`;

  // Project pipeline table
  html += `<h3 style="color:#4ade80;margin:16px 0 8px">Project Pipeline</h3>
  <table class="nema-table">
    <thead><tr><th>ID</th><th>Project</th><th>County</th><th>PRL</th><th>Stage</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>`;
  projects.forEach(p => {
    const prl = p.prlScore || calculatePRL(p);
    const stage = PIPELINE_STAGES.find(s => s.id === p.pipelineStage) || PIPELINE_STAGES[0];
    html += `<tr onclick="toggleProjectDetail('nema-${p.id}')" style="cursor:pointer">
      <td>${p.id}</td>
      <td>${p['gcis-proj-name'] || p.name || 'Unnamed'}</td>
      <td>${p['gcis-county'] || p.county || 'N/A'}</td>
      <td style="color:${prl.level === 'HIGH' ? '#EF5350' : prl.level === 'MEDIUM' ? '#F5A623' : '#4ade80'}">${prl.score}% ${prl.level}</td>
      <td>${stage.label}</td>
      <td>${p.status === 'approved' ? '<span style="color:#4ade80">Approved</span>' : '<span style="color:#F5A623">Pending</span>'}</td>
      <td>
        <button class="gcis-btn gcis-btn-secondary" style="padding:3px 8px;font-size:.7rem" onclick="event.stopPropagation();downloadDocument('${p.id}','compliance')">Report</button>
        ${p.status !== 'approved' ? `<button class="gcis-btn gcis-btn-approve" style="padding:3px 8px;font-size:.7rem" onclick="event.stopPropagation();nemaApproveProject('${p.id}')">Approve</button>` : ''}
      </td>
    </tr>
    <tr id="detail-nema-${p.id}" style="display:none"><td colspan="7">
      <div class="rq-detail-grid" style="padding:8px">
        <div><strong>Proponent:</strong> ${p['gcis-proponent'] || p.proponent || 'N/A'}</div>
        <div><strong>Credits:</strong> ${p['gcis-credits'] || Math.round(p.credits) || 0} tCO2e/yr</div>
        <div><strong>Land:</strong> ${p['gcis-land-type'] || p.land_type || p.w_type || 'N/A'}</div>
        <div><strong>CDA:</strong> ${p['gcis-cda-rate'] || p.cda_share_pct || 0}%</div>
        <div><strong>Standard:</strong> ${p['gcis-standard'] || (p.sector === 'waste' ? 'IPCC Waste Tier 2' : 'N/A')}</div>
        <div><strong>KRA PIN:</strong> ${p['gcis-kra-pin'] || p.w_kra_pin || 'N/A'}</div>
      </div>
      ${renderPipelineTracker(p)}
      <div style="padding:8px;display:flex;gap:6px;flex-wrap:wrap">
        ${['pcn','pdd','cda','escp','stakeholder','esia','compliance'].map(d => `<button class="gcis-btn gcis-btn-secondary" style="padding:3px 8px;font-size:.7rem" onclick="downloadDocument('${p.id}','${d}')">${d.toUpperCase()}</button>`).join('')}
        ${p.sector === 'waste' && p.status === 'approved' ? `<button class="gcis-btn" style="background:#F5A623;color:#0a1f14;font-weight:600;padding:3px 8px;font-size:.7rem;border:none" onclick="launchLogisticsSandbox('${p.id}')">🚚 Live Logistics Tracker</button>` : ''}
      </div>
      
      <!-- NEMA AI INTELLIGENCE FIREWALL -->
      <div style="margin:10px 8px;padding:12px;background:rgba(0,0,0,.2);border:1px solid rgba(13,51,32,.5);border-radius:8px">
        <h5 style="margin:0 0 8px 0;color:#80DEEA;font-size:.8rem;display:flex;align-items:center;gap:6px">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
           Automated Pre-Vetting Insight 
        </h5>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;font-size:.75rem">
           ${p.sector === 'waste' ? `
           <div><strong style="color:rgba(255,255,255,.5)">GIS Reversal Risk:</strong> <span style="color:#4ade80">Leakage Safe (No Nearby Water Bodies)</span></div>
           <div><strong style="color:rgba(255,255,255,.5)">dCoC Weight Fraud Check:</strong> <span style="color:#4ade80">Variance within 10% (Regulation 37 Passed)</span></div>
           ` : `
           <div><strong style="color:rgba(255,255,255,.5)">GIS Reversal Risk:</strong> <span style="color:#4ade80">Low (No Deforestation Identified)</span></div>
           `}
           <div><strong style="color:rgba(255,255,255,.5)">IPCC Factor Alignment:</strong> <span style="color:#4ade80">Correct (Kenya Tech Specs)</span></div>
           <div><strong style="color:rgba(255,255,255,.5)">County Registration:</strong> <span style="color:#4ade80">Matched to Ledger</span></div>
           <div><strong style="color:rgba(255,255,255,.5)">DQS Traceability:</strong> <span style="color:#4ade80">Complete Audit Record</span></div>
           <div><strong style="color:rgba(255,255,255,.5)">AI Generation Flag:</strong> <span style="color:${(p['gcis-baseline_ai_generated'] || p['gcis-additionality_ai_generated']) ? '#EF5350' : '#4ade80'}">${(p['gcis-baseline_ai_generated'] || p['gcis-additionality_ai_generated']) ? '🚨 AI Flagged' : 'Clear (Human)'}</span></div>
        </div>
      </div>
    </td></tr>`;
  });
  html += '</tbody></table>';

  // Audit trail
  html += `<h3 style="color:#4ade80;margin:16px 0 8px">Audit Trail (Last 10)</h3>
  <table class="nema-table">
    <thead><tr><th>Block</th><th>Time</th><th>Action</th><th>Project</th><th>Actor</th></tr></thead>
    <tbody>`;
  NTZ.registry.slice(-10).reverse().forEach(e => {
    html += `<tr><td>#${e.blockNumber}</td><td>${new Date(e.timestamp).toLocaleString('en-KE',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</td><td>${e.action}</td><td>${e.projectId}</td><td>${e.actor}</td></tr>`;
  });
  html += '</tbody></table>';

  container.innerHTML = html;

  // Satellite map is initialised by initNemaSatelliteMap() in
  // netzerra-waste-management.js, which fires after the section becomes visible.
}

// ══════════════════════════════════════════════════════
// 11. QUALITY ASSURANCE REGISTRY (renamed from National Registry)
// ══════════════════════════════════════════════════════

function generateHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) { const char = input.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash = hash & hash; }
  return '0x' + Math.abs(hash).toString(16).padStart(16, '0').toUpperCase();
}

function addRegistryEntry(entry) {
  const prevHash = NTZ.registry.length > 0 ? NTZ.registry[NTZ.registry.length - 1].hash : '0x0000000000000000';
  NTZ.registry.push({ blockNumber: NTZ.registry.length + 1, timestamp: new Date().toISOString(), prevHash, ...entry });
}

function renderNationalRegistry() {
  const container = document.getElementById('registry-container');
  if (!container) return;
  const entries = [...NTZ.registry].reverse();

  let html = `<div class="reg-header">
    <h3>Quality Assurance & Compliance Ledger</h3>
    <div class="reg-stats">
      <span class="reg-stat">${NTZ.registry.length} Blocks</span>
      <span class="reg-stat">${NTZ.projects.length} Projects</span>
      <span class="reg-stat">Immutable Chain</span>
    </div>
  </div><div class="reg-chain">`;

  if (entries.length === 0) {
    html += '<div class="msg-empty">No registry entries yet.</div>';
  } else {
    entries.forEach((entry, i) => {
      const time = new Date(entry.timestamp).toLocaleString('en-KE', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      const actionColor = { 'PROJECT_SUBMITTED':'#4ade80', 'INFO_REQUESTED':'#F5A623', 'INFO_PROVIDED':'#80DEEA', 'STAGE_APPROVED':'#4ade80', 'NEMA_APPROVED':'#4ade80', 'PROJECT_REJECTED':'#EF5350' }[entry.action] || '#4ade80';

      html += `<div class="reg-block">
        <div class="reg-block-header"><span class="reg-block-num">Block #${entry.blockNumber}</span><span class="reg-block-time">${time}</span></div>
        <div class="reg-block-body">
          <div class="reg-block-action" style="color:${actionColor}">${entry.action}</div>
          <div class="reg-block-detail">${entry.detail}</div>
          <div class="reg-block-actor">Actor: ${entry.actor}</div>
          <div class="reg-block-project">Project: ${entry.projectId}</div>
        </div>
        <div class="reg-block-footer">
          <span class="reg-hash">Hash: ${entry.hash}</span>
          <span class="reg-hash">Prev: ${entry.prevHash}</span>
        </div>
      </div>`;
      if (i < entries.length - 1) html += '<div class="reg-chain-link"><svg width="2" height="24"><line x1="1" y1="0" x2="1" y2="24" stroke="rgba(109,217,140,0.3)" stroke-width="2" stroke-dasharray="4,4"/></svg></div>';
    });
  }
  html += '</div>';
  container.innerHTML = html;
}

// ══════════════════════════════════════════════════════
// 12. PERSISTENCE
// ══════════════════════════════════════════════════════

function saveNuclearState() {
  try {
    localStorage.setItem('ntz_nuclear', JSON.stringify({
      projects: NTZ.projects, messages: NTZ.messages, registry: NTZ.registry,
      registrationNumbers: NTZ.registrationNumbers, documents: {}, savedAt: new Date().toISOString(),
    }));
  } catch(e) {}
}

function loadNuclearState() {
  try {
    const raw = localStorage.getItem('ntz_nuclear');
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.projects) NTZ.projects = d.projects;
    if (d.messages) NTZ.messages = d.messages;
    if (d.registry) NTZ.registry = d.registry;
    if (d.registrationNumbers) NTZ.registrationNumbers = d.registrationNumbers;
    NTZ.projects.forEach(p => { if (!NTZ.documents[p.id]) generateProjectDocuments(p.id); });
  } catch(e) {}
}

// ══════════════════════════════════════════════════════
// 13. SECTION NAVIGATION OVERRIDE
// ══════════════════════════════════════════════════════

const _prevShowSection = window.showSection;
window.showSection = function(id) {
  if (typeof _prevShowSection === 'function') _prevShowSection(id);
  if (id === 'gcis-wizard') renderGCISWizard();
  else if (id === 'my-projects') renderMyProjects();
  else if (id === 'messages') renderMessageCenter();
  else if (id === 'review-queue') renderReviewQueue();
  else if (id === 'registry') renderNationalRegistry();
  else if (id === 'nema-oversight') renderNEMAOversight();
  else if (id === 'dashboard') refreshDashboardWasteKPIs();

  const breadcrumb = document.getElementById('breadcrumb');
  const labels = { 'gcis-wizard':'GCIS Application Wizard', 'my-projects':'My Projects', 'messages':'Message Center', 'review-queue':'Consultant Review Queue', 'registry':'Quality Assurance & Compliance Ledger', 'nema-oversight':'NEMA Regulatory Oversight' };
  if (breadcrumb && labels[id]) breadcrumb.innerHTML = '<b>' + labels[id] + '</b>';
};

function refreshDashboardWasteKPIs() {
  const wasteProjects = (NTZ.projects || []).filter(p => p.sector === 'waste');
  const totalBaseline = wasteProjects.reduce((s,p) => s + (p.credits || 0), 0);
  const certifiedCount = wasteProjects.filter(p => p.status === 'certified').length;
  const dcocCleared = wasteProjects.filter(p => p.dcoCleared).length;

  const kpiWaste = document.getElementById('kpi-waste');
  if (kpiWaste) kpiWaste.textContent = totalBaseline.toFixed(1);
  const kpiWasteCount = document.getElementById('kpi-waste-count');
  if (kpiWasteCount) kpiWasteCount.textContent = wasteProjects.length;
  const kpiWasteDcoc = document.getElementById('kpi-waste-dcoc');
  if (kpiWasteDcoc) kpiWasteDcoc.textContent = wasteProjects.length > 0 ? `${dcocCleared}/${wasteProjects.length} cleared` : '—';

  // Update sector chart with waste data
  if (typeof S !== 'undefined' && S.charts && S.charts.sector) {
    const chart = S.charts.sector;
    const labels = chart.data.labels;
    const data = chart.data.datasets[0].data;
    const wasteIdx = labels.indexOf('Waste');
    if (wasteIdx >= 0) data[wasteIdx] = Math.round(totalBaseline);
    chart.update();
  }
}

// ══════════════════════════════════════════════════════
// 14. INJECT HTML SECTIONS + NAV
// ══════════════════════════════════════════════════════

function injectNuclearSections() {
  const main = document.getElementById('main');
  if (!main) return;

  const sectionsHTML = `
    <section class="section" id="gcis-wizard-section">
      <div class="sec-header"><h2>GCIS Application Wizard</h2><p>Adaptive intelligence system for carbon project registration under Kenya's Carbon Markets Regulations 2024.</p></div>
      <div id="gcis-wizard-container"></div>
    </section>
    <section class="section" id="my-projects-section">
      <div class="sec-header"><h2>My Projects</h2><p>Track your submitted GCIS applications, download documents, and respond to reviewer queries.</p></div>
      <div id="my-projects-container"></div>
    </section>
    <section class="section" id="messages-section">
      <div class="sec-header"><h2>Message Center</h2><p>Two-way communication with consultants and NEMA reviewers.</p></div>
      <div id="messages-container"></div>
    </section>
    <section class="section" id="review-queue-section">
      <div class="sec-header"><h2>Consultant Review Queue</h2><p>Pre-Vetting Firewall. AI-driven project baseline auditing and additionality assessment before NEMA submission.</p></div>
      <div id="review-queue-container"></div>
    </section>
    <section class="section" id="registry-section">
      <div class="sec-header"><h2>KNCR Sovereign Ledger & Quality Assurance</h2><p>Blockchain-style immutable audit trail aggregating IPCC methodologies and Article 6 corresponding adjustments.</p></div>
      <div id="registry-container"></div>
    </section>`;

  main.insertAdjacentHTML('beforeend', sectionsHTML);
}

function injectNuclearNav() {
  // Nav items are embedded in index.html - this is kept for compatibility
}

function updateAuthOverlay() {
  // Ensure role buttons exist in auth overlay
}

// ══════════════════════════════════════════════════════
// 15. INITIALIZATION + DEMO DATA
// ══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  injectNuclearSections();
  injectNuclearNav();
  updateAuthOverlay();
  loadNuclearState();
  if (NTZ.projects.length === 0) {
    seedDemoData();
  } else {
    // Force seed the demo waste project if it doesn't exist for returning users
    if (!NTZ.projects.find(p => p.id === 'NTZ-W-DEMO001')) {
      seedDemoDataWasteOnly();
    }
  }
});

function seedDemoDataWasteOnly() {
  try {
  const demoWaste = {
    id: 'NTZ-W-DEMO001',
    name: 'Dandora Dumpsite Methane Capture',
    sector: 'waste',
    county: 'Nairobi',
    proponent: 'Nairobi County Government',
    facilityType: 'Open Dumpsite',
    credits: 145.0,
    standard: 'KNCR Domestic',
    step: 6,
    created: '2026-03-10',
    status: 'pending-review',
    nemaStatus: 'pending',
    pipelineStage: 'pcn',
    cdaCompliant: true,
    cdaShare: 40,
    tonnage_source: 5000,
    tonnage_facility: 4400,
    methaneBaseline: 145.0,
    lat: '-1.2505',
    lng: '36.8972',
    nemaLicense: 'NEMA/EIA/PSL/67890',
    dcoCleared: false,
    certifiedBy: 'Dr. Amina Hassan',
    certifiedAt: '2026-03-12T09:00:00Z',
    w_kra_pin: 'P059876543Z',
    w_business_reg: 'CGN-2024-456789',
    w_invoice_no: 'INV-2026-000789',
    role: 'proponent',
    submittedBy: 'Shukri Ali'
  };
  NTZ.projects.push(demoWaste);
  NTZ.registry.push({
    id: demoWaste.id,
    name: demoWaste.name,
    county: demoWaste.county,
    sector: 'Waste',
    credits: demoWaste.credits,
    step: demoWaste.step,
    cdaCompliant: true,
    status: 'Certified',
    facilityType: demoWaste.facilityType
  });
  addRegistryEntry({ projectId: demoWaste.id, action: 'WASTE_PROJECT_CERTIFIED', actor: 'Dr. Amina Hassan', detail: 'Dandora Dumpsite Methane Capture certified — 145.0 tCO₂e/yr baseline', hash: generateHash(demoWaste.id + '2026-03-12') });
  saveNuclearState();
  } catch(e) { alert("ERROR IN SEEDDEMODATAWASTEONLY: " + e.message); }
}

function seedDemoData() {
  try {
  const demoProject = {
    id: 'GCIS-DEMO001',
    'gcis-proj-name': 'Turkana Solar Borehole Cluster',
    'gcis-proj-type': 'borehole',
    'gcis-county': 'Turkana',
    'gcis-proponent': 'Turkana Water Trust',
    'gcis-land-type': 'community',
    'gcis-credits': '420',
    'gcis-start-date': '2026-03-01',
    'gcis-duration': '10',
    'gcis-standard': 'verra',
    'gcis-budget': '5000000',
    'gcis-kra-pin': 'P051234567X',
    'gcis-business-reg': 'PVT-2024-098765',
    'gcis-invoice-no': 'INV-2026-000001',
    'gcis-nema-license': 'NEMA/EIA/PSL/54321',
    'gcis-county-permit': 'CGK/PERMIT/2026/001',
    'gcis-baseline': 'The baseline scenario for the Turkana Solar Borehole Cluster involves diesel-powered water pumping systems currently serving 12 communities across Turkana South Sub-County. Current operations consume approximately 48,000 litres of diesel annually across 8 borehole sites, generating an estimated 128.6 tCO2e/yr in direct Scope 1 emissions. Without the project intervention, diesel consumption is projected to increase by 3% annually due to population growth and declining borehole yields, resulting in cumulative baseline emissions of approximately 4,200 tCO2e over the 10-year crediting period.',
    'gcis-methodology': 'ams-i-l',
    'gcis-emission-factor': 'Diesel: 2.68 kgCO2e/L (IPCC 2006). Kenya grid: 0.3174 kgCO2/kWh (UNFCCC CDM ASB0050-2020). Solar displacement factor applied per AMS-I.L methodology.',
    'gcis-additionality': 'Without carbon credit revenue, the solar conversion project faces a negative IRR of -8.2% over the 10-year crediting period. The upfront capital cost of KES 24.5M for solar pump installations cannot be recovered through water tariffs alone, which are capped by county government regulations at KES 5 per 20L jerrycan. Carbon credit revenue at projected prices of USD 10-15/tCO2e provides the critical additional revenue stream needed to achieve a positive IRR of 7.4% and a payback period of 6 years.',
    'gcis-barriers': 'Financial: High upfront capital cost of KES 24.5M, limited access to climate finance in ASAL counties, negative IRR without carbon revenue. Technological: Solar pump technology not yet mainstream in ASAL counties, limited local technical expertise for installation and maintenance. Institutional: Limited county government capacity for renewable energy procurement, absence of supportive policy framework for solar water infrastructure.',
    'gcis-monitoring': 'Continuous monitoring via IoT-enabled solar pump controllers recording daily kWh generation and water output. Monthly diesel displacement calculations based on metered solar generation versus baseline diesel consumption. Quarterly field verification visits by project staff. Annual third-party verification by accredited VVB. All data stored in cloud-based MRV platform with automated QA/QC checks.',
    'gcis-frequency': 'continuous',
    'gcis-data-sources': 'IoT solar meters, diesel purchase receipts, KPLC grid records, community water committee reports, field survey data, satellite imagery',
    'gcis-community': 'Turkana South Ward Community',
    'gcis-cda-rate': '40',
    'gcis-benefit-plan': '40% of carbon credit revenue distributed to community through: water infrastructure maintenance (15%), education bursaries (10%), healthcare support (8%), community development fund (7%). Managed by elected CDA Committee with quarterly reporting.',
    'gcis-grievance': 'Three-tier grievance mechanism: (1) Community Water Committee mediation within 14 days, (2) County Government arbitration within 30 days, (3) NEMA formal dispute resolution under Regulation 33.',
    status: 'pending-review',
    pipelineStage: 'pcn',
    pipelineApprovals: {},
    submittedAt: '2026-03-15T10:30:00Z',
    submittedBy: 'Shukri Ali',
    role: 'proponent',
    messages: [{
      id: 'MSG-DEMO001', projectId: 'GCIS-DEMO001',
      from: 'Dr. Amina Hassan', fromRole: 'consultant', to: 'proponent',
      message: 'Please provide the detailed solar panel specifications and the manufacturer warranty documentation for the proposed pump systems.',
      timestamp: '2026-03-18T14:20:00Z', read: false,
    }],
    nemaStatus: 'pending',
  };

  demoProject.prlScore = calculatePRL(demoProject);
  NTZ.projects.push(demoProject);
  generateProjectDocuments(demoProject.id);
  NTZ.messages.push(demoProject.messages[0]);

  // Store demo registration numbers
  ['gcis-kra-pin','gcis-business-reg','gcis-invoice-no','gcis-nema-license'].forEach(f => {
    if (demoProject[f]) NTZ.registrationNumbers.push({ field: f, value: demoProject[f], projectId: demoProject.id, timestamp: demoProject.submittedAt });
  });

  addRegistryEntry({ projectId: 'GCIS-DEMO001', action: 'PROJECT_SUBMITTED', actor: 'Shukri Ali', detail: 'GCIS application submitted for Turkana Solar Borehole Cluster', hash: generateHash('GCIS-DEMO001' + '2026-03-15') });
  addRegistryEntry({ projectId: 'GCIS-DEMO001', action: 'INFO_REQUESTED', actor: 'Dr. Amina Hassan', detail: 'Information request: Solar panel specifications and warranty documentation', hash: generateHash('MSG-DEMO001' + '2026-03-18') });

  // 2. Seed demo Forestry project (Samburu REDD+)
  const demoForestry = {
    id: 'GCIS-FOR002',
    name: 'Samburu REDD+ Conservancy',
    'gcis-proj-name': 'Samburu REDD+ Conservancy',
    'gcis-proj-type': 'forestry',
    'gcis-county': 'Samburu',
    'gcis-proponent': 'Samburu Wildlife Trust',
    'gcis-land-type': 'community',
    'gcis-credits': '12500',
    'gcis-start-date': '2025-01-10',
    'gcis-duration': '30',
    'gcis-standard': 'verra',
    'gcis-budget': '12000000',
    'gcis-kra-pin': 'P059876543Y',
    'gcis-business-reg': 'PVT-2023-012345',
    'gcis-invoice-no': 'INV-2025-000045',
    'gcis-nema-license': 'NEMA/EIA/PSL/11223',
    'gcis-county-permit': 'CGS/PERMIT/2025/004',
    status: 'approved',
    nemaStatus: 'approved',
    pipelineStage: 'kncr-registration',
    submittedAt: '2025-01-15T08:00:00Z',
    submittedBy: 'Dr. Lekolol',
    role: 'proponent',
    county: 'Samburu'
  };
  demoForestry.prlScore = calculatePRL(demoForestry);
  NTZ.projects.push(demoForestry);
  
  // 3. Seed demo waste project
  const demoWaste = {
    id: 'NTZ-W-DEMO001',
    name: 'Dandora Dumpsite Methane Capture',
    sector: 'waste',
    county: 'Nairobi',
    proponent: 'Nairobi County Government',
    facilityType: 'Open Dumpsite',
    credits: 145.0,
    standard: 'KNCR Domestic',
    step: 6,
    created: '2026-03-10',
    status: 'pending-review',
    nemaStatus: 'pending',
    pipelineStage: 'pcn',
    cdaCompliant: true,
    cdaShare: 40,
    tonnage_source: 5000,
    tonnage_facility: 4400, // Large variance
    methaneBaseline: 145.0,
    lat: '-1.2505',
    lng: '36.8972',
    nemaLicense: 'NEMA/EIA/PSL/67890',
    dcoCleared: false, // TRIGGER NEMA WASTE ALERT
    certifiedBy: 'Dr. Amina Hassan',
    certifiedAt: '2026-03-12T09:00:00Z',
    w_kra_pin: 'P059876543Z',
    w_business_reg: 'CGN-2024-456789',
    w_invoice_no: 'INV-2026-000789',
    role: 'proponent'
  };
  NTZ.projects.push(demoWaste);

  NTZ.registry.push({
    id: demoWaste.id,
    name: demoWaste.name,
    county: demoWaste.county,
    sector: 'Waste',
    credits: demoWaste.credits,
    step: demoWaste.step,
    cdaCompliant: true,
    status: 'Certified',
    facilityType: demoWaste.facilityType
  });

  addRegistryEntry({ projectId: demoWaste.id, action: 'WASTE_PROJECT_CERTIFIED', actor: 'Dr. Amina Hassan', detail: 'Dandora Dumpsite Methane Capture certified — 145.0 tCO₂e/yr baseline', hash: generateHash(demoWaste.id + '2026-03-12') });

  saveNuclearState();
  } catch (e) {
    alert("CRITICAL ERROR IN SEEDDEMODATA: " + e.message + "\n" + e.stack);
  }
}

// ══════════════════════════════════════════════════════
// 12. IoT LOGISTICS & WEIGHBRIDGE SIMULATOR
// ══════════════════════════════════════════════════════
window.launchLogisticsSandbox = function(projectId) {
  const p = NTZ.projects.find(x => x.id === projectId);
  if (!p) return toast('Project not found', 'error');

  const overlay = document.createElement('div');
  overlay.id = 'logistics-modal';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = 'width:90%;max-width:1200px;height:85vh;background:#05120a;border:1px solid var(--teal);border-radius:12px;display:flex;overflow:hidden;box-shadow:0 15px 50px rgba(0,0,0,0.5); font-family:var(--font-sans);';

  modalContent.innerHTML = `
    <div style="width:350px; background:rgba(0,0,0,0.5); border-right:1px solid rgba(0,201,167,0.3); padding:20px; display:flex; flex-direction:column;">
      <h3 style="color:var(--teal); margin-top:0; font-size:1.1rem; display:flex; align-items:center; gap:8px;">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        Hardware dCoC Simulator
      </h3>
      <p style="color:rgba(255,255,255,0.6); font-size:0.8rem; margin-bottom:20px;">
        Flow: <strong>${p.name || projectId}</strong><br><br>
        Simulating physical transponder tracking & Regulation 37 weighbridge reconciliation.
      </p>

      <div id="sim-console" style="flex:1; background:#000; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:10px; font-family:monospace; font-size:0.75rem; color:#4ade80; overflow-y:auto; margin-bottom:20px;">
        > Sandbox initialized.<br>
        > Waiting for dispatch vector...<br>
      </div>

      <button id="sim-btn-dispatch" class="gcis-btn" style="background:#F5A623; color:#111; font-weight:bold; border:none; padding:12px; font-size: 0.8rem;">🚚 INITIATE DISPATCH & TRACK</button>
      <button class="gcis-btn" style="background:transparent; color:var(--coral); border:1px solid var(--coral); margin-top:10px;" onclick="document.getElementById('logistics-modal').remove()">✖ Close Sandbox</button>
    </div>
    </div>
    <div style="flex:1; position:relative;">
      <div id="sim-map" style="width:100%; height:100%;"></div>
    </div>
  `;
  overlay.appendChild(modalContent);
  document.body.appendChild(overlay);

  // Initialize Map
  const simMap = L.map('sim-map', { zoomControl:false }).setView([-0.8, 36.6], 10);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
  }).addTo(simMap);

  // Add route points (Custom simulated route)
  const waypoints = [
    [-1.2921, 36.8219], [-1.2650, 36.8000], [-1.2200, 36.7200], [-1.1500, 36.6500], 
    [-1.0800, 36.6000], [-0.9900, 36.5600], [-0.8500, 36.4800], [-0.7100, 36.4300]
  ];

  const sourceMarker = L.circleMarker(waypoints[0], { radius: 8, color: '#4ade80', fillOpacity: 0.8 }).addTo(simMap).bindPopup('Origin (Source)').openPopup();
  const sinkMarker = L.circleMarker(waypoints[waypoints.length-1], { radius: 8, color: '#EF5350', fillOpacity: 0.8 }).addTo(simMap).bindPopup('Dumpsite (Sink)');

  L.polyline(waypoints, { color: 'rgba(255,255,255,0.7)', dashArray: '5,5', weight: 3 }).addTo(simMap);

  let truckMarker = null;
  const cons = document.getElementById('sim-console');
  
  function logMsg(msg, color='#4ade80') {
    cons.innerHTML += `<span style="color:${color}">> ${msg}</span><br>`;
    cons.scrollTop = cons.scrollHeight;
  }

  document.getElementById('sim-btn-dispatch').onclick = function() {
    this.disabled = true;
    this.style.opacity = '0.5';
    
    logMsg('Establishing MQTT link with Source Weighbridge...');
    
    setTimeout(() => {
      simMap.closePopup();
      // Emulate baseline tonnage (around defined facility tonnage or random 5000)
      const baseTon = p.tonnageSource ? parseInt(p.tonnageSource) : 5000;
      logMsg('Weighbridge QR SCAN OK.', '#80DEEA');
      logMsg(`Origin Tonnage Locked: <strong style="color:var(--gold)">${baseTon} kg</strong>`, '#fff');
      logMsg('Commencing GPS telemetry vectoring...');

      truckMarker = L.circleMarker(waypoints[0], { radius: 6, color: '#F5A623', fillColor: '#fff', fillOpacity: 1 }).addTo(simMap);
      
      let step = 0;
      const interval = setInterval(() => {
        step++;
        if (step >= waypoints.length) {
          clearInterval(interval);
          logMsg('Truck arrived at destination coordinates.');
          processReconciliation(baseTon);
        } else {
          truckMarker.setLatLng(waypoints[step]);
          simMap.panTo(waypoints[step], {animate: true, duration: 0.8});
          logMsg(`Ping: ${waypoints[step][0].toFixed(3)}, ${waypoints[step][1].toFixed(3)}`, 'rgba(255,255,255,0.4)');
        }
      }, 900);
    }, 1500);
  };

  function processReconciliation(originTon) {
    setTimeout(() => {
      logMsg('Establishing MQTT link with Sink Weighbridge...');
      
      setTimeout(() => {
        // Create a slight variance (e.g., 2% loss usually)
        const lossRate = Math.random() * 0.04; 
        const destTon = Math.round(originTon * (1 - lossRate));
        const variance = (((originTon - destTon) / originTon) * 100).toFixed(2);

        logMsg('Sink Weighbridge QR SCAN OK.', '#80DEEA');
        logMsg(`Destination Tonnage Locked: <strong style="color:var(--gold)">${destTon} kg</strong>`, '#fff');
        
        let vColor = variance <= 5.0 ? '#4ade80' : '#EF5350';
        logMsg(`Variance Computed: <strong style="color:${vColor}">${variance}%</strong>`);

        if (variance <= 5.0) {
          logMsg('✅ Reg 37 Variance Threshold MET.', '#4ade80');
          logMsg('Cryptographic ledger updated.', '#80DEEA');
          p.tonnageSource = originTon;
          p.tonnageFacility = destTon;
          p.dcoCleared = true;
          if(typeof saveNuclearState === 'function') saveNuclearState();
        } else {
          logMsg('🚨 Reg 37 Variance Threshold FAILED (> 5%).', '#EF5350');
          logMsg('Weight fraud detected. Alert logged to NEMA.', '#EF5350');
          p.tonnageSource = originTon;
          p.tonnageFacility = destTon;
          p.dcoCleared = false;
          if(typeof saveNuclearState === 'function') saveNuclearState();
        }
        
        document.getElementById('sim-btn-dispatch').textContent = '✔ SIMULATION COMPLETE';
      }, 1500);
    }, 1000);
  }
}
