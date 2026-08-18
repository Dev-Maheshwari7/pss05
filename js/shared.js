(function(){
  const D = window.DDAS_DATA;
  const path = location.pathname.split('/').pop() || 'index.html';
  const links = [
    ['dashboard.html','◈','Discover'],
    ['repository.html','▦','Repository'],
    ['activity.html','⌁','Activity'],
    ['analytics.html','◎','Analytics']
  ];

  window.ddas = {
    toast(message){
      let t=document.getElementById('globalToast');
      if(!t){t=document.createElement('div');t.id='globalToast';t.className='toast';document.body.appendChild(t)}
      t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);
    },
    getDataset(id){return D.datasets.find(d=>d.id===id) || D.datasets[0]},
    queryParam(name){return new URLSearchParams(location.search).get(name)},
    formatGB(n){return n>=1000?(n/1000).toFixed(2)+' TB':n.toFixed(n<10?1:0)+' GB'},
    shell(active){
      const nav=links.map(([href,icon,label])=>`<a class="menu-link ${active===label?'active':''}" href="${href}"><span>${icon}</span>${label}</a>`).join('');
      return `<aside class="app-sidebar clay-soft">
        <div>
          <a class="brand" href="index.html"><img src="assets/logo.svg" class="brand-logo"><div><b>DDAS</b><small>Data Intelligence Layer</small></div></a>
          <nav class="app-menu">${nav}</nav>
        </div>
        <div class="side-bottom">
          <div class="system-status clay-inset"><span class="status-dot"></span><div><small>System status</small><b>All indexers operational</b></div></div>
          <a class="profile clay" href="dashboard.html"><div class="avatar">DM</div><div><b>Researcher</b><small>Ocean Sciences Lab</small></div></a>
        </div>
      </aside>`;
    },
    metric(label,value,note=''){
      return `<div class="metric-card clay"><span>${label}</span><strong>${value}</strong>${note?`<small>${note}</small>`:''}</div>`
    },
    datasetCard(d, compact=false){
      return `<article class="dataset-card clay" data-id="${d.id}">
        <div class="tag-row"><span class="tag green">${d.match}% MATCH</span><span class="tag">${d.format}</span><span class="tag blue">${d.access.toUpperCase()}</span></div>
        <h3>${d.title}</h3><p>${d.description}</p>
        <div class="mini-grid">
          <div class="mini clay-inset">Coverage<b>${d.region} · ${d.period}</b></div>
          <div class="mini clay-inset">Size<b>${d.size}</b></div>
          <div class="mini clay-inset">Source<b>${d.source}</b></div>
          <div class="mini clay-inset">Location<b>${d.location}</b></div>
        </div>
        <div class="action-row"><a class="btn ghost small" href="dataset.html?id=${encodeURIComponent(d.id)}">View details</a><button class="btn primary small duplicate-trigger" data-id="${d.id}">Download</button></div>
      </article>`;
    },
    duplicateModal(){
      if(document.getElementById('duplicateOverlay')) return;
      document.body.insertAdjacentHTML('beforeend',`<div class="overlay" id="duplicateOverlay">
        <div class="modal clay">
          <section id="dupScan" class="scan-view"><div class="scanner"></div><h2>Checking institute repositories…</h2><p>Comparing fingerprints, source lineage, temporal range, spatial bounds and semantic metadata.</p><div class="progress clay-inset"><i></i></div><small id="scanMessage">Querying 16 registered repositories</small></section>
          <section id="dupResult" class="dup-result hidden"></section>
        </div>
      </div>`);
      const ov=document.getElementById('duplicateOverlay');
      ov.addEventListener('click',e=>{if(e.target===ov)ov.classList.remove('show')});
    },
    openDuplicate(id){
      this.duplicateModal();
      const d=this.getDataset(id);
      const ov=document.getElementById('duplicateOverlay');
      const scan=document.getElementById('dupScan');
      const result=document.getElementById('dupResult');
      const messages=['Querying 16 registered repositories','Comparing metadata & dataset IDs','Checking temporal + spatial coverage','Verifying fingerprint & access policy'];
      ov.classList.add('show');scan.classList.remove('hidden');result.classList.add('hidden');
      let i=0;document.getElementById('scanMessage').textContent=messages[0];
      const inter=setInterval(()=>{i=Math.min(i+1,messages.length-1);document.getElementById('scanMessage').textContent=messages[i]},360);
      setTimeout(()=>{clearInterval(inter);scan.classList.add('hidden');result.classList.remove('hidden');result.innerHTML=this.duplicateResultHTML(d);this.bindModal(d)},1600);
    },
    duplicateResultHTML(d){
      const saving=d.id==='DDAS-CLIM-ERA5-02491'?'8.4 GB':d.size;
      return `<div class="dup-head"><div class="warning"><div class="warning-icon">⚠</div><div><h2>Potential duplicate already available</h2><p>Your requested data is fully or substantially covered by an existing institute dataset.</p></div></div><div class="score clay-soft"><strong>${Math.min(99,d.match+.7).toFixed(1)}%</strong><span>DDAS confidence</span></div></div>
      <div class="dup-body">
        <div class="summary-grid"><div class="summary clay-soft"><span>TEMPORAL COVERAGE</span><b>✓ ${d.startYear===d.endYear?'100%':'Overlapping range'} · ${d.period}</b></div><div class="summary clay-soft"><span>SPATIAL COVERAGE</span><b>✓ Requested domain covered by ${d.region}</b></div><div class="summary clay-soft"><span>ESTIMATED SAVING</span><b>✓ ${saving} download avoided</b></div></div>
        <div class="tabs"><button class="tab active" data-tab="modalOverview">Overview</button><button class="tab" data-tab="modalLineage">Lineage & Provenance</button><button class="tab" data-tab="modalAccess">Access & History</button></div>
        <div class="tabpage active" id="modalOverview"><div class="meta-grid">
          <div class="field clay-inset wide"><span>DATASET</span><b>${d.title}</b></div><div class="field clay-inset"><span>DDAS ID</span><code>${d.id}</code></div><div class="field clay-inset"><span>VERSION</span><b>${d.version}</b></div>
          <div class="field clay-inset"><span>PROVIDER</span><b>${d.provider}</b></div><div class="field clay-inset"><span>FORMAT</span><b>${d.format}</b></div><div class="field clay-inset"><span>FILE SIZE</span><b>${d.size}</b></div><div class="field clay-inset"><span>ACCESS</span><b>${d.access}</b></div>
          <div class="field clay-inset wide"><span>SHA / COLLECTION FINGERPRINT</span><code>${d.hash}</code></div><div class="field clay-inset"><span>SIMHASH</span><code>${d.simhash}</code></div><div class="field clay-inset"><span>MIME TYPE</span><b>${d.mime}</b></div>
          <div class="field clay-inset"><span>TIME RANGE</span><b>${d.period}</b></div><div class="field clay-inset"><span>TEMPORAL RES.</span><b>${d.temporalResolution}</b></div><div class="field clay-inset"><span>LATITUDE</span><b>${d.latitude}</b></div><div class="field clay-inset"><span>LONGITUDE</span><b>${d.longitude}</b></div>
          <div class="field clay-inset"><span>GRID / RESOLUTION</span><b>${d.resolution}</b></div><div class="field clay-inset wide"><span>VARIABLES</span><b>${d.variables.join(', ')}</b></div><div class="field clay-inset"><span>CRS</span><b>${d.crs}</b></div>
          <div class="field clay-inset wide"><span>STORAGE LOCATION</span><code>${d.storagePath}</code></div><div class="field clay-inset"><span>REPLICAS</span><b>${d.replicas} · ${d.storageTier}</b></div><div class="field clay-inset"><span>INTEGRITY</span><b class="green-text">${d.integrity}</b></div>
        </div></div>
        <div class="tabpage" id="modalLineage"><div class="lineage"><div class="step-line"><div class="step-num">1</div><div><b>Original acquisition</b><p>${d.source} acquisition recorded on ${d.downloadedOn} by ${d.downloader}.</p></div></div><div class="step-line"><div class="step-num">2</div><div><b>Integrity validation</b><p>Dataset fingerprint, format signatures and metadata schema checks passed.</p></div></div><div class="step-line"><div class="step-num">3</div><div><b>Metadata enrichment</b><p>Temporal bounds, spatial coverage, variables, CRS and access information extracted.</p></div></div><div class="step-line"><div class="step-num">4</div><div><b>Repository replication</b><p>${d.replicas} active replica(s) currently registered in DDAS.</p></div></div><div class="step-line"><div class="step-num">5</div><div><b>Semantic indexing</b><p>Indexed using tags: ${d.tags.join(' / ')}.</p></div></div></div></div>
        <div class="tabpage" id="modalAccess"><div class="meta-grid"><div class="field clay-inset"><span>OWNER</span><b>${d.owner}</b></div><div class="field clay-inset"><span>ORIGINAL DOWNLOADER</span><b>${d.downloader}</b></div><div class="field clay-inset"><span>DOWNLOADED</span><b>${d.downloadedOn}</b></div><div class="field clay-inset"><span>LAST ACCESSED</span><b>${d.lastAccessed}</b></div><div class="field clay-inset"><span>ACCESS CLASS</span><b>${d.access}</b></div><div class="field clay-inset"><span>LICENSE</span><b>${d.license}</b></div><div class="field clay-inset"><span>ACTIVE USERS</span><b>${d.activeUsers}</b></div><div class="field clay-inset"><span>REUSE COUNT</span><b>${d.reuseCount}</b></div><div class="field clay-inset wide"><span>ACCESS PATH</span><code>${d.accessPath}</code></div><div class="field clay-inset wide"><span>AUDIT NOTE</span><b>${d.access==='Approval required'?'Owner approval required before direct reuse.':'Eligible for direct reuse under current policy.'}</b></div></div></div>
      </div>
      <div class="modal-actions"><div class="side"><button class="btn ghost" id="modalCancel">Cancel</button><button class="btn danger" id="modalOverride">Download anyway</button></div><div class="side"><button class="btn ghost" id="modalCopy">Copy location</button><button class="btn mint" id="modalUse">${d.access==='Approval required'?'Request access':'Use existing dataset'}</button></div></div>`
    },
    bindModal(d){
      document.querySelectorAll('.tab').forEach(tab=>tab.onclick=()=>{document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.tabpage').forEach(p=>p.classList.remove('active'));tab.classList.add('active');document.getElementById(tab.dataset.tab).classList.add('active')});
      document.getElementById('modalCancel').onclick=()=>document.getElementById('duplicateOverlay').classList.remove('show');
      document.getElementById('modalCopy').onclick=()=>{navigator.clipboard?.writeText(d.accessPath).catch(()=>{});this.toast('Dataset location copied ✓')};
      document.getElementById('modalOverride').onclick=()=>{document.getElementById('duplicateOverlay').classList.remove('show');this.toast('Override logged. New download queued.')};
      document.getElementById('modalUse').onclick=()=>{document.getElementById('duplicateOverlay').classList.remove('show');this.toast(d.access==='Approval required'?'Access request sent to dataset owner ✓':'Existing dataset mounted to your workspace ✓');const n=+(localStorage.getItem('ddasPrevented')||D.stats.prevented);localStorage.setItem('ddasPrevented',n+1)};
    },
    bindDuplicateTriggers(root=document){root.querySelectorAll('.duplicate-trigger').forEach(b=>b.onclick=()=>this.openDuplicate(b.dataset.id))}
  };

  window.addEventListener('DOMContentLoaded',()=>{
    const shell=document.getElementById('appShell');if(shell) shell.innerHTML=ddas.shell(shell.dataset.active||'Discover');
    ddas.bindDuplicateTriggers();
  });
})();
