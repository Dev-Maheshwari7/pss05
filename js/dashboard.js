window.addEventListener('DOMContentLoaded',()=>{
  const D = DDAS_DATA;
  const prevented = +(localStorage.getItem('ddasPrevented') || D.stats.prevented);
  document.getElementById('metricGrid').innerHTML = [
    ddas.metric('Downloads Prevented', prevented, '+14.8% vs last month'),
    ddas.metric('Storage Saved', D.stats.storageTB + ' TB', 'Across 16 indexed clusters'),
    ddas.metric('Bandwidth Saved', D.stats.bandwidthTB + ' TB', '+21.2% this quarter'),
    ddas.metric('Indexed Datasets', D.stats.datasets.toLocaleString(), D.stats.repositories + ' active nodes')
  ].join('');

  const grid = document.getElementById('datasetGrid');
  function render(list){
    grid.innerHTML = list.slice(0, 3).map(d => ddas.datasetCard(d)).join('');
    ddas.bindDuplicateTriggers(grid);
  }
  render(D.datasets);

  document.getElementById('recentActivity').innerHTML = D.activities.slice(0, 4).map(a => 
    `<div class="activity-item">
      <div class="activity-icon">${ddas.icon(a.icon)}</div>
      <div>
        <b>${a.title}</b>
        <p>${a.detail}</p>
      </div>
      <time>${a.time}</time>
    </div>`
  ).join('');

  const sig = [
    ['Temporal Coverage Overlap', 100],
    ['Spatial Bounding Domain', 96],
    ['Variable Schema Similarity', 94],
    ['Source Lineage Match', 100]
  ];
  document.getElementById('signals').innerHTML = sig.map(([n, v]) => 
    `<div class="signal-row">
      <div class="signal-label">
        <span>${n}</span>
        <span>${v}%</span>
      </div>
      <div class="signal-bar">
        <i style="width:${v}%"></i>
      </div>
    </div>`
  ).join('');

  function search(){
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    let list = D.datasets;
    if(q){
      const terms = q.split(/\s+/).filter(Boolean);
      list = D.datasets.map(d => ({
        d,
        score: terms.reduce((s, t) => s + ([d.title, d.description, d.region, d.source, d.type, ...d.tags, ...d.variables].join(' ').toLowerCase().includes(t) ? 1 : 0), 0)
      })).sort((a, b) => b.score - a.score || b.d.match - a.d.match).map(x => x.d);
    }
    render(list);
    document.getElementById('resultTitle').textContent = `Results for "${document.getElementById('searchInput').value || 'all datasets'}"`;
    ddas.toast(`DDAS ranked ${Math.min(3, list.length)} high-confidence matches`);
  }

  document.getElementById('searchBtn').onclick = search;
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if(e.key === 'Enter') search();
  });
});
