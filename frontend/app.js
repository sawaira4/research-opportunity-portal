// Frontend for the Research Opportunity Portal.
// All data comes from the REST API - nothing is hard-coded here.

const API = '/api/opportunities';   // same server serves the page and the API

const listEl = document.getElementById('list');
const stateEl = document.getElementById('state');
const countEl = document.getElementById('count');
const filterEl = document.getElementById('filter');
const formEl = document.getElementById('form');
const dlgDetail = document.getElementById('dlg-detail');
const dlgForm = document.getElementById('dlg-form');
const dlgConfirm = document.getElementById('dlg-confirm');

const FORM_FIELDS = [
  'title', 'description', 'research_area', 'department', 'faculty_name',
  'required_skills', 'available_positions', 'application_deadline', 'status'
];

let opportunities = [];
let pendingDeleteId = null;

/* ---------- small helpers ---------- */

function toast(message, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'error' ? 'error' : '');
  t.textContent = message;          // textContent -> safe from HTML injection
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

// Wrapper around fetch: parses JSON and throws a readable Error on non-2xx
async function api(url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
  } catch (e) {
    throw new Error('Cannot reach the server. Is the backend running?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.errors ? ': ' + data.errors.join('; ') : '';
    const err = new Error((data.message || 'Request failed') + detail);
    err.status = res.status;
    err.errors = data.errors || [];
    throw err;
  }
  return data;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* ---------- list ---------- */

async function loadOpportunities() {
  stateEl.hidden = false;
  stateEl.textContent = 'Loading opportunities...';
  listEl.replaceChildren();
  try {
    opportunities = await api(API);
    render();
  } catch (e) {
    stateEl.textContent = e.message;
    toast(e.message, 'error');
  }
}

function render() {
  const filter = filterEl.value;
  const shown = opportunities.filter((o) => filter === 'All' || o.status === filter);
  countEl.textContent = `${shown.length} of ${opportunities.length} shown`;
  listEl.replaceChildren();

  if (shown.length === 0) {
    stateEl.hidden = false;
    stateEl.textContent = opportunities.length === 0
      ? 'No opportunities posted yet. Use "Post an opportunity" to add the first one.'
      : 'No opportunities match this filter.';
    return;
  }
  stateEl.hidden = true;

  shown.forEach((o) => {
    const closed = o.status === 'Closed';
    const card = el('article', 'card' + (closed ? ' closed' : ''));

    const top = el('div', 'card-top');
    top.append(el('h3', '', o.title), el('span', 'badge' + (closed ? ' closed' : ''), o.status));

    const meta = el('p', 'meta',
      `${o.faculty_name} - ${o.department} - ${o.research_area} - ` +
      `${o.available_positions} position(s) - apply by ${o.application_deadline}`);

    const actions = el('div', 'card-actions');
    const mk = (label, handler, cls = '') => {
      const b = el('button', 'btn small ' + cls, label);
      b.addEventListener('click', handler);
      return b;
    };
    actions.append(
      mk('View details', () => showDetails(o.id)),
      mk('Edit', () => openForm(o))
    );
    // "Close opportunity" button only makes sense while it is still Open
    if (!closed) actions.append(mk('Close opportunity', () => closeOpportunity(o.id)));
    actions.append(mk('Delete', () => askDelete(o), 'danger'));

    card.append(top, meta, actions);
    listEl.append(card);
  });
}

/* ---------- details ---------- */

async function showDetails(id) {
  try {
    const o = await api(`${API}/${id}`);        // fetch fresh copy from the API
    document.getElementById('d-title').textContent = o.title;
    const body = document.getElementById('d-body');
    body.replaceChildren();

    const dl = el('dl', 'detail-grid');
    const rows = [
      ['Status', o.status],
      ['Faculty member', o.faculty_name],
      ['Department', o.department],
      ['Research area', o.research_area],
      ['Required skills', o.required_skills],
      ['Open positions', String(o.available_positions)],
      ['Deadline', o.application_deadline],
      ['Description', o.description]
    ];
    rows.forEach(([k, v]) => dl.append(el('dt', '', k), el('dd', '', v)));
    body.append(dl);
    dlgDetail.showModal();
  } catch (e) {
    toast(e.message, 'error');
    if (e.status === 404) loadOpportunities();  // it was deleted elsewhere
  }
}

/* ---------- create / edit ---------- */

function clearErrors() {
  formEl.querySelectorAll('.err').forEach((s) => (s.textContent = ''));
  formEl.querySelectorAll('.invalid').forEach((i) => i.classList.remove('invalid'));
}

function showFieldError(name, message) {
  const span = formEl.querySelector(`.err[data-for="${name}"]`);
  const input = document.getElementById(name);
  if (span) span.textContent = message;
  if (input) input.classList.add('invalid');
}

function openForm(o = null) {
  formEl.reset();
  clearErrors();
  document.getElementById('f-id').value = o ? o.id : '';
  document.getElementById('f-heading').textContent = o ? 'Edit opportunity' : 'Post an opportunity';
  if (o) FORM_FIELDS.forEach((f) => (document.getElementById(f).value = o[f]));
  dlgForm.showModal();
}

// Basic client-side validation (the server validates again)
function validateForm() {
  clearErrors();
  let ok = true;
  const names = {
    title: 'Research title', description: 'Description', research_area: 'Research area',
    department: 'Department', faculty_name: 'Faculty member', required_skills: 'Required skills',
    available_positions: 'Positions', application_deadline: 'Application deadline'
  };
  Object.entries(names).forEach(([f, label]) => {
    if (!document.getElementById(f).value.trim()) {
      showFieldError(f, `${label} is required.`);
      ok = false;
    }
  });
  const pos = document.getElementById('available_positions').value;
  if (pos && (!Number.isInteger(Number(pos)) || Number(pos) < 1)) {
    showFieldError('available_positions', 'Enter a whole number of 1 or more.');
    ok = false;
  }
  return ok;
}

formEl.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!validateForm()) {
    toast('Please fix the highlighted fields.', 'error');
    return;
  }

  const payload = {};
  FORM_FIELDS.forEach((f) => (payload[f] = document.getElementById(f).value.trim()));
  payload.available_positions = Number(payload.available_positions);

  const id = document.getElementById('f-id').value;
  const submitBtn = document.getElementById('f-submit');
  submitBtn.disabled = true;
  try {
    if (id) {
      await api(`${API}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      toast('Opportunity updated.');
    } else {
      await api(API, { method: 'POST', body: JSON.stringify(payload) });
      toast('Opportunity posted.');
    }
    dlgForm.close();
    await loadOpportunities();
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

/* ---------- close (Open -> Closed) ---------- */

async function closeOpportunity(id) {
  try {
    await api(`${API}/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'Closed' }) });
    toast('Opportunity closed.');
    await loadOpportunities();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ---------- delete ---------- */

function askDelete(o) {
  pendingDeleteId = o.id;
  document.getElementById('c-text').textContent =
    `"${o.title}" will be removed permanently. This cannot be undone.`;
  dlgConfirm.showModal();
}

document.getElementById('c-yes').addEventListener('click', async () => {
  dlgConfirm.close();
  try {
    await api(`${API}/${pendingDeleteId}`, { method: 'DELETE' });
    toast('Opportunity deleted.');
  } catch (e) {
    toast(e.message, 'error');          // e.g. 404 if it was already deleted
  }
  pendingDeleteId = null;
  await loadOpportunities();
});

/* ---------- wiring ---------- */

document.getElementById('btn-new').addEventListener('click', () => openForm());
filterEl.addEventListener('change', render);
document.querySelectorAll('[data-close]').forEach((b) =>
  b.addEventListener('click', () => b.closest('dialog').close()));

loadOpportunities();
