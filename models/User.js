const db = require('../db');

module.exports = {
  getAll: (cb) => {
    db.query('SELECT id, username, email, contact, role FROM users', (err, results) => {
      if (err) return cb(err);
      cb(null, results);
    });
  },

  getById: (id, cb) => {
    db.query('SELECT id, username, email, contact, role FROM users WHERE id = ?', [id], (err, results) => {
      if (err) return cb(err);
      cb(null, results[0]);
    });
  },

  findByEmail: (email, cb) => {
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
      if (err) return cb(err);
      cb(null, results[0]);
    });
  },

  add: (data, cb) => {
    const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, ?, ?, ?, ?)';
    const params = [data.username, data.email, data.password, data.address || null, data.contact || null, data.role || 'user'];
    db.query(sql, params, (err, result) => cb(err, result));
  },

  update: (id, data, cb) => {
    const sql = 'UPDATE users SET username = ?, email = ?, contact = ?, role = ? WHERE id = ?';
    const params = [data.username, data.email, data.contact || null, data.role || 'user', id];
    db.query(sql, params, (err, result) => cb(err, result));
  },

  delete: (id, cb) => {
    db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => cb(err, result));
  }
};
