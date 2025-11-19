const pool = require('../config/db');

exports.listByCourse = async (courseId) => {
  const [rows] = await pool.execute(
    'SELECT id, title, mark, weight FROM assignments WHERE course_id = ? ORDER BY created_at DESC', 
    [courseId]
  );
  return rows;
};

exports.create = async (courseId, title, mark, weight) => {
  const [res] = await pool.execute(
    'INSERT INTO assignments (course_id, title, mark, weight) VALUES (?, ?, ?, ?)', 
    [courseId, title, mark, weight]
  );
  return res.insertId;
};

exports.update = async (id, title, mark, weight) => {
  await pool.execute(
    'UPDATE assignments SET title = ?, mark = ?, weight = ? WHERE id = ?',
    [title, mark, weight, id]
  );
};

exports.delete = async (id) => {
  await pool.execute(
    'DELETE FROM assignments WHERE id = ?', 
    [id]
  );
};
