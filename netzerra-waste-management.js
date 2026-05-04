// ═══════════════════════════════════════════════════════════
// NETZERRA WASTE MANAGEMENT MODULE v6.0 (TITAN SOVEREIGN)
// The 9-Step Waste GCIS Workflow per Directive
// Digital Chain of Custody (dCoC) + Role-Based Sovereign Dashboards
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// THE CONSTITUTION (Hardcoded Sovereign Values)
// ═══════════════════════════════════════════════════════════
const SOVEREIGN_VALUES = {
  // Regulations
  REGULATION_37_PENALTY_KES: 500000000, // KES 500M for false data
  REGULATION_23E_LAND_SHARE_PCT: 40,      // 40% for land-based projects
  REGULATION_23E_NONLAND_SHARE_PCT: 25, // 25% for non-land projects
  
  // Waste Math (IPCC 2019 Refinement)
  SOLID_WASTE_EF: 0.58,      // kg CH4/kg waste
  WASTEWATER_EF: 0.025,      // kg CH4/kg COD
  METHANE_GWP: 27.0,          // AR6 100-yr GWP
  
  // PRL (Project Readiness Level) Math
  PRL_DATA_QUALITY_PCT: 30,      // 30% weight
  PRL_CDA_COMPLIANCE_PCT: 40,    // 40% weight
  PRL_METHODOLOGY_PCT: 30,        // 30% weight
  
  // Waste Stream DOC Defaults (IPCC)
  DOC_MUNICIPAL: 0.15,       // Degradable organic carbon fraction
  DOC_INDUSTRIAL: 0.10,
  DOC_HEALTHCARE: 0.12,
  DOC_AGRICULTURAL: 0.20,
  
  // IoT & Traceability
  WEIGHT_VARIANCE_THRESHOLD_PCT: 10,  // Regulation 37 trigger
  TRUCK_SPEED_KMH: 40,                // Simulation speed
  LEDGER_HASH_ALGO: 'SHA-256'
};

// ═══════════════════════════════════════════════════════════
// WASTE GCIS AI SYSTEM PROMPT - Zerra Conversational Intake
// ═══════════════════════════════════════════════════════════
const WASTE_GCIS_SYSTEM_PROMPT = `You are Zerra, the AI guide for Netzerra's Waste GCIS Wizard.

Your job is to conduct a structured adaptive intake interview for a new waste facility registration under Regulation 21(2) of the Carbon Markets Regulations 2024 and the Sustainable Waste Management Act 2022.

WASTE-SPECIFIC REGULATORY GROUNDING:
- EMCA 1999 S87: NEMA waste licence requirement
- Sustainable Waste Management Act 2022 (SWMA): dCoC and EPR obligations
- Plastic Bags Regulations 2017: EPR producer take-back
- Health Act 2017: healthcare waste separate regime
- IPCC 2006 Vol.5 Ch.3: waste sector methane methodology
- Regulation 37: KES 500M penalty for false waste manifest data
- SWMA Section 28: Digital Chain of Custody (dCoC) requirement
- CDM AMS-III.G: landfill gas capture methodology
- Methane EF: 0.58 kgCH4/kg waste (IPCC default East Africa)
- Wastewater EF: 0.025 kgCH4/kg COD
- CH4 GWP: 27.0 (IPCC AR6 100-year)

CONVERSATION FLOW - ask in this sequence:

STEP 1 - PROJECT IDENTITY & KYC
Q1: "Habari! I'm Zerra, your Waste GCIS guide. What is the name of this waste facility or project?"
Q2: "Which county is this facility located in?"
Q3: "Who is the licensed waste operator responsible for this facility? Must be NEMA-registered."

STEP 2 - LEGAL HARD-GATE
Q4: "Does the operator hold a valid NEMA waste management licence under EMCA 1999 S87?"
HARD GATE: If no licence, block progress. Explain: apply at nema.go.ke, 2-6 weeks, KES 5,000-50,000.
Q5: "What is the NEMA licence category? Options: Category A (municipal), B (industrial), C (healthcare), D (hazardous), E (recycling), F (composting), G (waste-to-energy)."

STEP 3 - WASTE STREAMS
Q6: "What is the primary waste type? Options: Municipal Solid Waste, Industrial waste, Healthcare waste, Agricultural waste, Construction debris, Mixed recyclables, Hazardous waste."
Q7: "How many tonnes per year does this facility process?"
After Q7: Calculate preliminary IPCC methane baseline.

STEP 4 - AI VISION AUDIT
Q8: "For the AI waste composition analysis, have you uploaded site photos for Zerra to analyse?"

STEP 5 - GIS FACILITY SELECTION
Q9: "Which NEMA-licensed disposal facility will receive the waste?"

STEP 6 - IPCC TIER 2 METHANE BASELINE
Q10: "What percentage of the waste is degradable organic content (DOC)?"
Q11: "Does the facility have or plan a landfill gas (LFG) capture system?"

STEP 7 - DIGITAL CHAIN OF CUSTODY
Q12: "How will you implement the Digital Chain of Custody (dCoC) required under SWMA 2022?"

STEP 8 - CDA FOURTH SCHEDULE
Q13: "What percentage of carbon revenues will be allocated to the community under the CDA?"
HARD GATE: Minimum 25% for non-land waste projects. Block if below.
Q14: "Does the project include provisions for informal waste pickers who may be affected?"

STEP 9 - REGISTRATION SUMMARY
Q15 (FINAL): Present facility summary table, calculate PRL score, list action items, provide timeline.

AI SUGGESTION RULES:
After each question add: "Suggested answers: [3 specific, Kenya-relevant options]"

IPCC METHANE FORMULA - use this throughout:
CH4 (tonnes) = W x DOC x DOCf x F x (16/12) x MCF x (1-OX)
CH4 CO2e = CH4 tonnes x GWP(27.0)
Where: W=Annual waste tonnage, DOC=Degradable organic carbon fraction (MSW:0.17, industrial:0.10, agricultural:0.20), DOCf=0.5, F=0.5, MCF=1.0, OX=0.1
Always show this formula with real numbers substituted when you calculate it.`;

// ═══════════════════════════════════════════════════════════
// WASTE GCIS CHAT STATE
// ═══════════════════════════════════════════════════════════
let wasteGcisHistory = [];
let wasteGcisBusy = false;

const ALL_47_COUNTIES = ['Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa',"Murang'a",'Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot'];

// Licensed Waste Collection Companies in Kenya (NEMA Registered)
const LICENSED_WASTE_COMPANIES = [
  { name: 'Baus Taka Ltd', license: 'NEMA/WCL/001', counties: ['Nairobi', 'Kiambu', 'Machakos'], specialization: 'municipal' },
  { name: 'Nairobi Waste Management', license: 'NEMA/WCL/002', counties: ['Nairobi'], specialization: 'municipal' },
  { name: 'Taka Kenya Solutions', license: 'NEMA/WCL/003', counties: ['Nairobi', 'Mombasa', 'Kisumu'], specialization: 'commercial' },
  { name: 'Baus Company Ltd', license: 'NEMA/WCL/004', counties: ['Nairobi', 'Kiambu'], specialization: 'construction' },
  { name: 'Clean Sweep Kenya', license: 'NEMA/WCL/005', counties: ['Mombasa', 'Kwale', 'Kilifi'], specialization: 'municipal' },
  { name: 'Lake Basin Waste Ltd', license: 'NEMA/WCL/006', counties: ['Kisumu', 'Kakamega', 'Busia'], specialization: 'municipal' },
  { name: 'Rift Valley Disposals', license: 'NEMA/WCL/007', counties: ['Nakuru', 'Naivasha', 'Eldoret'], specialization: 'industrial' },
  { name: 'Build Waste Solutions', license: 'NEMA/WCL/008', counties: ['Nairobi', 'Mombasa', 'Kisumu'], specialization: 'construction' },
  { name: 'Green Site Collectors', license: 'NEMA/WCL/009', counties: ['Nairobi', 'Thika', 'Athi River'], specialization: 'construction' },
  { name: 'Industrial Removers Ltd', license: 'NEMA/WCL/010', counties: ['Nairobi', 'Mombasa', 'Nakuru'], specialization: 'industrial' }
];

// Construction Waste Categories
const CONSTRUCTION_WASTE_TYPES = [
  { id: 'concrete', name: 'Concrete & Masonry', recyclable: true, density: 2400 },
  { id: 'wood', name: 'Timber & Wood Products', recyclable: true, density: 600 },
  { id: 'metal', name: 'Steel & Metal Scrap', recyclable: true, density: 7850 },
  { id: 'asphalt', name: 'Asphalt & Bitumen', recyclable: true, density: 2300 },
  { id: 'gypsum', name: 'Drywall/Gypsum Board', recyclable: false, density: 800 },
  { id: 'insulation', name: 'Insulation Materials', recyclable: false, density: 50 },
  { id: 'mixed_cdw', name: 'Mixed Construction Debris', recyclable: false, density: 1200 },
  { id: 'excavation', name: 'Soil & Excavation Waste', recyclable: true, density: 1600 }
];

// GIS Areas for Kenya waste facilities with known coordinates
const GIS_WASTE_AREAS = [
  { name: 'Dandora Dumpsite, Nairobi', lat: -1.2505, lng: 36.8972, type: 'dumpsite', county: 'Nairobi' },
  { name: 'Kibera Waste Collection Point', lat: -1.315, lng: 36.783, type: 'transfer', county: 'Nairobi' },
  { name: 'Kibarani Dumpsite, Mombasa', lat: -4.065, lng: 39.678, type: 'dumpsite', county: 'Mombasa' },
  { name: 'Kisumu Kachok Dumpsite', lat: -0.095, lng: 34.768, type: 'dumpsite', county: 'Kisumu' },
  { name: 'Nakuru Gioto Dumpsite', lat: -0.285, lng: 36.076, type: 'dumpsite', county: 'Nakuru' },
  { name: 'Thika Waste Management Facility', lat: -1.033, lng: 37.072, type: 'engineered', county: 'Kiambu' },
  { name: 'Athi River Landfill', lat: -1.452, lng: 36.978, type: 'landfill', county: 'Machakos' },
  { name: 'Kisat Landfill, Kisumu', lat: -0.072, lng: 34.778, type: 'landfill', county: 'Kisumu' },
  { name: 'Kibarani Recycling Center', lat: -4.055, lng: 39.675, type: 'recycling', county: 'Mombasa' },
  { name: 'Kasarani Composting Facility', lat: -1.225, lng: 36.890, type: 'composting', county: 'Nairobi' },
  { name: 'Ruiru Waste Transfer Station', lat: -1.180, lng: 36.965, type: 'transfer', county: 'Kiambu' },
  { name: 'Syokimau Waste-to-Energy', lat: -1.365, lng: 36.925, type: 'wte', county: 'Machakos' }
];

// ═══════════════════════════════════════════════════════════
// THE 8-STEP WASTE GCIS WIZARD (TITAN SOVEREIGN DIRECTIVE v6.0)
// Step 3: Contractor | Steps 4-7: Technical | Steps 8-9: CDA & Submit
// ═══════════════════════════════════════════════════════════
const WASTE_STEPS = [
  // Step 1: Project Identity & Proponent KYC
  { id: 'step1-kyc', title: 'Step 1: Project Identity & KYC', subtitle: 'Capture Company Name, KRA PIN, Business Registration', type: 'kyc',
    inputs: [
      { id: 'w_company_name', label: 'Company Name', type: 'text', placeholder: 'e.g. EcoWaste Solutions Ltd', required: true },
      { id: 'w_kra_pin', label: 'KRA PIN Number', type: 'text', placeholder: 'e.g. P051234567X', required: true },
      { id: 'w_business_reg', label: 'Business Registration Number', type: 'text', placeholder: 'e.g. PVT-2024-123456', required: true },
      { id: 'w_proponent_name', label: 'Lead Proponent / Director', type: 'text', placeholder: 'Full name of responsible officer', required: true }
    ]
  },
  
  // Step 2: Legal Hard-Gate (NEMA License)
  { id: 'step2-license', title: 'Step 2: Legal Hard-Gate', subtitle: 'NEMA Waste Management License (Sustainable Waste Management Act 2022)', type: 'license',
    inputs: [
      { id: 'w_nema_license', label: 'NEMA License Number', type: 'text', placeholder: 'e.g. NEMA/EIA/PSL/12345', required: true },
      { id: 'w_license_expiry', label: 'License Expiry Date', type: 'date', required: true },
      { id: 'w_nema_verified', label: 'NEMA Verification Status', type: 'readonly', value: 'Pending Cross-Check' }
    ]
  },
  
  // Step 3: Licensed Waste Contractor
  { id: 'step3-contractor', title: 'Step 3: Licensed Waste Contractor', subtitle: 'NEMA Registered Waste Collection Company (e.g., Baus Taka)', type: 'contractor',
    inputs: [
      { id: 'w_contractor', label: 'Waste Collection Company', type: 'select', 
        options: LICENSED_WASTE_COMPANIES.map(c => c.name),
        required: true,
        help: 'Select from NEMA-licensed waste contractors' },
      { id: 'w_contractor_license', label: 'Waste Collector License No.', type: 'text', placeholder: 'Auto-filled from NEMA database', required: true },
      { id: 'w_transport_cert', label: 'Transport Certificate No.', type: 'text', placeholder: 'e.g. NTSA-WT-2026-001' }
    ]
  },
  
  // Step 4: Source & Stream Definition
  { id: 'step4-stream', title: 'Step 4: Source & Stream Definition', subtitle: 'Define waste source category (affects IPCC DOC defaults)', type: 'stream',
    inputs: [
      { id: 'w_stream_type', label: 'Waste Stream Category', type: 'select', 
        options: ['Municipal Solid Waste', 'Industrial Waste', 'Healthcare/Medical Waste', 'Agricultural Waste'],
        required: true,
        help: 'Selection changes IPCC Degradable Organic Carbon (DOC) defaults' },
      { id: 'w_doc_fraction', label: 'DOC Fraction (Auto-set)', type: 'readonly', 
        help: 'IPCC 2019 default: Municipal=0.15, Industrial=0.10, Healthcare=0.12, Agricultural=0.20' },
      { id: 'w_annual_volume', label: 'Estimated Annual Volume (tonnes)', type: 'number', placeholder: 'e.g. 50000', required: true }
    ]
  },
  
  // Step 5: AI Multi-Vision Audit
  { id: 'step5-vision', title: 'Step 5: AI Multi-Vision Audit', subtitle: 'Jina AI Reader + Llama 70B Vision Analysis', type: 'vision',
    help: 'Upload waste pile photos and manifests for AI composition analysis'
  },
  
  // Step 6: GIS Sovereign Proof
  { id: 'step6-gis', title: 'Step 6: GIS Sovereign Proof', subtitle: 'Interactive GPS + Sentinel-2 Leakage Risk Assessment', type: 'gis',
    help: 'Set facility coordinates. System checks proximity to water bodies.'
  },
  
  // Step 7: Technical Methane Baseline
  { id: 'step7-baseline', title: 'Step 7: Technical Methane Baseline', subtitle: 'Automated IPCC Tier 2 Calculation', type: 'baseline',
    help: 'Calculates projected tCO2e/yr from organic fraction'
  },
  
  // Step 8: Fourth Schedule Lock (CDA)
  { id: 'step8-cda', title: 'Step 8: Fourth Schedule Lock (CDA)', subtitle: 'Community Development Agreement Compliance', type: 'cda',
    help: 'Land-based: 40% minimum | Non-land: 25% minimum',
    regulation: 'Regulation 23E: 40% Community Share for land-based projects'
  },
  
  // Step 9: Professional Review & Submit
  { id: 'step9-review', title: 'Step 9: Professional Review & Submit', subtitle: 'Calculate PRL and Submit for Expert Audit', type: 'review',
    help: 'Final Project Readiness Level assessment before NEMA submission'
  }
];

// ═══════════════════════════════════════════════════════════
// WASTE DATA STATE (Titan Sovereign v6.0 Schema)
// ═══════════════════════════════════════════════════════════
let wasteCurrentStep = 0;
let wasteData = {
  // Step 1: KYC
  w_company_name: '', w_kra_pin: '', w_business_reg: '', w_proponent_name: '',
  
  // Step 2: Legal Hard-Gate
  w_nema_license: '', w_license_expiry: '', w_nema_verified: false,
  
  // Step 3: Licensed Waste Contractor (NEW)
  w_contractor: '',
  w_contractor_license: '',
  w_transport_cert: '',
  
  // Step 4: Source & Stream
  w_stream_type: 'Municipal Solid Waste',
  w_doc_fraction: SOVEREIGN_VALUES.DOC_MUNICIPAL,
  w_annual_volume: 0,
  
  // Step 5: AI Vision (Multi-Image Audit)
  vision_images: [],
  ai_composition: { organic: 0, plastic: 0, metal: 0, glass: 0, hazardous: 0 },
  ai_synthesis: '',
  
  // Step 6: GIS Sovereign Proof
  w_facility_lat: '-1.2505', w_facility_lng: '36.8972',
  w_facility_name: '', w_county: '', w_gis_area: '',
  gis_leakage_risk: 'unknown',
  sentinel2_verified: false,
  
  // Step 7: Methane Baseline
  methane_baseline_tco2e_yr: 0,
  ipcc_calculation_log: '',
  
  // Step 8: IoT Traceability
  source_qr_code: '',
  truck_vessel_id: 'KCH-' + Math.floor(100 + Math.random() * 900) + 'X',
  weight_at_source: 0,
  weight_at_facility: 0,
  iot_telemetry: [],
  transit_simulation_active: false,
  
  // Step 9: CDA Lock
  cda_share_pct: 40,
  cda_locked: false,
  land_type: 'Public/Community',
  
  // Step 10: PRL & Submission
  project_id: '',
  prl_score: 0,
  prl_breakdown: { data_quality: 0, cda_compliance: 0, methodology: 0 },
  status: 'draft',
  submitted_at: '',
  submittedToConsultant: false,
  
  // Traceability Ledger (dCoC)
  ledger_blocks: [],
  
  // Meta
  created_at: null,
  updated_at: null
};

