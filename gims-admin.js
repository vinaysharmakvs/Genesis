(() => {
  const loginPanel = document.querySelector('[data-login-panel]');
  const loginForm = document.querySelector('[data-login-form]');
  const loginMessage = document.querySelector('[data-login-message]');
  const dashboard = document.querySelector('[data-dashboard]');
  const rowsElement = document.querySelector('[data-registration-rows]');
  const paymentAttemptRows = document.querySelector('[data-payment-attempt-rows]');
  const attemptCount = document.querySelector('[data-attempt-count]');
  const attemptEmptyState = document.querySelector('[data-attempt-empty-state]');
  const emptyState = document.querySelector('[data-empty-state]');
  const resultCount = document.querySelector('[data-result-count]');
  const syncNote = document.querySelector('[data-sync-note]');
  const searchInput = document.querySelector('[data-search]');
  const filterElements = [...document.querySelectorAll('[data-filter]')];
  const detailsDialog = document.querySelector('[data-details-dialog]');
  const detailsContent = document.querySelector('[data-details-content]');
  let securityCode = '';
  let registrations = [];
  let transactions = [];
  let events = [];
  let paymentAttempts = [];

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const display = (value, fallback = '—') => value === null || value === undefined || value === '' ? fallback : escapeHtml(value);
  const formatDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
  const money = (amount, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount || 0));
  const statusClass = (value) => /verified|confirmed|not_required/i.test(value || '') ? 'success' : /pending|created/i.test(value || '') ? 'warn' : '';

  const loadDashboard = async () => {
    loginMessage.textContent = '';
    const submitButton = loginForm.querySelector('button');
    submitButton.disabled = true;
    submitButton.textContent = 'Loading…';
    try {
      const response = await fetch('/api/admin/gims-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: securityCode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load dashboard.');
      registrations = Array.isArray(data.registrations) ? data.registrations : [];
      transactions = Array.isArray(data.transactions) ? data.transactions : [];
      events = Array.isArray(data.events) ? data.events : [];
      paymentAttempts = Array.isArray(data.paymentAttempts) ? data.paymentAttempts : [];
      loginPanel.hidden = true;
      dashboard.hidden = false;
      syncNote.textContent = `Updated ${formatDate(data.generatedAt)} · ${registrations.length} confirmed registrations · ${paymentAttempts.length} unfinished payment attempts`;
      populateFilters();
      updateStats();
      renderRows();
      renderPaymentAttempts();
    } catch (error) {
      loginMessage.textContent = error.message;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Open Dashboard';
    }
  };

  const populateFilters = () => {
    filterElements.forEach((select) => {
      const key = select.dataset.filter;
      if (key === 'qualified_stage_1') return;
      const current = select.value;
      const first = select.options[0];
      const values = [...new Set(registrations.map((row) => row[key]).filter(Boolean))].sort();
      select.replaceChildren(first, ...values.map((value) => new Option(value.replaceAll('_', ' '), value)));
      select.value = current;
    });
  };

  const updateStats = () => {
    const paidTransactions = transactions.filter((item) => item.status === 'payment_verified');
    const revenue = paidTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0) / 100;
    const stats = {
      total: registrations.length,
      confirmed: registrations.filter((item) => item.registration_status === 'confirmed').length,
      awaiting: paymentAttempts.length,
      qualified: registrations.filter((item) => item.qualified_stage_1 === true).length,
      paid: paidTransactions.length,
      revenue: money(revenue)
    };
    Object.entries(stats).forEach(([key, value]) => { document.querySelector(`[data-stat="${key}"]`).textContent = value; });
  };

  const filteredRegistrations = () => {
    const query = searchInput.value.trim().toLowerCase();
    return registrations.filter((row) => {
      const searchText = [row.registration_id, row.student_name, row.parent_name, row.mobile, row.email, row.school_name, row.city, row.state].join(' ').toLowerCase();
      if (query && !searchText.includes(query)) return false;
      return filterElements.every((select) => {
        if (!select.value) return true;
        if (select.dataset.filter === 'qualified_stage_1') return String(row.qualified_stage_1) === select.value;
        return String(row[select.dataset.filter] || '') === select.value;
      });
    });
  };

  const renderRows = () => {
    const filtered = filteredRegistrations();
    resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'record' : 'records'}`;
    emptyState.hidden = filtered.length !== 0;
    rowsElement.innerHTML = filtered.map((row) => `
      <tr>
        <td><span class="cell-title">${display(row.registration_id)}</span><span class="cell-note">${formatDate(row.created_at)}</span></td>
        <td><span class="cell-title">${display(row.student_name)}</span><span class="cell-note">${display(row.grade)}</span></td>
        <td><span class="cell-title">${display(row.parent_name)}</span><span class="cell-note">${display(row.mobile)} · ${display(row.email)}</span></td>
        <td><span class="cell-title">${display(row.school_name)}</span><span class="cell-note">${display(row.present_board)} · ${display(row.city)}</span></td>
        <td><span class="cell-title">${display(row.test_center)}</span><span class="cell-note">${display(row.test_mode)}</span></td>
        <td><span class="status ${row.qualified_stage_1 ? 'success' : ''}">${row.qualified_stage_1 ? 'Yes' : 'No'}</span></td>
        <td><span class="status ${statusClass(row.payment_status)}">${display(row.payment_status).replaceAll('_', ' ')}</span><span class="cell-note">${money(row.fee_amount, row.currency)}</span></td>
        <td><button class="view-button" type="button" data-view="${escapeHtml(row.registration_id)}">View</button></td>
      </tr>`).join('');
  };

  const renderPaymentAttempts = () => {
    if (!paymentAttemptRows) return;
    attemptCount.textContent = `${paymentAttempts.length} ${paymentAttempts.length === 1 ? 'attempt' : 'attempts'}`;
    attemptEmptyState.hidden = paymentAttempts.length !== 0;
    paymentAttemptRows.innerHTML = paymentAttempts.map((attempt) => `
      <tr>
        <td><span class="cell-title">Payment started</span><span class="cell-note">${formatDate(attempt.created_at)}</span></td>
        <td><span class="cell-title">${display(attempt.student_name)}</span></td>
        <td><span class="cell-title">${display(attempt.mobile)}</span><span class="cell-note">${display(attempt.email)}</span></td>
        <td><span class="cell-title">${money(attempt.fee_amount, attempt.currency)}</span></td>
        <td><span class="status warn">${display(attempt.payment_status).replaceAll('_', ' ')}</span></td>
      </tr>`).join('');
  };

  const detailItem = (label, value) => `<div class="detail-item"><span>${escapeHtml(label)}</span><strong>${display(value)}</strong></div>`;
  const showDetails = (registrationId) => {
    const row = registrations.find((item) => item.registration_id === registrationId);
    if (!row) return;
    const paymentRows = transactions.filter((item) => item.registration_id === registrationId);
    const eventRows = events.filter((item) => item.registration_id === registrationId);
    detailsContent.innerHTML = `
      <div class="detail-hero"><p class="eyebrow">${display(row.registration_id)}</p><h2>${display(row.student_name)}</h2><p>Registered ${formatDate(row.created_at)}</p></div>
      <div class="detail-body">
        <div class="detail-grid">
          ${detailItem('Parent / guardian', row.parent_name)}${detailItem('Mobile', row.mobile)}${detailItem('Email', row.email)}
          ${detailItem('Class', row.grade)}${detailItem('Present board', row.present_board)}${detailItem('School', row.school_name)}
          ${detailItem('City', row.city)}${detailItem('State', row.state)}${detailItem('Test center', row.test_center)}
          ${detailItem('Exam mode', row.test_mode)}${detailItem('Genesis student', row.genesis_student ? 'Yes' : 'No')}${detailItem('Stage 1 through school', row.qualified_stage_1 ? 'Yes' : 'No')}${detailItem('Registration fee', money(row.fee_amount, row.currency))}
          ${detailItem('Registration status', String(row.registration_status || '').replaceAll('_', ' '))}${detailItem('Payment status', String(row.payment_status || '').replaceAll('_', ' '))}${detailItem('Verified', formatDate(row.verified_at))}
          ${detailItem('Razorpay order ID', row.razorpay_order_id)}${detailItem('User ID', row.user_id)}${detailItem('User source', row.user_source)}
        </div>
        <section class="detail-section"><h3>Payment transactions</h3><div class="history-list">${paymentRows.length ? paymentRows.map((item) => `<div class="history-item"><div><strong>${display(item.status).replaceAll('_', ' ')}</strong><small>${display(item.razorpay_payment_id, 'No payment ID')}</small></div><div><strong>${money(Number(item.amount || 0) / 100, item.currency)}</strong><small>${formatDate(item.created_at)}</small></div><code>Order: ${display(item.razorpay_order_id)}</code></div>`).join('') : '<p class="detail-empty">No payment transaction required or recorded.</p>'}</div></section>
        <section class="detail-section"><h3>Payment event log</h3><div class="history-list">${eventRows.length ? eventRows.map((item) => `<div class="history-item"><div><strong>${display(item.event_type).replaceAll('_', ' ')}</strong><small>${formatDate(item.created_at)}</small></div><code>${escapeHtml(JSON.stringify(item.payload, null, 2))}</code></div>`).join('') : '<p class="detail-empty">No payment events recorded.</p>'}</div></section>
      </div>`;
    detailsDialog.showModal();
  };

  const exportCsv = () => {
    const fields = ['registration_id','student_name','parent_name','mobile','email','grade','school_name','present_board','city','state','test_center','test_mode','genesis_student','qualified_stage_1','fee_amount','currency','payment_status','registration_status','razorpay_order_id','created_at','verified_at'];
    const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [fields.join(','), ...filteredRegistrations().map((row) => fields.map((field) => quote(row[field])).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `gims-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  loginForm.addEventListener('submit', (event) => { event.preventDefault(); securityCode = loginForm.securityCode.value; loadDashboard(); });
  document.querySelector('[data-refresh]').addEventListener('click', loadDashboard);
  document.querySelector('[data-export]').addEventListener('click', exportCsv);
  document.querySelector('[data-logout]').addEventListener('click', () => { securityCode = ''; registrations = []; transactions = []; events = []; paymentAttempts = []; dashboard.hidden = true; loginPanel.hidden = false; loginForm.reset(); loginForm.securityCode.focus(); });
  document.querySelector('[data-dialog-close]').addEventListener('click', () => detailsDialog.close());
  detailsDialog.addEventListener('click', (event) => { if (event.target === detailsDialog) detailsDialog.close(); });
  rowsElement.addEventListener('click', (event) => { const button = event.target.closest('[data-view]'); if (button) showDetails(button.dataset.view); });
  searchInput.addEventListener('input', renderRows);
  filterElements.forEach((select) => select.addEventListener('change', renderRows));
})();
