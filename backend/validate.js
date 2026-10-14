// Input validation for a research opportunity.
// Returns { errors: [...], clean: {...} }  -> if errors is empty, "clean" is safe to store.

const TEXT_FIELDS = {
  title: 255,
  description: 5000,
  research_area: 100,
  faculty_name: 100,
  department: 100,
  required_skills: 500
};

function isRealDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00Z');
  // round-trip check catches things like 2026-02-31
  return !isNaN(d) && d.toISOString().slice(0, 10) === str;
}

function validateOpportunity(data) {
  const errors = [];
  const clean = {};

  // 1) text fields: required, must be non-empty strings, max length
  for (const [field, max] of Object.entries(TEXT_FIELDS)) {
    const value = data[field];
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${field} is required and must be a non-empty string`);
    } else if (value.trim().length > max) {
      errors.push(`${field} must be at most ${max} characters`);
    } else {
      clean[field] = value.trim();
    }
  }

  // 2) available_positions: whole number >= 1
  const raw = data.available_positions;
  const pos = Number(raw);
  if (raw === undefined || raw === null || raw === '' || !Number.isInteger(pos) || pos < 1) {
    errors.push('available_positions is required and must be a whole number of at least 1');
  } else {
    clean.available_positions = pos;
  }

  // 3) application_deadline: valid YYYY-MM-DD
  if (!isRealDate(data.application_deadline)) {
    errors.push('application_deadline is required and must be a valid date in YYYY-MM-DD format');
  } else {
    clean.application_deadline = data.application_deadline;
  }

  // 4) status: Open or Closed (defaults to Open when missing)
  const status = data.status === undefined ? 'Open' : data.status;
  if (status !== 'Open' && status !== 'Closed') {
    errors.push("status must be either 'Open' or 'Closed'");
  } else {
    clean.status = status;
  }

  return { errors, clean };
}

module.exports = { validateOpportunity };