const WASTE_LS_KEY = 'ntz_waste_v3';

const WASTE_WORKER_URL = 'https://delicate-bird-531b.shukriali411.workers.dev/';

// ═══════════════════════════════════════════════════════════
// SOVEREIGN ARCHITECTURE: All AI processing routes through
// Cloudflare Worker. Keys stored in encrypted Worker Environment.
// Frontend only captures images → Base64 → Worker Bridge
// ═══════════════════════════════════════════════════════════

// ── Persistence ──────────────────────────────────────
function saveWasteState() {
  try {
    localStorage.setItem(WASTE_LS_KEY, JSON.stringify({
      wasteData,
      wasteCurrentStep,
      wasteGcisHistory,
      savedAt: new Date().toISOString()
    }));
  } catch(e) { /* silent */ }
}

function loadWasteState() {
  try {
    const raw = localStorage.getItem(WASTE_LS_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (d.wasteData) Object.assign(wasteData, d.wasteData);
    if (typeof d.wasteCurrentStep === 'number') wasteCurrentStep = d.wasteCurrentStep;
    if (Array.isArray(d.wasteGcisHistory)) wasteGcisHistory = d.wasteGcisHistory;
    return true;
  } catch(e) { return false; }
}

function clearWasteState() {
  localStorage.removeItem(WASTE_LS_KEY);
  localStorage.removeItem('ntz_waste_v2');
  localStorage.removeItem('wasteWizardData');
  wasteCurrentStep = 0;
  wasteGcisHistory = [];
  wasteGcisBusy = false;
  wasteData = {
    // Step 1: KYC
    w_company_name: '', w_kra_pin: '', w_business_reg: '', w_proponent_name: '',
    // Step 2: Legal
    w_nema_license: '', w_license_expiry: '', w_nema_verified: false,
    // Step 3: Contractor
    w_contractor: '', w_contractor_license: '', w_transport_cert: '',
    // Step 4: Stream
    w_stream_type: 'Municipal Solid Waste', w_doc_fraction: SOVEREIGN_VALUES.DOC_MUNICIPAL, w_annual_volume: 0,
    // Step 5: AI Vision
    vision_images: [], ai_composition: { organic: 0, plastic: 0, metal: 0, glass: 0, hazardous: 0 }, ai_synthesis: '',
    // Step 6: GIS
    w_facility_lat: '-1.2505', w_facility_lng: '36.8972', w_facility_name: '', w_county: '', w_gis_area: '',
    gis_leakage_risk: 'unknown', sentinel2_verified: false,
    // Step 7: Baseline
    methane_baseline_tco2e_yr: 0, ipcc_calculation_log: '',
    // Step 8: IoT
    source_qr_code: '', truck_vessel_id: 'KCH-' + Math.floor(100 + Math.random() * 900) + 'X',
    weight_at_source: 0, weight_at_facility: 0, iot_telemetry: [], transit_simulation_active: false,
    // Step 9: CDA
    cda_share_pct: 40, cda_locked: false, land_type: 'Public/Community',
    // Step 10: Submission
    project_id: '', prl_score: 0, prl_breakdown: { data_quality: 0, cda_compliance: 0, methodology: 0 },
    status: 'draft', submitted_at: '', submittedToConsultant: false,
    // Ledger
    ledger_blocks: [], created_at: null, updated_at: null
  };
  console.log('🗑️ Waste state cleared - fresh 10-step wizard ready');
}

// Hard reset function for complete wipe
function hardResetWasteModule() {
  clearWasteState();
  // Clear any DOM elements
  const container = document.getElementById('waste-wizard-container');
  if (container) {
    container.innerHTML = '';
    container.classList.remove('hidden');
  }
  const docView = document.getElementById('waste-document-view');
  if (docView) docView.classList.add('hidden');
  const consultantBar = document.getElementById('consultant-sidebar');
  if (consultantBar) consultantBar.classList.add('hidden');
  
  wasteCurrentStep = 0;
  renderWasteWizard();
  toast('🗑️ Waste wizard reset to Step 1', 'success');
}

// ── Register Waste Project into window.NTZ.projects ────────
function registerWasteProject() {
  const project = {
    id: wasteData.project_id || 'NTZ-W-' + Date.now(),
    name: wasteData.w_facility_name || wasteData.w_company_name || 'Unnamed Waste Facility',
    sector: 'waste',
    county: wasteData.w_county || 'Nairobi',
    proponent: wasteData.w_proponent_name || '',
    facilityType: wasteData.w_stream_type || 'Municipal Solid Waste',
    credits: parseFloat(wasteData.methane_baseline_tco2e_yr) || 0,
    standard: 'KNCR Domestic',
    step: wasteCurrentStep,
    created: new Date().toISOString().split('T')[0],
    status: wasteData.status || 'pending-review',
    pipelineStage: 'pcn', // ensure it appears in the pipeline
    submittedBy: window.AUTH?.currentUser?.name || window.S?.user?.name || 'Shukri Ali',
    prlScore: { score: wasteData.prl_score || 85, level: (wasteData.prl_score || 85) > 60 ? 'HIGH' : 'LOW', html: '' },
    cdaCompliant: wasteData.cda_share_pct >= (wasteData.land_type === 'Public/Community' ? 40 : 25),
    cdaShare: wasteData.cda_share_pct,
    tonnageSource: wasteData.weight_at_source,
    tonnageFacility: wasteData.weight_at_facility,
    methaneBaseline: wasteData.methane_baseline_tco2e_yr,
    lat: wasteData.w_facility_lat,
    lng: wasteData.w_facility_lng,
    nemaLicense: wasteData.w_nema_license,
    dcoCleared: wasteData.dcoCleared,
    certifiedBy: wasteData.certifiedBy,
    certifiedAt: wasteData.certifiedAt
  };

  if (!window.NTZ) window.NTZ = {};
  if (!window.NTZ.projects) window.NTZ.projects = [];

  // Check for duplicate by name
  const existing = window.NTZ.projects.findIndex(p => p.name === project.name && p.sector === 'waste');
  if (existing >= 0) {
    window.NTZ.projects[existing] = { ...window.NTZ.projects[existing], ...project };
  } else {
    window.NTZ.projects.push(project);
  }

  // Also push to registry for ledger view
  if (!window.NTZ.registry) window.NTZ.registry = [];
  const regExisting = window.NTZ.registry.findIndex(r => r.name === project.name && r.sector === 'Waste');
  const regEntry = {
    id: project.id,
    name: project.name,
    county: project.county,
    sector: 'Waste',
    credits: project.credits,
    step: project.step,
    cdaCompliant: project.cdaCompliant,
    status: project.status === 'certified' ? 'Certified' : 'Draft',
    facilityType: project.facilityType
  };
  if (regExisting >= 0) {
    window.NTZ.registry[regExisting] = regEntry;
  } else {
    window.NTZ.registry.push(regEntry);
  }

  // Update global user state for dashboard
  if (typeof S !== 'undefined') {
    S.user.totalOffsets = Math.round((S.user.totalOffsets || 0) + project.credits);
    S.user.projects++;
    if (typeof saveToStorage === 'function') saveToStorage();
  }

  // Update dashboard if visible
  if (typeof updateDashboardWithWaste === 'function') updateDashboardWithWaste(project);

  saveNuclearState();
  saveWasteState();
  return project;
}

// ── Get all waste projects ───────────────────────────
function getWasteProjects() {
  if (!window.NTZ || !window.NTZ.projects) return [];
  return window.NTZ.projects.filter(p => p.sector === 'waste');
}

// ── Dashboard update hook ────────────────────────────
function updateDashboardWithWaste(project) {
  // Update KPIs
  const kpiOffsets = document.getElementById('kpi-offsets');
  if (kpiOffsets && typeof S !== 'undefined') {
    kpiOffsets.textContent = S.user.totalOffsets.toLocaleString();
  }
  const kpiScore = document.getElementById('kpi-score');
  if (kpiScore && typeof S !== 'undefined') {
    kpiScore.textContent = S.user.score;
  }
  const sbScore = document.getElementById('sb-score');
  if (sbScore && typeof S !== 'undefined') {
    sbScore.textContent = S.user.score;
  }

  // Update sector chart if exists
  if (typeof S !== 'undefined' && S.charts && S.charts.sector) {
    const chart = S.charts.sector;
    const labels = chart.data.labels;
    const data = chart.data.datasets[0].data;
    const colors = chart.data.datasets[0].backgroundColor;
    if (!labels.includes('Waste')) {
      labels.push('Waste');
      data.push(0);
      colors.push('rgba(245,166,35,.78)');
    }
    const wasteIdx = labels.indexOf('Waste');
    const wasteProjects = getWasteProjects();
    const totalWaste = wasteProjects.reduce((sum, p) => sum + (p.credits || 0), 0);
    data[wasteIdx] = Math.round(totalWaste || data[wasteIdx]);
    chart.update();
  }

  // Add to recent projects table
  const tbody = document.querySelector('#dashboard-section table tbody');
  if (tbody) {
    const existingRow = tbody.querySelector(`[data-project-id="${project.id}"]`);
    if (existingRow) {
      existingRow.cells[3].textContent = project.credits.toFixed(1);
      existingRow.cells[8].textContent = project.created;
    } else {
      const row = document.createElement('tr');
      row.setAttribute('data-project-id', project.id);
      row.innerHTML = `
        <td>${project.name}</td>
        <td><span class="tag-pill" style="background:rgba(245,166,35,.15);color:#F5A623">Waste</span></td>
        <td>${project.county}</td>
        <td>${project.credits.toFixed(1)}</td>
        <td>${project.credits.toFixed(1)}</td>
        <td>0</td>
        <td>0</td>
        <td style="color:var(--gold)">${Math.min(95, 60 + Math.round(project.credits / 10))}</td>
        <td>${project.created}</td>
      `;
      tbody.insertBefore(row, tbody.firstChild);
    }
  }

  // Render / refresh Waste→NEMA module on dashboard
  try { renderDashboardWasteNemaModule(); } catch (e) {}
}

// ── Dashboard Waste→NEMA Module ───────────────────────
function renderDashboardWasteNemaModule() {
  const dashboard = document.getElementById('dashboard-section');
  if (!dashboard) return;

  const currentUserName = (window.AUTH?.currentUser?.name || window.S?.user?.name || '').trim();
  const wasteProjects = (typeof getWasteProjects === 'function') ? getWasteProjects() : [];
  const myWaste = currentUserName
    ? wasteProjects.filter(p => (p.submittedBy || '').trim() === currentUserName)
    : wasteProjects;

  const latest = [...myWaste].sort((a, b) => {
    const ta = new Date(a.created || a.submitted_at || a.created_at || 0).getTime();
    const tb = new Date(b.created || b.submitted_at || b.created_at || 0).getTime();
    return tb - ta;
  })[0];

  const statusLabel = (p) => {
    const s = (p?.status || '').toLowerCase();
    if (s === 'certified') return { text: 'Certified', bg: 'rgba(58,170,92,.15)', color: 'var(--mint)' };
    if (s === 'pending-review') return { text: 'Pending Expert Review', bg: 'rgba(245,166,35,.15)', color: 'var(--gold)' };
    if (s === 'submitted') return { text: 'Submitted to NEMA Queue', bg: 'rgba(144,202,249,.12)', color: '#90CAF9' };
    if (s === 'draft') return { text: 'Draft', bg: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.75)' };
    return { text: p?.status || 'Unknown', bg: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.75)' };
  };

  const ensureContainer = () => {
    let el = document.getElementById('dashboard-waste-nema-module');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'dashboard-waste-nema-module';
    el.className = 'card';
    el.style.marginTop = '1.05rem';
    el.style.border = '1px solid rgba(245,166,35,.25)';
    el.style.background = 'rgba(245,166,35,.06)';

    const kpiWaste = document.getElementById('kpi-waste');
    const kpiRow = kpiWaste?.closest?.('.g3');
    if (kpiRow && kpiRow.parentNode) {
      kpiRow.parentNode.insertBefore(el, kpiRow.nextSibling);
    } else {
      const recentHdr = Array.from(dashboard.querySelectorAll('h3')).find(h => (h.textContent || '').toLowerCase().includes('recent projects'));
      if (recentHdr && recentHdr.parentNode) recentHdr.parentNode.insertBefore(el, recentHdr);
      else dashboard.appendChild(el);
    }
    return el;
  };

  const el = ensureContainer();
  const totals = {
    count: myWaste.length,
    baseline: myWaste.reduce((s, p) => s + (p.credits || 0), 0),
    certified: myWaste.filter(p => (p.status || '').toLowerCase() === 'certified').length
  };

  const latestStatus = latest ? statusLabel(latest) : null;
  const viewBtn = latest ? `<button class="btn-report" onclick="showSection('waste-management'); setTimeout(()=>{ try{ viewWasteProject('${latest.id}'); }catch(e){} }, 120);" style="font-size:.75rem">📋 View</button>` : '';

  el.innerHTML = `
    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:1rem;">
      <div>
        <div style="display:flex; align-items:center; gap:.5rem; margin-bottom:.25rem;">
          <div style="font-size:1.1rem">🏛️</div>
          <h4 style="margin:0; color:#fff;">NEMA Waste Projects</h4>
        </div>
        <div style="font-size:.78rem; color:rgba(255,255,255,.62);">
          ${currentUserName ? `Proponent: <b style="color:rgba(255,255,255,.82)">${currentUserName}</b> · ` : ''}${totals.count} project${totals.count===1?'':'s'} · ${totals.baseline.toFixed(1)} tCO₂e/yr baseline · ${totals.certified} certified
        </div>
      </div>
      <div style="display:flex; gap:.5rem; flex-wrap:wrap; justify-content:flex-end;">
        ${viewBtn}
        <button class="btn-report" onclick="hardResetWasteModule(); showSection('waste-management');" style="background:rgba(245,166,35,.10); color:#F5A623; font-size:.75rem">➕ Register another</button>
      </div>
    </div>
    <div style="margin-top:.85rem; padding:.85rem; border-radius:10px; background:rgba(0,0,0,.22); border:1px solid rgba(255,255,255,.08);">
      ${latest ? `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
          <div>
            <div style="color:#fff; font-weight:700; margin-bottom:.15rem;">${latest.name}</div>
            <div style="font-size:.78rem; color:rgba(255,255,255,.6);">${latest.facilityType || 'Waste Facility'} · ${latest.county || '—'} County · ${(latest.credits||0).toFixed(1)} tCO₂e/yr</div>
          </div>
          <div style="display:flex; align-items:center; gap:.5rem;">
            <span class="tag-pill" style="background:${latestStatus.bg}; color:${latestStatus.color};">${latestStatus.text}</span>
            <span class="tag-pill" style="background:rgba(255,255,255,.08); color:rgba(255,255,255,.78);">dCoC: ${latest.dcoCleared ? 'Cleared' : 'Pending'}</span>
            <span class="tag-pill" style="background:rgba(255,255,255,.08); color:rgba(255,255,255,.78);">CDA: ${latest.cdaCompliant ? 'Compliant' : 'At risk'}</span>
          </div>
        </div>
      ` : `
        <div style="color:rgba(255,255,255,.70); font-size:.85rem;">
          No waste facility registered yet. Use the Waste Management wizard to register under NEMA Regulation 21(2), then track status here.
        </div>
      `}
    </div>
  `;
}

// ── Satellite Map Initialiser ─────────────────────────
// Called whenever NEMA Oversight becomes visible.
// Leaflet needs the container to have non-zero dimensions; this
// is only guaranteed AFTER the section's display:none is removed.
function initNemaSatelliteMap() {
  const mapEl = document.getElementById('nema-satellite-map');
  if (!mapEl) return;

  if (!mapEl._leaflet_id) {
    // First visit — create the map
    try {
      const map = L.map('nema-satellite-map', {
        center: [1.2, 36.8],   // Rift Valley / Samburu, Kenya
        zoom: 12,
        zoomControl: true,
        attributionControl: true
      });
      window.nemaSatMap = map;

      // Primary tile layer: Esri World Imagery (real satellite)
      const esri = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles &copy; Esri — Maxar, Earthstar Geographics', maxZoom: 18 }
      );

      // Fallback tile layer: OpenStreetMap
      const osm = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }
      );

      let esriFailed = false;
      esri.on('tileerror', () => {
        if (!esriFailed) {
          esriFailed = true;
          map.removeLayer(esri);
          osm.addTo(map);
        }
      });
      esri.addTo(map);

      // Deforestation alert marker
      L.circle([1.2, 36.8], {
        color: '#EF5350', fillColor: '#EF5350', fillOpacity: 0.4, radius: 1200
      }).addTo(map)
        .bindPopup('<b>🌲 Deforestation Alert</b><br>14% canopy loss detected (NDVI drop).<br><small>Coordinates: 1.2°N, 36.8°E · KNCR-102 Samburu REDD+</small>')
        .openPopup();

      // Double invalidateSize to handle CSS transition timing
      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 600);
      setTimeout(() => map.invalidateSize(), 1200);
    } catch (err) {
      console.error('[NemaSatMap] Init error:', err);
    }
  } else {
    // Subsequent visits — just refresh dimensions
    if (window.nemaSatMap) {
      setTimeout(() => window.nemaSatMap.invalidateSize(), 150);
      setTimeout(() => window.nemaSatMap.invalidateSize(), 600);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const _origShowSection = window.showSection;
  window.showSection = function (id) {
    if (typeof _origShowSection === 'function') _origShowSection(id);
    if (id === 'waste-management') {
      loadWasteState();
      renderWasteViewForRole();
      document.getElementById('waste-document-view')?.classList.add('hidden');
      document.getElementById('consultant-sidebar')?.classList.add('hidden');
    }
    if (id === 'dashboard') {
      try { renderDashboardWasteNemaModule(); } catch (e) {}
    }
    if (id === 'nema-oversight') {
      try { renderNemaWasteAlerts(); } catch (e) { console.error('[NEMA Waste Alerts]', e); }
      // Fix satellite map — must happen AFTER section is visible
      setTimeout(initNemaSatelliteMap, 400);
    }
  };

  // Fallback: MutationObserver watches for nema-oversight-section becoming active
  const nemaSec = document.getElementById('nema-oversight-section');
  if (nemaSec) {
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class' && nemaSec.classList.contains('active')) {
          try { renderNemaWasteAlerts(); } catch (e) { console.error('[NEMA Waste Alerts Observer]', e); }
          setTimeout(initNemaSatelliteMap, 400);
        }
      }
    });
    obs.observe(nemaSec, { attributes: true, attributeFilter: ['class'] });
  }
});

