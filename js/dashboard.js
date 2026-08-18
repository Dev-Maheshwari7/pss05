window.addEventListener('DOMContentLoaded',()=>{
  const D=DDAS_DATA;const prevented=+(localStorage.getItem('ddasPrevented')||D.stats.prevented);
  document.getElementById('metricGrid').innerHTML=[ddas.metric('Duplicate downloads prevented',prevented,'↑ 14.8% this month'),ddas.metric('Storage saved',D.stats.storageTB+' TB','Across reusable datasets'),ddas.metric('Bandwidth saved',D.stats.bandwidthTB+' TB','↑ 21.2% this month'),ddas.metric('Indexed datasets',D.stats.datasets.toLocaleString(),D.stats.repositories+' repositories')].join('');
  const grid=document.getElementById('datasetGrid');
  function render(list){grid.innerHTML=list.slice(0,3).map(d=>ddas.datasetCard(d)).join('');ddas.bindDuplicateTriggers(grid)}
  render(D.datasets);
  document.getElementById('recentActivity').innerHTML=D.activities.slice(0,4).map(a=>`<div class="activity-item"><div class="activity-icon clay-inset">${a.icon}</div><div><b>${a.title}</b><p>${a.detail}</p></div><time>${a.time}</time></div>`).join('');
  const sig=[['Temporal overlap',100],['Spatial overlap',96],['Variable similarity',94],['Source confidence',100]];
  document.getElementById('signals').innerHTML=sig.map(([n,v])=>`<div class="bar-row"><div class="bar-label"><span>${n}</span><span>${v}%</span></div><div class="bar clay-inset"><i style="width:${v}%"></i></div></div>`).join('');
  function search(){const q=document.getElementById('searchInput').value.toLowerCase().trim();let list=D.datasets;if(q){const terms=q.split(/\s+/).filter(Boolean);list=D.datasets.map(d=>({d,score:terms.reduce((s,t)=>s+([d.title,d.description,d.region,d.source,d.type,...d.tags,...d.variables].join(' ').toLowerCase().includes(t)?1:0),0)})).sort((a,b)=>b.score-a.score||b.d.match-a.d.match).map(x=>x.d)}render(list);document.getElementById('resultTitle').textContent=`Results for “${document.getElementById('searchInput').value || 'all datasets'}”`;ddas.toast(`DDAS ranked ${Math.min(3,list.length)} high-confidence matches`)}
  document.getElementById('searchBtn').onclick=search;document.getElementById('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')search()});
});
