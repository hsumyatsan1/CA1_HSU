const db = require('../db');

module.exports = {
  getAll: (cb) => {
    db.query('SELECT * FROM payments ORDER BY created_at DESC', (err, results) => {
      if (err) return cb(err);
      cb(null, results);
    });
  },

  getById: (id, cb) => {
    db.query('SELECT * FROM payments WHERE id = ?', [id], (err, results) => {
      if (err) return cb(err);
      cb(null, results[0]);
    });
  },

  getByUser: (userId, cb) => {
    db.query('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, results) => {
      if (err) return cb(err);
      cb(null, results);
    });
  },

  add: (data, cb) => {
    const sql = 'INSERT INTO payments (user_id, total, card_last_four, status, created_at) VALUES (?, ?, ?, ?, NOW())';
    const params = [data.userId, data.total, data.cardLastFour, data.status];
    db.query(sql, params, (err, result) => {
      if (err) return cb(err);
      cb(null, result.insertId);
    });
  }
};