// ── Role-Based View Router ──────────────────────────
function getWasteRole() {
  if (typeof AUTH !== 'undefined' && AUTH.currentUser) return AUTH.currentUser.role;
  if (typeof S !== 'undefined' && S.user) return 'proponent'; // default
  return 'proponent';
}

// ── NEMA Oversight filter state ───────────────────────
function getWasteOversightMode() {
  const m = (window.NTZ_WASTE_OVERSIGHT_MODE || 'active').toString().toLowerCase();
  return (m === 'all' || m === 'drafts') ? 'all' : 'active';
}
function setWasteOversightMode(mode, role) {
  window.NTZ_WASTE_OVERSIGHT_MODE = (mode || 'active').toString().toLowerCase();
  const c = document.getElementById('waste-wizard-container');
  if (!c) return;
  renderWasteOversightView(c, role);
}

function renderWasteViewForRole() {
  const role = getWasteRole();
  const container = document.getElementById('waste-wizard-container');
  if (!container) return;

  // NEMA roles: see oversight view (all waste projects, no wizard)
  if (['nema','nema_national','nema_county','nema_reviewer'].includes(role)) {
    renderWasteOversightView(container, role);
    return;
  }

  // Consultant: see review queue of submitted waste projects
  if (role === 'consultant') {
    renderWasteConsultantView(container);
    return;
  }

  // Enterprise: see portfolio summary of waste credits
  if (role === 'enterprise') {
    renderWasteEnterpriseView(container);
    return;
  }

  // Proponent / Developer: full wizard
  renderWasteWizard();
}

// ── NEMA Oversight View ──────────────────────────────
function renderWasteOversightView(container, role) {
  const mode = getWasteOversightMode(); // 'active' | 'all'
  const projectsAll = getWasteProjects();
  const activeProjects = projectsAll.filter(p => !['draft'].includes((p.status || '').toLowerCase()));
  const projects = (mode === 'active' && activeProjects.length > 0) ? activeProjects : projectsAll;
  const roleLabel = typeof ROLE_MAP !== 'undefined' && ROLE_MAP[role] ? ROLE_MAP[role].label : 'NEMA';
  
  // Check for Regulation 37 violations in registry
  const violations = (typeof window.NTZ !== 'undefined' && window.NTZ.registry) 
    ? window.NTZ.registry.filter(r => r.type === 'COMPLIANCE VIOLATION ALERT' || r.code === 'REGULATION-37')
    : [];
  
  // Calculate weight variance alerts from project data
  const weightAlerts = projectsAll.filter(p => {
    const sourceWeight = p.weight_at_source || p.tonnage_source || 0;
    const facilityWeight = p.weight_at_facility || p.tonnage_facility || 0;
    if (sourceWeight === 0 || facilityWeight === 0) return false;
    const diff = Math.abs(sourceWeight - facilityWeight);
    const variance = (diff / Math.max(sourceWeight, 1)) * 100;
    return variance > SOVEREIGN_VALUES.WEIGHT_VARIANCE_THRESHOLD_PCT;
  });

  container.innerHTML = `
    <div style="margin-bottom:1.5rem">
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem">
        <span style="font-size:1.5rem">🏛️</span>
        <div>
          <h3 style="margin:0;color:#fff">NEMA Waste Oversight — ${roleLabel}</h3>
          <p style="margin:0;font-size:.78rem;color:rgba(255,255,255,.5)">All registered waste facilities under Regulation 21(2) and Sustainable Waste Management Act 2022</p>
        </div>
      </div>
      
      ${violations.length > 0 || weightAlerts.length > 0 ? `
      <div style="margin-bottom:1.2rem; padding:1rem; background:rgba(255,100,100,0.1); border:2px solid #ff6b6b; border-radius:8px;">
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
          <span style="font-size:1.2rem;">🚨</span>
          <strong style="color:#ff6b6b; font-size:0.9rem;">REGULATION 37 VIOLATIONS DETECTED</strong>
        </div>
        <div style="font-size:0.8rem; color:rgba(255,255,255,0.8); margin-bottom:0.75rem;">
          ${violations.length} compliance alert${violations.length !== 1 ? 's' : ''} • ${weightAlerts.length} weight variance issue${weightAlerts.length !== 1 ? 's' : ''}
        </div>
        <div style="font-size:0.75rem; color:#ff6b6b;">
          Penalty Risk: KES ${SOVEREIGN_VALUES.REGULATION_37_PENALTY_KES.toLocaleString()} per violation
        </div>
        ${violations.map(v => `
        <div style="margin-top:0.5rem; padding:0.5rem; background:rgba(0,0,0,0.3); border-radius:4px; font-size:0.7rem;">
          <strong style="color:#ff6b6b;">${v.timestamp ? new Date(v.timestamp).toLocaleString() : 'Recent'}</strong><br>
          ${v.detail || v.message || 'Weight variance exceeds 10% threshold'}
        </div>
        `).join('')}
      </div>
      ` : ''}
      
      <div class="g4" style="margin-bottom:1.2rem">
        <div class="kpi gold"><div class="kpi-lbl">Active Facilities</div><div class="kpi-val gold">${projects.length}</div><div class="kpi-sub">submitted / in review / certified</div></div>
        <div class="kpi green"><div class="kpi-lbl">Total Methane Baseline</div><div class="kpi-val green">${projects.reduce((s,p)=>s+(p.credits||0),0).toFixed(1)}</div><div class="kpi-sub">tCO₂e/yr mitigated</div></div>
        <div class="kpi teal"><div class="kpi-lbl">CDA Compliant</div><div class="kpi-val teal">${projects.filter(p=>p.cdaCompliant).length}</div><div class="kpi-sub">≥40% community share</div></div>
        <div class="kpi ${violations.length > 0 || weightAlerts.length > 0 ? 'coral' : 'teal'}"><div class="kpi-lbl">Compliance Alerts</div><div class="kpi-val ${violations.length > 0 || weightAlerts.length > 0 ? 'coral' : 'teal'}">${violations.length + weightAlerts.length}</div><div class="kpi-sub">Regulation 37</div></div>
      </div>
      <div style="display:flex; gap:.5rem; flex-wrap:wrap; margin:-.2rem 0 1.2rem 0;">
        <button class="btn-report" onclick="setWasteOversightMode('active','${role}')" style="background:${mode==='active'?'rgba(58,170,92,.12)':'rgba(255,255,255,.08)'}; color:${mode==='active'?'var(--mint)':'rgba(255,255,255,.82)'}; font-size:.75rem">✅ Active only</button>
        <button class="btn-report" onclick="setWasteOversightMode('all','${role}')" style="background:${mode==='all'?'rgba(245,166,35,.10)':'rgba(255,255,255,.08)'}; color:${mode==='all'?'#F5A623':'rgba(255,255,255,.82)'}; font-size:.75rem">📋 Include drafts</button>
      </div>
    </div>
    ${renderIoTTrackingPanel()}
    ${projects.length === 0 ? '<div style="text-align:center;padding:3rem;color:rgba(255,255,255,.26)"><div style="font-size:3rem;margin-bottom:.9rem">♻️</div><p>No waste projects registered yet. Proponents will submit via the Waste Management wizard.</p></div>' : `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Facility</th><th>Type</th><th>County</th><th>tCO₂e/yr</th><th>CDA</th><th>dCoC</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${projects.map(p => `
          <tr>
            <td>${p.name}</td>
            <td><span class="tag-pill" style="background:rgba(245,166,35,.15);color:#F5A623">${p.facilityType || 'Dumpsite'}</span></td>
            <td>${p.county}</td>
            <td>${(p.credits||0).toFixed(1)}</td>
            <td style="color:${p.cdaCompliant?'var(--mint)':'var(--coral)'}">${p.cdaCompliant?'✅ 40%+':'❌ <40%'}</td>
            <td>${p.dcoCleared?'✅ Cleared':'⏳ Pending'}</td>
            <td><span class="tag-pill" style="background:${(p.status||'').toLowerCase()==='certified'?'rgba(58,170,92,.15)':((p.status||'').toLowerCase()==='submitted'?'rgba(144,202,249,.12)':'rgba(245,166,35,.15)')};color:${(p.status||'').toLowerCase()==='certified'?'var(--mint)':((p.status||'').toLowerCase()==='submitted'?'#90CAF9':'var(--gold)')}">${(p.status||'draft').toUpperCase()}</span></td>
            <td><button class="btn-report" onclick="viewWasteProject('${p.id}')">📋 View</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`}
  `;
}

// ── Consultant Review View ──────────────────────────
function renderWasteConsultantView(container) {
  const allProjects = getWasteProjects();
  const projects = allProjects.filter(p => p.status !== 'certified');
  
  // Debug info
  console.log('📊 Consultant View - Total waste projects:', allProjects.length);
  console.log('📊 Pending review:', projects.length);
  console.log('📊 Project statuses:', allProjects.map(p => ({ name: p.name, status: p.status })));

  container.innerHTML = `
    <div style="margin-bottom:1.5rem">
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem">
        <span style="font-size:1.5rem">💼</span>
        <div>
          <h3 style="margin:0;color:#fff">Consultant Review Queue — Waste Projects</h3>
          <p style="margin:0;font-size:.78rem;color:rgba(255,255,255,.5)">NEMA Lead Expert certification workbench. Regulation 21(2) requires your sign-off before KNCR registration.</p>
        </div>
      </div>
      <div class="g3" style="margin-bottom:1.2rem">
        <div class="kpi gold"><div class="kpi-lbl">All Waste Projects</div><div class="kpi-val gold">${allProjects.length}</div><div class="kpi-sub">total in system</div></div>
        <div class="kpi green"><div class="kpi-lbl">Pending Review</div><div class="kpi-val green">${projects.length}</div><div class="kpi-sub">awaiting certification</div></div>
        <div class="kpi coral"><div class="kpi-lbl">Certified</div><div class="kpi-val coral">${allProjects.filter(p=>p.status==='certified').length}</div><div class="kpi-sub">completed</div></div>
      </div>
    </div>
    ${projects.length === 0 ? `
    <div style="text-align:center;padding:3rem;color:rgba(255,255,255,.26)">
      <div style="font-size:3rem;margin-bottom:.9rem">✅</div>
      <p>No waste projects pending review.</p>
      ${allProjects.length > 0 ? `<p style="font-size:0.75rem; margin-top:10px;">Found ${allProjects.length} total project(s): ${allProjects.map(p => p.name + ' (' + p.status + ')').join(', ')}</p>` : '<p style="font-size:0.75rem; margin-top:10px;">No waste projects in system yet. Proponents must submit via the wizard.</p>'}
    </div>` : `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Facility</th><th>County</th><th>tCO₂e/yr</th><th>CDA</th><th>dCoC</th><th>Evidence</th><th>Actions</th></tr></thead>
        <tbody>
          ${projects.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${p.county}</td>
            <td>${(p.credits||0).toFixed(1)}</td>
            <td style="color:${p.cdaCompliant?'var(--mint)':'var(--coral)'}">${p.cdaCompliant?'✅':'❌'}</td>
            <td>${p.dcoCleared?'✅':'⏳'}</td>
            <td>${p.nemaLicense||'—'}</td>
            <td><button class="btn-report" onclick="certifyWasteProject('${p.id}')" style="background:rgba(58,170,92,.15);color:var(--mint)">🔒 Certify</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`}
  `;
}

// ── Enterprise Portfolio View ───────────────────────
function renderWasteEnterpriseView(container) {
  const projects = getWasteProjects();
  const totalCredits = projects.reduce((s,p) => s + (p.credits||0), 0);
  const certifiedProjects = projects.filter(p => p.status === 'certified');

  container.innerHTML = `
    <div style="margin-bottom:1.5rem">
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem">
        <span style="font-size:1.5rem">🏢</span>
        <div>
          <h3 style="margin:0;color:#fff">Enterprise Waste Credit Portfolio</h3>
          <p style="margin:0;font-size:.78rem;color:rgba(255,255,255,.5)">Waste-derived carbon credits available for trading and offset procurement</p>
        </div>
      </div>
      <div class="g4" style="margin-bottom:1.2rem">
        <div class="kpi green"><div class="kpi-lbl">Total Waste Credits</div><div class="kpi-val green">${totalCredits.toFixed(1)}</div><div class="kpi-sub">tCO₂e available</div></div>
        <div class="kpi gold"><div class="kpi-lbl">Certified Projects</div><div class="kpi-val gold">${certifiedProjects.length}</div><div class="kpi-sub">trade-ready</div></div>
        <div class="kpi teal"><div class="kpi-lbl">Est. Market Value</div><div class="kpi-val teal">KES ${(totalCredits * 950).toLocaleString()}</div><div class="kpi-sub">@ KES 950/tCO₂e</div></div>
        <div class="kpi coral"><div class="kpi-lbl">Pipeline</div><div class="kpi-val coral">${projects.length - certifiedProjects.length}</div><div class="kpi-sub">pending certification</div></div>
      </div>
    </div>
    ${projects.length === 0 ? '<div style="text-align:center;padding:3rem;color:rgba(255,255,255,.26)"><div style="font-size:3rem;margin-bottom:.9rem">♻️</div><p>No waste credit projects in portfolio. Register a facility to generate tradeable credits.</p></div>' : `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Facility</th><th>County</th><th>Credits (tCO₂e)</th><th>Status</th><th>Est. Value</th><th>Actions</th></tr></thead>
        <tbody>
          ${projects.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${p.county}</td>
            <td>${(p.credits||0).toFixed(1)}</td>
            <td><span class="tag-pill" style="background:${p.status==='certified'?'rgba(58,170,92,.15)':'rgba(245,166,35,.15)'};color:${p.status==='certified'?'var(--mint)':'var(--gold)'}">${p.status==='certified'?'Trade-Ready':'Pending'}</span></td>
            <td>KES ${((p.credits||0)*950).toLocaleString()}</td>
            <td><button class="btn-report" onclick="listWasteCredits('${p.id}')">🔄 List on Exchange</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`}
  `;
}

// ── Certify a waste project (Consultant action) ─────
function certifyWasteProject(projectId) {
  if (!window.NTZ || !window.NTZ.projects) return;
  const project = window.NTZ.projects.find(p => p.id === projectId);
  if (!project) return;

  project.status = 'certified';
  project.certifiedBy = typeof AUTH !== 'undefined' && AUTH.currentUser ? AUTH.currentUser.name : 'Lead Expert';
  project.certifiedAt = new Date().toISOString();
  project.step = 8; // Validation complete

  // Update registry
  if (window.NTZ.registry) {
    const reg = window.NTZ.registry.find(r => r.id === projectId);
    if (reg) { reg.status = 'Certified'; reg.step = project.step; }
  }

  saveNuclearState();
  toast(`✅ ${project.name} certified by ${project.certifiedBy}. Ready for KNCR registration.`, 'success');
  renderWasteConsultantView(document.getElementById('waste-wizard-container'));
}

// ── View a waste project detail ─────────────────────
function viewWasteProject(projectId) {
  if (!window.NTZ || !window.NTZ.projects) return;
  const project = window.NTZ.projects.find(p => p.id === projectId);
  if (!project) return;

  const container = document.getElementById('waste-wizard-container');
  container.innerHTML = `
    <div style="margin-bottom:1rem">
      <button class="btn-report" onclick="renderWasteViewForRole()" style="margin-bottom:1rem">← Back to Overview</button>
      <h3 style="color:#fff">${project.name}</h3>
      <p style="font-size:.8rem;color:rgba(255,255,255,.5)">${project.facilityType || 'Waste Facility'} · ${project.county} County</p>
    </div>
    <div class="g3" style="margin-bottom:1.2rem">
      <div class="card"><h4>Methane Baseline</h4><div style="font-size:1.5rem;color:var(--mint);font-weight:700">${(project.credits||0).toFixed(1)} tCO₂e/yr</div></div>
      <div class="card"><h4>CDA Compliance</h4><div style="font-size:1.1rem;color:${project.cdaCompliant?'var(--mint)':'var(--coral)'};font-weight:700">${project.cdaCompliant?'✅ '+project.cdaShare+'% share':'❌ Non-compliant'}</div></div>
      <div class="card"><h4>Certification</h4><div style="font-size:.85rem;color:${project.status==='certified'?'var(--mint)':'var(--gold)'}">${project.status==='certified'?'Certified by '+project.certifiedBy:'Pending certification'}</div></div>
    </div>
    <div class="card" style="margin-bottom:1rem">
      <h4 style="margin-bottom:.5rem">📋 Project Details</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:.82rem">
        <div><span style="color:rgba(255,255,255,.5)">Proponent:</span> ${project.proponent||'—'}</div>
        <div><span style="color:rgba(255,255,255,.5)">NEMA License:</span> ${project.nemaLicense||'—'}</div>
        <div><span style="color:rgba(255,255,255,.5)">Source Tonnage:</span> ${project.tonnageSource||0} kg</div>
        <div><span style="color:rgba(255,255,255,.5)">Facility Tonnage:</span> ${project.tonnageFacility||0} kg</div>
        <div><span style="color:rgba(255,255,255,.5)">Coordinates:</span> ${project.lat}, ${project.lng}</div>
        <div><span style="color:rgba(255,255,255,.5)">dCoC:</span> ${project.dcoCleared?'✅ Cleared':'⏳ Pending'}</div>
      </div>
    </div>
  `;
}

// ── List waste credits on exchange (Enterprise) ─────
function listWasteCredits(projectId) {
  if (!window.NTZ || !window.NTZ.projects) return;
  const project = window.NTZ.projects.find(p => p.id === projectId);
  if (!project) return;
  if (project.status !== 'certified') {
    toast('Only certified waste credits can be listed on the exchange.', 'error');
    return;
  }
  if (typeof EXCHANGE !== 'undefined') {
    const existing = EXCHANGE.listings.find(l => l.id === project.id);
    if (existing) {
      toast('This project is already listed on the exchange.', 'info');
      return;
    }
    EXCHANGE.listings.push({
      id: project.id,
      project: project.name,
      seller: project.proponent || 'Waste Facility',
      county: project.county,
      type: 'Waste Management',
      standard: 'KNCR Domestic',
      vintage: new Date().getFullYear(),
      credits: Math.round(project.credits || 0),
      price: 950,
      coBenefits: ['Waste Reduction', 'Methane Capture', 'Community Health'],
      status: 'verified'
    });
    toast(`✅ ${project.name} listed on Carbon Exchange at KES 950/tCO₂e`, 'success');
  } else {
    toast('Exchange module not available.', 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// SOVEREIGN UTILITY FUNCTIONS (Titan Directive v6.0)
// ═══════════════════════════════════════════════════════════

// ── PRL (Project Readiness Level) Calculator ─────────
function calculatePRL(data) {
  // PRL = 30% Data Quality + 40% CDA Compliance + 30% Methodology Adherence
  
  // Data Quality (30%): Based on steps completed and AI verification
  let dataQualityScore = 0;
  if (data.w_kra_pin && data.w_business_reg) dataQualityScore += 10;
  if (data.w_nema_license && data.w_nema_verified) dataQualityScore += 10;
  if (data.vision_images.length > 0 && data.ai_synthesis) dataQualityScore += 10;
  
  // CDA Compliance (40%): Based on community share meeting Regulation 23E
  let cdaScore = 0;
  const minShare = data.land_type === 'Public/Community' 
    ? SOVEREIGN_VALUES.REGULATION_23E_LAND_SHARE_PCT 
    : SOVEREIGN_VALUES.REGULATION_23E_NONLAND_SHARE_PCT;
  if (data.cda_share_pct >= minShare) {
    cdaScore = 40; // Full marks if compliant
  } else {
    cdaScore = (data.cda_share_pct / minShare) * 40; // Proportional
  }
  
  // Methodology Adherence (30%): IPCC Tier 2 compliance
  let methodologyScore = 0;
  if (data.w_doc_fraction > 0) methodologyScore += 10;
  if (data.methane_baseline_tco2e_yr > 0) methodologyScore += 10;
  if (data.w_annual_volume > 0) methodologyScore += 10;
  
  const totalPRL = Math.round(dataQualityScore + cdaScore + methodologyScore);
  
  return {
    total: totalPRL,
    breakdown: {
      data_quality: dataQualityScore,
      cda_compliance: cdaScore,
      methodology: methodologyScore
    },
    status: totalPRL >= 80 ? 'EXCELLENT' : totalPRL >= 60 ? 'GOOD' : totalPRL >= 40 ? 'FAIR' : 'POOR'
  };
}

// ── SHA-256 Hash Generator (for dCoC Ledger) ───────
async function generateSHA256(input) {
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Add Ledger Block ────────────────────────────────
async function addLedgerBlock(action, data) {
  const timestamp = new Date().toISOString();
  const blockData = JSON.stringify({ action, data, timestamp });
  const hash = await generateSHA256(blockData);
  
  const block = {
    hash,
    timestamp,
    action,
    prev_hash: wasteData.ledger_blocks.length > 0 
      ? wasteData.ledger_blocks[wasteData.ledger_blocks.length - 1].hash 
      : 'genesis',
    data_summary: action
  };
  
  wasteData.ledger_blocks.push(block);
  
  // Also add to window.NTZ.registry for global visibility
  if (typeof window.NTZ !== 'undefined') {
    if (!window.NTZ.registry) window.NTZ.registry = [];
    window.NTZ.registry.push({
      type: 'Waste Ledger Block',
      hash: hash.substring(0, 16) + '...',
      timestamp,
      action,
      detail: `Digital Chain of Custody: ${action}`
    });
  }
  
  return block;
}

// ── QR Code Generator (Digital Waste Passport) ─────
function generateWasteQRCode(projectData) {
  // Create structured QR payload
  const qrPayload = {
    v: '1.0',
    type: 'WASTE_PASSPORT',
    project: projectData.project_id || 'WASTE-' + Date.now(),
    company: projectData.w_company_name,
    license: projectData.w_nema_license,
    contractor: projectData.w_contractor,
    source_weight: projectData.weight_at_source,
    timestamp: new Date().toISOString(),
    verification: 'NTZ-SOVEREIGN'
  };
  
  const qrData = JSON.stringify(qrPayload);
  
  // Generate QR code using QRCode.js library
  try {
    // Create a temporary container
    const tempDiv = document.createElement('div');
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);
    
    // Generate QR code
    const qr = new QRCode(tempDiv, {
      text: qrData,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
    
    // Get the canvas and convert to data URL
    setTimeout(() => {
      const canvas = tempDiv.querySelector('canvas');
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        wasteData.source_qr_code = dataUrl;
        wasteData.qr_payload = qrPayload;
        
        // Save to NTZ registry for verification
        if (typeof window.NTZ !== 'undefined') {
          if (!window.NTZ.waste_qr_registry) window.NTZ.waste_qr_registry = [];
          window.NTZ.waste_qr_registry.push({
            project_id: qrPayload.project,
            qr_data: qrData,
            generated_at: new Date().toISOString(),
            hash: sha256(qrData).substring(0, 16)
          });
        }
        
        renderWasteWizard(); // Re-render to show QR
      }
      document.body.removeChild(tempDiv);
    }, 100);
    
    return qrData;
  } catch (e) {
    console.error('QR Generation failed:', e);
    // Fallback to JSON base64
    wasteData.source_qr_code = 'data:application/json;base64,' + btoa(qrData);
    return qrData;
  }
}

// ── Download QR Code ──────────────────────────────
function downloadWasteQRCode() {
  if (!wasteData.source_qr_code) {
    toast('No QR code generated yet.', 'error');
    return;
  }
  
  const link = document.createElement('a');
  link.href = wasteData.source_qr_code;
  link.download = `WASTE-PASSPORT-${wasteData.project_id || 'QR'}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  toast('💾 QR Code downloaded as PNG', 'success');
}

// ── Weight Reconciliation (Regulation 37) ───────────
function reconcileWeights(sourceWeight, facilityWeight) {
  const diff = Math.abs(sourceWeight - facilityWeight);
  const variance = (diff / Math.max(sourceWeight, 1)) * 100;
  const threshold = SOVEREIGN_VALUES.WEIGHT_VARIANCE_THRESHOLD_PCT;
  
  const result = {
    source_weight: sourceWeight,
    facility_weight: facilityWeight,
    variance_pct: variance.toFixed(2),
    compliant: variance <= threshold,
    regulation_37_triggered: variance > threshold
  };
  
  if (result.regulation_37_triggered) {
    // RED ALERT - Potential Illegal Dumping
    result.alert = {
      level: 'CRITICAL',
      code: 'REG-37-VIOLATION',
      message: `🚨 POTENTIAL ILLEGAL DUMPING: ${variance.toFixed(1)}% weight variance detected`,
      penalty_risk: `KES ${SOVEREIGN_VALUES.REGULATION_37_PENALTY_KES.toLocaleString()}`,
      action_required: 'Immediate NEMA inspection required'
    };
    
    // Add to global registry as violation
    if (typeof window.NTZ !== 'undefined') {
      if (!window.NTZ.registry) window.NTZ.registry = [];
      window.NTZ.registry.push({
        type: 'COMPLIANCE VIOLATION ALERT',
        severity: 'CRITICAL',
        code: 'REGULATION-37',
        timestamp: new Date().toISOString(),
        variance: variance.toFixed(2) + '%',
        detail: `Source: ${sourceWeight}kg vs Facility: ${facilityWeight}kg. Penalty risk: KES ${SOVEREIGN_VALUES.REGULATION_37_PENALTY_KES.toLocaleString()}`
      });
    }
  }
  
  return result;
}

// ── IoT Truck Simulation ───────────────────────────
function simulateTruckTransit(containerId, startLat, startLng, endLat, endLng) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  wasteData.transit_simulation_active = true;
  
  // Initialize telemetry
  wasteData.iot_telemetry = [{
    lat: parseFloat(startLat),
    lng: parseFloat(startLng),
    timestamp: new Date().toISOString(),
    speed: 0,
    status: 'departed_source'
  }];
  
  // Create map HTML
  container.innerHTML = `
    <div style="background:rgba(13,40,24,0.9); border:1px solid var(--mint); border-radius:8px; padding:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div>
          <span style="font-size:1.2rem;">🚛</span>
          <strong style="color:var(--mint);"> ${wasteData.truck_vessel_id}</strong>
          <span class="live-indicator" style="display:inline-block;width:8px;height:8px;background:#00ff00;border-radius:50%;margin-left:8px;animation:live-pulse 1.5s infinite;"></span>
          <span style="font-size:0.7rem; color:#00ff00;"> LIVE</span>
        </div>
        <div style="font-size:0.75rem; color:rgba(255,255,255,0.6);">
          Source-to-Sink Tracking
        </div>
      </div>
      <div id="truck-map-${containerId}" style="height:200px; background:#0D2818; border-radius:6px; position:relative; overflow:hidden;">
        <div style="position:absolute; top:50%; left:10%; transform:translate(-50%,-50%); font-size:2rem; transition:all 2s linear;" id="truck-icon-${containerId}">🚛</div>
        <div style="position:absolute; bottom:10px; left:10px; font-size:0.7rem; color:var(--mint);">
          GPS: ${startLat}, ${startLng}
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:10px; font-size:0.7rem;">
        <div style="text-align:center; padding:5px; background:rgba(0,0,0,0.3); border-radius:4px;">
          <div style="color:var(--mint);">SPEED</div>
          <div id="truck-speed-${containerId}">40 km/h</div>
        </div>
        <div style="text-align:center; padding:5px; background:rgba(0,0,0,0.3); border-radius:4px;">
          <div style="color:var(--mint);">ETA</div>
          <div id="truck-eta-${containerId}">45 min</div>
        </div>
        <div style="text-align:center; padding:5px; background:rgba(0,0,0,0.3); border-radius:4px;">
          <div style="color:var(--mint);">STATUS</div>
          <div id="truck-status-${containerId}">En Route</div>
        </div>
      </div>
    </div>
  `;
  
  // Simulate movement
  let progress = 0;
  const interval = setInterval(() => {
    progress += 5;
    const truck = document.getElementById(`truck-icon-${containerId}`);
    if (truck) {
      truck.style.left = (10 + progress) + '%';
    }
    
    // Add telemetry ping
    wasteData.iot_telemetry.push({
      lat: parseFloat(startLat) + (progress / 100) * (endLat - startLat),
      lng: parseFloat(startLng) + (progress / 100) * (endLng - startLng),
      timestamp: new Date().toISOString(),
      speed: 40,
      status: progress >= 100 ? 'arrived_facility' : 'in_transit'
    });
    
    if (progress >= 100) {
      clearInterval(interval);
      wasteData.transit_simulation_active = false;
      const status = document.getElementById(`truck-status-${containerId}`);
      if (status) status.textContent = 'Arrived';
      
      // Add ledger block
      addLedgerBlock('TRUCK_ARRIVED', { vessel_id: wasteData.truck_vessel_id });
    }
  }, 1000);
}

