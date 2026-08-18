window.addEventListener('DOMContentLoaded',()=>{
  const D = DDAS_DATA;
  document.getElementById('repoMetrics').innerHTML = [
    ddas.metric('Indexed Datasets', D.stats.datasets.toLocaleString(), 'Catalog-wide federated search'),
    ddas.metric('Registered Repositories', D.stats.repositories, '16/16 operational nodes'),
    ddas.metric('Active Researchers', D.stats.users, 'Across all lab divisions'),
    ddas.metric('Average Reuse Velocity', D.stats.reuseRate + '%', 'Satisfied without duplicate transfer')
  ].join('');

  const body = document.getElementById('repoBody');
  function render(){
    const q = document.getElementById('repoSearch').value.toLowerCase();
    const type = document.getElementById('typeFilter').value;
    const access = document.getElementById('accessFilter').value;
    const list = D.datasets.filter(d => 
      (!q || [d.title, d.description, d.provider, d.region, d.source, d.type, ...d.variables, ...d.tags].join(' ').toLowerCase().includes(q)) &&
      (!type || d.type === type) &&
      (!access || d.access === access)
    );
    document.getElementById('repoCount').textContent = `${list.length} indexed records`;
    body.innerHTML = list.map(d => `<tr>
      <td>
        <div class="dataset-title-cell">
          <div class="dataset-icon-badge">${d.type === 'Climate' ? '☁' : d.type === 'Remote Sensing' ? '◫' : d.type === 'Oceanography' ? '≈' : '▥'}</div>
          <div>
            <b>${d.title}</b>
            <span>${d.id}</span>
          </div>
        </div>
      </td>
      <td><span class="tag" style="font-size:10px">${d.type}</span></td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${d.period}</td>
      <td style="font-family:'JetBrains Mono',monospace;font-weight:600">${d.size}</td>
      <td><span class="tag blue" style="font-size:10px">${d.location}</span></td>
      <td><span style="font-size:12px;font-weight:500">${d.owner}</span></td>
      <td><span class="tag ${d.access === 'Approval required' ? 'amber' : 'green'}" style="font-size:10px">${d.access}</span></td>
      <td style="font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--brand-green)">${d.reuseCount}×</td>
      <td><a class="btn ghost small" href="dataset.html?id=${encodeURIComponent(d.id)}">Details</a></td>
    </tr>`).join('');
  }

  ['repoSearch', 'typeFilter', 'accessFilter'].forEach(id => 
    document.getElementById(id).addEventListener(id === 'repoSearch' ? 'input' : 'change', render)
  );
  render();
});
