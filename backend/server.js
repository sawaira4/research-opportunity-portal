require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');
const { validateOpportunity } = require('./validate');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend from the same server -> one command runs everything
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const FIELDS = [
  'title', 'description', 'research_area', 'faculty_name', 'department',
  'required_skills', 'available_positions', 'application_deadline', 'status'
];

// Returns a positive integer id, or null if the :id param is not valid
function parseId(raw) {
  return /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : null;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM opportunities WHERE id = ?', [id]);
  return rows[0] || null;
}

// ---------- 1. CREATE ----------
app.post('/api/opportunities', async (req, res, next) => {
  try {
    const { errors, clean } = validateOpportunity(req.body || {});
    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    const [result] = await pool.query(
      `INSERT INTO opportunities (${FIELDS.join(', ')}) VALUES (?)`,
      [FIELDS.map((f) => clean[f])]
    );
    res.status(201).json(await findById(result.insertId));
  } catch (err) { next(err); }
});

// ---------- 2. READ ALL ----------
app.get('/api/opportunities', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM opportunities ORDER BY application_deadline ASC');
    res.status(200).json(rows);
  } catch (err) { next(err); }
});

// ---------- 3. READ ONE ----------
app.get('/api/opportunities/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID must be a positive whole number' });

    const row = await findById(id);
    if (!row) return res.status(404).json({ message: `Opportunity with id ${id} not found` });
    res.status(200).json(row);
  } catch (err) { next(err); }
});

// ---------- 4. UPDATE (also used to change status Open -> Closed) ----------
// Partial updates are allowed: send only the fields you want to change.
app.put('/api/opportunities/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID must be a positive whole number' });

    const body = req.body || {};
    const sent = FIELDS.filter((f) => body[f] !== undefined);
    if (sent.length === 0) {
      return res.status(400).json({ message: 'Send at least one field to update', allowed: FIELDS });
    }

    const existing = await findById(id);
    if (!existing) return res.status(404).json({ message: `Opportunity with id ${id} not found` });

    // merge old row + new values, then validate the final result
    const merged = { ...existing };
    sent.forEach((f) => { merged[f] = body[f]; });
    const { errors, clean } = validateOpportunity(merged);
    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    await pool.query(
      `UPDATE opportunities SET ${FIELDS.map((f) => f + ' = ?').join(', ')} WHERE id = ?`,
      [...FIELDS.map((f) => clean[f]), id]
    );
    res.status(200).json(await findById(id));
  } catch (err) { next(err); }
});

// ---------- 5. DELETE ----------
app.delete('/api/opportunities/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID must be a positive whole number' });

    const [result] = await pool.query('DELETE FROM opportunities WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: `Opportunity with id ${id} not found` });
    }
    res.status(200).json({ message: `Opportunity ${id} deleted successfully` });
  } catch (err) { next(err); }
});

// ---------- unknown API routes -> 404 ----------
app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found' }));

// ---------- error handler ----------
app.use((err, req, res, next) => {
  // malformed JSON body -> client's fault -> 400
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