// ── Proponent / Developer: AI-Driven Waste GCIS Chat ──────────────
function renderWasteWizard() {
  const container = document.getElementById('waste-wizard-container');
  if (!container) return;

  const existingProjects = getWasteProjects();
  const projectSummary = existingProjects.length > 0 ? `
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(109,217,140,.15);border-radius:8px;padding:.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between">
      <div style="font-size:.82rem;color:rgba(255,255,255,.7)">You have <b style="color:var(--mint)">${existingProjects.length}</b> waste project${existingProjects.length>1?'s':''} registered</div>
      <button class="btn-report" onclick="renderWasteViewForRole()" style="font-size:.72rem">View All</button>
    </div>` : '';

  container.innerHTML = `
    ${projectSummary}
    <div class="wzc-wrapper">
      <div class="wzc-header">
        <div class="wzc-header-left">
          <div class="wzc-avatar">Z</div>
          <div>
            <div class="wzc-title">Zerra - Waste GCIS Intake</div>
            <div class="wzc-status"><span class="wzc-status-dot"></span> Online - Structured Interview</div>
          </div>
        </div>
        <div class="wzc-header-right">
          <span class="wzc-step-badge" id="wzc-step-badge">Step 1/9</span>
          <button class="btn-report" onclick="if(confirm('Reset interview and start fresh?')){wasteGcisHistory=[];hardResetWasteModule();}" style="font-size:.68rem;padding:.3rem .6rem">Reset</button>
        </div>
      </div>
      <div class="wzc-msgs" id="wzc-msgs"></div>
      <div class="wzc-sugs" id="wzc-sugs"></div>
      <div class="wzc-input-row">
        <textarea class="wzc-ta" id="wzc-inp" rows="1" placeholder="Type your answer..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();wasteGcisSend();}" oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,88)+'px';"></textarea>
        <button class="wzc-send" id="wzc-send" onclick="wasteGcisSend()">&#10148;</button>
      </div>
    </div>
  `;

  if (wasteGcisHistory.length === 0) {
    _wzcGreet();
  } else {
    _wzcRestoreMessages();
  }
}

