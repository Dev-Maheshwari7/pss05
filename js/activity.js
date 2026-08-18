window.addEventListener('DOMContentLoaded',()=>{
  const D = DDAS_DATA;
  const prevented = D.activities.filter(a => a.type === 'prevented').length;
  const overrides = D.activities.filter(a => a.type === 'override').length;
  const requests = D.activities.filter(a => a.type === 'request').length;

  document.getElementById('activityMetrics').innerHTML = [
    ddas.metric('Events Today', '1,284', 'Across 16 active nodes'),
    ddas.metric('Duplicates Prevented', prevented + ' recent', '829 lifetime recorded'),
    ddas.metric('Pending Access Requests', requests, 'Median approval: 18m'),
    ddas.metric('User Override Rate', '3.8%', overrides + ' logged in audit stream')
  ].join('');

  const list = document.getElementById('auditList');
  function render(type = 'all'){
    const rows = D.activities.filter(a => type === 'all' || a.type === type);
    list.innerHTML = rows.map(a => 
      `<div class="activity-item">
        <div class="activity-icon">${ddas.icon(a.icon)}</div>
        <div>
          <b>${a.title}</b>
          <p>${a.detail}</p>
        </div>
        <div class="audit-meta">
          <span style="font-weight:600;color:var(--ink-800)">${a.user}</span> &middot; 
          ${a.saved !== '—' ? `<span class="tag green" style="font-size:10px;padding:1px 5px">Saved ${a.saved}</span>` : '<span style="color:var(--ink-400);font-size:11px">Metadata log</span>'}
        </div>
        <time>${a.time} ago</time>
      </div>`
    ).join('');
  }

  document.querySelectorAll('.activity-filter').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.activity-filter').forEach(x => {
        x.style.background = '#ffffff';
        x.style.color = 'var(--ink-600)';
      });
      b.style.background = 'var(--brand-primary)';
      b.style.color = '#ffffff';
      render(b.dataset.type);
    };
  });
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
