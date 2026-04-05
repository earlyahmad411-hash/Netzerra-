/* ═══════════════════════════════════════════════════════════
   NETZERRA v2.1 — Enterprise, B2B, NEMA, AI Enhancement Layer
   All fictional demo data. No real company names used.
═══════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════════════
// 1. AUTH & REGISTRATION SYSTEM
// ══════════════════════════════════════════════════════

const AUTH = {
  currentUser: null,
  roles: {
    developer:     { label: 'Project Developer', sections: 'all' },
    enterprise:    { label: 'Enterprise',        sections: ['home','dashboard','passport','calculator','offsets','enterprise','exchange','b2b','county','leaderboard','community','methodology','docs','marketplace','education','membership','about','profile','disclaimer'] },
    nema_national: { label: 'NEMA National Director', sections: ['home','dashboard','nema-oversight','leaderboard','methodology','profile'] },
    nema_county:   { label: 'NEMA County Officer',    sections: ['home','dashboard','nema-oversight','leaderboard','methodology','profile'] },
    nema_reviewer: { label: 'NEMA Technical Reviewer', sections: ['home','dashboard','nema-oversight','leaderboard','methodology','profile'] },
    personal:      { label: 'Personal',          sections: ['home','dashboard','passport','calculator','offsets','county','leaderboard','community','methodology','docs','education','membership','about','profile','disclaimer'] },
  },
  demoAccounts: {
    'demo-dev':  { name: 'Shukri Ali',       org: 'Netzerra',                role: 'developer',     county: null,   plan: '🏔️ Canopy (Demo)' },
    'demo-ent':  { name: 'Amara Osei',        org: 'GreenLeaf Industries',   role: 'enterprise',    county: null,   plan: '🏢 Enterprise' },
    'demo-nema': { name: 'Dr. Faith Karanja',  org: 'NEMA Kenya',            role: 'nema_national', county: null,   plan: '🏛️ NEMA National Director' },
    'demo-co':   { name: 'Joseph Kiplagat',    org: 'Narok County',          role: 'nema_county',   county: 'Narok',plan: '📋 NEMA County Officer' },
    'demo-rev':  { name: 'Halima Abdi',        org: 'NEMA Kenya',            role: 'nema_reviewer', county: null,   plan: '🔍 NEMA Technical Reviewer' },
  }
};

function showAuthScreen() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.classList.add('open');
}

function hideAuthScreen() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.classList.remove('open');
}

function switchAuthTab(tab, el) {
  document.querySelectorAll('.auth-tabs .auth-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  const loginTab = document.getElementById('auth-login-tab');
  const registerTab = document.getElementById('auth-register-tab');
  if (tab === 'login') {
    if (loginTab) loginTab.style.display = 'block';
    if (registerTab) registerTab.style.display = 'none';
  } else {
    if (loginTab) loginTab.style.display = 'none';
    if (registerTab) registerTab.style.display = 'block';
  }
}

function toggleCountyField() {
  const role = document.getElementById('reg-role')?.value;
  const field = document.getElementById('reg-county-field');
  if (field) field.style.display = (role === 'nema-county') ? 'flex' : 'none';
}

function selectPayment(el, method) {
  document.querySelectorAll('.pay-option').forEach(o => o.classList.remove('selected'));
  if (el) el.classList.add('selected');
  const radio = el?.querySelector('input[type="radio"]');
  if (radio) radio.checked = true;
}

function registerAccount() {
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

  // Map select values to internal role keys
  const roleMap = {
    'developer': 'developer',
    'enterprise': 'enterprise',
    'nema-national': 'nema_national',
    'nema-county': 'nema_county',
    'nema-reviewer': 'nema_reviewer'
  };
  const role = roleMap[roleRaw] || 'developer';

  const user = {
    name, email, org: org || 'Independent',
    role,
    county: (role === 'nema_county') ? county : null,
    plan: AUTH.roles[role]?.label || 'Personal'
  };

  AUTH.currentUser = user;
  applyLogin(user);
  hideAuthScreen();
  toast(`Welcome to Netzerra, ${name}! Your ${AUTH.roles[role]?.label} account has been created.`, 'success');
}

function loginAs(demoId) {
  const user = AUTH.demoAccounts[demoId];
  if (!user) return;
  AUTH.currentUser = { ...user };
  applyLogin(user);
  hideAuthScreen();
  toast(`Logged in as ${user.name} (${AUTH.roles[user.role]?.label})`, 'success');
}

function applyLogin(user) {
  S.user.name = user.name;
  S.user.org = user.org;
  document.getElementById('sb-name').textContent = user.name;
  document.getElementById('sb-plan').textContent = user.plan || AUTH.roles[user.role]?.label;
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 3);
  document.getElementById('sb-avatar').textContent = initials;

  // Show/hide nav items based on role
  const navEnt = document.getElementById('nav-enterprise');
  const navEx  = document.getElementById('nav-exchange');
  const navB2B = document.getElementById('nav-b2b');
  const navNema = document.getElementById('nav-nema-oversight');

  if (navEnt) navEnt.style.display = (user.role === 'enterprise') ? 'flex' : 'none';
  if (navEx)  navEx.style.display  = (user.role === 'enterprise') ? 'flex' : 'none';
  if (navB2B) navB2B.style.display = (user.role === 'enterprise') ? 'flex' : 'none';
  if (navNema) navNema.style.display = (user.role.startsWith('nema')) ? 'flex' : 'none';

  applyRoleAccess(user.role);

  // Navigate to role-appropriate section
  if (user.role.startsWith('nema')) {
    showSection('nema-oversight');
  } else if (user.role === 'enterprise') {
    showSection('enterprise');
  } else {
    showSection('home');
  }
}

function applyRoleAccess(role) {
  const roleDef = AUTH.roles[role];
  if (!roleDef || roleDef.sections === 'all') {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.style.opacity = '1';
      item.style.pointerEvents = 'auto';
    });
    return;
  }
  document.querySelectorAll('.nav-item').forEach(item => {
    const onclick = item.getAttribute('onclick') || '';
    const match = onclick.match(/showSection\('([^']+)'\)/);
    if (match) {
      const section = match[1];
      if (!roleDef.sections.includes(section)) {
        item.style.opacity = '0.3';
        item.style.pointerEvents = 'none';
      } else {
        item.style.opacity = '1';
        item.style.pointerEvents = 'auto';
      }
    }
  });
}

function logout() {
  AUTH.currentUser = null;
  S.user.name = 'Guest';
  S.user.org = 'Netzerra';
  document.getElementById('sb-name').textContent = 'Guest';
  document.getElementById('sb-plan').textContent = '🌱 Seedling Plan';
  document.getElementById('sb-avatar').textContent = 'G';
  document.querySelectorAll('.nav-item').forEach(item => {
    item.style.opacity = '1';
    item.style.pointerEvents = 'auto';
  });
  ['nav-enterprise','nav-exchange','nav-b2b','nav-nema-oversight'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  showSection('home');
  showAuthScreen();
  toast('Logged out successfully', 'info');
}

// ══════════════════════════════════════════════════════
// 2. CARBON CREDIT EXCHANGE (Buy + Sell)
// ══════════════════════════════════════════════════════

const EXCHANGE = {
  listings: [
    { id: 'CRD-001', project: 'Turkana Solar Borehole Cluster',  seller: 'Turkana Water Trust',        county: 'Turkana',  type: 'Renewable Energy', standard: 'Verra VCS',     vintage: 2025, credits: 420,  price: 1200, coBenefits: ['Clean Water','Jobs','Gender Equality'], status: 'verified' },
    { id: 'CRD-002', project: 'Kwale Mangrove Restoration',      seller: 'Coastal Green Alliance',     county: 'Kwale',    type: 'Blue Carbon',      standard: 'Gold Standard', vintage: 2025, credits: 850,  price: 1800, coBenefits: ['Biodiversity','Fisheries','Coastal Protection'], status: 'verified' },
    { id: 'CRD-003', project: 'Narok Bamboo Plantation Phase I',  seller: 'Mara Green Initiative',      county: 'Narok',    type: 'Agroforestry',     standard: 'KNCR Domestic', vintage: 2026, credits: 1200, price: 950,  coBenefits: ['Soil Health','Community Income','Biodiversity'], status: 'verified' },
    { id: 'CRD-004', project: 'Nakuru Biogas Community Project',  seller: 'Rift Valley Clean Energy',   county: 'Nakuru',   type: 'Clean Cooking',    standard: 'Gold Standard', vintage: 2025, credits: 340,  price: 1100, coBenefits: ['Health','Deforestation Reduction','Gender Equality'], status: 'pending' },
    { id: 'CRD-005', project: 'Laikipia Acacia Reforestation',    seller: 'Laikipia Conservancy Trust', county: 'Laikipia', type: 'Agroforestry',     standard: 'Verra VCS',     vintage: 2026, credits: 2100, price: 1050, coBenefits: ['Wildlife Habitat','Pastoralist Livelihoods','Soil Carbon'], status: 'verified' },
    { id: 'CRD-006', project: 'Mombasa Electric Boda Fleet',      seller: 'Coast E-Mobility Co.',       county: 'Mombasa',  type: 'Transport',        standard: 'KNCR Domestic', vintage: 2026, credits: 560,  price: 800,  coBenefits: ['Air Quality','Jobs','Noise Reduction'], status: 'verified' },
  ],
  portfolio: {
    purchased: [],
    listed: [],
  },
  transactions: []
};

function renderExchange() {
  const grid = document.getElementById('exchange-listings');
  if (!grid) return;

  const filterStd = document.getElementById('ex-filter-standard')?.value || 'all';
  const filterType = document.getElementById('ex-filter-type')?.value || 'all';
  const sortBy = document.getElementById('ex-sort')?.value || 'price-asc';

  let filtered = EXCHANGE.listings.filter(l => {
    if (filterStd !== 'all' && l.standard !== filterStd) return false;
    if (filterType !== 'all' && l.type !== filterType) return false;
    return true;
  });

  if (sortBy === 'price-asc') filtered.sort((a,b) => a.price - b.price);
  else if (sortBy === 'price-desc') filtered.sort((a,b) => b.price - a.price);
  else if (sortBy === 'credits') filtered.sort((a,b) => b.credits - a.credits);

  grid.innerHTML = filtered.map(l => `
    <div class="exchange-card ${l.status === 'pending' ? 'pending' : ''}">
      <div class="ex-card-hdr">
        <span class="ex-std-badge ${l.standard.replace(/\s/g,'-').toLowerCase()}">${l.standard}</span>
        <span class="ex-status ${l.status}">${l.status === 'verified' ? '✅ Verified' : '⏳ Pending'}</span>
      </div>
      <h4 class="ex-project-name">${l.project}</h4>
      <div class="ex-seller">${l.seller} · ${l.county} County</div>
      <div class="ex-meta">
        <div class="ex-meta-item"><span class="ex-meta-label">Type</span><span>${l.type}</span></div>
        <div class="ex-meta-item"><span class="ex-meta-label">Vintage</span><span>${l.vintage}</span></div>
        <div class="ex-meta-item"><span class="ex-meta-label">Available</span><span>${l.credits.toLocaleString()} tCO₂e</span></div>
      </div>
      <div class="ex-benefits">${l.coBenefits.map(b => `<span class="ex-benefit-tag">${b}</span>`).join('')}</div>
      <div class="ex-price-row">
        <div class="ex-price">KES ${l.price.toLocaleString()}<small>/tCO₂e</small></div>
        <button class="btn-buy-credit" onclick="openBuyModal('${l.id}')" ${l.status !== 'verified' ? 'disabled' : ''}>
          ${l.status === 'verified' ? '🛒 Buy Credits' : '⏳ Pending'}
        </button>
      </div>
    </div>
  `).join('');

  // Update exchange stats
  const totalCredits = EXCHANGE.listings.reduce((s,l) => s + l.credits, 0);
  const avgPrice = Math.round(EXCHANGE.listings.reduce((s,l) => s + l.price, 0) / EXCHANGE.listings.length);
  const el = document.getElementById('ex-stats');
  if (el) el.innerHTML = `
    <div class="ex-stat"><div class="ex-stat-val">${totalCredits.toLocaleString()}</div><div class="ex-stat-lbl">Credits Available</div></div>
    <div class="ex-stat"><div class="ex-stat-val">KES ${avgPrice.toLocaleString()}</div><div class="ex-stat-lbl">Avg Price/tCO₂e</div></div>
    <div class="ex-stat"><div class="ex-stat-val">${EXCHANGE.listings.length}</div><div class="ex-stat-lbl">Active Projects</div></div>
    <div class="ex-stat"><div class="ex-stat-val">${EXCHANGE.transactions.length}</div><div class="ex-stat-lbl">Transactions</div></div>
  `;
}

function openBuyModal(creditId) {
  const listing = EXCHANGE.listings.find(l => l.id === creditId);
  if (!listing) return;
  const modal = document.getElementById('modal-buy-credit');
  if (!modal) return;

  document.getElementById('buy-project-name').textContent = listing.project;
  document.getElementById('buy-seller').textContent = listing.seller;
  document.getElementById('buy-price').textContent = `KES ${listing.price.toLocaleString()}/tCO₂e`;
  document.getElementById('buy-available').textContent = `${listing.credits.toLocaleString()} tCO₂e available`;
  document.getElementById('buy-credit-id').value = creditId;
  document.getElementById('buy-quantity').value = 10;
  document.getElementById('buy-quantity').max = listing.credits;
  updateBuyTotal();
  modal.classList.add('open');
}

function updateBuyTotal() {
  const creditId = document.getElementById('buy-credit-id')?.value;
  const qty = parseInt(document.getElementById('buy-quantity')?.value) || 0;
  const listing = EXCHANGE.listings.find(l => l.id === creditId);
  if (!listing) return;
  const total = qty * listing.price;
  const fee = Math.round(total * 0.03);
  document.getElementById('buy-subtotal').textContent = `KES ${total.toLocaleString()}`;
  document.getElementById('buy-fee').textContent = `KES ${fee.toLocaleString()}`;
  document.getElementById('buy-total').textContent = `KES ${(total + fee).toLocaleString()}`;
}

function executePurchase() {
  const creditId = document.getElementById('buy-credit-id')?.value;
  const qty = parseInt(document.getElementById('buy-quantity')?.value) || 0;
  const payMethod = document.querySelector('input[name="pay-method"]:checked')?.value || 'mpesa';
  const listing = EXCHANGE.listings.find(l => l.id === creditId);
  if (!listing || qty <= 0 || qty > listing.credits) {
    toast('Invalid quantity', 'error');
    return;
  }

  listing.credits -= qty;
  const txn = {
    id: `TXN-${String(EXCHANGE.transactions.length + 1).padStart(3,'0')}`,
    type: 'purchase', creditId, credits: qty,
    total: qty * listing.price,
    date: new Date().toISOString().split('T')[0],
    buyer: AUTH.currentUser?.org || S.user.org,
    seller: listing.seller,
    paymentMethod: payMethod,
    status: 'completed'
  };
  EXCHANGE.transactions.push(txn);
  EXCHANGE.portfolio.purchased.push({
    id: creditId, credits: qty, price: listing.price,
    date: txn.date, status: 'retired',
    certificate: `NTZ-RET-${new Date().getFullYear()}-${String(EXCHANGE.portfolio.purchased.length + 1).padStart(3,'0')}`
  });

  closeModal('modal-buy-credit');
  renderExchange();
  renderPortfolio();

  const methodLabels = { mpesa: 'M-Pesa', card: 'Card', bank: 'Bank Transfer', cheque: 'Cheque' };
  toast(`✅ Purchased ${qty} tCO₂e from ${listing.project} via ${methodLabels[payMethod]}. Certificate of Retirement generated.`, 'success');
}

function renderPortfolio() {
  const el = document.getElementById('portfolio-list');
  if (!el) return;
  if (EXCHANGE.portfolio.purchased.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:2rem;color:rgba(255,255,255,.3)">No credits purchased yet. Visit the Exchange to buy your first carbon credits.</div>';
    return;
  }
  el.innerHTML = EXCHANGE.portfolio.purchased.map(p => {
    const listing = EXCHANGE.listings.find(l => l.id === p.id) || {};
    return `
    <div class="portfolio-item">
      <div class="portfolio-project">${listing.project || p.id}</div>
      <div class="portfolio-meta">
        <span>${p.credits} tCO₂e</span>
        <span>KES ${(p.credits * p.price).toLocaleString()}</span>
        <span>${p.date}</span>
        <span class="portfolio-status ${p.status}">${p.status === 'retired' ? '🏅 Retired' : '📋 Active'}</span>
      </div>
      <div class="portfolio-cert">Certificate: ${p.certificate}</div>
    </div>`;
  }).join('');
}

function renderEnterpriseDashboard() {
  renderPortfolio();
  const totalPurchased = EXCHANGE.portfolio.purchased.reduce((s,p) => s + p.credits, 0);
  const totalSpent = EXCHANGE.portfolio.purchased.reduce((s,p) => s + (p.credits * p.price), 0);
  const totalListed = EXCHANGE.portfolio.listed.reduce((s,l) => s + l.credits, 0);
  const kpis = document.getElementById('ent-kpis');
  if (kpis) kpis.innerHTML = `
    <div class="kpi green"><div class="kpi-lbl">Credits Purchased</div><div class="kpi-val green">${totalPurchased.toLocaleString()}</div><div class="kpi-sub">tCO₂e retired</div></div>
    <div class="kpi gold"><div class="kpi-lbl">Total Invested</div><div class="kpi-val gold" style="font-size:1.1rem">KES ${totalSpent.toLocaleString()}</div><div class="kpi-sub">in carbon offsets</div></div>
    <div class="kpi teal"><div class="kpi-lbl">Credits Listed</div><div class="kpi-val teal">${totalListed.toLocaleString()}</div><div class="kpi-sub">tCO₂e for sale</div></div>
    <div class="kpi coral"><div class="kpi-lbl">Offset Ratio</div><div class="kpi-val coral">${S.user.totalEmissions > 0 ? Math.round(totalPurchased / S.user.totalEmissions * 100) : 0}%</div><div class="kpi-sub">of total emissions</div></div>
  `;
  renderListedCredits();
}

function renderListedCredits() {
  const el = document.getElementById('listed-credits-list');
  if (!el) return;
  if (EXCHANGE.portfolio.listed.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:rgba(255,255,255,.3)">No credits listed for sale yet. Use the form above to list your verified credits.</div>';
    return;
  }
  el.innerHTML = EXCHANGE.portfolio.listed.map(l => `
    <div class="portfolio-item">
      <div class="portfolio-project">${l.projectName}</div>
      <div class="portfolio-meta">
        <span>${l.credits} tCO₂e</span>
        <span>KES ${l.price.toLocaleString()}/tCO₂e</span>
        <span>${l.standard}</span>
        <span class="portfolio-status active">📋 Listed</span>
      </div>
    </div>
  `).join('');
}

function listCreditsForSale() {
  const projectName = document.getElementById('sell-project-name')?.value?.trim();
  const credits = parseInt(document.getElementById('sell-credits')?.value) || 0;
  const price = parseInt(document.getElementById('sell-price')?.value) || 0;
  const standard = document.getElementById('sell-standard')?.value;
  const type = document.getElementById('sell-type')?.value;
  const county = document.getElementById('sell-county')?.value;

  if (!projectName || credits <= 0 || price <= 0) {
    toast('Please fill in all required fields', 'error');
    return;
  }

  const newListing = {
    id: `CRD-${String(EXCHANGE.listings.length + 1).padStart(3,'0')}`,
    project: projectName,
    seller: AUTH.currentUser?.org || S.user.org,
    county: county || 'Nairobi',
    type: type || 'Agroforestry',
    standard: standard || 'KNCR Domestic',
    vintage: new Date().getFullYear(),
    credits, price,
    coBenefits: ['Community Income'],
    status: 'pending'
  };

  EXCHANGE.listings.push(newListing);
  EXCHANGE.portfolio.listed.push({
    id: newListing.id, projectName, credits, price, standard: newListing.standard
  });

  // Clear form
  ['sell-project-name','sell-credits','sell-price'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  renderEnterpriseDashboard();
  toast(`✅ Listed ${credits} tCO₂e from "${projectName}" on the exchange. Status: Pending Verification.`, 'success');
}

// ══════════════════════════════════════════════════════
// 3. B2B TRADING HUB
// ══════════════════════════════════════════════════════

const B2B = {
  rfqs: [
    { id: 'RFQ-001', buyer: 'EcoTech Manufacturing', need: 'Agroforestry credits', quantity: 500, maxPrice: 1100, deadline: '2026-05-15', status: 'open', responses: 2 },
    { id: 'RFQ-002', buyer: 'Horizon Logistics Ltd', need: 'Transport offset credits', quantity: 1200, maxPrice: 900, deadline: '2026-06-01', status: 'open', responses: 0 },
    { id: 'RFQ-003', buyer: 'Savanna Cement Co.', need: 'Any verified credits', quantity: 3000, maxPrice: 1500, deadline: '2026-04-30', status: 'open', responses: 5 },
  ],
  contracts: [
    { id: 'CTR-001', buyer: 'EcoTech Manufacturing', seller: 'Mara Green Initiative', credits: 200, price: 1050, total: 210000, date: '2026-03-10', status: 'active', type: 'Spot' },
  ],
  profiles: [
    { org: 'EcoTech Manufacturing',   sector: 'Manufacturing', county: 'Nairobi',  emissions: 4200, purchased: 800,  rating: 4.5, verified: true },
    { org: 'Horizon Logistics Ltd',   sector: 'Transport',     county: 'Mombasa',  emissions: 8500, purchased: 1200, rating: 4.2, verified: true },
    { org: 'Savanna Cement Co.',      sector: 'Construction',  county: 'Machakos', emissions: 15000,purchased: 3000, rating: 3.8, verified: true },
    { org: 'GreenLeaf Industries',    sector: 'Agriculture',   county: 'Nakuru',   emissions: 2100, purchased: 500,  rating: 4.7, verified: true },
    { org: 'Coastal Fisheries Corp.', sector: 'Fisheries',     county: 'Kwale',    emissions: 1800, purchased: 200,  rating: 4.0, verified: false },
  ]
};

function renderB2BHub() {
  renderB2BStats();
  renderRFQBoard();
  renderContractsList();
  renderEnterpriseDirectory();
}

function renderB2BStats() {
  const el = document.getElementById('b2b-kpis');
  if (!el) return;
  const totalRFQVolume = B2B.rfqs.reduce((s,r) => s + r.quantity, 0);
  const activeContracts = B2B.contracts.filter(c => c.status === 'active').length;
  const totalTraded = B2B.contracts.reduce((s,c) => s + c.total, 0);
  el.innerHTML = `
    <div class="kpi green"><div class="kpi-lbl">Open RFQs</div><div class="kpi-val green">${B2B.rfqs.filter(r => r.status === 'open').length}</div><div class="kpi-sub">${totalRFQVolume.toLocaleString()} tCO₂e demanded</div></div>
    <div class="kpi gold"><div class="kpi-lbl">Active Contracts</div><div class="kpi-val gold">${activeContracts}</div><div class="kpi-sub">B2B agreements</div></div>
    <div class="kpi teal"><div class="kpi-lbl">Total Traded</div><div class="kpi-val teal" style="font-size:1rem">KES ${totalTraded.toLocaleString()}</div><div class="kpi-sub">B2B volume</div></div>
    <div class="kpi coral"><div class="kpi-lbl">Enterprises</div><div class="kpi-val coral">${B2B.profiles.length}</div><div class="kpi-sub">registered on platform</div></div>
  `;
}

function renderRFQBoard() {
  const el = document.getElementById('rfq-board');
  if (!el) return;
  el.innerHTML = B2B.rfqs.map(r => `
    <div class="rfq-card">
      <div class="rfq-header">
        <span class="rfq-id">${r.id}</span>
        <span class="rfq-status ${r.status}">${r.status === 'open' ? '🟢 Open' : '🔴 Closed'}</span>
      </div>
      <div class="rfq-buyer">${r.buyer}</div>
      <div class="rfq-need">${r.need}</div>
      <div class="rfq-details">
        <div><strong>${r.quantity.toLocaleString()}</strong> tCO₂e</div>
        <div>Max <strong>KES ${r.maxPrice.toLocaleString()}</strong>/tCO₂e</div>
        <div>Deadline: <strong>${r.deadline}</strong></div>
      </div>
      <div class="rfq-footer">
        <span>${r.responses} response${r.responses !== 1 ? 's' : ''}</span>
        <button class="btn-rfq-respond" onclick="respondToRFQ('${r.id}')">📩 Respond</button>
      </div>
    </div>
  `).join('');
}

function renderContractsList() {
  const el = document.getElementById('contracts-list');
  if (!el) return;
  if (B2B.contracts.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:1.5rem;color:rgba(255,255,255,.3)">No contracts yet.</div>';
    return;
  }
  el.innerHTML = `
    <table class="nema-table">
      <thead><tr><th>Contract</th><th>Buyer</th><th>Seller</th><th>Credits</th><th>Price</th><th>Total</th><th>Type</th><th>Status</th></tr></thead>
      <tbody>${B2B.contracts.map(c => `
        <tr>
          <td class="mono">${c.id}</td>
          <td>${c.buyer}</td>
          <td>${c.seller}</td>
          <td>${c.credits.toLocaleString()} tCO₂e</td>
          <td>KES ${c.price.toLocaleString()}</td>
          <td>KES ${c.total.toLocaleString()}</td>
          <td>${c.type}</td>
          <td><span class="pipeline-badge step-5">${c.status}</span></td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;
}

function renderEnterpriseDirectory() {
  const el = document.getElementById('enterprise-directory');
  if (!el) return;
  el.innerHTML = B2B.profiles.map(p => `
    <div class="ent-dir-card">
      <div class="ent-dir-header">
        <div class="ent-dir-avatar">${p.org.split(' ').map(w => w[0]).join('').slice(0,2)}</div>
        <div>
          <div class="ent-dir-name">${p.org} ${p.verified ? '<span class="verified-badge">✅ Verified</span>' : ''}</div>
          <div class="ent-dir-sector">${p.sector} · ${p.county} County</div>
        </div>
      </div>
      <div class="ent-dir-stats">
        <div><span class="ent-dir-stat-val">${p.emissions.toLocaleString()}</span><span class="ent-dir-stat-lbl">tCO₂e/yr</span></div>
        <div><span class="ent-dir-stat-val">${p.purchased.toLocaleString()}</span><span class="ent-dir-stat-lbl">Purchased</span></div>
        <div><span class="ent-dir-stat-val">${Math.round(p.purchased/p.emissions*100)}%</span><span class="ent-dir-stat-lbl">Offset</span></div>
        <div><span class="ent-dir-stat-val">⭐ ${p.rating}</span><span class="ent-dir-stat-lbl">Rating</span></div>
      </div>
    </div>
  `).join('');
}

function postRFQ() {
  const need = document.getElementById('rfq-need')?.value?.trim();
  const quantity = parseInt(document.getElementById('rfq-quantity')?.value) || 0;
  const maxPrice = parseInt(document.getElementById('rfq-max-price')?.value) || 0;
  const deadline = document.getElementById('rfq-deadline')?.value;

  if (!need || quantity <= 0 || maxPrice <= 0 || !deadline) {
    toast('Please fill in all RFQ fields', 'error');
    return;
  }

  B2B.rfqs.unshift({
    id: `RFQ-${String(B2B.rfqs.length + 1).padStart(3,'0')}`,
    buyer: AUTH.currentUser?.org || S.user.org,
    need, quantity, maxPrice, deadline,
    status: 'open', responses: 0
  });

  ['rfq-need','rfq-quantity','rfq-max-price','rfq-deadline'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  renderB2BHub();
  toast(`✅ RFQ posted for ${quantity.toLocaleString()} tCO₂e. Sellers will be notified.`, 'success');
}

function respondToRFQ(rfqId) {
  const rfq = B2B.rfqs.find(r => r.id === rfqId);
  if (!rfq) return;
  rfq.responses++;
  renderRFQBoard();
  toast(`📩 Response submitted to ${rfqId} (${rfq.buyer}). They will review your offer.`, 'success');
}

// ══════════════════════════════════════════════════════
// 4. NEMA OVERSIGHT PORTAL
// ══════════════════════════════════════════════════════

const NEMA_DATA = {
  projects: [
    { id: 'KNCR-2026-001', name: 'Turkana Solar Borehole Cluster',  developer: 'Turkana Water Trust',        county: 'Turkana',  sector: 'Energy',        credits: 420,  status: 'Registered',   step: 5, cda: 40, cdaCompliant: true,  lastAudit: '2026-02-28' },
    { id: 'KNCR-2026-002', name: 'Rift Valley Matatu CNG Pilot',    developer: 'Rift Valley SACCO',          county: 'Nakuru',   sector: 'Transport',     credits: 1100, status: 'PDD Draft',    step: 2, cda: 40, cdaCompliant: true,  lastAudit: '2026-03-10' },
    { id: 'KNCR-2026-003', name: 'Kwale Mangrove Restoration',      developer: 'Coastal Green Alliance',     county: 'Kwale',    sector: 'Blue Carbon',   credits: 850,  status: 'Validation',   step: 3, cda: 40, cdaCompliant: true,  lastAudit: '2026-03-15' },
    { id: 'KNCR-2026-004', name: 'Narok Bamboo Plantation Phase I',  developer: 'Mara Green Initiative',     county: 'Narok',    sector: 'Agroforestry',  credits: 1200, status: 'Concept Note', step: 1, cda: 25, cdaCompliant: false, lastAudit: null },
    { id: 'KNCR-2026-005', name: 'Nakuru Biogas Community',          developer: 'Rift Valley Clean Energy',  county: 'Nakuru',   sector: 'Clean Cooking', credits: 340,  status: 'DNA Review',   step: 4, cda: 40, cdaCompliant: true,  lastAudit: '2026-03-20' },
    { id: 'KNCR-2026-006', name: 'Laikipia Acacia Reforestation',    developer: 'Laikipia Conservancy Trust',county: 'Laikipia', sector: 'Agroforestry',  credits: 2100, status: 'Registered',   step: 5, cda: 40, cdaCompliant: true,  lastAudit: '2026-03-01' },
    { id: 'KNCR-2026-007', name: 'Mombasa Electric Boda Fleet',      developer: 'Coast E-Mobility Co.',      county: 'Mombasa',  sector: 'Transport',     credits: 560,  status: 'Credits Live', step: 6, cda: 25, cdaCompliant: true,  lastAudit: '2026-03-25' },
  ],
  auditLog: [
    { timestamp: '2026-03-25 14:32', action: 'Project Verified',      project: 'KNCR-2026-007', officer: 'Dr. Faith Karanja', detail: 'MRV report approved. Credits issued.' },
    { timestamp: '2026-03-20 09:15', action: 'DNA Review Started',    project: 'KNCR-2026-005', officer: 'Halima Abdi',       detail: 'Technical review of biogas methodology initiated.' },
    { timestamp: '2026-03-15 11:45', action: 'Validation Assigned',   project: 'KNCR-2026-003', officer: 'Dr. Faith Karanja', detail: 'VVB assigned: Bureau Veritas Kenya.' },
    { timestamp: '2026-03-10 16:20', action: 'PDD Submitted',         project: 'KNCR-2026-002', officer: 'System',            detail: 'Project Design Document uploaded by developer.' },
    { timestamp: '2026-02-28 10:00', action: 'Project Registered',    project: 'KNCR-2026-001', officer: 'Dr. Faith Karanja', detail: 'Listed on kncr.go.ke. Public project page live.' },
  ]
};

function renderNEMAOversight() {
  const user = AUTH.currentUser;
  const isCounty = user?.role === 'nema_county';
  const county = user?.county;

  let projects = NEMA_DATA.projects;
  if (isCounty && county) {
    projects = projects.filter(p => p.county === county);
  }

  const kpis = document.getElementById('nema-kpis');
  if (kpis) {
    const totalCredits = projects.reduce((s,p) => s + p.credits, 0);
    const compliant = projects.filter(p => p.cdaCompliant).length;
    const registered = projects.filter(p => p.step >= 5).length;
    kpis.innerHTML = `
      <div class="kpi teal"><div class="kpi-lbl">Total Projects</div><div class="kpi-val teal">${projects.length}</div><div class="kpi-sub">${isCounty ? county + ' County' : 'Nationwide'}</div></div>
      <div class="kpi green"><div class="kpi-lbl">Total Credits</div><div class="kpi-val green">${totalCredits.toLocaleString()}</div><div class="kpi-sub">tCO₂e tracked</div></div>
      <div class="kpi gold"><div class="kpi-lbl">CDA Compliant</div><div class="kpi-val gold">${compliant}/${projects.length}</div><div class="kpi-sub">meeting benefit mandate</div></div>
      <div class="kpi coral"><div class="kpi-lbl">Registered on KNCR</div><div class="kpi-val coral">${registered}</div><div class="kpi-sub">projects live</div></div>
    `;
  }

  const table = document.getElementById('nema-projects-table');
  if (table) {
    table.innerHTML = `
      <table class="nema-table">
        <thead><tr><th>KNCR ID</th><th>Project</th><th>Developer</th><th>County</th><th>Sector</th><th>Credits</th><th>Pipeline Stage</th><th>CDA</th><th>Actions</th></tr></thead>
        <tbody>${projects.map(p => `
          <tr>
            <td class="mono">${p.id}</td><td>${p.name}</td><td>${p.developer}</td><td>${p.county}</td><td>${p.sector}</td>
            <td>${p.credits.toLocaleString()}</td>
            <td><span class="pipeline-badge step-${p.step}">${p.status}</span></td>
            <td><span class="cda-badge ${p.cdaCompliant ? 'compliant' : 'non-compliant'}">${p.cdaCompliant ? '✅ ' + p.cda + '%' : '❌ Non-compliant'}</span></td>
            <td><button class="btn-nema-action" onclick="viewProjectAudit('${p.id}')">🔍 Review</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  const logEl = document.getElementById('nema-audit-log');
  if (logEl) {
    const logs = isCounty && county
      ? NEMA_DATA.auditLog.filter(l => { const proj = NEMA_DATA.projects.find(p => p.id === l.project); return proj && proj.county === county; })
      : NEMA_DATA.auditLog;
    logEl.innerHTML = logs.map(l => `
      <div class="audit-entry">
        <div class="audit-time">${l.timestamp}</div>
        <div class="audit-action">${l.action}</div>
        <div class="audit-detail">${l.project} — ${l.detail}</div>
        <div class="audit-officer">By: ${l.officer}</div>
      </div>
    `).join('');
  }

  renderCDAChart(projects);
}

function renderCDAChart(projects) {
  const ctx = document.getElementById('nema-cda-chart');
  if (!ctx) return;
  if (S.charts.cdaChart) S.charts.cdaChart.destroy();
  const compliant = projects.filter(p => p.cdaCompliant).length;
  const nonCompliant = projects.length - compliant;
  S.charts.cdaChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['CDA Compliant', 'Non-Compliant'],
      datasets: [{ data: [compliant, nonCompliant], backgroundColor: ['rgba(109,217,140,0.7)', 'rgba(255,107,107,0.7)'], borderColor: ['rgba(109,217,140,1)', 'rgba(255,107,107,1)'], borderWidth: 1 }]
    },
    options: { responsive: true, plugins: { legend: { labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } } } } }
  });
}

function viewProjectAudit(projectId) {
  const project = NEMA_DATA.projects.find(p => p.id === projectId);
  if (!project) return;
  const logs = NEMA_DATA.auditLog.filter(l => l.project === projectId);
  const modal = document.getElementById('modal-project-audit');
  if (!modal) return;

  document.getElementById('audit-project-title').textContent = project.name;
  document.getElementById('audit-project-detail').innerHTML = `
    <div class="audit-detail-grid">
      <div><strong>KNCR ID:</strong> ${project.id}</div>
      <div><strong>Developer:</strong> ${project.developer}</div>
      <div><strong>County:</strong> ${project.county}</div>
      <div><strong>Sector:</strong> ${project.sector}</div>
      <div><strong>Credits:</strong> ${project.credits.toLocaleString()} tCO₂e</div>
      <div><strong>Pipeline Stage:</strong> ${project.status} (Step ${project.step}/6)</div>
      <div><strong>CDA Rate:</strong> ${project.cda}%</div>
      <div><strong>CDA Compliant:</strong> ${project.cdaCompliant ? '✅ Yes' : '❌ No'}</div>
      <div><strong>Last Audit:</strong> ${project.lastAudit || 'Not yet audited'}</div>
    </div>
    <h4 style="margin-top:1rem;margin-bottom:.5rem">📋 Audit Trail</h4>
    ${logs.length ? logs.map(l => `
      <div class="audit-entry" style="margin-bottom:.5rem">
        <div class="audit-time">${l.timestamp}</div>
        <div class="audit-action">${l.action}</div>
        <div class="audit-detail">${l.detail}</div>
        <div class="audit-officer">By: ${l.officer}</div>
      </div>
    `).join('') : '<div style="color:rgba(255,255,255,.3)">No audit entries yet.</div>'}
  `;
  modal.classList.add('open');
}

// ══════════════════════════════════════════════════════
// 5. ZERRA AI ASSISTANT (Gemini Free Tier)
// ══════════════════════════════════════════════════════

const ZERRA = {
  isOpen: false,
  messages: [
    { role: 'assistant', content: 'Habari! 👋 I\'m Zerra, your AI carbon intelligence assistant. I can help you with:\n\n• Carbon calculations and methodology\n• KNCR compliance and regulations\n• Offset strategy recommendations\n• Understanding emission factors\n\nAsk me anything about carbon accounting in Kenya!' }
  ],
  knowledgeBase: {
    'kncr': 'The Kenya National Carbon Registry (KNCR) went live on 17 February 2026. It is governed by the Carbon Markets Regulations 2024 and Carbon Trading Regulations 2025. All carbon projects must register. False data carries a KES 500M penalty under Regulation 37. The registry is managed by NEMA.',
    'cda': 'The Community Development Agreement (CDA) is required under the Fourth Schedule of the Carbon Markets Regulations 2024. Land-based projects must allocate 40% of carbon credit earnings to the community. Non-land-based projects must allocate 25%. Private land projects may be exempt.',
    'emission factors': 'Kenya Grid EF (KNCR): 0.3174 kgCO₂/kWh (UNFCCC CDM ASB0050-2020, Combined Margin — correct for KNCR carbon credit calculations). Note: IEA actual mix ~0.070 kgCO₂e/kWh applies only to GHG Protocol Scope 2 corporate reporting. Diesel: 2.68 kgCO₂e/L. Petrol: 2.31 kgCO₂e/L. Cement: 830 kgCO₂e/t. Steel (BOF): 1,850 kgCO₂e/t. CH₄ GWP (AR6): 27.0. N₂O GWP (AR6): 273.',
    'offsets': 'Kenya offset strategies: Bamboo (17 tCO₂e/ha/yr), Casuarina (8 tCO₂e/ha/yr), Grevillea (6 tCO₂e/ha/yr), Biogas (3.5 tCO₂e/unit/yr), Solar pump replacement, Mangrove restoration (6.4 tCO₂e/ha/yr), Soil carbon (0.4 tCO₂e/ha/yr), Electric boda (0.103 kgCO₂e/km saved).',
    'regulation 37': 'Regulation 37 of the Carbon Markets Regulations 2024 imposes a penalty of KES 500,000,000 (KES 500M) for submitting false or misleading data to the KNCR. Additional penalties include KES 20,000 for failure to report and up to 6 months imprisonment.',
    'article 6': 'Article 6 of the Paris Agreement allows countries to trade carbon credits internationally. Kenya has active bilateral agreements with Switzerland (ITMO transfers operational), and is negotiating with Sweden, Singapore, South Korea, and the UK.',
    'floca': 'FLLoCA (Framework for Local Climate Change Action) is a county-level reporting framework. It requires performance criteria documentation. Counties must report on climate resilience investments, carbon project oversight, and community benefit fund tracking.',
    'ipcc': 'Netzerra uses IPCC 2006 Guidelines updated with AR6 (2021) GWP₁₀₀ values. The GHG Protocol Scope 1/2/3 framework is aligned with ISO 14064-1:2018.',
    'verra': 'Verra VCS (Verified Carbon Standard) is one of the most widely used voluntary carbon market standards. Projects must undergo third-party validation and verification by an accredited VVB.',
    'gold standard': 'Gold Standard is a premium carbon credit standard that requires demonstration of sustainable development co-benefits. It is often preferred by European buyers and development finance institutions.',
  }
};

function toggleZerra() {
  ZERRA.isOpen = !ZERRA.isOpen;
  const panel = document.getElementById('zerra-panel');
  if (panel) panel.classList.toggle('open', ZERRA.isOpen);
}

function renderZerraMessages() {
  const container = document.getElementById('zerra-messages');
  if (!container) return;
  container.innerHTML = ZERRA.messages.map(m => `
    <div class="zerra-msg ${m.role}">
      <div class="zerra-msg-avatar">${m.role === 'assistant' ? '🌿' : '👤'}</div>
      <div class="zerra-msg-content">${m.content.replace(/\n/g, '<br>')}</div>
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

async function sendZerraMessage() {
  const input = document.getElementById('zerra-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  ZERRA.messages.push({ role: 'user', content: text });
  input.value = '';
  renderZerraMessages();

  const typing = document.getElementById('zerra-typing');
  if (typing) typing.style.display = 'flex';

  // Always try Gemini API first for richer responses; fallback to local knowledge base
  try {
    const response = await callGeminiAPI(text);
    if (typing) typing.style.display = 'none';
    ZERRA.messages.push({ role: 'assistant', content: response });
    renderZerraMessages();
  } catch (e) {
    if (typing) typing.style.display = 'none';
    // Fallback: try local knowledge base, then smart response
    const localAnswer = searchKnowledgeBase(text);
    ZERRA.messages.push({ role: 'assistant', content: localAnswer || generateSmartResponse(text) });
    renderZerraMessages();
  }
}

function searchKnowledgeBase(query) {
  const q = query.toLowerCase();
  const matches = [];
  for (const [key, value] of Object.entries(ZERRA.knowledgeBase)) {
    const keywords = key.split(/[\s_]+/);
    if (keywords.some(k => q.includes(k)) || q.includes(key)) {
      matches.push(value);
    }
  }
  if (matches.length > 0) {
    return matches.join('\n\n') + '\n\n📚 *Source: Netzerra Knowledge Base — verified against KNCR regulations and IPCC AR6.*';
  }
  return null;
}

function generateSmartResponse(query) {
  const q = query.toLowerCase();
  if (q.includes('calculate') || q.includes('emission') || q.includes('carbon footprint'))
    return 'To calculate emissions, go to the ⚡ Emission Calculator section. Select your sector (Borehole, Livestock, Transport, Construction, or Manufacturing), enter your activity data, and click Calculate. The system uses IPCC AR6 methodology with Kenya-calibrated emission factors.\n\n💡 Tip: Use the "Declare Data Sources" section to improve your Data Quality Score (DQS).';
  if (q.includes('offset') || q.includes('reduce') || q.includes('net zero'))
    return 'Kenya offers several offset strategies:\n\n🎋 Bamboo: 17 tCO₂e/ha/yr (highest sequestration)\n🌲 Casuarina: 8 tCO₂e/ha/yr\n🔥 Biogas: 3.5 tCO₂e/unit/yr\n☀️ Solar pump: Saves 2.68 kgCO₂e per litre of diesel replaced\n🌊 Mangrove: 6.4 tCO₂e/ha/yr (Blue Carbon)\n\nVisit the 🌳 Offset Strategies section for detailed analysis and pricing.';
  if (q.includes('register') || q.includes('kncr') || q.includes('project'))
    return 'To register a project on the KNCR:\n\n1. Run a calculation in the Emission Calculator\n2. Click "Register as KNCR Carbon Project"\n3. Complete the KNCR Gateway form\n4. Generate required documents (PCN, PDD, CDA, ESCP, MRV)\n5. Submit to NEMA for DNA Review\n\nThe pipeline has 6 stages: Concept Note → PDD Draft → Validation → DNA Review → Registered → Credits Live.';
  if (q.includes('price') || q.includes('cost') || q.includes('buy') || q.includes('sell'))
    return 'Carbon credit prices in Kenya vary by project type and standard:\n\n• KNCR Domestic: KES 800–1,200/tCO₂e\n• Verra VCS: KES 1,000–1,800/tCO₂e\n• Gold Standard: KES 1,200–2,000/tCO₂e\n• Blue Carbon (Mangrove): KES 1,500–2,500/tCO₂e\n\nVisit the 🔄 Carbon Exchange to browse available credits.';
  if (q.includes('b2b') || q.includes('enterprise') || q.includes('bulk'))
    return 'The B2B Trading Hub allows enterprises to:\n\n• Post RFQs (Request for Quotes) for bulk credit purchases\n• Browse the Enterprise Directory to find verified trading partners\n• Execute B2B contracts with full audit trails\n• View transaction history and generate invoices\n\nVisit the 🤝 B2B Trading Hub section for more.';
  if (q.includes('hello') || q.includes('hi') || q.includes('habari') || q.includes('mambo'))
    return 'Habari! 😊 I\'m Zerra, your carbon intelligence assistant. I can help with:\n\n• Understanding emission factors and methodology\n• KNCR registration and compliance\n• Offset strategy recommendations\n• Carbon credit pricing and trading\n• B2B enterprise features\n• CDA and community benefit requirements\n\nWhat would you like to know?';
  return 'That\'s a great question! While I don\'t have a specific answer in my knowledge base for that query, I can help with:\n\n• **KNCR compliance** — registration, documents, penalties\n• **Emission factors** — Kenya grid, diesel, livestock, cement\n• **Offset strategies** — bamboo, biogas, mangrove, solar\n• **Carbon credit trading** — prices, standards, verification\n• **B2B trading** — RFQs, contracts, enterprise directory\n\nTry rephrasing your question or ask about one of these topics!';
}

async function callGeminiAPI(prompt) {
  const apiKey = 'AIzaSyAWsBmp3w9AlGGrcNQy8NxY-_vMUjUmywQ';
  const systemContext = `You are Zerra, the AI assistant for Netzerra — Kenya's Carbon Intelligence Platform. You are an expert in:
- Kenya's Carbon Markets Regulations 2024 and Carbon Trading Regulations 2025
- KNCR (Kenya National Carbon Registry) compliance
- IPCC AR6 methodology and GHG Protocol
- Kenya-specific emission factors (KNCR grid: 0.3174 kgCO₂/kWh UNFCCC CDM ASB0050-2020, diesel: 2.68 kgCO₂e/L)
- Carbon credit trading in East Africa
- Community Development Agreements (CDA) — 40% land-based, 25% non-land
- Offset strategies for Kenya (bamboo, biogas, mangrove, solar)
- B2B carbon credit trading and enterprise compliance

Always provide accurate, Kenya-specific answers. Cite regulations and standards where relevant. Keep responses concise but informative. Respond in the same language the user writes in (English or Swahili).`;

  // Try multiple models in order of preference (handles quota limits)
  const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];
  const requestBody = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: systemContext + '\n\nUser question: ' + prompt }] }],
    generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
  });

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.warn(`Zerra: ${model} failed (${response.status}):`, errData.error?.message || 'Unknown error');
        continue; // Try next model
      }
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log(`Zerra: Response from ${model}`);
        return text;
      }
    } catch (e) {
      console.warn(`Zerra: ${model} network error:`, e.message);
      continue;
    }
  }
  throw new Error('All Gemini models exhausted or quota exceeded');
}

// ══════════════════════════════════════════════════════
// 6. SMART DATA PARSING (AI-Lite)
// ══════════════════════════════════════════════════════

function parseReceiptText(text) {
  const results = {};
  const dieselMatch = text.match(/(\d[\d,]*\.?\d*)\s*(litres?|liters?|L)\s*(of\s*)?(diesel|ago)/i);
  if (dieselMatch) results.diesel = parseFloat(dieselMatch[1].replace(/,/g, ''));
  const kwhMatch = text.match(/(\d[\d,]*\.?\d*)\s*(kWh|kwh|kilowatt)/i);
  if (kwhMatch) results.kwh = parseFloat(kwhMatch[1].replace(/,/g, ''));
  const petrolMatch = text.match(/(\d[\d,]*\.?\d*)\s*(litres?|liters?|L)\s*(of\s*)?(petrol|pms|gasoline)/i);
  if (petrolMatch) results.petrol = parseFloat(petrolMatch[1].replace(/,/g, ''));
  const cementMatch = text.match(/(\d[\d,]*\.?\d*)\s*(tonnes?|bags?|t)\s*(of\s*)?(cement|opc)/i);
  if (cementMatch) { let val = parseFloat(cementMatch[1].replace(/,/g, '')); if (cementMatch[2].toLowerCase().startsWith('bag')) val *= 0.05; results.cement = val; }
  const steelMatch = text.match(/(\d[\d,]*\.?\d*)\s*(tonnes?|kg|t)\s*(of\s*)?(steel|rebar)/i);
  if (steelMatch) { let val = parseFloat(steelMatch[1].replace(/,/g, '')); if (steelMatch[2].toLowerCase() === 'kg') val /= 1000; results.steel = val; }
  const kmMatch = text.match(/(\d[\d,]*\.?\d*)\s*(km|kilometres?|kilometers?)/i);
  if (kmMatch) results.distance = parseFloat(kmMatch[1].replace(/,/g, ''));
  const lpgMatch = text.match(/(\d[\d,]*\.?\d*)\s*(kg|tonnes?)\s*(of\s*)?(lpg|gas)/i);
  if (lpgMatch) results.lpg = parseFloat(lpgMatch[1].replace(/,/g, ''));
  return results;
}

function handleSmartParse() {
  const text = document.getElementById('smart-parse-input')?.value || '';
  if (!text.trim()) { toast('Paste your receipt or bill text first', 'error'); return; }
  const results = parseReceiptText(text);
  const keys = Object.keys(results);
  if (keys.length === 0) {
    document.getElementById('smart-parse-results').innerHTML = '<div style="color:rgba(255,107,107,.8);padding:.5rem">❌ No recognizable data found. Try pasting text that includes quantities with units (e.g., "500 litres diesel", "12,000 kWh", "200 tonnes cement").</div>';
    return;
  }
  let html = '<div class="parse-results">';
  for (const [key, val] of Object.entries(results)) {
    const ef = { diesel: 2.68, petrol: 2.31, kwh: 0.3174, cement: 830, steel: 1850, lpg: 2.98 }[key] || 0;
    const unit = { diesel: 'L', petrol: 'L', kwh: 'kWh', cement: 't', steel: 't', lpg: 'kg', distance: 'km' }[key] || '';
    const emission = key === 'distance' ? (val * 0.165 / 1000) : (val * ef / 1000);
    html += `<div class="parse-item"><div class="parse-label">${key.charAt(0).toUpperCase() + key.slice(1)}</div><div class="parse-value">${val.toLocaleString()} ${unit}</div><div class="parse-emission">${emission.toFixed(3)} tCO₂e</div></div>`;
  }
  const totalEmission = Object.entries(results).reduce((sum, [key, val]) => {
    const ef = { diesel: 2.68, petrol: 2.31, kwh: 0.3174, cement: 830, steel: 1850, lpg: 2.98 }[key] || 0;
    return sum + (key === 'distance' ? (val * 0.165 / 1000) : (val * ef / 1000));
  }, 0);
  html += `<div class="parse-total">Total Extracted: ${totalEmission.toFixed(3)} tCO₂e</div></div>`;
  document.getElementById('smart-parse-results').innerHTML = html;
  toast(`✅ Extracted ${keys.length} data point${keys.length > 1 ? 's' : ''} from text`, 'success');
}

// ══════════════════════════════════════════════════════
// 7. AI-POWERED FEATURES (Beyond Chatbot)
// ══════════════════════════════════════════════════════

// 7a. Emissions Forecasting
function runEmissionsForecast() {
  const currentEmissions = S.user.totalEmissions || 2847;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentMonth = new Date().getMonth();

  // Generate historical trend (simulated)
  const historical = [];
  let base = currentEmissions * 0.7;
  for (let i = 0; i < 6; i++) {
    base += (Math.random() - 0.3) * (currentEmissions * 0.08);
    historical.push(Math.round(base));
  }

  // Forecast next 6 months with trend + seasonality
  const forecast = [];
  const trend = (historical[5] - historical[0]) / 5;
  let last = historical[5];
  for (let i = 0; i < 6; i++) {
    last += trend + (Math.random() - 0.5) * (currentEmissions * 0.05);
    forecast.push(Math.round(Math.max(0, last)));
  }

  const ctx = document.getElementById('forecast-chart');
  if (!ctx) return;
  if (S.charts.forecastChart) S.charts.forecastChart.destroy();

  const histLabels = [];
  const foreLabels = [];
  for (let i = 5; i >= 0; i--) histLabels.push(months[(currentMonth - i + 12) % 12]);
  for (let i = 1; i <= 6; i++) foreLabels.push(months[(currentMonth + i) % 12]);

  S.charts.forecastChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [...histLabels, ...foreLabels],
      datasets: [
        { label: 'Historical', data: [...historical, null, null, null, null, null, null], borderColor: 'rgba(109,217,140,1)', backgroundColor: 'rgba(109,217,140,0.1)', fill: true, tension: 0.4 },
        { label: 'AI Forecast', data: [null, null, null, null, null, historical[5], ...forecast], borderColor: 'rgba(245,166,35,1)', backgroundColor: 'rgba(245,166,35,0.1)', borderDash: [5,5], fill: true, tension: 0.4 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: 'rgba(255,255,255,0.6)' } } },
      scales: {
        x: { ticks: { color: 'rgba(255,255,255,0.4)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: 'rgba(255,255,255,0.4)', callback: v => v.toLocaleString() + ' tCO₂e' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  // Update forecast summary
  const forecastTotal = forecast.reduce((s,v) => s + v, 0);
  const yearProjection = Math.round((historical.reduce((s,v) => s + v, 0) + forecastTotal) / 12 * 12);
  const el = document.getElementById('forecast-summary');
  if (el) el.innerHTML = `
    <div class="forecast-insight"><strong>6-Month Projection:</strong> ${forecastTotal.toLocaleString()} tCO₂e</div>
    <div class="forecast-insight"><strong>Annual Estimate:</strong> ${yearProjection.toLocaleString()} tCO₂e</div>
    <div class="forecast-insight"><strong>Trend:</strong> ${trend > 0 ? '📈 Increasing' : '📉 Decreasing'} (${trend > 0 ? '+' : ''}${Math.round(trend)} tCO₂e/month)</div>
    <div class="forecast-insight"><strong>Net-Zero Gap:</strong> ${yearProjection.toLocaleString()} tCO₂e of offsets needed</div>
  `;
}

// 7b. Compliance Scoring
function runComplianceScore() {
  const checks = [
    { name: 'IPCC AR6 Methodology', status: true, weight: 20, detail: 'Using AR6 GWP₁₀₀ values' },
    { name: 'Data Quality Score (DQS)', status: S.user.dqs >= 3, weight: 15, detail: `Current DQS: ${S.user.dqs || 2}/5` },
    { name: 'Emission Factor Sources', status: true, weight: 15, detail: 'Kenya-calibrated EFs from IEA/KPLC' },
    { name: 'Scope 1 Coverage', status: true, weight: 10, detail: 'Direct emissions tracked' },
    { name: 'Scope 2 Coverage', status: true, weight: 10, detail: 'Grid electricity tracked' },
    { name: 'Scope 3 Coverage', status: false, weight: 10, detail: 'Supply chain not yet tracked' },
    { name: 'CDA Fourth Schedule', status: false, weight: 10, detail: 'Not yet generated' },
    { name: 'MRV Documentation', status: false, weight: 5, detail: 'Monitoring plan pending' },
    { name: 'VVB Assignment', status: false, weight: 5, detail: 'No verifier assigned' },
  ];

  const totalScore = checks.reduce((s, c) => s + (c.status ? c.weight : 0), 0);
  const grade = totalScore >= 80 ? 'A' : totalScore >= 60 ? 'B' : totalScore >= 40 ? 'C' : 'D';
  const gradeColor = totalScore >= 80 ? 'green' : totalScore >= 60 ? 'gold' : totalScore >= 40 ? 'coral' : 'red';

  const el = document.getElementById('compliance-results');
  if (!el) return;
  el.innerHTML = `
    <div class="compliance-score-display">
      <div class="compliance-grade ${gradeColor}">${grade}</div>
      <div class="compliance-pct">${totalScore}%</div>
      <div class="compliance-label">KNCR Readiness</div>
    </div>
    <div class="compliance-checks">
      ${checks.map(c => `
        <div class="compliance-check ${c.status ? 'pass' : 'fail'}">
          <span class="check-icon">${c.status ? '✅' : '❌'}</span>
          <span class="check-name">${c.name}</span>
          <span class="check-weight">${c.weight}%</span>
          <span class="check-detail">${c.detail}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// 7c. Anomaly Detection
function runAnomalyDetection() {
  const anomalies = [
    { type: 'warning', metric: 'Diesel Consumption', value: '2,400 L/month', expected: '800–1,200 L/month', severity: 'High', suggestion: 'Diesel usage is 2x the sector average. Check for fuel theft, equipment inefficiency, or data entry error.' },
    { type: 'info', metric: 'Grid Electricity', value: '12,000 kWh/month', expected: '10,000–15,000 kWh/month', severity: 'Normal', suggestion: 'Within expected range for your facility size.' },
    { type: 'warning', metric: 'Cement Usage', value: '450 tonnes', expected: '200–300 tonnes', severity: 'Medium', suggestion: 'Higher than typical for reported project scope. Verify quantities against delivery notes.' },
    { type: 'success', metric: 'Transport Emissions', value: '0.12 kgCO₂e/km', expected: '0.15–0.20 kgCO₂e/km', severity: 'Good', suggestion: 'Below average — your fleet is more efficient than the sector benchmark.' },
  ];

  const el = document.getElementById('anomaly-results');
  if (!el) return;
  el.innerHTML = anomalies.map(a => `
    <div class="anomaly-card ${a.type}">
      <div class="anomaly-header">
        <span class="anomaly-icon">${a.type === 'warning' ? '⚠️' : a.type === 'success' ? '✅' : 'ℹ️'}</span>
        <span class="anomaly-metric">${a.metric}</span>
        <span class="anomaly-severity ${a.severity.toLowerCase()}">${a.severity}</span>
      </div>
      <div class="anomaly-body">
        <div><strong>Reported:</strong> ${a.value}</div>
        <div><strong>Expected Range:</strong> ${a.expected}</div>
        <div class="anomaly-suggestion">💡 ${a.suggestion}</div>
      </div>
    </div>
  `).join('');
}

// 7d. AI Report Generation
async function generateAIReport() {
  const btn = document.getElementById('btn-ai-report');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating...'; }

  const userData = {
    name: AUTH.currentUser?.name || S.user.name,
    org: AUTH.currentUser?.org || S.user.org,
    emissions: S.user.totalEmissions || 2847,
    offsets: EXCHANGE.portfolio.purchased.reduce((s,p) => s + p.credits, 0),
  };

  try {
    const prompt = `Generate a concise executive carbon report summary for ${userData.org}. Total emissions: ${userData.emissions} tCO₂e. Offsets purchased: ${userData.offsets} tCO₂e. Net position: ${userData.emissions - userData.offsets} tCO₂e. Include: 1) Current status assessment, 2) Key risks under Kenya's Carbon Markets Regulations 2024, 3) Three recommended actions. Keep it under 200 words. Format with bullet points.`;
    const report = await callGeminiAPI(prompt);
    const el = document.getElementById('ai-report-output');
    if (el) el.innerHTML = `<div class="ai-report-content">${report.replace(/\n/g, '<br>')}</div>`;
  } catch (e) {
    const el = document.getElementById('ai-report-output');
    if (el) el.innerHTML = `
      <div class="ai-report-content">
        <strong>📊 Carbon Status Report — ${userData.org}</strong><br><br>
        <strong>Current Position:</strong><br>
        • Total Emissions: ${userData.emissions.toLocaleString()} tCO₂e<br>
        • Offsets Purchased: ${userData.offsets.toLocaleString()} tCO₂e<br>
        • Net Position: ${(userData.emissions - userData.offsets).toLocaleString()} tCO₂e<br>
        • Offset Ratio: ${userData.emissions > 0 ? Math.round(userData.offsets / userData.emissions * 100) : 0}%<br><br>
        <strong>Key Risks:</strong><br>
        • KES 500M penalty risk under Regulation 37 for inaccurate reporting<br>
        • CDA compliance gap if community benefit sharing not documented<br><br>
        <strong>Recommended Actions:</strong><br>
        1. Complete Scope 3 supply chain emissions mapping<br>
        2. Generate CDA Fourth Schedule documentation<br>
        3. Engage a VVB for third-party verification<br><br>
        <em>Report generated by Netzerra AI · ${new Date().toLocaleDateString()}</em>
      </div>
    `;
  }
  if (btn) { btn.disabled = false; btn.textContent = '🤖 Generate AI Report'; }
}

// ══════════════════════════════════════════════════════
// 8. SECTION NAVIGATION OVERRIDE
// ══════════════════════════════════════════════════════

const _origShowSection = window.showSection;

window.showSection = function(id) {
  if (typeof _origShowSection === 'function') _origShowSection(id);

  if (id === 'enterprise') renderEnterpriseDashboard();
  else if (id === 'exchange') renderExchange();
  else if (id === 'nema-oversight') renderNEMAOversight();
  else if (id === 'b2b') renderB2BHub();

  const breadcrumb = document.getElementById('breadcrumb');
  const labels = {
    'enterprise': '🏢 Enterprise Dashboard',
    'exchange': '🔄 Carbon Credit Exchange',
    'nema-oversight': '🏛️ NEMA Oversight Portal',
    'b2b': '🤝 B2B Trading Hub',
  };
  if (breadcrumb && labels[id]) breadcrumb.innerHTML = `<b>${labels[id]}</b>`;
};

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// ══════════════════════════════════════════════════════
// 9. INITIALIZATION
// ══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  renderZerraMessages();

  const zerraInput = document.getElementById('zerra-input');
  if (zerraInput) zerraInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendZerraMessage(); });

  // Enterprise tab switching
  document.querySelectorAll('.ent-tabs .ent-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const targetId = this.getAttribute('data-tab');
      if (!targetId) return;
      document.querySelectorAll('.ent-tabs .ent-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.ent-tab-content').forEach(c => c.style.display = 'none');
      const target = document.getElementById(targetId);
      if (target) target.style.display = 'block';
    });
  });

  // B2B tab switching
  document.querySelectorAll('.b2b-tabs .b2b-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const targetId = this.getAttribute('data-tab');
      if (!targetId) return;
      document.querySelectorAll('.b2b-tabs .b2b-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.b2b-tab-content').forEach(c => c.style.display = 'none');
      const target = document.getElementById(targetId);
      if (target) target.style.display = 'block';
    });
  });

  // Show auth screen after onboarding
  setTimeout(() => {
    if (!AUTH.currentUser) {
      const onboarding = document.getElementById('onboarding-overlay');
      if (onboarding && onboarding.classList.contains('open')) {
        const observer = new MutationObserver(() => {
          if (!onboarding.classList.contains('open')) {
            observer.disconnect();
            setTimeout(showAuthScreen, 500);
          }
        });
        observer.observe(onboarding, { attributes: true, attributeFilter: ['class'] });
      } else {
        showAuthScreen();
      }
    }
  }, 1500);
});

// ══════════════════════════════════════════════════════
// 10. CARBON SEQUESTRATION CALCULATOR
// Full IPCC-verified calculator for NGOs, project devs,
// conservancies — how much CO₂ does my project absorb?
// ══════════════════════════════════════════════════════

const SEQ_SPECIES = {
  bamboo_highland:  { name:'Bamboo (Highland — Arundinaria alpina)',  rate:17.0, unit:'tCO₂e/ha/yr', ref:'Yuen et al. 2017', density:'1,600 stems/ha', notes:'Fastest Kenya sequestration. Highlands >1,500m. Also timber income.' },
  bamboo_lowland:   { name:'Bamboo (Lowland — Bambusa vulgaris)',     rate:12.0, unit:'tCO₂e/ha/yr', ref:'KEFRI 2019',       density:'1,200 stems/ha', notes:'Suitable below 1,500m. Slightly lower sequestration than highland.' },
  casuarina:        { name:'Casuarina equisetifolia',                 rate:8.0,  unit:'tCO₂e/ha/yr', ref:'KEFRI 2019',       density:'1,100 stems/ha', notes:'N-fixing pioneer. ASAL and coastal Kenya. Rapid establishment.' },
  grevillea:        { name:'Grevillea robusta (Silky Oak)',           rate:6.0,  unit:'tCO₂e/ha/yr', ref:'KEFRI 2019',       density:'800 stems/ha',   notes:'Widely adopted in Kenyan smallholder systems. Timber + carbon.' },
  acacia_tortilis:  { name:'Acacia tortilis (ASAL)',                  rate:4.0,  unit:'tCO₂e/ha/yr', ref:'KEFRI 2020',       density:'400 stems/ha',   notes:'Arid/semi-arid Kenya. Nitrogen-fixing. Livestock shade + fodder.' },
  eucalyptus:       { name:'Eucalyptus spp. (Commercial)',            rate:9.5,  unit:'tCO₂e/ha/yr', ref:'KEFRI 2019',       density:'1,000 stems/ha', notes:'High sequestration but check local regulations on exotic species.' },
  mango:            { name:'Mango (Mangifera indica)',                rate:3.8,  unit:'tCO₂e/ha/yr', ref:'Rosenstock 2014',  density:'100 stems/ha',   notes:'Fruit income + carbon. Common in agroforestry systems.' },
  avocado:          { name:'Avocado (Persea americana)',              rate:3.5,  unit:'tCO₂e/ha/yr', ref:'Rosenstock 2014',  density:'100 stems/ha',   notes:'Commercial fruit crop with significant woody biomass carbon.' },
  indigenous_mix:   { name:'Indigenous Mixed Forest (Kenya highlands)',rate:5.5, unit:'tCO₂e/ha/yr', ref:'KEFRI 2021',       density:'Mixed',          notes:'Biodiversity co-benefits. Preferred by Verra VCS and Gold Standard.' },
  mangrove:         { name:'Mangrove (Rhizophora/Avicennia)',         rate:6.4,  unit:'tCO₂e/ha/yr', ref:'Alongi 2014',      density:'2,000 stems/ha', notes:'Blue carbon. Highest ecosystem carbon density incl. soil carbon. Coastal Kenya.' },
  mangrove_soil:    { name:'Mangrove incl. soil carbon (full)',       rate:9.8,  unit:'tCO₂e/ha/yr', ref:'Kauffman et al.',  density:'2,000 stems/ha', notes:'When deep soil carbon is measured and verified — premium credits.' },
  savannah:         { name:'Savannah Grassland (avoided degradation)',rate:1.2,  unit:'tCO₂e/ha/yr', ref:'IPCC 2006 Vol.4',  density:'N/A',            notes:'Based on biomass + soil carbon. Conservative Tier 1 estimate for northern Kenya.' },
  soil_carbon:      { name:'Soil Carbon Enhancement (cropland)',      rate:0.4,  unit:'tCO₂e/ha/yr', ref:'IPCC 2019',        density:'N/A',            notes:'Conservation agriculture, cover crops, reduced tillage.' },
};

const TREE_AVG_CARBON = {
  small:  { label:'Small trees (<5yr, <5m height)',   kgCO2_per_tree_per_yr: 6  },
  medium: { label:'Medium trees (5-15yr, 5-15m)',     kgCO2_per_tree_per_yr: 21 },
  large:  { label:'Mature trees (>15yr, >15m)',        kgCO2_per_tree_per_yr: 48 },
  mixed:  { label:'Mixed / unknown age',              kgCO2_per_tree_per_yr: 21 },
};

function renderSeqCalculator() {
  const el = document.getElementById('seq-species-grid');
  if (!el) return;
  el.innerHTML = Object.entries(SEQ_SPECIES).map(([key, s]) => `
    <label class="seq-species-card">
      <input type="radio" name="seq-species" value="${key}" ${key === 'bamboo_highland' ? 'checked' : ''} onchange="updateSeqPreview()">
      <div class="seq-card-body">
        <div class="seq-card-name">${s.name}</div>
        <div class="seq-card-rate">${s.rate} <span>${s.unit}</span></div>
        <div class="seq-card-notes">${s.notes}</div>
        <div class="seq-card-ref">📚 ${s.ref}</div>
      </div>
    </label>
  `).join('');
  updateSeqPreview();
}

function updateSeqPreview() {
  const key = document.querySelector('input[name="seq-species"]:checked')?.value;
  const species = SEQ_SPECIES[key];
  if (!species) return;

  const inputMode = document.querySelector('input[name="seq-input-mode"]:checked')?.value || 'area';
  let area_ha = 0, trees = 0;

  if (inputMode === 'area') {
    area_ha = parseFloat(document.getElementById('seq-area')?.value) || 0;
  } else if (inputMode === 'trees') {
    trees = parseFloat(document.getElementById('seq-trees')?.value) || 0;
    const treeAge = document.getElementById('seq-tree-age')?.value || 'mixed';
    const treeRate = TREE_AVG_CARBON[treeAge]?.kgCO2_per_tree_per_yr || 21;
    area_ha = trees / (parseFloat(species.density?.replace(/[^0-9]/g, '')) || 800);
    // also compute from tree count directly
    const directTco2 = (trees * treeRate) / 1000;
    document.getElementById('seq-tree-direct').textContent =
      `${trees.toLocaleString()} trees × ${treeRate} kg CO₂/tree/yr = ${directTco2.toFixed(1)} tCO₂e/yr (tree-count method)`;
  }

  const years  = parseFloat(document.getElementById('seq-years')?.value) || 10;
  const annual = area_ha * species.rate;
  const total  = annual * years;
  const credits_gross = total;
  const credits_net   = credits_gross * 0.80; // 20% buffer pool (VCS standard)
  const value_low  = credits_net * 800;
  const value_high = credits_net * 1800;

  // Update display
  const set = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  set('seq-result-area',    area_ha > 0 ? area_ha.toFixed(2) + ' ha' : '—');
  set('seq-result-annual',  annual.toFixed(1) + ' tCO₂e/yr');
  set('seq-result-total',   total.toFixed(0) + ' tCO₂e');
  set('seq-result-net',     credits_net.toFixed(0) + ' tCO₂e (after 20% buffer)');
  set('seq-result-value',   `KES ${value_low.toLocaleString()} – ${value_high.toLocaleString()}`);
  set('seq-result-species', species.name);
  set('seq-result-density', species.density);
  set('seq-result-ref',     species.ref);

  // Progress ring
  const ring = document.getElementById('seq-ring-pct');
  if (ring) {
    const pct = Math.min(100, (annual / 500) * 100);
    ring.textContent = annual > 0 ? annual.toFixed(0) + ' t/yr' : '0';
  }

  // Chart
  renderSeqChart(annual, years, species.name);
}

function renderSeqChart(annual, years, speciesName) {
  const ctx = document.getElementById('seq-chart');
  if (!ctx) return;
  if (S.charts && S.charts.seqChart) S.charts.seqChart.destroy();
  const labels = Array.from({length: years}, (_, i) => `Year ${i+1}`);
  const cumulative = labels.map((_, i) => parseFloat((annual * (i+1)).toFixed(1)));
  const annual_arr = labels.map(() => parseFloat(annual.toFixed(1)));
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Annual Sequestration (tCO₂e)', data: annual_arr, backgroundColor: 'rgba(109,217,140,0.5)', borderColor: 'rgba(109,217,140,1)', borderWidth: 1, yAxisID: 'y' },
        { label: 'Cumulative Total (tCO₂e)',      data: cumulative, type: 'line', borderColor: 'rgba(245,166,35,1)', backgroundColor: 'rgba(245,166,35,0.1)', tension: 0.4, fill: true, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: 'rgba(255,255,255,0.6)', font: { size: 10 } } },
        title: { display: true, text: `${speciesName} — CO₂ Absorption Projection`, color: 'rgba(255,255,255,0.7)', font: { size: 11 } }
      },
      scales: {
        x:  { ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y:  { position: 'left',  ticks: { color: 'rgba(255,255,255,0.4)', callback: v => v + 't' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y1: { position: 'right', ticks: { color: 'rgba(245,166,35,0.6)', callback: v => v + 't' }, grid: { display: false } }
      }
    }
  });
  if (S.charts) S.charts.seqChart = chart;
}

async function generateSeqAIInsight() {
  const key = document.querySelector('input[name="seq-species"]:checked')?.value;
  const species = SEQ_SPECIES[key];
  if (!species) { toast('Select a species first', 'error'); return; }
  const area = parseFloat(document.getElementById('seq-area')?.value) || 0;
  const years = parseFloat(document.getElementById('seq-years')?.value) || 10;
  const annual = area * species.rate;
  const total = annual * years;

  const btn = document.getElementById('btn-seq-ai');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Analysing...'; }

  const prompt = `You are a carbon project expert for Kenya. An NGO or project developer is planting ${species.name} across ${area} hectares over ${years} years in Kenya.

Key facts: ${species.rate} tCO₂e/ha/yr sequestration rate (${species.ref}). Annual sequestration: ${annual.toFixed(1)} tCO₂e. Total over ${years} years: ${total.toFixed(0)} tCO₂e. Density: ${species.density}. Notes: ${species.notes}.

Provide a concise 4-section response (under 250 words):
1. KNCR Eligibility: Can this be registered as a KNCR carbon project? What standard fits best (Verra VCS VM0047, Gold Standard, KNCR Domestic)?
2. Key Risks: Top 3 risks (permanence, leakage, additionality, monitoring) and how to mitigate.
3. Co-Benefits: Community, biodiversity, water, soil benefits relevant to Kenya.
4. Next Steps: 3 concrete actions to turn this into registered carbon credits.

Keep it practical and Kenya-specific.`;

  try {
    const response = await callGeminiAPI(prompt);
    const el = document.getElementById('seq-ai-output');
    if (el) el.innerHTML = `<div class="ai-report-content">${response.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/#{1,3} (.*)/g,'<h4 style="color:var(--mint);margin:.6rem 0 .3rem">$1</h4>')}</div>`;
  } catch(e) {
    const el = document.getElementById('seq-ai-output');
    if (el) el.innerHTML = `<div class="ai-report-content">
      <strong>KNCR Eligibility:</strong> ${species.name} projects qualify under KNCR Domestic standard and Verra VCS VM0047 (AFOLU — Improved Forest Management). Gold Standard also accepts agroforestry projects with strong community co-benefits.<br><br>
      <strong>Key Risks:</strong> (1) Permanence — fire, drought, or land-use change can reverse sequestration; maintain a 20% buffer pool. (2) Additionality — demonstrate the planting would not happen without carbon finance. (3) Leakage — ensure project doesn't displace land use elsewhere in the county.<br><br>
      <strong>Co-Benefits:</strong> Soil erosion control, watershed protection, community timber/fruit income, biodiversity habitat, microclimate cooling — all quantifiable as SDG co-benefits for Gold Standard.<br><br>
      <strong>Next Steps:</strong> (1) Register a KNCR Concept Note via Netzerra KNCR Gateway. (2) Engage a Verra-accredited VVB (Bureau Veritas, SCS Global) for validation. (3) Set up GPS-based monitoring plots (minimum 10% of project area) for annual MRV reporting.
    </div>`;
  }
  if (btn) { btn.disabled = false; btn.textContent = '🤖 AI Project Analysis'; }
}

// ══════════════════════════════════════════════════════
// 11. REAL OCR — Gemini Vision API
// Reads actual receipt/bill photos, not just text paste
// ══════════════════════════════════════════════════════

async function handleOCRUpload(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Please upload an image file (JPG, PNG)', 'error'); return; }

  // Show preview
  const preview = document.getElementById('ocr-preview');
  if (preview) { preview.src = URL.createObjectURL(file); preview.style.display = 'block'; }

  const statusEl = document.getElementById('ocr-status');
  if (statusEl) { statusEl.textContent = '🔍 Reading receipt with AI vision...'; statusEl.style.color = 'var(--mint)'; }
  document.getElementById('ocr-results').innerHTML = '';

  // Convert to base64
  const base64 = await new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result.split(',')[1]);
    reader.readAsDataURL(file);
  });

  const prompt = `You are an emission data extraction assistant for Netzerra, Kenya's carbon intelligence platform.

Carefully read this receipt, bill, invoice, or delivery note image and extract ALL emission-relevant quantities. Look for:
- Fuel: diesel, petrol, kerosene, LPG, HFO, CNG (in litres, kg, or m³)
- Electricity: kWh consumed (from KPLC or any utility bill)
- Materials: cement (bags or tonnes), steel/rebar (kg or tonnes), concrete (m³), timber (m³)
- Transport: distance in km, number of trips, vehicle type
- Waste: tonnes of solid waste, m³ of wastewater
- Refrigerants: kg of HFC-134a, R-404A, R-22

Return ONLY a JSON object with this exact format (include only fields where you found data):
{
  "extracted": [
    { "type": "diesel", "value": 500, "unit": "litres", "confidence": "high", "raw_text": "500L AGO" },
    { "type": "electricity", "value": 12000, "unit": "kWh", "confidence": "high", "raw_text": "Units: 12,000 kWh" }
  ],
  "document_type": "fuel receipt",
  "vendor": "Total Energies Nairobi",
  "date": "2026-03-15",
  "notes": "any important caveats or unclear items"
}

Types must be one of: diesel, petrol, lpg, hfo, cng, kerosene, electricity, cement, steel, rebar, concrete, timber, distance, solid_waste, wastewater, hfc134a, r404a`;

  try {
    const apiKey = 'AIzaSyAWsBmp3w9AlGGrcNQy8NxY-_vMUjUmywQ';
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    let data = null;

    for (const model of models) {
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { inline_data: { mime_type: file.type, data: base64 } },
              { text: prompt }
            ]}],
            generationConfig: { maxOutputTokens: 800, temperature: 0.1 }
          })
        });
        if (!resp.ok) continue;
        const result = await resp.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) { data = JSON.parse(jsonMatch[0]); break; }
      } catch(e) { continue; }
    }

    if (!data) throw new Error('Could not parse AI response');
    renderOCRResults(data);
    if (statusEl) { statusEl.textContent = `✅ Extracted ${data.extracted?.length || 0} data points from ${data.document_type || 'document'}`; }

  } catch(e) {
    if (statusEl) { statusEl.textContent = '⚠️ AI vision unavailable — use text paste below'; statusEl.style.color = '#FFD54F'; }
    document.getElementById('ocr-results').innerHTML = `<div style="color:rgba(255,165,0,.7);font-size:.8rem;padding:.5rem">
      AI vision could not process this image. Try: (1) better lighting, (2) clearer photo, (3) paste the text manually in the Smart Parse tab.
    </div>`;
  }
}

const EF_MAP = {
  diesel: 2.68, petrol: 2.31, lpg: 2.98, hfo: 3.17, cng: 1.99, kerosene: 2.54,
  electricity: 0.3174, cement: 0.83, steel: 1.85, rebar: 1.99,
  concrete: 0.159, timber: 0.72, distance: 0.165 / 1000,
  solid_waste: 0.58, wastewater: 0.025, hfc134a: 1.53, r404a: 4.18
};
const UNIT_LABEL = {
  diesel:'L', petrol:'L', lpg:'kg', hfo:'L', cng:'m³', kerosene:'L',
  electricity:'kWh', cement:'t', steel:'t', rebar:'t', concrete:'m³', timber:'m³',
  distance:'km', solid_waste:'t', wastewater:'m³', hfc134a:'kg', r404a:'kg'
};

function renderOCRResults(data) {
  const el = document.getElementById('ocr-results');
  if (!el || !data.extracted?.length) {
    el.innerHTML = '<div style="color:rgba(255,255,255,.3);font-size:.8rem">No emission-relevant data found in this image.</div>';
    return;
  }

  let totalCO2 = 0;
  const rows = data.extracted.map(item => {
    const ef = EF_MAP[item.type] || 0;
    const co2 = item.type === 'electricity'
      ? (item.value * ef / 1000)
      : (item.type === 'distance' ? item.value * 0.000165 : item.value * ef / 1000);
    totalCO2 += co2;
    const confColor = item.confidence === 'high' ? '#69F0AE' : item.confidence === 'medium' ? '#FFD54F' : '#EF9A9A';
    return `<div class="parse-item">
      <div class="parse-label">${item.type.replace(/_/g,' ')}</div>
      <div class="parse-value">${item.value.toLocaleString()} ${item.unit || UNIT_LABEL[item.type] || ''}</div>
      <div class="parse-emission">${co2.toFixed(3)} tCO₂e</div>
      <div style="font-size:.65rem;color:${confColor};margin-top:2px">${item.confidence} confidence</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    ${data.vendor || data.date ? `<div style="font-size:.75rem;color:rgba(255,255,255,.4);margin-bottom:.5rem">
      ${data.vendor ? `Vendor: ${data.vendor}` : ''} ${data.date ? `· Date: ${data.date}` : ''}
    </div>` : ''}
    <div class="parse-results">${rows}</div>
    <div class="parse-total">Total: ${totalCO2.toFixed(3)} tCO₂e</div>
    ${data.notes ? `<div style="font-size:.72rem;color:rgba(255,165,0,.6);margin-top:.4rem">⚠️ ${data.notes}</div>` : ''}
    <button class="btn-buy-credit" style="margin-top:.7rem;font-size:.78rem" onclick="applyOCRToCalculator(${JSON.stringify(data.extracted).replace(/"/g,'&quot;')})">
      ⚡ Apply to Calculator
    </button>`;
}

function applyOCRToCalculator(items) {
  // Try to pre-fill calculator fields with extracted data
  const map = { diesel: 'bh-diesel-pump', electricity: 'bh-kwh', cement: 'con-cement', steel: 'con-steel', rebar: 'con-rebar' };
  let applied = 0;
  items.forEach(item => {
    const fieldId = map[item.type];
    if (fieldId) {
      const el = document.getElementById(fieldId);
      if (el) { el.value = item.value; applied++; }
    }
  });
  if (applied > 0) {
    showSection('calculator');
    toast(`✅ Applied ${applied} values to the calculator. Review and adjust before calculating.`, 'success');
  } else {
    toast('Open the calculator manually and enter the extracted values above.', 'info');
  }
}

// ══════════════════════════════════════════════════════
// 12. AI-ENHANCED DQS ADVISOR
// After score calculated, Gemini gives tailored advice
// ══════════════════════════════════════════════════════

async function getDQSAdvice(dqsScore, dqsGrade, sources, sector) {
  const el = document.getElementById('dqs-ai-advice');
  if (!el) return;
  el.innerHTML = '<div style="font-size:.78rem;color:rgba(255,255,255,.3);font-style:italic">🔍 Getting AI advice on your data quality...</div>';

  const declaredSources = sources.filter(Boolean);
  const undeclared = sources.filter(s => !s || s === '').length;

  try {
    const prompt = `A Kenya carbon project (sector: ${sector}) has a Data Quality Score of ${dqsScore}/100 (${dqsGrade}).

Sources declared: [${declaredSources.join(', ') || 'none'}]. Undeclared fields: ${undeclared}.

Under Kenya's Carbon Markets Regulations 2024 and IPCC AR6 methodology, what are the 3 most important actions this organisation should take to improve their DQS? Be specific, practical, and Kenya-context aware. Under 120 words. Format as numbered list.`;

    const advice = await callGeminiAPI(prompt);
    el.innerHTML = `<div class="dqs-ai-box">
      <div style="font-size:.72rem;font-weight:600;color:var(--mint);margin-bottom:.4rem">🤖 AI Data Quality Advisor</div>
      <div style="font-size:.79rem;color:rgba(255,255,255,.75)">${advice.replace(/\n/g,'<br>')}</div>
    </div>`;
  } catch(e) {
    const tips = {
      'Audit-Ready': 'Your data quality is excellent. Maintain it by retaining all source documents for 7 years (Regulation 19 requirement). Consider engaging a VVB for third-party verification.',
      'Verified': 'Good foundation. Upgrade remaining estimated values to metered or receipt-based sources. Request KPLC meter certificates and keep fuel delivery notes.',
      'Mixed Sources': `${undeclared} fields have no declared source. For NEMA submissions, all values need supporting evidence. Prioritise: meter readings over estimates, receipts over visual observation.`,
      'Unverified': 'High risk under Regulation 37. All inputs are estimated. You need primary data: fuel receipts from suppliers, KPLC monthly statements, delivery notes for materials. An auditor will flag this immediately.'
    };
    el.innerHTML = `<div class="dqs-ai-box">
      <div style="font-size:.72rem;font-weight:600;color:var(--gold);margin-bottom:.4rem">📋 DQS Guidance (offline)</div>
      <div style="font-size:.79rem;color:rgba(255,255,255,.65)">${tips[dqsGrade] || tips['Mixed Sources']}</div>
    </div>`;
  }
}

// ══════════════════════════════════════════════════════
// 13. AI-ENHANCED PDF — Hybrid Report
// Hardcoded compliance structure + AI executive summary
// ══════════════════════════════════════════════════════

async function generateHybridReport(calcData, gs, dqsInfo, u) {
  const userData = { name: AUTH?.currentUser?.name || S.user.name, org: AUTH?.currentUser?.org || S.user.org };
  try {
    const prompt = `Write a 3-paragraph executive summary for a GHG emissions report.
Organisation: ${userData.org}. Sector: ${calcData.sector}. Total emissions: ${calcData.total_t.toFixed(2)} tCO₂e/yr.
Scope 1: ${calcData.s1_t.toFixed(2)} t. Scope 2: ${calcData.s2_t.toFixed(2)} t. Scope 3: ${calcData.s3_t.toFixed(2)} t.
NTZ Score: ${gs}/100. DQS: ${calcData.dqs}/100 (${dqsInfo.grade}).
Uncertainty range: ±${u.pct}%.
Plausibility flags: ${calcData.flags?.length ? calcData.flags.join('; ') : 'none'}.
Kenya context. IPCC AR6 methodology. ISO 14064-1 aligned. Professional tone. Under 150 words.`;
    return await callGeminiAPI(prompt);
  } catch(e) {
    return `This report documents the greenhouse gas (GHG) emissions of ${userData.org} for the reporting period, prepared in accordance with ISO 14064-1:2018 and IPCC 2006 Guidelines with AR6 GWP₁₀₀ values. Total emissions are ${calcData.total_t.toFixed(2)} tCO₂e/year, comprising Scope 1 direct emissions (${calcData.s1_t.toFixed(2)} tCO₂e), Scope 2 purchased energy (${calcData.s2_t.toFixed(2)} tCO₂e), and Scope 3 upstream/embodied emissions (${calcData.s3_t.toFixed(2)} tCO₂e).

The NTZ Integrity Score of ${gs}/100 and Data Quality Score of ${calcData.dqs}/100 reflect the current state of data availability. ${calcData.flags?.length ? `${calcData.flags.length} plausibility flag(s) require auditor review before formal submission.` : 'No plausibility flags were identified.'} Results should be verified by a qualified carbon auditor before submission to NEMA or any carbon registry.`;
  }
}

// ══════════════════════════════════════════════════════
// 14. ENTERPRISE IMPROVEMENTS
// ══════════════════════════════════════════════════════

// 14a. Net Zero Pathway Builder
const NET_ZERO_TARGETS = { 2030: 0.5, 2035: 0.25, 2040: 0.1, 2045: 0.0, 2050: 0.0 };

function runNetZeroPathway() {
  const currentEmissions = S.user.totalEmissions || 2847;
  const targetYear = parseInt(document.getElementById('nz-target-year')?.value) || 2035;
  const offsetBudget = parseFloat(document.getElementById('nz-offset-budget')?.value) || 500000;
  const now = new Date().getFullYear();
  const yearsLeft = targetYear - now;

  const annualReduction = currentEmissions / yearsLeft;
  const requiredOffsets = currentEmissions * 0.2; // 20% via offsets, 80% via reduction
  const offsetCostLow  = requiredOffsets * 800;
  const offsetCostHigh = requiredOffsets * 1800;

  const years = Array.from({length: yearsLeft + 1}, (_, i) => now + i);
  const pathway = years.map((_, i) => Math.max(0, currentEmissions - (annualReduction * i)));
  const offsets  = years.map((_, i) => Math.min(requiredOffsets, requiredOffsets * (i / yearsLeft)));

  const ctx = document.getElementById('nz-chart');
  if (!ctx) return;
  if (S.charts && S.charts.nzChart) S.charts.nzChart.destroy();
  if (S.charts) S.charts.nzChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: years,
      datasets: [
        { label: 'Emission Reduction Pathway', data: pathway, borderColor: '#EF5350', backgroundColor: 'rgba(239,83,80,0.08)', fill: true, tension: 0.4 },
        { label: 'Offset Coverage',            data: offsets,  borderColor: '#69F0AE', backgroundColor: 'rgba(109,240,174,0.1)', fill: true, tension: 0.4 },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: 'rgba(255,255,255,0.6)' } } },
      scales: {
        x:  { ticks: { color: 'rgba(255,255,255,0.4)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y:  { ticks: { color: 'rgba(255,255,255,0.4)', callback: v => v.toLocaleString() + 't' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  const sumEl = document.getElementById('nz-summary');
  if (sumEl) sumEl.innerHTML = `
    <div class="forecast-insight"><strong>Target Year:</strong> ${targetYear} (${yearsLeft} years)</div>
    <div class="forecast-insight"><strong>Required Annual Reduction:</strong> ${annualReduction.toFixed(0)} tCO₂e/yr</div>
    <div class="forecast-insight"><strong>Offsets Needed (20%):</strong> ${requiredOffsets.toFixed(0)} tCO₂e/yr · KES ${offsetCostLow.toLocaleString()}–${offsetCostHigh.toLocaleString()}/yr</div>
    <div class="forecast-insight"><strong>Budget vs Need:</strong> ${offsetBudget >= offsetCostLow ? '✅ Budget sufficient for minimum offsets' : '⚠️ Budget below minimum — need KES ' + (offsetCostLow - offsetBudget).toLocaleString() + ' more'}</div>
    <div class="forecast-insight"><strong>KNCR Credits Available:</strong> Browse the Carbon Exchange for KES 800–1,800/tCO₂e</div>`;
}

// 14b. Scope 3 Supply Chain Tracker
const SCOPE3_CATEGORIES = [
  { cat:'Purchased Goods & Services', icon:'📦', ef_note:'Use supplier-specific data or EEIO models', placeholder:'e.g., office supplies, IT equipment, professional services' },
  { cat:'Capital Goods',              icon:'🏗️', ef_note:'Bath ICE v3.0 for construction materials', placeholder:'e.g., vehicles, machinery, buildings' },
  { cat:'Fuel & Energy (upstream)',   icon:'⛽', ef_note:'~15% upstream for diesel, ~8% for KPLC',   placeholder:'Upstream of your Scope 1&2 fuel use' },
  { cat:'Upstream Transport',         icon:'🚚', ef_note:'0.20 kgCO₂/t-km (HGV)',                    placeholder:'Freight to your facility' },
  { cat:'Waste Generated',            icon:'🗑️', ef_note:'580 kgCO₂e/t landfill',                   placeholder:'Solid waste sent to landfill' },
  { cat:'Business Travel',            icon:'✈️', ef_note:'0.165 kgCO₂/km (car), 0.09 (flight)',     placeholder:'Employee flights, car travel' },
  { cat:'Employee Commuting',         icon:'🚌', ef_note:'0.103 kgCO₂/km (matatu/boda avg)',        placeholder:'Daily staff commute distances' },
  { cat:'Downstream Transport',       icon:'📤', ef_note:'0.20 kgCO₂/t-km',                         placeholder:'Freight from your facility to clients' },
  { cat:'Use of Sold Products',       icon:'🏭', ef_note:'Depends on product type',                  placeholder:'Emissions from products when used by customers' },
  { cat:'End-of-Life Treatment',      icon:'♻️', ef_note:'Material-specific disposal EFs',           placeholder:'Disposal/recycling of sold products' },
];

function renderScope3Tracker() {
  const el = document.getElementById('scope3-tracker');
  if (!el) return;
  el.innerHTML = SCOPE3_CATEGORIES.map((c, i) => `
    <div class="scope3-row">
      <div class="scope3-cat"><span>${c.icon}</span><div><div style="font-weight:600;font-size:.83rem">${c.cat}</div><div style="font-size:.7rem;color:rgba(255,255,255,.35)">${c.ef_note}</div></div></div>
      <input type="number" class="scope3-input" id="s3-val-${i}" placeholder="tCO₂e/yr" min="0" step="0.1" oninput="updateScope3Total()">
      <div class="scope3-status" id="s3-status-${i}" style="font-size:.72rem;color:rgba(255,255,255,.25)">—</div>
    </div>`).join('');
}

function updateScope3Total() {
  let total = 0;
  SCOPE3_CATEGORIES.forEach((c, i) => {
    const val = parseFloat(document.getElementById(`s3-val-${i}`)?.value) || 0;
    total += val;
    const statusEl = document.getElementById(`s3-status-${i}`);
    if (statusEl) statusEl.textContent = val > 0 ? `${val} tCO₂e` : '—';
  });
  const el = document.getElementById('scope3-total');
  if (el) el.textContent = total.toFixed(1) + ' tCO₂e/yr';
  const pctEl = document.getElementById('scope3-pct');
  if (pctEl) {
    const pct = S.user.totalEmissions > 0 ? Math.round(total / (S.user.totalEmissions + total) * 100) : 0;
    pctEl.textContent = pct + '% of total footprint';
  }
}

// 14c. Supply chain section rendering (called on section load)
function renderEnterpriseExtras() {
  renderScope3Tracker();
}

// Override section navigation to also init new features
const _origShowSectionEnt = window.showSection;
window.showSection = function(id) {
  if (typeof _origShowSectionEnt === 'function') _origShowSectionEnt(id);
  if (id === 'sequestration') { renderSeqCalculator(); }
  if (id === 'enterprise')    { renderEnterpriseExtras(); }
};