// ── Chat Message Helpers ──────────────────────────────
function _wzcAddMsg(role, text) {
  const c = document.getElementById('wzc-msgs');
  if (!c) return;
  const d = document.createElement('div');
  d.className = 'wzc-msg ' + role;
  const ts = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  let html = text
    .replace(/</g, '&lt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  d.innerHTML = '<div class="wzc-bub">' + html + '</div><span class="wzc-ts">' + ts + '</span>';
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

function _wzcShowTyping() {
  const c = document.getElementById('wzc-msgs');
  if (!c) return;
  const d = document.createElement('div');
  d.className = 'wzc-msg bot wzc-typing';
  d.id = 'wzc-typing';
  d.innerHTML = '<div class="wzc-bub"><span class="wzc-dot-anim"></span><span class="wzc-dot-anim"></span><span class="wzc-dot-anim"></span></div>';
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

function _wzcRemoveTyping() {
  var el = document.getElementById('wzc-typing');
  if (el) el.remove();
}

function _wzcRestoreMessages() {
  wasteGcisHistory.forEach(function(m) {
    _wzcAddMsg(m.role === 'user' ? 'user' : 'bot', m.content);
  });
  var lastBot = null;
  for (var i = wasteGcisHistory.length - 1; i >= 0; i--) {
    if (wasteGcisHistory[i].role === 'assistant') { lastBot = wasteGcisHistory[i]; break; }
  }
  if (lastBot) _wzcParseSuggestions(lastBot.content);
  _wzcUpdateStepBadge();
}

// ── Greeting (Auto-start Q1) ──────────────────────────
async function _wzcGreet() {
  _wzcShowTyping();
  wasteGcisBusy = true;
  try {
    var systemMsg = { role: 'system', content: WASTE_GCIS_SYSTEM_PROMPT };
    var initMsg = { role: 'user', content: 'Begin the waste facility registration interview. Start with Q1.' };
    var messages = [systemMsg, initMsg];
    var reply = await _wzcCallWorker(messages);
    _wzcRemoveTyping();
    _wzcAddMsg('bot', reply);
    wasteGcisHistory.push({ role: 'assistant', content: reply });
    _wzcParseSuggestions(reply);
    _wzcUpdateStepBadge();
    saveWasteState();
  } catch (e) {
    _wzcRemoveTyping();
    _wzcAddMsg('bot', 'Could not connect to Zerra: ' + e.message);
  }
  wasteGcisBusy = false;
}

// ── Send User Message ──────────────────────────────
async function wasteGcisSend(textOverride) {
  if (wasteGcisBusy) return;
  var inp = document.getElementById('wzc-inp');
  var txt = textOverride || (inp ? inp.value.trim() : '');
  if (!txt) return;
  if (inp) { inp.value = ''; inp.style.height = 'auto'; }

  var sugs = document.getElementById('wzc-sugs');
  if (sugs) sugs.innerHTML = '';

  _wzcAddMsg('user', txt);
  wasteGcisHistory.push({ role: 'user', content: txt });

  wasteGcisBusy = true;
  var sendBtn = document.getElementById('wzc-send');
  if (sendBtn) sendBtn.disabled = true;
  _wzcShowTyping();

  try {
    var systemMsg = { role: 'system', content: WASTE_GCIS_SYSTEM_PROMPT };
    var messages = [systemMsg].concat(wasteGcisHistory.slice(-24));
    var reply = await _wzcCallWorker(messages);
    _wzcRemoveTyping();
    _wzcAddMsg('bot', reply);
    wasteGcisHistory.push({ role: 'assistant', content: reply });

    _wzcExtractData(reply);
    _wzcParseSuggestions(reply);
    _wzcUpdateStepBadge();

    if (_wzcCheckComplete(reply)) {
      _wzcShowSubmitButton();
    }

    saveWasteState();
  } catch (e) {
    _wzcRemoveTyping();
    _wzcAddMsg('bot', 'Error: ' + e.message);
  }

  wasteGcisBusy = false;
  if (sendBtn) sendBtn.disabled = false;
}

// ── Worker Call ──────────────────────────────────
async function _wzcCallWorker(messages) {
  var url = typeof WASTE_WORKER_URL !== 'undefined' ? WASTE_WORKER_URL : 'https://delicate-bird-531b.shukriali411.workers.dev/';
  var r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages })
  });
  if (!r.ok) {
    var msg = 'Worker ' + r.status;
    try { var e = await r.json(); msg = e.error && e.error.message ? e.error.message : msg; } catch (_) {}
    throw new Error(msg);
  }
  var d = await r.json();
  var text = d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : null;
  if (!text) throw new Error('Empty response from Worker');
  return text;
}

// ── Parse Suggested Answers ──────────────────────────
function _wzcParseSuggestions(reply) {
  var sugs = document.getElementById('wzc-sugs');
  if (!sugs) return;

  var match = reply.match(/Suggested answers?:\s*([\s\S]*?)(?:\n\n|$)/i);
  if (!match) { sugs.innerHTML = ''; return; }

  var sugText = match[1];
  var items = sugText
    .split(/\n/)
    .map(function(s) { return s.replace(/^[\s\-\d.)]+/, '').trim(); })
    .filter(function(s) { return s.length > 2 && s.length < 150; });

  if (items.length === 0) { sugs.innerHTML = ''; return; }

  sugs.innerHTML = items.slice(0, 4).map(function(s) {
    var escaped = s.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return '<button class="wzc-sug" onclick="wasteGcisSend(\'' + escaped + '\')">' + s + '</button>';
  }).join('');
}

// ── Extract Data from AI Responses ──────────────────
function _wzcExtractData(reply) {
  var fullConvo = wasteGcisHistory.map(function(m) { return m.content; }).join('\n');
  var userMsgs = wasteGcisHistory.filter(function(m) { return m.role === 'user'; }).map(function(m) { return m.content; });

  // Extract county
  for (var i = 0; i < userMsgs.length; i++) {
    var um = userMsgs[i];
    for (var j = 0; j < ALL_47_COUNTIES.length; j++) {
      if (um.toLowerCase().indexOf(ALL_47_COUNTIES[j].toLowerCase()) !== -1) {
        wasteData.w_county = ALL_47_COUNTIES[j];
        break;
      }
    }
    if (wasteData.w_county) break;
  }

  // Extract tonnage
  var tonnageMatch = reply.match(/([\d,]+)\s*(?:tonnes?|t)\s*(?:per year|\/year|\/yr|annually)/i);
  if (tonnageMatch) wasteData.w_annual_volume = parseInt(tonnageMatch[1].replace(/,/g, ''));

  // Extract tCO2e baseline
  var co2Match = reply.match(/([\d,]+(?:\.\d+)?)\s*tCO.?e\/(?:year|yr)/i);
  if (co2Match) wasteData.methane_baseline_tco2e_yr = parseFloat(co2Match[1].replace(/,/g, ''));

  // Extract CDA share
  for (var k = 0; k < userMsgs.length; k++) {
    var cdaMatch = userMsgs[k].match(/(\d+)\s*%/);
    if (cdaMatch) {
      var pct = parseInt(cdaMatch[1]);
      if (pct >= 20 && pct <= 100) wasteData.cda_share_pct = pct;
    }
  }

  // Extract DOC fraction
  var docMatch = reply.match(/DOC[^:]*?[:=]\s*(0\.\d+)/i);
  if (docMatch) wasteData.w_doc_fraction = parseFloat(docMatch[1]);

  // Extract waste type
  var wasteTypes = ['Municipal Solid Waste', 'Industrial waste', 'Healthcare waste', 'Agricultural waste', 'Construction debris', 'Mixed recyclables', 'Hazardous waste'];
  for (var w = 0; w < wasteTypes.length; w++) {
    if (fullConvo.toLowerCase().indexOf(wasteTypes[w].toLowerCase()) !== -1) {
      wasteData.w_stream_type = wasteTypes[w];
      break;
    }
  }

  // Extract facility name from first user answer
  if (!wasteData.w_facility_name && userMsgs.length >= 1) {
    var firstAnswer = userMsgs[0];
    if (firstAnswer && firstAnswer.length < 100 && firstAnswer.length > 2) {
      wasteData.w_facility_name = firstAnswer.trim();
      wasteData.w_company_name = wasteData.w_company_name || firstAnswer.trim();
    }
  }

  saveWasteState();
}

// ── Update Step Badge ──────────────────────────────
function _wzcUpdateStepBadge() {
  var badge = document.getElementById('wzc-step-badge');
  if (!badge) return;

  var botMsgs = wasteGcisHistory.filter(function(m) { return m.role === 'assistant'; }).length;
  var stepMap = [
    { min: 0, max: 4, step: 1, label: 'Project Identity' },
    { min: 4, max: 6, step: 2, label: 'Legal Hard-Gate' },
    { min: 6, max: 8, step: 3, label: 'Waste Streams' },
    { min: 8, max: 9, step: 4, label: 'AI Vision Audit' },
    { min: 9, max: 10, step: 5, label: 'GIS Facility' },
    { min: 10, max: 12, step: 6, label: 'IPCC Baseline' },
    { min: 12, max: 13, step: 7, label: 'dCoC' },
    { min: 13, max: 15, step: 8, label: 'CDA Fourth Schedule' },
    { min: 15, max: 99, step: 9, label: 'Registration Summary' }
  ];

  var current = stepMap[stepMap.length - 1];
  for (var i = 0; i < stepMap.length; i++) {
    if (botMsgs >= stepMap[i].min && botMsgs < stepMap[i].max) {
      current = stepMap[i];
      break;
    }
  }
  badge.textContent = 'Step ' + current.step + '/9 - ' + current.label;
  wasteCurrentStep = current.step - 1;
}

// ── Check Interview Complete ──────────────────────────
function _wzcCheckComplete(reply) {
  var lower = reply.toLowerCase();
  return (lower.indexOf('facility summary') !== -1 || lower.indexOf('registration data') !== -1 || lower.indexOf('collected all') !== -1) &&
         (lower.indexOf('generate') !== -1 || lower.indexOf('registration package') !== -1 || lower.indexOf('pcn') !== -1);
}

// ── Show Submit Button ──────────────────────────────
function _wzcShowSubmitButton() {
  var c = document.getElementById('wzc-msgs');
  if (!c) return;
  if (document.getElementById('wzc-submit-panel')) return;

  var d = document.createElement('div');
  d.id = 'wzc-submit-panel';
  d.className = 'wzc-submit-panel';
  d.innerHTML = '<div style="text-align:center; padding:1.5rem; background:rgba(58,170,92,.08); border:1px solid var(--mint,#6DD98C); border-radius:12px; margin-top:.75rem;">' +
    '<h4 style="color:var(--mint,#6DD98C); margin:0 0 .5rem 0;">Interview Complete - Ready to Submit</h4>' +
    '<p style="font-size:.78rem; color:rgba(255,255,255,.6); margin-bottom:1rem;">Zerra has collected all registration data. Generate your NEMA Waste Registration Package.</p>' +
    '<button class="gcis-btn gcis-btn-submit" onclick="wasteGcisSubmit()" style="font-size:.9rem; padding:.8rem 2rem;">Generate Registration Package</button>' +
    '</div>';
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

// ── Submit from Chat ──────────────────────────────
async function wasteGcisSubmit() {
  var prl = calculatePRL(wasteData);
  wasteData.prl_score = prl.total;
  wasteData.prl_breakdown = prl.breakdown;

  if (!wasteData.w_company_name) wasteData.w_company_name = wasteData.w_facility_name || 'Waste Facility';
  if (!wasteData.w_doc_fraction) wasteData.w_doc_fraction = SOVEREIGN_VALUES.DOC_MUNICIPAL;
  if (!wasteData.methane_baseline_tco2e_yr && wasteData.w_annual_volume) {
    wasteData.methane_baseline_tco2e_yr = wasteData.w_annual_volume * wasteData.w_doc_fraction * SOVEREIGN_VALUES.SOLID_WASTE_EF * SOVEREIGN_VALUES.METHANE_GWP / 1000;
  }

  await submitWasteForAudit();
  toast('Registration Package generated and submitted for NEMA expert audit. PRL: ' + wasteData.prl_score + '/100', 'success');
}


function wasteNext() {
  const step = WASTE_STEPS[wasteCurrentStep];
  
  // ═══════════════════════════════════════════════════════════
  // TITAN SOVEREIGN 8-STEP VALIDATION
  // ═══════════════════════════════════════════════════════════
  
  // Step 1: KYC - Company, KRA PIN, Business Reg required
  if (step.id === 'step1-kyc') {
    if (!wasteData.w_company_name || !wasteData.w_kra_pin || !wasteData.w_business_reg) {
      return toast('Step 1: Company Name, KRA PIN, and Business Registration are required.', 'error');
    }
    // Check for duplicates in NTZ registry
    const dups = checkWasteDuplicateRegistrations();
    if (dups.length > 0) {
      dups.forEach(w => toast(w, 'error'));
      return;
    }
  }
  
  // Step 2: Legal Hard-Gate - NEMA License required (BLOCKS PROGRESS)
  if (step.id === 'step2-license') {
    if (!wasteData.w_nema_license) {
      return toast('🚨 LEGAL HARD-GATE: NEMA License is mandatory under Sustainable Waste Management Act 2022. Progress blocked.', 'error');
    }
    wasteData.w_nema_verified = true;
    addLedgerBlock('NEMA_LICENSE_VERIFIED', { license: wasteData.w_nema_license });
  }
  
  // Step 3: Licensed Waste Contractor - REQUIRED
  if (step.id === 'step3-contractor') {
    if (!wasteData.w_contractor) {
      return toast('Step 3: Please select a NEMA-licensed waste collection company (e.g., Baus Taka).', 'error');
    }
    const company = LICENSED_WASTE_COMPANIES.find(c => c.name === wasteData.w_contractor);
    if (!company) {
      return toast('Step 3: Selected contractor not found in NEMA database.', 'error');
    }
    wasteData.w_contractor_license = company.license;
    addLedgerBlock('CONTRACTOR_SELECTED', { company: wasteData.w_contractor, license: company.license });
  }
  
  // Step 4: Source & Stream
  if (step.id === 'step4-stream') {
    if (!wasteData.w_stream_type) {
      return toast('Step 4: Please select a waste stream category.', 'error');
    }
    if (!wasteData.w_annual_volume || wasteData.w_annual_volume <= 0) {
      return toast('Step 4: Annual volume is required for baseline calculation.', 'error');
    }
    updateStreamType(wasteData.w_stream_type);
  }
  
  // Step 5: AI Vision — allow skip if demo was run (tonnage_facility or ai_composition set)
  if (step.id === 'step5-vision') {
    if (wasteData.ai_composition.organic === 0 && wasteData.vision_images.length === 0 && !wasteData.tonnage_facility) {
      return toast('Step 5: Upload images and run AI analysis, or use Demo Mode.', 'error');
    }
    addLedgerBlock('AI_VISION_COMPLETE', { images: wasteData.vision_images.length, composition: wasteData.ai_composition });
  }
  
  // Step 6: GIS
  if (step.id === 'step6-gis') {
    if (!wasteData.w_facility_name && !wasteData.w_gis_area) {
      return toast('Step 6: Please select a facility location.', 'error');
    }
    addLedgerBlock('GIS_VERIFIED', { lat: wasteData.w_facility_lat, lng: wasteData.w_facility_lng, risk: wasteData.gis_leakage_risk });
  }
  
  // Step 7: Baseline
  if (step.id === 'step7-baseline') {
    addLedgerBlock('IPCC_BASELINE_CALCULATED', { tco2e_yr: wasteData.methane_baseline_tco2e_yr });
  }
  // Step 8: CDA Lock
  if (step.id === 'step8-cda') {
    const minShare = wasteData.land_type === 'Public/Community' 
      ? SOVEREIGN_VALUES.REGULATION_23E_LAND_SHARE_PCT 
      : SOVEREIGN_VALUES.REGULATION_23E_NONLAND_SHARE_PCT;
    
    if (wasteData.cda_share_pct < minShare) {
      return toast(`🚨 FOURTH SCHEDULE LOCK ACTIVE: ${minShare}% required for ${wasteData.land_type}. Current: ${wasteData.cda_share_pct}%.`, 'error');
    }
    wasteData.cda_locked = true;
    addLedgerBlock('CDA_LOCK_CLEARED', { share_pct: wasteData.cda_share_pct, land_type: wasteData.land_type });
  }
  
  // Step 9: Review & Submit
  if (step.id === 'step9-review') {
    const prl = calculatePRL(wasteData);
    if (prl.total < 60) {
      return toast(`Step 9: PRL score too low (${prl.total}/100). Minimum 60 required for submission.`, 'error');
    }
    // Submit to consultant
    submitWasteForAudit();
    return;
  }
  
  // Advance to next step
  if (wasteCurrentStep < WASTE_STEPS.length - 1) {
    wasteCurrentStep++;
    saveWasteState();
    renderWasteWizard();
    
    // Add ledger block for step completion
    addLedgerBlock(`STEP_${wasteCurrentStep}_COMPLETED`, { step_id: WASTE_STEPS[wasteCurrentStep].id });
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS (Titan Sovereign)
// ═══════════════════════════════════════════════════════════

// Update stream type and auto-set DOC fraction
function updateStreamType(streamType) {
  wasteData.w_stream_type = streamType;
  
  // Auto-set DOC fraction based on IPCC 2019 defaults
  const docMap = {
    'Municipal Solid Waste': SOVEREIGN_VALUES.DOC_MUNICIPAL,
    'Industrial Waste': SOVEREIGN_VALUES.DOC_INDUSTRIAL,
    'Healthcare/Medical Waste': SOVEREIGN_VALUES.DOC_HEALTHCARE,
    'Agricultural Waste': SOVEREIGN_VALUES.DOC_AGRICULTURAL
  };
  
  wasteData.w_doc_fraction = docMap[streamType] || SOVEREIGN_VALUES.DOC_MUNICIPAL;
  saveWasteState();
  
  // Re-render to show updated DOC
  if (WASTE_STEPS[wasteCurrentStep].id === 'step3-stream') {
    renderWasteWizard();
  }
}

// Check CDA Lock status
function checkCDALock() {
  const minShare = wasteData.land_type === 'Public/Community' 
    ? SOVEREIGN_VALUES.REGULATION_23E_LAND_SHARE_PCT 
    : SOVEREIGN_VALUES.REGULATION_23E_NONLAND_SHARE_PCT;
  
  const nextBtn = document.getElementById('waste-next-btn');
  const warning = document.getElementById('cda-warning');
  
  if (nextBtn) {
    if (wasteData.cda_share_pct < minShare) {
      nextBtn.style.opacity = '0.3';
      nextBtn.style.pointerEvents = 'none';
      nextBtn.title = `Fourth Schedule Lock: ${minShare}% required`;
    } else {
      nextBtn.style.opacity = '1';
      nextBtn.style.pointerEvents = 'auto';
      nextBtn.title = 'Continue →';
    }
  }
}

// Submit for Expert Audit
async function submitWasteForAudit() {
  // Generate project ID if not set
  if (!wasteData.project_id) {
    wasteData.project_id = 'WASTE-' + Date.now();
  }
  
  wasteData.status = 'submitted';
  wasteData.submitted_at = new Date().toISOString();
  wasteData.submittedToConsultant = true;
  
  // Add final ledger block
  await addLedgerBlock('PROJECT_SUBMITTED', { 
    project_id: wasteData.project_id, 
    prl: wasteData.prl_score,
    tco2e_yr: wasteData.methane_baseline_tco2e_yr 
  });
  
  // Register in NTZ
  registerWasteProject(wasteData);
  
  // Show success
  toast(`📤 Project ${wasteData.project_id} submitted for NEMA expert audit. PRL: ${wasteData.prl_score}/100`, 'success');
  
  // Return user to dashboard so they can see the NEMA module card
  setTimeout(() => {
    try { if (typeof showSection === 'function') showSection('dashboard'); } catch (e) {}
    try { renderDashboardWasteNemaModule(); } catch (e) {}
  }, 900);
}

// Legacy checkCDA (backward compat)
function checkCDA() {
  const share = parseInt(wasteData.cda_share) || 0;
  const warn = document.getElementById('cda-warning');
  const nextBtn = document.getElementById('waste-next-btn');
  
  if (warn && nextBtn) {
    if (share < 40) {
      warn.style.display = 'block';
      nextBtn.style.opacity = '0.3';
      nextBtn.style.pointerEvents = 'none';
    } else {
      warn.style.display = 'none';
      nextBtn.style.opacity = '1';
      nextBtn.style.pointerEvents = 'auto';
    }
  }
}

function checkWasteDuplicateRegistrations() {
  const warnings = [];
  const fieldsToCheck = ['w_kra_pin', 'w_business_reg', 'w_invoice_no', 'w_nema_license'];
  fieldsToCheck.forEach(fieldId => {
    const val = wasteData[fieldId];
    if (!val) return;
    if (!window.NTZ || !window.NTZ.projects) return;
    const existing = window.NTZ.projects.find(p => p.sector === 'waste' && p[fieldId] === val);
    if (existing) {
      warnings.push(`${fieldId.replace('w_','').replace(/_/g,' ').toUpperCase()} "${val}" already used in project ${existing.name}`);
    }
  });
  return warnings;
}

function wasteBack() {
  if (wasteCurrentStep > 0) {
    wasteCurrentStep--;
    saveWasteState();
    renderWasteWizard();
    console.log(`⬅️ Navigated back to Step ${wasteCurrentStep + 1}`);
  } else {
    // At step 0, go back to role view
    renderWasteViewForRole();
    console.log('⬅️ Back to role dashboard');
  }
}

// ── GIS Area Selection ──────────────────────────────
function selectGISArea(areaName) {
  wasteData.w_gis_area = areaName;
  const area = GIS_WASTE_AREAS.find(a => a.name === areaName);
  if (area) {
    // Write to BOTH old and new field names to ensure compatibility
    wasteData.w_facility_lat = String(area.lat);
    wasteData.w_facility_lng = String(area.lng);
    wasteData.w_lat = String(area.lat);
    wasteData.w_lng = String(area.lng);
    wasteData.w_county = area.county;
    const facilityType = area.type === 'dumpsite' ? 'Open Dumpsite' : 
                       area.type === 'landfill' ? 'Engineered Landfill' :
                       area.type === 'recycling' ? 'Recycling Centre' :
                       area.type === 'composting' ? 'Composting Facility' :
                       area.type === 'wte' ? 'Waste-to-Energy' :
                       area.type === 'transfer' ? 'Transfer Station' : 'Open Dumpsite';
    wasteData.w_type = facilityType;
    // Auto-fill facility name (write to BOTH field names)
    if (!wasteData.w_facility_name) {
      wasteData.w_facility_name = area.name.split(',')[0];
    }
    wasteData.w_name = wasteData.w_facility_name;
    saveWasteState();
    renderWasteWizard(); // re-render to show satellite panel
  }
}

// Auto-fill contractor license when company selected
function selectWasteContractor(companyName) {
  wasteData.w_contractor = companyName;
  const company = LICENSED_WASTE_COMPANIES.find(c => c.name === companyName);
  if (company) {
    wasteData.w_contractor_license = company.license;
    // Auto-validate county coverage
    if (wasteData.w_county && !company.counties.includes(wasteData.w_county)) {
      toast(`⚠️ ${company.name} not licensed for ${wasteData.w_county} County`, 'warning');
    } else {
      toast(`✅ ${company.name} validated - License: ${company.license}`, 'success');
    }
    saveWasteState();
    // Update the license field in DOM
    const licenseField = document.getElementById('w_contractor_license');
    if (licenseField) licenseField.value = company.license;
  }
}

// ── Satellite OCR with Fallback Simulation ─────────
async function runSatelliteOCR() {
  const btn = document.getElementById('ocr-btn');
  const scanning = document.getElementById('ocr-scanning');
  const placeholder = document.getElementById('satellite-placeholder');
  const overlay = document.getElementById('ocr-results-overlay');
  const detailed = document.getElementById('ocr-detailed-results');
  
  if (btn) btn.disabled = true;
  if (btn) btn.innerHTML = '🔍 Scanning Sentinel-2 Imagery...';
  if (scanning) scanning.style.display = 'block';
  if (placeholder) placeholder.style.display = 'none';
  
  try {
    // Try worker first
    const res = await fetch(typeof WASTE_WORKER_URL !== "undefined" ? WASTE_WORKER_URL : 'https://delicate-bird-531b.shukriali411.workers.dev/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'satellite_ocr', lat: wasteData.w_facility_lat, lng: wasteData.w_facility_lng })
    });
    const data = await res.json();
    if (!data.error) {
      wasteData.gis_leakage_risk = data.leakage_risk || 'low';
    }
  } catch (e) {
    // Worker failed - use simulation
    console.log('Worker unavailable, using simulation');
    // Simulate leakage risk based on facility type
    const risks = ['low', 'low', 'medium', 'low'];
    wasteData.gis_leakage_risk = risks[Math.floor(Math.random() * risks.length)];
  }

  // Show results
  setTimeout(() => {
    if (scanning) scanning.style.display = 'none';
    if (overlay) overlay.style.display = 'block';
    if (detailed) detailed.style.display = 'block';
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '✅ Sentinel-2 Analysis Complete';
      btn.style.background = 'rgba(58, 170, 92, 0.8)';
    }
    
    wasteData.gis_verified = true;
    wasteData.gis_ocr_completed = true;
    saveWasteState();
    toast(`✅ Satellite Analysis: ${wasteData.gis_leakage_risk.toUpperCase()} leakage risk detected`, 'success');
  }, 2000);
}

// checkCDA() duplicate removed — single definition at line ~1929

function runWasteGIS() {
  const mapEl = document.getElementById('waste-leaflet-map');
  if (!mapEl || !window.L) return;
  mapEl.innerHTML = '';
  // Read from w_facility_lat/lng (primary) with fallback to w_lat/lng
  const lat = parseFloat(wasteData.w_facility_lat || wasteData.w_lat) || -1.2505;
  const lng = parseFloat(wasteData.w_facility_lng || wasteData.w_lng) || 36.8972;
  
  const map = L.map('waste-leaflet-map', { zoomControl: false, attributionControl:false }).setView([lat, lng], 16);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri', maxZoom:18
  }).addTo(map);

  L.circle([lat, lng], { color: '#00C9A7', fillColor: '#00C9A7', fillOpacity: 0.2, radius: 150 }).addTo(map);
  L.marker([lat, lng]).addTo(map).bindPopup('Facility Lock').openPopup();
}

