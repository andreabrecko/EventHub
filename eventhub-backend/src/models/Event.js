// File: src/models/Event.js
// Modello Event: incapsula le query verso PostgreSQL per la gestione eventi.

const { pool } = require('../config/db');

// Recupera dinamicamente la colonna proprietario (user_id o creator_id)
async function getOwnerColumn() {
  try {
    const colsRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'events'");
    const cols = colsRes.rows.map(r => String(r.column_name).toLowerCase());
    return cols.includes('user_id') ? 'user_id' : (cols.includes('creator_id') ? 'creator_id' : 'user_id');
  } catch (_) {
    return 'user_id';
  }
}

async function findById(id) {
  const q = `
    SELECT e.*, 
           COALESCE(p.photos, '[]'::json) AS photos
    FROM Events e
    LEFT JOIN LATERAL (
      SELECT json_agg(ep.file_path) AS photos
      FROM EventPhotos ep
      WHERE ep.event_id = e.id
    ) p ON TRUE
    WHERE e.id = $1
  `;
  const r = await pool.query(q, [id]);
  return r.rows[0] || null;
}

async function create({ title, description, event_date, location, capacity, category_id, user_id, min_participants = null, max_participants = null }) {
  const q = `
    INSERT INTO Events (title, description, event_date, location, capacity, category_id, user_id, min_participants, max_participants)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `;
  const params = [title, description, event_date, location, capacity, category_id, user_id, min_participants, max_participants];
  const r = await pool.query(q, params);
  return r.rows[0];
}

async function listPublic({ category_id, location, date }) {
  const ownerCol = await getOwnerColumn();
  let query = `
    SELECT 
      e.*, 
      u.username as creator_username, 
      c.name as category_name,
      (SELECT COUNT(*) FROM Registrations r WHERE r.event_id = e.id) as current_registrations,
      COALESCE(p.photos, '[]'::json) AS photos
    FROM Events e
    JOIN Users u ON e.${ownerCol} = u.id
    LEFT JOIN Categories c ON e.category_id = c.id
    LEFT JOIN LATERAL (
      SELECT json_agg(ep.file_path) AS photos
      FROM EventPhotos ep
      WHERE ep.event_id = e.id
    ) p ON TRUE
    WHERE e.is_approved = TRUE
  `;
  const params = [];
  let paramIndex = 1;
  if (category_id) { query += ` AND e.category_id = $${paramIndex++}`; params.push(category_id); }
  if (location) { query += ` AND LOWER(e.location) LIKE LOWER($${paramIndex++})`; params.push(`%${location}%`); }
  if (date) { query += ` AND DATE(e.event_date) = DATE($${paramIndex++})`; params.push(date); }
  query += ` ORDER BY e.event_date ASC`;
  const r = await pool.query(query, params);
  return r.rows;
}

async function updatePartial({ id, userId, updates }) {
  const ownerCol = await getOwnerColumn();
  const checkQuery = `SELECT ${ownerCol} AS owner_id FROM Events WHERE id = $1`;
  const checkResult = await pool.query(checkQuery, [id]);
  if (checkResult.rows.length === 0) return { notFound: true };
  if (checkResult.rows[0].owner_id !== userId) return { unauthorized: true };

  let setClauses = [];
  let updateParams = [];
  let paramIndex = 1;
  const fields = ['title','description','event_date','location','capacity','category_id','min_participants','max_participants','is_approved'];
  for (const f of fields) {
    if (updates[f] !== undefined) { setClauses.push(`${f} = $${paramIndex++}`); updateParams.push(updates[f]); }
  }
  if (setClauses.length === 0) {
    const r = await pool.query('SELECT * FROM Events WHERE id = $1', [id]);
    return { updated: r.rows[0] };
  }
  const updateQuery = `UPDATE Events SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  updateParams.push(id);
  const result = await pool.query(updateQuery, updateParams);
  return { updated: result.rows[0] };
}

async function remove({ id, userId }) {
  const ownerCol = await getOwnerColumn();
  const checkQuery = `SELECT ${ownerCol} AS owner_id FROM Events WHERE id = $1`;
  const checkResult = await pool.query(checkQuery, [id]);
  if (checkResult.rows.length === 0) return { notFound: true };
  if (checkResult.rows[0].owner_id !== userId) return { unauthorized: true };
  const del = await pool.query('DELETE FROM Events WHERE id = $1 RETURNING *', [id]);
  return { deleted: del.rows[0] || null };
}

async function countRegistrations(eventId) {
  const r = await pool.query('SELECT COUNT(*) FROM Registrations WHERE event_id = $1', [eventId]);
  return parseInt(r.rows[0].count, 10);
}

async function isUserRegistered({ eventId, userId }) {
  const r = await pool.query('SELECT 1 FROM Registrations WHERE user_id = $1 AND event_id = $2', [userId, eventId]);
  return r.rows.length > 0;
}

async function register({ eventId, userId }) {
  const r = await pool.query('INSERT INTO Registrations (user_id, event_id) VALUES ($1,$2) RETURNING *', [userId, eventId]);
  return r.rows[0];
}

async function unregister({ eventId, userId }) {
  const r = await pool.query('DELETE FROM Registrations WHERE user_id = $1 AND event_id = $2 RETURNING *', [userId, eventId]);
  return r.rows[0] || null;
}

async function participants(eventId) {
  const q = `
    SELECT u.id, u.username
    FROM Registrations r
    JOIN Users u ON u.id = r.user_id
    WHERE r.event_id = $1
    ORDER BY u.username ASC
  `;
  const r = await pool.query(q, [eventId]);
  return r.rows;
}

async function listByUser(userId) {
  const q = `
    SELECT e.*, COALESCE(p.photos, '[]'::json) AS photos
    FROM Events e
    LEFT JOIN LATERAL (
      SELECT json_agg(ep.file_path) AS photos
      FROM EventPhotos ep
      WHERE ep.event_id = e.id
    ) p ON TRUE
    WHERE e.user_id = $1
    ORDER BY e.created_at DESC
  `;
  const r = await pool.query(q, [userId]);
  return r.rows;
}

async function listRegistrationsByUser(userId) {
  const q = `
    SELECT e.*, COALESCE(p.photos, '[]'::json) AS photos, r.created_at AS registered_at
    FROM Registrations r
    JOIN Events e ON r.event_id = e.id
    LEFT JOIN LATERAL (
      SELECT json_agg(ep.file_path) AS photos
      FROM EventPhotos ep
      WHERE ep.event_id = e.id
    ) p ON TRUE
    WHERE r.user_id = $1
    ORDER BY r.created_at DESC
  `;
  const r = await pool.query(q, [userId]);
  return r.rows;
}

module.exports = {
  getOwnerColumn,
  findById,
  create,
  listPublic,
  updatePartial,
  remove,
  countRegistrations,
  isUserRegistered,
  register,
  unregister,
  participants,
  listByUser,
  listRegistrationsByUser,
};