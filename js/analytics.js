window.addEventListener('DOMContentLoaded',()=>{
 const D=DDAS_DATA, S=D.stats, months=['Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'];
 document.getElementById('analyticsMetrics').innerHTML=[
   ddas.metric('Downloads Prevented', S.prevented, '↑ 14.8% vs prior period'),
   ddas.metric('Storage Saved', S.storageTB+' TB', 'Equivalent capacity avoided'),
   ddas.metric('Bandwidth Saved', S.bandwidthTB+' TB', 'Across external transfers'),
   ddas.metric('Reuse Rate', S.reuseRate+'%', 'Satisfied internally without fetch')
 ].join('');

 function bars(id, values){
   const max = Math.max(...values);
   document.getElementById(id).innerHTML = values.map((v, i) => 
     `<div class="chart-bar-col">
       <div class="chart-bar-fill" title="${v}" style="height:${Math.max(6, v/max*160)}px"></div>
       <label>${months[i]}</label>
     </div>`
   ).join('');
 }
 bars('preventedChart', S.monthlyPrevented);
 bars('storageChart', S.monthlyStorage);

 const colors = ['#0f172a','#10b981','#2563eb','#8b5cf6','#f97316'];
 document.getElementById('deptLegend').innerHTML = S.departments.map((d, i) => 
   `<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${d.name} · ${d.value}%</div>`
 ).join('');

 document.getElementById('topReuse').innerHTML = [...D.datasets].sort((a,b) => b.reuseCount - a.reuseCount).slice(0, 4).map((d, i) => 
   `<div class="activity-item">
     <div class="activity-icon" style="font-weight:700;font-size:11px">${i+1}</div>
     <div>
       <b>${d.title}</b>
       <p>${d.owner}</p>
     </div>
     <time style="font-weight:700;color:var(--brand-green)">${d.reuseCount}×</time>
   </div>`
 ).join('');

 document.getElementById('insights').innerHTML = [
   ['Storage Yield','Remote Sensing','Large SAR & optical tiles make duplicate prevention disproportionately valuable.'],
   ['Most Reused','IMD Rainfall','District rainfall aggregates have 219 logged reuse events across 4 departments.'],
   ['Highest Velocity','Climate Analytics','Monthly prevented downloads accelerated significantly in the latest quarter.'],
   ['Cluster Reach','16 Repositories','A federated metadata index provides discovery without moving raw petabytes.'],
   ['Policy Health','3.8% Overrides','Overrides remain transparently logged and auditable for scientific edge cases.'],
   ['Preserved Bandwidth','1,120 Hours','Estimated transfer and processing wait-time preserved across institute teams.']
 ].map(x => 
   `<div class="insight-tile">
     <small>${x[0]}</small>
     <b>${x[1]}</b>
     <p>${x[2]}</p>
   </div>`
 ).join('');
});