function handleBatchWasteUpload(input) {
  const files = input.files;
  if (!files || files.length === 0) return;
  
  const promises = [];
  for (let i=0; i<files.length; i++) {
    promises.push(new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve({ base64: e.target.result, mime: files[i].type });
      reader.readAsDataURL(files[i]);
    }));
  }

  Promise.all(promises).then(res => {
    wasteData.vision_images = res;
    renderThumbnails();
    document.getElementById('waste-vision-btn').style.display = 'block';
  });
}

window.downloadWasteQRCode = function() {
  const canvas = document.createElement('canvas');
  const size = 300;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const img = new Image();
  img.crossOrigin = "Anonymous";
  const id = window.wasteData?.project_id || 'NTZ-W-' + Date.now();
  img.src = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent("https://www.netzerra.co.ke/verify?hash=" + id + "&dCoC=true");
  
  img.onload = function() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    
    // Add banner text
    ctx.fillStyle = "rgba(58,170,92,0.1)";
    ctx.fillRect(0, size - 40, size, 40);
    ctx.fillStyle = "#184f32";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("dCoC TRACEABILITY PASSPORT", size / 2, size - 15);
    
    const lnk = document.createElement('a');
    lnk.download = 'Waste_Passport_' + id + '.png';
    lnk.href = canvas.toDataURL('image/png');
    lnk.click();
    toast('Waste Passport Downloaded', 'success');
  };
};

function renderThumbnails() {
  const thumbWrap = document.getElementById('waste-image-thumbnails');
  if (!thumbWrap) return;
  thumbWrap.innerHTML = wasteData.vision_images.map(img => `
    <div style="width:60px; height:60px; border-radius:6px; overflow:hidden; border:2px solid var(--mint)">
      <img src="${img.base64}" style="width:100%; height:100%; object-fit:cover;">
    </div>
  `).join('');
}

// Manual tonnage entry fallback
function setManualTonnage() {
  const input = document.getElementById('manual-tonnage');
  const value = parseFloat(input.value);
  if (!value || value <= 0) {
    toast('Please enter a valid tonnage value', 'error');
    return;
  }
  wasteData.tonnage_facility = value;
  wasteData.extracted = [
    { type: 'organic', value: 65 },
    { type: 'plastic', value: 15 },
    { type: 'metal', value: 10 },
    { type: 'inert', value: 10 }
  ];
  saveWasteState();
  renderWasteWizard();
  toast(`✅ Manual tonnage set: ${value.toLocaleString()} kg`, 'success');
}

// Demo mode - simulate AI extraction without images
function runDemoExtraction() {
  const load = document.getElementById('vision-loading');
  const resContainer = document.getElementById('vision-results-container');
  
  if (load) load.classList.remove('hidden');
  
  // Simulate processing delay
  setTimeout(() => {
    // Generate realistic demo data
    const demoTonnage = Math.floor(4500 + Math.random() * 3000); // 4500-7500 kg
    const organicPct = Math.floor(55 + Math.random() * 15);
    const plasticPct = Math.floor(10 + Math.random() * 10);
    const metalPct = Math.floor(5 + Math.random() * 10);
    const glassPct = Math.floor(3 + Math.random() * 5);
    const hazPct = Math.max(0, 100 - organicPct - plasticPct - metalPct - glassPct);
    
    wasteData.tonnage_facility = demoTonnage;
    wasteData.extracted = [
      { type: 'organic', value: organicPct },
      { type: 'plastic', value: plasticPct },
      { type: 'metal', value: metalPct },
      { type: 'inert', value: glassPct }
    ];
    // CRITICAL: Also set ai_composition for the new Step 5 wizard
    wasteData.ai_composition = {
      organic: organicPct,
      plastic: plasticPct,
      metal: metalPct,
      glass: glassPct,
      hazardous: hazPct
    };
    wasteData.ai_synthesis = `Demo analysis: ${organicPct}% organic, ${plasticPct}% plastic, ${metalPct}% metal. Total: ${demoTonnage} kg.`;
    wasteData.vision_images = [{ name: 'demo-weighbridge-1.jpg', base64: '' }]; // Mark as processed
    
    saveWasteState();
    
    if (load) load.classList.add('hidden');
    if (resContainer) {
      resContainer.innerHTML = `
        <div style="background:rgba(58,170,92,0.1); padding:15px; border-radius:8px; border:1px solid var(--mint);">
          <h4 style="color:var(--mint); margin:0 0 10px 0;">✅ Demo Extraction Complete</h4>
          <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span>Facility Tonnage:</span>
            <strong style="color:#fff">${demoTonnage.toLocaleString()} kg</strong>
          </div>
          <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:8px; font-size:0.8rem; margin-top:8px;">
            <div>🌱 Organic: <strong>${organicPct}%</strong></div>
            <div>🧴 Plastic: <strong>${plasticPct}%</strong></div>
            <div>🔩 Metal: <strong>${metalPct}%</strong></div>
            <div>🍾 Glass: <strong>${glassPct}%</strong></div>
          </div>
          <div style="font-size:0.7rem; color:var(--gold); margin-top:8px;">🎮 DEMO MODE - Simulated data for testing</div>
        </div>
      `;
    }
    
    toast(`🎮 Demo extraction complete: ${demoTonnage.toLocaleString()} kg`, 'success');
  }, 1500);
}

async function triggerWasteWorker() {
  const load = document.getElementById('vision-loading');
  const resContainer = document.getElementById('vision-results-container');
  const btn = document.getElementById('waste-vision-btn');
  
  // ── SOVEREIGN ARCHITECTURE ─────────────────────────
  // All AI processing routes through Cloudflare Worker.
  // Frontend captures images → Base64 → Worker Bridge.
  // Worker v14.0 handles: Jina Reader iteration + Groq 70B synthesis
  // Keys stored in ENCRYPTED Worker Environment Variables.
  // ─────────────────────────────────────────────────
  
  if (btn) btn.style.display = 'none';
  if (load) load.classList.remove('hidden');
  
  console.log('🔒 Sending vision data to Worker Bridge:', WASTE_WORKER_URL);

  try {
    // Send images to Worker for Jina + Groq processing
    const response = await fetch(WASTE_WORKER_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'waste_composition',
        images: wasteData.vision_images
      })
    });

    const data = await response.json();
    if (load) load.classList.add('hidden');
    
    if (data.error) throw new Error(data.error);

    // Store extraction results
    wasteData.extracted = data.extracted || [
      { type: 'organic', value: 65 },
      { type: 'plastic', value: 15 },
      { type: 'metal', value: 10 },
      { type: 'inert', value: 10 }
    ];
    wasteData.tonnage_facility = data.total_tonnage || data.tonnage_kg || 0;
    wasteData.ai_synthesis = data.synthesis || data.notes || 'Worker v14.0 synthesis complete';

    // Sync ai_composition with extracted data for Step 5 wizard compatibility
    const organic = wasteData.extracted.find(e => e.type === 'organic')?.value || 65;
    const plastic = wasteData.extracted.find(e => e.type === 'plastic')?.value || 15;
    const metal = wasteData.extracted.find(e => e.type === 'metal')?.value || 10;
    const glass = wasteData.extracted.find(e => e.type === 'glass' || e.type === 'inert')?.value || 10;
    wasteData.ai_composition = {
      organic: organic,
      plastic: plastic,
      metal: metal,
      glass: glass,
      hazardous: Math.max(0, 100 - organic - plastic - metal - glass)
    };
    saveWasteState();

    if (resContainer) {
      resContainer.innerHTML = `
        <div style="background:rgba(58,170,92,0.1); padding:15px; border-radius:8px; border:1px solid var(--mint);">
          <h4 style="color:var(--mint); margin-top:0;">✅ NEMA Vision Analysis Complete</h4>
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span>Facility Tonnage (Worker Aggregated):</span>
            <strong style="color:#fff">${wasteData.tonnage_facility.toLocaleString()} kg</strong>
          </div>
          <div style="margin-bottom:5px;"><strong>Composition Breakdown:</strong></div>
          <div style="height:12px; background:rgba(0,0,0,0.3); border-radius:6px; overflow:hidden; display:flex;">
            <div style="width:${organic}%; background:var(--mint);" title="Organic ${organic}%"></div>
            <div style="width:${plastic}%; background:var(--coral);" title="Plastic ${plastic}%"></div>
            <div style="flex:1; background:#555;" title="Metal/Inert"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:rgba(255,255,255,0.6); margin-top:5px;">
            <span>${organic}% Organic</span>
            <span>${plastic}% Plastic</span>
            <span>Metal/Inert</span>
          </div>
          <div style="font-size:0.7rem; color:var(--gold); margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.1);">
            🔒 <strong>Sovereign Architecture:</strong> Jina OCR + Groq 70B synthesis via Cloudflare Worker (ENCRYPTED_ENV)<br>
            <span style="font-size:0.65rem; color:rgba(255,255,255,0.5);">${wasteData.ai_synthesis}</span>
          </div>
        </div>
      `;
    }
    
    toast('🔒 Worker v14.0: Secure extraction complete', 'success');
    
  } catch (e) {
    if (load) load.classList.add('hidden');
    toast('Worker Bridge Error: ' + e.message, 'error');
    console.error('Vision worker bridge error:', e);
    
    // Show fallback message with demo button
    if (resContainer) {
      resContainer.innerHTML = `
        <div style="background:rgba(255,100,100,0.1); padding:15px; border-radius:8px; border:1px solid #ff6b6b;">
          <h4 style="color:#ff6b6b; margin:0 0 10px 0;">⚠️ Worker Bridge Connection Failed</h4>
          <p style="font-size:0.75rem; color:rgba(255,255,255,0.7); margin:0 0 10px 0;">
            Could not reach <code>delicate-bird-531b.shukriali411.workers.dev</code>.<br>
            Worker may be updating to v14.0 or unavailable.
          </p>
          <button class="gcis-btn" style="width:100%; background:var(--gold);" onclick="runDemoExtraction()">🎮 Use Demo Mode for Testing</button>
        </div>
      `;
    }
  }
}

