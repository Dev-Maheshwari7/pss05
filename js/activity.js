window.addEventListener('DOMContentLoaded',()=>{
  const D = DDAS_DATA;
  const preventedCount = D.activities.filter(a => a.type === 'prevented').length;
  const overridesCount = D.activities.filter(a => a.type === 'override').length;
  const requestsCount = D.activities.filter(a => a.type === 'request').length;
  const indexedCount = D.activities.filter(a => a.type === 'indexed').length;

  document.getElementById('activityMetrics').innerHTML = [
    ddas.metric('Events Today', '1,284', 'Across 16 active nodes'),
    ddas.metric('Duplicates Prevented', preventedCount + ' recent', '829 lifetime recorded'),
    ddas.metric('Pending Access Requests', requestsCount, 'Median approval: 18m'),
    ddas.metric('User Override Rate', '3.8%', overridesCount + ' logged in audit stream')
  ].join('');

  // Update counts
  if(document.getElementById('countAll')) document.getElementById('countAll').textContent = D.activities.length;
  if(document.getElementById('countPrevented')) document.getElementById('countPrevented').textContent = preventedCount;
  if(document.getElementById('countRequest')) document.getElementById('countRequest').textContent = requestsCount;
  if(document.getElementById('countIndexed')) document.getElementById('countIndexed').textContent = indexedCount;
  if(document.getElementById('countOverride')) document.getElementById('countOverride').textContent = overridesCount;

  const list = document.getElementById('auditList');
  let currentType = 'all';

  function getTypeBadge(type){
    switch(type){
      case 'prevented':
        return `<span class="tag green">${ddas.icon('zap')} PREVENTED</span>`;
      case 'request':
        return `<span class="tag blue">${ddas.icon('arrow-up-right')} REQUEST</span>`;
      case 'indexed':
        return `<span class="tag purple">${ddas.icon('plus')} INDEXED</span>`;
      case 'override':
        return `<span class="tag amber">${ddas.icon('arrow-down')} OVERRIDE</span>`;
      default:
        return `<span class="tag">${type.toUpperCase()}</span>`;
    }
  }

  function render(){
    const searchVal = (document.getElementById('auditSearch')?.value || '').toLowerCase().trim();
    const rows = D.activities.filter(a => {
      const matchType = currentType === 'all' || a.type === currentType;
      const matchSearch = !searchVal || [a.title, a.detail, a.user, a.saved, a.type].join(' ').toLowerCase().includes(searchVal);
      return matchType && matchSearch;
    });

    if(rows.length === 0){
      list.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--ink-400);">No audit events matching criteria.</td></tr>`;
      return;
    }

    list.innerHTML = rows.map(a => {
      const initials = a.user === 'System' ? 'SY' : a.user === 'Admin' ? 'AD' : a.user === 'Indexer' ? 'IX' : a.user.split(' ').map(x=>x[0]).join('').substring(0,2);
      return `<tr class="audit-tr">
        <td>${getTypeBadge(a.type)}</td>
        <td>
          <b style="color:var(--ink-900);font-size:13px;display:block;">${a.title}</b>
          <p style="font-size:12px;color:var(--ink-500);margin-top:2px;">${a.detail}</p>
        </td>
        <td>
          <div class="audit-user-cell">
            <div class="mini-avatar">${initials}</div>
            <span style="font-weight:600;font-size:12.5px;color:var(--ink-800);">${a.user}</span>
          </div>
        </td>
        <td>
          ${a.saved !== '—' && a.saved !== '0 GB' 
            ? `<span class="tag green" style="font-weight:700;">+${a.saved} saved</span>` 
            : a.saved === '0 GB'
            ? `<span class="tag amber">0 GB (Bypass)</span>`
            : `<span class="tag" style="color:var(--ink-400);">Catalog log</span>`
          }
        </td>
        <td style="text-align:right;">
          <span style="font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--ink-500);">${a.time} ago</span>
        </td>
      </tr>`;
    }).join('');
  }

  document.querySelectorAll('.activity-filter').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.activity-filter').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      currentType = b.dataset.type;
      render();
    };
  });

  document.getElementById('auditSearch')?.addEventListener('input', render);
  render();

  document.getElementById('exportBtn').onclick = () => {
    const rows = [
      ['type', 'title', 'detail', 'user', 'time', 'saved'],
      ...D.activities.map(a => [a.type, a.title, a.detail, a.user, a.time, a.saved])
    ];
    const csv = rows.map(r => r.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ddas-audit-log.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    ddas.toast('Audit CSV exported successfully');
  };
});
