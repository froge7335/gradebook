const pool = require('../config/db');

exports.findByUsername = async (username) => {
  const [rows] = await pool.execute(
    'SELECT id, username, password_hash FROM users WHERE username = ?', 
    [username]
  );
  return rows[0];
};

exports.createUser = async (username, passwordHash) => {
  const [result] = await pool.execute(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)', 
    [username, passwordHash]
  );
  return result.insertId;
};