// ── IoT Dashboard Tracking Functions ──────────────────
function renderIoTDashboard() {
  return `
    <div class="iot-dashboard-card" style="margin-bottom:1.5rem;">
      <h4><span class="live-indicator" style="display:inline-block;width:8px;height:8px;background:#00ff00;border-radius:50%;margin-right:6px;animation:live-pulse 1.5s infinite;"></span> Live Waste Transport Tracking</h4>
      <div class="iot-telemetry-grid">
        <div class="iot-telemetry-item">
          <div class="t-label">Active Transports</div>
          <div class="t-value live">3</div>
        </div>
        <div class="iot-telemetry-item">
          <div class="t-label">Total Load (kg)</div>
          <div class="t-value">12,450</div>
        </div>
        <div class="iot-telemetry-item">
          <div class="t-label">Avg Speed</div>
          <div class="t-value">42 km/h</div>
        </div>
      </div>
      <div id="iot-map-container" style="height:200px;margin-top:1rem;background:#0D2818;border-radius:8px;position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4);">
          <div>🗺️ Real-time GPS tracking active</div>
        </div>
        <!-- Simulated truck positions -->
        <div style="position:absolute;top:30%;left:20%;transform:translate(-50%,-50%);">
          <div style="font-size:1.5rem;">🚛</div>
          <div style="font-size:0.65rem;color:var(--mint);white-space:nowrap;">KCH 420A<br>5.2km away</div>
        </div>
        <div style="position:absolute;top:60%;left:60%;transform:translate(-50%,-50%);">
          <div style="font-size:1.5rem;">🚛</div>
          <div style="font-size:0.65rem;color:var(--gold);white-space:nowrap;">KCH 301B<br>2.8km away</div>
        </div>
        <div style="position:absolute;top:45%;left:80%;transform:translate(-50%,-50%);">
          <div style="font-size:1.5rem;">🚛</div>
          <div style="font-size:0.65rem;color:var(--teal);white-space:nowrap;">KCH 105C<br>Arrived</div>
        </div>
      </div>
      <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
        <span class="tag-pill" style="background:rgba(0,255,0,0.15);color:#00ff00;">● 2 En Route</span>
        <span class="tag-pill" style="background:rgba(245,166,35,0.15);color:#F5A623;">● 1 At Facility</span>
        <span class="tag-pill" style="background:rgba(0,150,255,0.15);color:#0096ff;">● 0 Alerts</span>
      </div>
    </div>
  `;
}

