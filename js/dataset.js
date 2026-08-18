window.addEventListener('DOMContentLoaded',()=>{
 const d=ddas.getDataset(ddas.queryParam('id'));
 document.title=d.title+' — DDAS';
 document.getElementById('detailHero').innerHTML=`<div class="detail-top-row">
   <div>
     <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--ink-400);letter-spacing:0.5px">${d.type} · ${d.id}</div>
     <h1 style="font-size:22px;font-weight:700;margin:4px 0 6px;color:var(--ink-900)">${d.title}</h1>
     <p style="font-size:13px;color:var(--ink-500);max-width:740px">${d.description}</p>
     <div class="tag-row" style="margin-top:10px">
       <span class="tag green">${d.integrity}</span>
       <span class="tag">${d.format}</span>
       <span class="tag blue">${d.access}</span>
       <span class="tag">${d.storageTier} Tier</span>
     </div>
   </div>
   <div style="display:flex;gap:8px">
     <button class="btn ghost small" id="copyPath">Copy Path</button>
     <button class="btn primary small duplicate-trigger" data-id="${d.id}">Check Duplicate / Download</button>
   </div>
 </div>`;
 ddas.bindDuplicateTriggers(document.getElementById('detailHero'));
 document.getElementById('copyPath').onclick=()=>{
   navigator.clipboard?.writeText(d.accessPath).catch(()=>{});
   ddas.toast('Dataset mount path copied to clipboard ✓');
 };
 document.getElementById('detailMetrics').innerHTML=[
   ddas.metric('Dataset Size', d.size, d.format),
   ddas.metric('Reuse Frequency', d.reuseCount+'×', 'Avoided duplicate transfers'),
   ddas.metric('Active Researchers', d.activeUsers, d.owner),
   ddas.metric('Replica Nodes', d.replicas, d.storageTier+' tier storage')
 ].join('');
 const fields=[
   ['Provider', d.provider],
   ['Product Family', d.family],
   ['Format', d.format],
   ['Version', d.version],
   ['Time Range', d.period],
   ['Temporal Resolution', d.temporalResolution],
   ['Region', d.region],
   ['Spatial Resolution', d.resolution],
   ['Latitude Bounds', d.latitude],
   ['Longitude Bounds', d.longitude],
   ['Coordinate System (CRS)', d.crs],
   ['MIME Type', d.mime],
   ['Indexed Variables', d.variables.join(', '), 'wide'],
   ['Collection Fingerprint (SHA-256)', d.hash, 'wide'],
   ['Semantic Fingerprint', d.simhash],
   ['Storage URI', d.storagePath, 'wide']
 ];
 document.getElementById('metadata').innerHTML=fields.map(([k,v,w])=>
   `<div class="meta-field ${w||''}">
     <span>${k}</span>
     ${k.includes('Fingerprint')||k.includes('URI')?`<code>${v}</code>`:`<b>${v}</b>`}
   </div>`
 ).join('');
 document.getElementById('coverage').innerHTML=[
   ['Temporal Coverage', d.period, 'The catalog records the usable time extent so subset requests can be matched without comparing raw files.'],
   ['Spatial Domain', d.region, 'Bounding coordinates: '+d.latitude+' · '+d.longitude+'.'],
   ['Research Variables', d.variables.length+' indexed', 'Variables are searchable and contribute to similarity scoring.'],
   ['Institutional Reuse', d.reuseCount+' prevented downloads', 'DDAS logs reuse as a resource-saving event rather than duplicating raw bytes.']
 ].map(x=>`<div class="meta-field"><small style="font-size:9.5px;font-weight:600;text-transform:uppercase;color:var(--ink-400)">${x[0]}</small><strong style="display:block;font-size:13px;font-weight:700;color:var(--ink-900);margin-top:2px">${x[1]}</strong><p style="font-size:11.5px;color:var(--ink-500);line-height:1.4;margin:4px 0 0">${x[2]}</p></div>`).join('');
 const steps=[
   ['Original Acquisition', `${d.source} acquisition recorded on ${d.downloadedOn} by ${d.downloader}.`],
   ['Integrity Validation', 'File/collection fingerprint and schema signature checks validated successfully.'],
   ['Metadata Enrichment', `DDAS extracted temporal range, spatial coverage, variables, CRS, ownership and access rules.`],
   ['Repository Registration', `Registered at ${d.location} with ${d.replicas} active replica(s).`],
   ['Semantic Indexing', `Search tags: ${d.tags.join(' / ')}.`]
 ];
 document.getElementById('lineage').innerHTML=steps.map((x,i)=>
   `<div class="meta-field" style="margin-bottom:6px">
     <b>${i+1}. ${x[0]}</b>
     <p style="font-size:11.5px;color:var(--ink-500);margin-top:2px">${x[1]}</p>
   </div>`
 ).join('');
 const access=[
   ['Owner', d.owner],
   ['Original Downloader', d.downloader],
   ['Access Class', d.access],
   ['License', d.license],
   ['Downloaded On', d.downloadedOn],
   ['Last Accessed', d.lastAccessed],
   ['Local Access Path', d.accessPath, 'wide'],
   ['Integrity Verification', d.integrity, 'wide']
 ];
 document.getElementById('accessMeta').innerHTML=access.map(([k,v,w])=>
   `<div class="meta-field ${w||''}"><span>${k}</span><b>${v}</b></div>`
 ).join('');
});
