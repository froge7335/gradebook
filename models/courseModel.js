const pool = require('../config/db');

exports.getByUser = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT id, code, weight FROM courses WHERE user_id = ? ORDER BY created_at DESC', 
    [userId]
  );
  return rows;
};

exports.getByIdAndUser = async (id, userId) => {
  const [rows] = await pool.execute(
    'SELECT id, code, weight FROM courses WHERE id = ? AND user_id = ? LIMIT 1', 
    [id, userId]
  );
  return rows[0];
};

exports.create = async (userId, code, weight) => {
  const [res] = await pool.execute(
    'INSERT INTO courses (user_id, code, weight) VALUES (?, ?, ?)', 
    [userId, code, weight]
  );
  return res.insertId;
};

exports.update = async (id, userId, code, weight) => {
  await pool.execute(
    'UPDATE courses SET code = ?, weight = ? WHERE id = ? AND user_id = ?', 
    [code, weight, id, userId]
  );
};

exports.delete = async (id, userId) => {
  await pool.execute(
    'DELETE FROM courses WHERE id = ? AND user_id = ?', 
    [id, userId]
  );
};