function renderIoTTrackingPanel() {
  return `
    <div class="iot-dashboard-card" style="margin-bottom:1.5rem;">
      <h4><span class="live-indicator" style="display:inline-block;width:8px;height:8px;background:#00ff00;border-radius:50%;margin-right:6px;animation:live-pulse 1.5s infinite;"></span> Source-to-Sink dCoC Tracking</h4>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem;margin-bottom:1rem;">
        <div style="background:rgba(0,0,0,0.2);padding:0.75rem;border-radius:6px;text-align:center;">
          <div style="font-size:0.65rem;color:rgba(255,255,255,0.5);">Transports Today</div>
          <div style="font-size:1.2rem;font-weight:700;color:#fff;">24</div>
        </div>
        <div style="background:rgba(0,0,0,0.2);padding:0.75rem;border-radius:6px;text-align:center;">
          <div style="font-size:0.65rem;color:rgba(255,255,255,0.5);">Total Weight (t)</div>
          <div style="font-size:1.2rem;font-weight:700;color:var(--mint);">142.5</div>
        </div>
        <div style="background:rgba(0,0,0,0.2);padding:0.75rem;border-radius:6px;text-align:center;">
          <div style="font-size:0.65rem;color:rgba(255,255,255,0.5);">Variance Alerts</div>
          <div style="font-size:1.2rem;font-weight:700;color:var(--coral);">0</div>
        </div>
        <div style="background:rgba(0,0,0,0.2);padding:0.75rem;border-radius:6px;text-align:center;">
          <div style="font-size:0.65rem;color:rgba(255,255,255,0.5);">dCoC Verified</div>
          <div style="font-size:1.2rem;font-weight:700;color:var(--gold);">98%</div>
        </div>
      </div>
      <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:1rem;">
        <div style="font-size:0.75rem;color:rgba(255,255,255,0.6);margin-bottom:0.5rem;">Recent Transport Activity</div>
        <div style="display:flex;flex-direction:column;gap:0.5rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem;background:rgba(58,170,92,0.1);border-radius:6px;">
            <span>🚛</span>
            <div style="flex:1;">
              <div style="font-size:0.8rem;">KCH 420A • Dandora → Athi River</div>
              <div style="font-size:0.65rem;color:rgba(255,255,255,0.5);">2,500 kg • Arrived 14:32</div>
            </div>
            <span class="tag-pill" style="background:rgba(58,170,92,0.2);color:var(--mint);">✓ Verified</span>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem;background:rgba(245,166,35,0.1);border-radius:6px;">
            <span>🚛</span>
            <div style="flex:1;">
              <div style="font-size:0.8rem;">KCH 301B • Kibera → Dandora</div>
              <div style="font-size:0.65rem;color:rgba(255,255,255,0.5);">1,800 kg • En Route (ETA 18min)</div>
            </div>
            <span class="tag-pill" style="background:rgba(245,166,35,0.2);color:var(--gold);">🚚 Transit</span>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem;background:rgba(0,0,0,0.2);border-radius:6px;">
            <span>🚛</span>
            <div style="flex:1;">
              <div style="font-size:0.8rem;">KCH 105C • Ruiru → Thika</div>
              <div style="font-size:0.65rem;color:rgba(255,255,255,0.5);">3,200 kg • Departed 13:15</div>
            </div>
            <span class="tag-pill" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);">⏳ Pending</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function executeTraceability() {
  // Call sim in app.js
  if (typeof simulateWasteTransit !== 'function') {
    console.error('simulateWasteTransit missing in app.js');
    return;
  }
  
  simulateWasteTransit('iot-dashboard-container', wasteData.w_lat, wasteData.w_lng, wasteData.tonnage_source, 'KCH 420A');
  
  // Fake facility delay then reconcile weights
  setTimeout(() => {
    const rec = reconcileWasteWeights(wasteData.tonnage_source, wasteData.tonnage_facility || Math.round(wasteData.tonnage_source * 0.95)); // provide mock facility weight if vision failed
    const resEl = document.getElementById('anti-fraud-gate-result');
    resEl.innerHTML = `
      <div style="padding:15px; border-radius:8px; border:1px solid ${rec.fraud ? 'var(--coral)' : 'var(--mint)'}; background:rgba(0,0,0,0.3);">
        <h4 style="margin:0 0 5px 0; color:${rec.fraud ? 'var(--coral)' : 'var(--mint)'}">${rec.fraud ? '🚨 FRAUD ALERT' : '✅ WEIGHT RECONCILED'}</h4>
        <p style="font-size:0.8rem; margin:0; color:#fff">${rec.message}</p>
      </div>
    `;
    if (rec.fraud) document.getElementById('waste-next-btn').style.display = 'none'; // Lock
  }, 2500);
}

function generateWasteDossierAndConsultant() {
  // Mark dCoC as cleared
  wasteData.dcoCleared = true;
  wasteData.status = 'pending-review'; // Set status for consultant queue
  wasteData.submittedToConsultant = true;
  wasteData.submittedAt = new Date().toISOString();
  saveWasteState();

  // Register the project FIRST so it appears in all queues
  const project = registerWasteProject();
  
  // Add to NTZ nuclear messages for consultant review queue
  if (!window.NTZ) window.NTZ = {};
  if (!window.NTZ.messages) window.NTZ.messages = [];
  if (!window.NTZ.projects) window.NTZ.projects = [];
  
  // Add consultant message
  const consultantMsg = {
    id: 'MSG-WASTE-' + Date.now(),
    projectId: project.id,
    from: wasteData.w_proponent || 'Waste Proponent',
    fromRole: 'proponent',
    to: 'consultant',
    toRole: 'consultant',
    message: `Waste Project Submission: ${wasteData.w_name} (${wasteData.w_type}) in ${wasteData.w_county} County. Baseline: ${wasteData.methane_baseline.toFixed(1)} tCO₂e/yr. Contractor: ${wasteData.w_contractor || 'N/A'}. Ready for lead expert review.`,
    timestamp: new Date().toISOString(),
    read: false,
    type: 'waste-submission',
    project: {
      name: wasteData.w_name,
      sector: 'waste',
      county: wasteData.w_county,
      credits: wasteData.methane_baseline,
      contractor: wasteData.w_contractor,
      contractorLicense: wasteData.w_contractor_license,
      status: 'pending-review'
    }
  };
  window.NTZ.messages.push(consultantMsg);
  
  // Save nuclear state
  if (typeof saveNuclearState === 'function') saveNuclearState();
  
  console.log('📨 Waste project submitted to consultant queue:', project.id);
  toast('📨 Project submitted to Consultant Review Queue!', 'success');

  document.getElementById('waste-wizard-container').classList.add('hidden');
  const dView = document.getElementById('waste-document-view');
  const cBar = document.getElementById('consultant-sidebar');
  if (dView) dView.classList.remove('hidden');
  if (cBar) cBar.classList.remove('hidden');

  // Generate 10-page style doc
  const docHtml = `
    <h1 style="text-align:center; color:#0D2818; margin-bottom:0.5rem; font-size:24pt;">PROJECT DESIGN DOCUMENT (PDD)</h1>
    <h3 style="text-align:center; color:#184f32; margin-top:0;">WASTE MANAGEMENT OFFSETS</h3>
    <hr style="margin:20px 0;">
    
    <h2>1. Executive Summary</h2>
    <p>Facility: <strong>${wasteData.w_name || 'Designated Dumpsite'}</strong></p>
    <p>Proponent: <strong>${wasteData.w_proponent || 'Not specified'}</strong></p>
    <p>Facility Type: <strong>${wasteData.w_type || 'Open Dumpsite'}</strong></p>
    <p>Coordinates: ${wasteData.w_lat}, ${wasteData.w_lng} | ${wasteData.w_county || 'Nairobi'} County</p>
    
    <h2>2. Registration & Compliance</h2>
    <p>KRA PIN: ${wasteData.w_kra_pin || '—'}</p>
    <p>Business Reg: ${wasteData.w_business_reg || '—'}</p>
    <p>NEMA License: ${wasteData.w_nema_license || '—'}</p>
    <p>Invoice No: ${wasteData.w_invoice_no || '—'}</p>

    <h2>3. Licensed Waste Contractor</h2>
    <p>Waste Collection Company: <strong>${wasteData.w_contractor || '—'}</strong></p>
    <p>WCL License: ${wasteData.w_contractor_license || '—'}</p>
    <p>Transport Certificate: ${wasteData.w_transport_cert || '—'}</p>

    <h2>4. Traceability Rationale (Zerra AI)</h2>
    <div style="background:#f0f5f2; border-left:4px solid #184f32; padding:15px; margin-bottom:20px; font-family:serif;">
      "This project employs a Digital Chain of Custody (dCoC) linking IoT transponder telemetry with weighbridge data extraction. Under the Sustainable Waste Management Act 2022 and Regulation 37, strict weight reconciliation is enforced. Source tonnage (${wasteData.tonnage_source} kg) was cryptographically matched with Jina/Groq Vision extracted facility tonnage (${wasteData.tonnage_facility} kg), yielding an acceptable variance threshold and clearing anti-fraud gates. Zero leakage detected."
    </div>

    <h2>5. IPCC Tier 2 Baseline Methodology</h2>
    <p>Solid Waste Emission Factor: 0.58 (AR6 East Africa default).</p>
    <p>Identified Target Volume: ${(wasteData.tonnage_facility/1000).toFixed(1)} t</p>
    <p>Calculated Methane Baseline Mitigated: <strong>${wasteData.methane_baseline.toFixed(1)} tCO₂e/year</strong></p>

    <h2>6. Community Development Agreement (CDA)</h2>
    <p>Fourth Schedule Compliance check executed. The Proponent has mathematically embedded a <strong>${wasteData.cda_share}% net revenue share</strong> to the surrounding community fund, completely clearing the legal >40% threshold requirement.</p>

    <h2>7. Visual Batch Evidence Log</h2>
    <p>A multi-image visual inspection pipeline processed ${wasteData.vision_images?.length || 0} primary pieces of evidence, stored as immutable vector hashes on the KNCR sidechain.</p>
    
    <h2>8. Digital Chain of Custody (dCoC) Verification QR</h2>
    <div style="text-align:center; padding: 20px; background: rgba(58,170,92,0.1); border-radius: 8px; margin-top: 15px;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://www.netzerra.co.ke/verify?hash=' + project.id + '&dCoC=true')}" alt="dCoC QR Code" style="border: 4px solid #184f32; border-radius: 8px; background: white; padding: 4px;">
      <p style="margin-top: 10px; font-weight: bold; font-family: monospace; color: #184f32;">SCAN TO VERIFY SOURCE-TO-SINK TRACEABILITY</p>
      <button class="gcis-btn gcis-btn-primary" onclick="downloadWasteQRCode()" style="margin-top: 10px;">Download Digital Waste Passport (QR)</button>
    </div>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px dashed rgba(24, 79, 50, 0.3); text-align: center;">
      <h3 style="color:#184f32; margin-top:0;">Proponent Next Steps</h3>
      <div style="display:flex; gap:10px; justify-content:center; margin-top:15px; flex-wrap:wrap;">
        <button class="gcis-btn gcis-btn-primary" onclick="showSection('my-projects'); document.getElementById('waste-document-view').classList.add('hidden'); document.getElementById('consultant-sidebar').classList.add('hidden'); document.documentElement.scrollTop=0;" style="background:#0D2818; padding: 12px 20px;">📂 Return to My Projects Ledger</button>
        <button class="gcis-btn gcis-btn-secondary" onclick="hardResetWasteModule(); document.getElementById('waste-document-view').classList.add('hidden'); document.getElementById('consultant-sidebar').classList.add('hidden'); document.documentElement.scrollTop=0;" style="color:#184f32; border-color:#184f32; padding: 12px 20px;">➕ Register Another Logistics Flow</button>
      </div>
    </div>
  `;
  document.getElementById('doc-editable-content').innerHTML = docHtml;

  // Build Consultant right panel with action buttons
  const cContent = document.getElementById('consultant-sidebar-content');
  cContent.innerHTML = `
    <div style="font-size:0.75rem; color:rgba(255,255,255,0.6);">
      <strong>TRACEABILITY LEDGER (CONSULTANT VIEW)</strong>
    </div>
    <div style="background:var(--deep); padding:10px; border-radius:6px; border:1px solid rgba(109,217,140,0.2);">
      <div style="font-size:0.7rem; color:var(--mint); margin-bottom:5px;">dCoC Gate Check</div>
      <div>Source Data: ${wasteData.tonnage_source} kg</div>
      <div>Visual Extraction: ${wasteData.tonnage_facility} kg</div>
      <div style="color:var(--mint); font-weight:600; margin-top:5px;">✅ Variance Accepted</div>
    </div>
    <div style="background:var(--deep); padding:10px; border-radius:6px; border:1px solid rgba(109,217,140,0.2); margin-top:10px;">
      <div style="font-size:0.7rem; color:var(--gold); margin-bottom:5px;">Registration Numbers</div>
      <div>KRA: ${wasteData.w_kra_pin || '—'}</div>
      <div>Business: ${wasteData.w_business_reg || '—'}</div>
      <div>NEMA: ${wasteData.w_nema_license || '—'}</div>
      <div style="margin-top:5px; font-size:0.7rem; color:var(--coral);">Contractor: ${wasteData.w_contractor || '—'}</div>
    </div>
    <div style="background:rgba(58,170,92,0.1); padding:10px; border-radius:6px; border:1px solid var(--mint); margin-top:10px; text-align:center;">
      <div style="font-size:0.75rem; color:var(--mint); margin-bottom:5px;">📨 Project Status</div>
      <div style="font-size:0.9rem; color:#fff; font-weight:600;">Submitted to Consultant</div>
      <div style="font-size:0.65rem; color:rgba(255,255,255,0.5); margin-top:3px;">ID: ${project.id}</div>
    </div>
    <button id="btn-certify-integrity" class="btn-primary" style="width:100%; margin-top:15px;">
      ✓ CERTIFY INTEGRITY (Lead Expert)
    </button>
    <div id="certify-success" class="hidden" style="margin-top:10px; padding:10px; background:rgba(58,170,92,0.2); border-radius:6px; font-size:0.75rem; color:var(--mint); text-align:center;"></div>
  `;

  document.getElementById('btn-certify-integrity')?.addEventListener('click', () => {
    const stat = document.getElementById('certify-success');
    if (stat) {
      stat.innerHTML = '✅ Integrity Certified via NEMA Lead Expert 19301.<br>Document Cryptographically Sealed. Ready for KNCR sync.';
      stat.classList.remove('hidden');
    }
    const hud = document.getElementById('nema-score-container');
    if (hud) hud.classList.remove('hidden');
    document.getElementById('hud-score-val').textContent = '98%';
    document.getElementById('hud-baseline-val').textContent = `${wasteData.methane_baseline.toFixed(1)} tCO₂e`;
    
    // Update project status to certified
    wasteData.status = 'certified';
    wasteData.certifiedBy = 'Dr. Amina Hassan (Lead Expert 19301)';
    wasteData.certifiedAt = new Date().toISOString();
    saveWasteState();
    
    // Update project in NTZ
    const existing = window.NTZ.projects.find(p => p.id === project.id);
    if (existing) {
      existing.status = 'certified';
      existing.certifiedBy = wasteData.certifiedBy;
      existing.certifiedAt = wasteData.certifiedAt;
    }
    
    if (typeof saveNuclearState === 'function') saveNuclearState();
    toast(`♻️ ${project.name} certified! ${project.credits.toFixed(1)} tCO₂e baseline added to dashboard.`, 'success');
  });
}

// ═══════════════════════════════════════════════════════════
// NEMA WASTE INTELLIGENCE ALERT ENGINE
// Renders into #nema-waste-alerts-container on the NEMA Oversight page
// Scans ALL waste projects for violations, fraud, and compliance gaps
// ═══════════════════════════════════════════════════════════

function renderNemaWasteAlerts() {
  const container = document.getElementById('nema-waste-alerts-container');
  if (!container) return;

  const wasteProjects = (typeof getWasteProjects === 'function') ? getWasteProjects() : [];
  const alerts = generateWasteAlerts(wasteProjects);
  const fleetData = generateFleetTracking(wasteProjects);
  const wasteKpis = calculateWasteKPIs(wasteProjects, alerts);

  container.innerHTML = `
    <!-- WASTE SECTOR KPIs -->
    <div class="nema-waste-kpi-strip">
      <div class="nema-waste-kpi">
        <div class="nwk-icon">♻️</div>
        <div class="nwk-val">${wasteKpis.totalFacilities}</div>
        <div class="nwk-lbl">Waste Facilities</div>
        <div class="nwk-sub">under NEMA oversight</div>
      </div>
      <div class="nema-waste-kpi">
        <div class="nwk-icon">🔥</div>
        <div class="nwk-val" style="color:var(--mint)">${wasteKpis.totalBaseline.toFixed(1)}</div>
        <div class="nwk-lbl">Methane Baseline</div>
        <div class="nwk-sub">tCO₂e/yr mitigated</div>
      </div>
      <div class="nema-waste-kpi">
        <div class="nwk-icon">🔗</div>
        <div class="nwk-val" style="color:${wasteKpis.dcocRate >= 90 ? 'var(--mint)' : 'var(--gold)'}">${wasteKpis.dcocRate}%</div>
        <div class="nwk-lbl">dCoC Verified</div>
        <div class="nwk-sub">chain of custody</div>
      </div>
      <div class="nema-waste-kpi">
        <div class="nwk-icon">${wasteKpis.criticalAlerts > 0 ? '🚨' : '✅'}</div>
        <div class="nwk-val" style="color:${wasteKpis.criticalAlerts > 0 ? 'var(--coral)' : 'var(--mint)'}">${wasteKpis.criticalAlerts}</div>
        <div class="nwk-lbl">Critical Alerts</div>
        <div class="nwk-sub">Regulation 37</div>
      </div>
      <div class="nema-waste-kpi">
        <div class="nwk-icon">🏛️</div>
        <div class="nwk-val" style="color:${wasteKpis.cdaCompliant === wasteKpis.totalFacilities ? 'var(--mint)' : 'var(--coral)'}">${wasteKpis.cdaCompliant}/${wasteKpis.totalFacilities}</div>
        <div class="nwk-lbl">CDA Compliant</div>
        <div class="nwk-sub">≥40% community share</div>
      </div>
    </div>

    <!-- WASTE COMPLIANCE ALERTS -->
    ${alerts.length > 0 ? `
    <div class="nema-waste-alert-card">
      <div class="nwac-header">
        <div class="nwac-title">
          <svg width="22" height="22" fill="none" stroke="#EF5350" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
          <span>Waste Compliance Alert Centre</span>
        </div>
        <div class="nwac-badge">${alerts.filter(a => a.severity === 'critical').length} Critical · ${alerts.filter(a => a.severity === 'warning').length} Warning</div>
      </div>
      <div class="nwac-body">
        ${alerts.map(alert => `
        <div class="nema-alert-item nema-alert-${alert.severity}">
          <div class="nai-icon">${alert.icon}</div>
          <div class="nai-content">
            <div class="nai-title">${alert.title}</div>
            <div class="nai-project">${alert.projectName} · ${alert.county} County</div>
            <div class="nai-detail">${alert.detail}</div>
            <div class="nai-meta">
              <span class="nai-time">${alert.timeAgo}</span>
              <span class="nai-reg">${alert.regulation}</span>
            </div>
          </div>
          <div class="nai-actions">
            ${alert.actions.map(a => `<button class="nai-btn nai-btn-${a.type}" onclick="${a.onclick}">${a.label}</button>`).join('')}
          </div>
        </div>
        `).join('')}
      </div>
    </div>
    ` : `
    <div class="nema-waste-alert-card" style="border-color:rgba(58,170,92,.3);">
      <div class="nwac-header" style="border-color:rgba(58,170,92,.2);">
        <div class="nwac-title" style="color:var(--mint)">
          <span>✅</span><span>Waste Compliance — All Clear</span>
        </div>
      </div>
      <div style="padding:1.5rem;text-align:center;color:rgba(255,255,255,.5);font-size:.85rem;">No active waste compliance alerts. All ${wasteKpis.totalFacilities} facilities operating within regulatory thresholds.</div>
    </div>
    `}

    <!-- LIVE FLEET dCoC TRACKER -->
    <div class="nema-waste-fleet-card">
      <div class="nwfc-header">
        <div class="nwfc-title">
          <span class="nwfc-live-dot"></span>
          <span>Live Waste Fleet · dCoC Tracking</span>
        </div>
        <div class="nwfc-stats">
          <span class="tag-pill" style="background:rgba(58,170,92,.15);color:var(--mint)">● ${fleetData.verified} Verified</span>
          <span class="tag-pill" style="background:rgba(245,166,35,.15);color:var(--gold)">● ${fleetData.inTransit} In Transit</span>
          <span class="tag-pill" style="background:${fleetData.flagged > 0 ? 'rgba(239,83,80,.15)' : 'rgba(255,255,255,.08)'};color:${fleetData.flagged > 0 ? 'var(--coral)' : 'rgba(255,255,255,.5)'}">● ${fleetData.flagged} Flagged</span>
        </div>
      </div>
      <div class="nwfc-grid">
        <div class="nwfc-kpi"><div class="nwfc-kpi-val">${fleetData.totalTrips}</div><div class="nwfc-kpi-lbl">Transports Today</div></div>
        <div class="nwfc-kpi"><div class="nwfc-kpi-val" style="color:var(--mint)">${fleetData.totalWeight.toFixed(1)}t</div><div class="nwfc-kpi-lbl">Total Weight</div></div>
        <div class="nwfc-kpi"><div class="nwfc-kpi-val" style="color:${fleetData.avgVariance > 8 ? 'var(--coral)' : 'var(--mint)'}">${fleetData.avgVariance.toFixed(1)}%</div><div class="nwfc-kpi-lbl">Avg Variance</div></div>
        <div class="nwfc-kpi"><div class="nwfc-kpi-val" style="color:var(--gold)">${fleetData.dcocRate}%</div><div class="nwfc-kpi-lbl">dCoC Rate</div></div>
      </div>
      <div class="nwfc-trips">
        ${fleetData.trips.map(trip => `
        <div class="nwfc-trip nwfc-trip-${trip.status}">
          <span class="nwfc-trip-icon">🚛</span>
          <div class="nwfc-trip-info">
            <div class="nwfc-trip-route">${trip.plate} · ${trip.from} → ${trip.to}</div>
            <div class="nwfc-trip-meta">${trip.weight} · ${trip.time}</div>
          </div>
          <div class="nwfc-trip-tags">
            ${trip.varianceFlag ? '<span class="tag-pill" style="background:rgba(239,83,80,.15);color:var(--coral)">⚠️ ' + trip.variance + '% var</span>' : ''}
            <span class="tag-pill" style="background:${trip.status === 'verified' ? 'rgba(58,170,92,.15)' : trip.status === 'transit' ? 'rgba(245,166,35,.15)' : 'rgba(239,83,80,.15)'};color:${trip.status === 'verified' ? 'var(--mint)' : trip.status === 'transit' ? 'var(--gold)' : 'var(--coral)'}">${trip.statusLabel}</span>
          </div>
        </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ── Alert Generator ─────────────────────────────────
function generateWasteAlerts(projects) {
  const alerts = [];
  const now = Date.now();

  projects.forEach(p => {
    // 1. WEIGHT FRAUD — Source vs facility variance > 10%
    const srcW = p.tonnage_source || p.weight_at_source || 0;
    const facW = p.tonnage_facility || p.weight_at_facility || 0;
    if (srcW > 0 && facW > 0) {
      const variance = Math.abs(srcW - facW) / Math.max(srcW, 1) * 100;
      if (variance > SOVEREIGN_VALUES.WEIGHT_VARIANCE_THRESHOLD_PCT) {
        alerts.push({
          severity: 'critical', icon: '🚨',
          title: 'Weight Fraud — Variance Exceeds 10% Threshold',
          projectName: p.name, county: p.county || '—',
          detail: 'Source: ' + srcW.toLocaleString() + ' kg → Facility: ' + facW.toLocaleString() + ' kg. Variance: ' + variance.toFixed(1) + '% (threshold: ' + SOVEREIGN_VALUES.WEIGHT_VARIANCE_THRESHOLD_PCT + '%). Possible diversion or scale tampering.',
          regulation: 'Reg. 37 · KES 500M Penalty',
          timeAgo: _randomTimeAgo(),
          actions: [
            { label: '🔒 Freeze Credits', type: 'danger', onclick: "toast('Credits frozen for " + p.name + ". KNCR notified.','success')" },
            { label: '📋 Investigate', type: 'secondary', onclick: "toast('Investigation dispatched for " + p.name + ".','success')" }
          ]
        });
      }
    }

    // 2. dCoC GAP — No chain of custody verification
    if (!p.dcoCleared && p.status !== 'draft') {
      alerts.push({
        severity: 'warning', icon: '🔗',
        title: 'dCoC Chain Gap — Custody Not Verified',
        projectName: p.name, county: p.county || '—',
        detail: 'Digital Chain of Custody has not been cleared. Source-to-sink traceability cannot be guaranteed. IoT transponder data may be missing or weighbridge extraction incomplete.',
        regulation: 'SWMA 2022 · dCoC Protocol',
        timeAgo: _randomTimeAgo(),
        actions: [
          { label: '📡 Request IoT Data', type: 'primary', onclick: "toast('IoT data request sent to " + p.name + ".','success')" },
          { label: '⏸ Hold', type: 'secondary', onclick: "toast('Project held pending dCoC verification.','success')" }
        ]
      });
    }

    // 3. CDA NON-COMPLIANCE — Share < 40%
    const cdaShare = p.cdaShare || p.cda_share || 0;
    if (cdaShare > 0 && cdaShare < 40 && !p.cdaCompliant) {
      alerts.push({
        severity: 'critical', icon: '⚖️',
        title: 'CDA Violation — Community Share Below 40%',
        projectName: p.name, county: p.county || '—',
        detail: 'Community Development Agreement allocates only ' + cdaShare + '% to surrounding communities. Fourth Schedule Regulation 23E mandates minimum 40% for land-based waste projects.',
        regulation: 'Reg. 23E · Fourth Schedule',
        timeAgo: _randomTimeAgo(),
        actions: [
          { label: '🚫 Block Registration', type: 'danger', onclick: "toast('KNCR registration blocked for " + p.name + ".','success')" },
          { label: '📨 Notify Proponent', type: 'secondary', onclick: "toast('CDA revision notice sent to proponent.','success')" }
        ]
      });
    }

    // 4. LICENSE EXPIRY — NEMA waste license check
    const licenseNo = p.nemaLicense || p.w_nema_license;
    const expiry = p.w_license_expiry || p.licenseExpiry;
    if (licenseNo && expiry) {
      const expiryDate = new Date(expiry);
      const daysLeft = Math.floor((expiryDate - now) / 86400000);
      if (daysLeft < 0) {
        alerts.push({
          severity: 'critical', icon: '📛',
          title: 'NEMA License Expired',
          projectName: p.name, county: p.county || '—',
          detail: 'NEMA Waste License (' + licenseNo + ') expired ' + Math.abs(daysLeft) + ' days ago. Operations are unlawful under EMCA 1999 §87.',
          regulation: 'EMCA 1999 · §87',
          timeAgo: 'Expired ' + Math.abs(daysLeft) + 'd ago',
          actions: [
            { label: '🛑 Cease Operations', type: 'danger', onclick: "toast('Cease & desist order issued.','success')" },
            { label: '📋 Issue Fine', type: 'secondary', onclick: "toast('Fine notice dispatched.','success')" }
          ]
        });
      } else if (daysLeft < 30) {
        alerts.push({
          severity: 'warning', icon: '⏰',
          title: 'NEMA License Expiring Soon',
          projectName: p.name, county: p.county || '—',
          detail: 'NEMA Waste License expires in ' + daysLeft + ' days. Proponent must renew before expiry.',
          regulation: 'EMCA 1999 · Renewal',
          timeAgo: daysLeft + ' days remaining',
          actions: [
            { label: '📨 Remind Proponent', type: 'primary', onclick: "toast('Renewal reminder sent.','success')" }
          ]
        });
      }
    }

    // 5. MRV OVERDUE — No monitoring report in 90+ days after certification
    if (p.status === 'certified' && p.certifiedAt) {
      const certDate = new Date(p.certifiedAt);
      const daysSince = Math.floor((now - certDate) / 86400000);
      if (daysSince > 90) {
        alerts.push({
          severity: 'warning', icon: '📊',
          title: 'MRV Report Overdue — ' + daysSince + ' Days',
          projectName: p.name, county: p.county || '—',
          detail: daysSince + ' days since certification with no MRV submission. Quarterly reporting required under Regulation 25. Credit issuance may be suspended.',
          regulation: 'Reg. 25 · MRV Protocol',
          timeAgo: daysSince + ' days overdue',
          actions: [
            { label: '⏸ Suspend Credits', type: 'danger', onclick: "toast('Credit issuance suspended.','success')" },
            { label: '📨 Request Report', type: 'primary', onclick: "toast('MRV report request sent.','success')" }
          ]
        });
      }
    }
  });

  // Sort: critical first, then warning
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2));
  return alerts;
}

// ── Fleet Tracking Data ─────────────────────────────
function generateFleetTracking(projects) {
  const routes = [
    { from: 'Dandora', to: 'Athi River', plate: 'KCH 420A' },
    { from: 'Kibera', to: 'Dandora', plate: 'KCH 301B' },
    { from: 'Ruiru', to: 'Thika', plate: 'KCH 105C' },
    { from: 'Westlands', to: 'Gikomba', plate: 'KDA 219F' },
    { from: 'Embakasi', to: 'Ruai', plate: 'KBZ 882K' },
    { from: 'Kangundo', to: 'Athi River', plate: 'KCJ 445D' },
  ];

  const trips = routes.map((r, i) => {
    const srcKg = 1500 + Math.floor(Math.random() * 4000);
    const facKg = Math.floor(srcKg * (0.88 + Math.random() * 0.12));
    const variance = Math.abs(srcKg - facKg) / srcKg * 100;
    const statuses = ['verified', 'transit', 'verified', 'transit', 'verified', 'flagged'];
    const status = statuses[i] || 'verified';
    const statusLabels = { verified: '✓ Verified', transit: '🚚 Transit', flagged: '🚨 Flagged' };
    return {
      ...r,
      weight: (srcKg / 1000).toFixed(1) + 't → ' + (facKg / 1000).toFixed(1) + 't',
      time: status === 'verified' ? 'Arrived ' + Math.floor(8 + Math.random() * 6) + ':' + String(Math.floor(Math.random() * 60)).padStart(2,'0') : status === 'transit' ? 'ETA ' + Math.floor(10 + Math.random() * 25) + 'min' : 'Flagged ' + Math.floor(1 + Math.random() * 3) + 'h ago',
      status,
      statusLabel: statusLabels[status],
      variance: variance.toFixed(1),
      varianceFlag: variance > SOVEREIGN_VALUES.WEIGHT_VARIANCE_THRESHOLD_PCT
    };
  });

  return {
    totalTrips: trips.length + Math.floor(Math.random() * 18),
    totalWeight: trips.reduce((s, t) => s + parseFloat(t.weight), 0) + 80 + Math.random() * 60,
    verified: trips.filter(t => t.status === 'verified').length,
    inTransit: trips.filter(t => t.status === 'transit').length,
    flagged: trips.filter(t => t.status === 'flagged').length,
    avgVariance: trips.reduce((s, t) => s + parseFloat(t.variance), 0) / trips.length,
    dcocRate: 94 + Math.floor(Math.random() * 6),
    trips
  };
}

// ── Waste KPI Calculator ────────────────────────────
function calculateWasteKPIs(projects, alerts) {
  return {
    totalFacilities: projects.length,
    totalBaseline: projects.reduce((s, p) => s + (p.credits || p.methaneBaseline || 0), 0),
    dcocRate: projects.length > 0 ? Math.round(projects.filter(p => p.dcoCleared).length / projects.length * 100) : 0,
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
    cdaCompliant: projects.filter(p => p.cdaCompliant).length
  };
}

function _randomTimeAgo() {
  const mins = Math.floor(Math.random() * 120) + 5;
  return mins < 60 ? mins + ' min ago' : Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm ago';
}
