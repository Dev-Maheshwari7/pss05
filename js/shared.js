(function(){
  const D = window.DDAS_DATA;
  const path = location.pathname.split('/').pop() || 'index.html';

  const ICONS = {
    search: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
    repository: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>',
    activity: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>',
    analytics: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
    server: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"></rect><rect x="2" y="14" width="20" height="8" rx="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>',
    shield: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    zap: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
    'arrow-up-right': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>',
    'arrow-down': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>',
    plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    alert: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    cloud: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>',
    satellite: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
    waves: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path></svg>',
    users: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>'
  };

  const menuItems = [
    { href: 'dashboard.html', label: 'Discover', icon: ICONS.search, badge: '24' },
    { href: 'repository.html', label: 'Repository', icon: ICONS.repository, badge: '16' },
    { href: 'activity.html', label: 'Audit Log', icon: ICONS.activity, badge: '7', badgeClass: 'red' },
    { href: 'analytics.html', label: 'Analytics', icon: ICONS.analytics, badge: '' }
  ];

  window.ddas = {
    icon(name){
      return ICONS[name] || ICONS.activity;
    },
    toast(message){
      let t = document.getElementById('globalToast');
      if(!t){
        t = document.createElement('div');
        t.id = 'globalToast';
        t.className = 'toast';
        document.body.appendChild(t);
      }
      t.textContent = message;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    },
    getDataset(id){
      return D.datasets.find(d => d.id === id) || D.datasets[0];
    },
    queryParam(name){
      return new URLSearchParams(location.search).get(name);
    },
    formatGB(n){
      return n >= 1000 ? (n/1000).toFixed(2) + ' TB' : n.toFixed(n < 10 ? 1 : 0) + ' GB';
    },
    shell(active){
      const navLinks = menuItems.map(item => `
        <a class="menu-link ${active === item.label ? 'active' : ''}" href="${item.href}">
          <div class="menu-link-left">
            ${item.icon}
            <span>${item.label}</span>
          </div>
          ${item.badge ? `<span class="menu-badge ${item.badgeClass || ''}">${item.badge}</span>` : ''}
        </a>
      `).join('');

      return `<aside class="app-sidebar">
        <div>
          <div class="sidebar-brand-wrap">
            <a class="sidebar-brand" href="index.html">
              <div class="sidebar-logo">D</div>
              <div class="sidebar-brand-text">
                <b>DDAS Suite</b>
                <small>ocean.institute</small>
              </div>
            </a>
          </div>

          <div class="sidebar-section-title">Overview</div>
          <nav class="app-menu">${navLinks}</nav>

          <div class="sidebar-section-title">Telemetry & Nodes</div>
          <div class="app-menu">
            <div class="menu-link" style="cursor:default">
              <div class="menu-link-left">
                ${ICONS.server}
                <span>Active Nodes</span>
              </div>
              <span class="menu-badge">16/16</span>
            </div>
            <div class="menu-link" style="cursor:default">
              <div class="menu-link-left">
                ${ICONS.shield}
                <span>Integrity Guard</span>
              </div>
              <span class="tag green" style="font-size:9px;padding:1px 5px">ACTIVE</span>
            </div>
          </div>
        </div>

        <div class="sidebar-footer">
          <div class="system-status">
            <span class="status-dot"></span>
            <div>
              <span style="color:var(--ink-500);font-size:10px;text-transform:uppercase">Storage Fabric</span>
              <b>All Nodes Nominal</b>
            </div>
          </div>
          <div class="profile-card">
            <div class="avatar">RS</div>
            <div class="profile-info">
              <b>Researcher</b>
              <small>Ocean Sciences Lab</small>
            </div>
          </div>
        </div>
      </aside>`;
    },
    metric(label, value, note = '', isIncrease = true){
      return `<div class="kpi-card">
        <div class="kpi-head">
          <span>${label}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
        </div>
        <div class="kpi-value">${value}</div>
        <div class="kpi-footer">
          ${note ? `<span>${note}</span>` : ''}
        </div>
      </div>`;
    },
    datasetCard(d, compact = false){
      return `<article class="dataset-card" data-id="${d.id}">
        <div class="card-content-wrap">
          <div class="card-topline">
            <div class="match-pill">
              <span class="match-dot"></span>
              <span>${d.match}% Match</span>
            </div>
            <div class="tag-row">
              <span class="tag blue">${d.access}</span>
              <span class="tag">${(d.format || '').split('/')[0].trim()}</span>
            </div>
          </div>
          <h3>${d.title}</h3>
          <p>${d.description}</p>
          <div class="meta-spec-grid">
            <div class="spec-cell">
              <span class="spec-label">Coverage</span>
              <b class="spec-val" title="${d.region} · ${d.period}">${d.region} · ${d.period}</b>
            </div>
            <div class="spec-cell">
              <span class="spec-label">Size</span>
              <b class="spec-val">${d.size}</b>
            </div>
            <div class="spec-cell">
              <span class="spec-label">Source</span>
              <b class="spec-val" title="${d.source}">${d.source}</b>
            </div>
            <div class="spec-cell">
              <span class="spec-label">Storage Node</span>
              <b class="spec-val" title="${d.location}">${d.location}</b>
            </div>
          </div>
        </div>
        <div class="card-actions">
          <a class="btn ghost small" href="dataset.html?id=${encodeURIComponent(d.id)}">Details</a>
          <button class="btn primary small duplicate-trigger" data-id="${d.id}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            <span>Check & Download</span>
          </button>
        </div>
      </article>`;
    },
    duplicateModal(){
      if(document.getElementById('duplicateOverlay')) return;
      document.body.insertAdjacentHTML('beforeend', `<div class="overlay" id="duplicateOverlay">
        <div class="modal">
          <section id="dupScan" class="scan-view">
            <div class="scanner"></div>
            <h2>Scanning 16 Institute Repositories…</h2>
            <p>Comparing SHA-256 fingerprints, temporal range bounds, spatial polygons and metadata schemas.</p>
            <div class="progress"><i></i></div>
            <small id="scanMessage">Querying 16 registered repositories</small>
          </section>
          <section id="dupResult" class="dup-result hidden"></section>
        </div>
      </div>`);
      const ov = document.getElementById('duplicateOverlay');
      ov.addEventListener('click', e => {
        if(e.target === ov) ov.classList.remove('show');
      });
    },
    openDuplicate(id){
      this.duplicateModal();
      const d = this.getDataset(id);
      const ov = document.getElementById('duplicateOverlay');
      const scan = document.getElementById('dupScan');
      const result = document.getElementById('dupResult');
      const messages = [
        'Querying 16 registered institute repositories',
        'Comparing SHA-256 fingerprints & dataset IDs',
        'Checking temporal window & spatial bounding overlap',
        'Verifying local access policy & mount options'
      ];
      ov.classList.add('show');
      scan.classList.remove('hidden');
      result.classList.add('hidden');
      let i = 0;
      document.getElementById('scanMessage').textContent = messages[0];
      const inter = setInterval(() => {
        i = Math.min(i + 1, messages.length - 1);
        document.getElementById('scanMessage').textContent = messages[i];
      }, 320);
      setTimeout(() => {
        clearInterval(inter);
        scan.classList.add('hidden');
        result.classList.remove('hidden');
        result.innerHTML = this.duplicateResultHTML(d);
        this.bindModal(d);
      }, 1300);
    },
    duplicateResultHTML(d){
      const saving = d.id === 'DDAS-CLIM-ERA5-02491' ? '8.4 GB' : d.size;
      return `<div class="dup-head">
        <div class="warning">
          <div class="warning-icon">${ICONS.alert}</div>
          <div>
            <h2>Potential Duplicate Already Available</h2>
            <p>Your requested data is fully or substantially covered by an existing institute dataset.</p>
          </div>
        </div>
        <div class="score">
          <strong>${Math.min(99, d.match + 0.7).toFixed(1)}%</strong>
          <span>Confidence Score</span>
        </div>
      </div>
      <div class="dup-body">
        <div class="summary-grid">
          <div class="summary">
            <span>TEMPORAL COVERAGE</span>
            <b style="display:flex;align-items:center;gap:4px">${ICONS.check} ${d.startYear === d.endYear ? '100% Matching Period' : 'Overlapping Window'} · ${d.period}</b>
          </div>
          <div class="summary">
            <span>SPATIAL COVERAGE</span>
            <b style="display:flex;align-items:center;gap:4px">${ICONS.check} Requested domain satisfied by ${d.region}</b>
          </div>
          <div class="summary">
            <span>ESTIMATED SAVING</span>
            <b style="display:flex;align-items:center;gap:4px">${ICONS.check} ${saving} external transfer avoided</b>
          </div>
        </div>
        <div class="tabs">
          <button class="tab active" data-tab="modalOverview">Overview</button>
          <button class="tab" data-tab="modalLineage">Lineage & Provenance</button>
          <button class="tab" data-tab="modalAccess">Access & Policy</button>
        </div>
        <div class="tabpage active" id="modalOverview">
          <div class="meta-fields-grid">
            <div class="meta-field wide"><span>DATASET TITLE</span><b>${d.title}</b></div>
            <div class="meta-field"><span>DDAS ID</span><code>${d.id}</code></div>
            <div class="meta-field"><span>VERSION</span><b>${d.version}</b></div>
            <div class="meta-field"><span>PROVIDER</span><b>${d.provider}</b></div>
            <div class="meta-field"><span>FORMAT</span><b>${d.format}</b></div>
            <div class="meta-field"><span>FILE SIZE</span><b>${d.size}</b></div>
            <div class="meta-field"><span>ACCESS LEVEL</span><b>${d.access}</b></div>
            <div class="meta-field wide"><span>COLLECTION FINGERPRINT (SHA-256)</span><code>${d.hash}</code></div>
            <div class="meta-field"><span>SIMHASH</span><code>${d.simhash}</code></div>
            <div class="meta-field"><span>MIME TYPE</span><b>${d.mime}</b></div>
            <div class="meta-field"><span>TIME RANGE</span><b>${d.period}</b></div>
            <div class="meta-field"><span>TEMPORAL RES.</span><b>${d.temporalResolution}</b></div>
            <div class="meta-field"><span>LATITUDE EXTENT</span><b>${d.latitude}</b></div>
            <div class="meta-field"><span>LONGITUDE EXTENT</span><b>${d.longitude}</b></div>
            <div class="meta-field"><span>GRID / RESOLUTION</span><b>${d.resolution}</b></div>
            <div class="meta-field wide"><span>INDEXED VARIABLES</span><b>${d.variables.join(', ')}</b></div>
            <div class="meta-field"><span>CRS</span><b>${d.crs}</b></div>
            <div class="meta-field wide"><span>INTERNAL STORAGE URI</span><code>${d.storagePath}</code></div>
            <div class="meta-field"><span>REPLICAS</span><b>${d.replicas} · ${d.storageTier} Tier</b></div>
            <div class="meta-field"><span>INTEGRITY STATUS</span><b class="green-text">${d.integrity}</b></div>
          </div>
        </div>
        <div class="tabpage" id="modalLineage">
          <div class="lineage" style="display:grid;gap:8px">
            <div class="meta-field"><b>1. Original Acquisition</b><p style="font-size:11.5px;color:var(--ink-500);margin-top:2px">${d.source} acquisition recorded on ${d.downloadedOn} by ${d.downloader}.</p></div>
            <div class="meta-field"><b>2. Integrity Validation</b><p style="font-size:11.5px;color:var(--ink-500);margin-top:2px">File hashes, collection checksums, and NetCDF/Zarr schemas validated.</p></div>
            <div class="meta-field"><b>3. Metadata Normalization</b><p style="font-size:11.5px;color:var(--ink-500);margin-top:2px">Temporal bounds, spatial extent, variables, and CRS extracted and indexed.</p></div>
            <div class="meta-field"><b>4. Repository Registration</b><p style="font-size:11.5px;color:var(--ink-500);margin-top:2px">${d.replicas} active replica(s) mounted across institute cluster nodes.</p></div>
            <div class="meta-field"><b>5. Semantic Cataloging</b><p style="font-size:11.5px;color:var(--ink-500);margin-top:2px">Indexed with search tags: ${d.tags.join(' / ')}.</p></div>
          </div>
        </div>
        <div class="tabpage" id="modalAccess">
          <div class="meta-fields-grid">
            <div class="meta-field"><span>DATA OWNER</span><b>${d.owner}</b></div>
            <div class="meta-field"><span>ACQUIRED BY</span><b>${d.downloader}</b></div>
            <div class="meta-field"><span>ACQUISITION DATE</span><b>${d.downloadedOn}</b></div>
            <div class="meta-field"><span>LAST ACCESSED</span><b>${d.lastAccessed}</b></div>
            <div class="meta-field"><span>ACCESS CLASS</span><b>${d.access}</b></div>
            <div class="meta-field"><span>LICENSE</span><b>${d.license}</b></div>
            <div class="meta-field"><span>ACTIVE USERS</span><b>${d.activeUsers} researchers</b></div>
            <div class="meta-field"><span>REUSE COUNT</span><b>${d.reuseCount} downloads saved</b></div>
            <div class="meta-field wide"><span>LOCAL MOUNT PATH</span><code>${d.accessPath}</code></div>
            <div class="meta-field wide"><span>POLICY NOTICE</span><b>${d.access === 'Approval required' ? 'Owner approval required before direct mount.' : 'Eligible for instant reuse under institute data policy.'}</b></div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <div class="side">
          <button class="btn ghost" id="modalCancel">Cancel</button>
          <button class="btn danger" id="modalOverride">Download anyway</button>
        </div>
        <div class="side">
          <button class="btn ghost" id="modalCopy">Copy Mount Path</button>
          <button class="btn primary" id="modalUse">${d.access === 'Approval required' ? 'Request Access' : 'Use Existing Dataset'}</button>
        </div>
      </div>`;
    },
    bindModal(d){
      document.querySelectorAll('.tab').forEach(tab => {
        tab.onclick = () => {
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.tabpage').forEach(p => p.classList.remove('active'));
          tab.classList.add('active');
          document.getElementById(tab.dataset.tab).classList.add('active');
        };
      });
      document.getElementById('modalCancel').onclick = () => {
        document.getElementById('duplicateOverlay').classList.remove('show');
      };
      document.getElementById('modalCopy').onclick = () => {
        navigator.clipboard?.writeText(d.accessPath).catch(() => {});
        this.toast('Dataset mount path copied to clipboard');
      };
      document.getElementById('modalOverride').onclick = () => {
        document.getElementById('duplicateOverlay').classList.remove('show');
        this.toast('Override logged. New download queued.');
      };
      document.getElementById('modalUse').onclick = () => {
        document.getElementById('duplicateOverlay').classList.remove('show');
        this.toast(d.access === 'Approval required' ? 'Access request sent to dataset owner' : 'Existing dataset mounted to your workspace');
        const n = +(localStorage.getItem('ddasPrevented') || D.stats.prevented);
        localStorage.setItem('ddasPrevented', n + 1);
      };
    },
    bindDuplicateTriggers(root = document){
      root.querySelectorAll('.duplicate-trigger').forEach(b => {
        b.onclick = () => this.openDuplicate(b.dataset.id);
      });
    }
  };

  window.addEventListener('DOMContentLoaded', () => {
    const shell = document.getElementById('appShell');
    if(shell) shell.innerHTML = ddas.shell(shell.dataset.active || 'Discover');
    ddas.bindDuplicateTriggers();
  });
})();
