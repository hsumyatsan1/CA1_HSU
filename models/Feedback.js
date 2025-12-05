const db = require('../db');

module.exports = {
  getAll: (cb) => {
    db.query('SELECT f.*, u.username FROM feedback f JOIN users u ON f.user_id = u.id ORDER BY f.created_at DESC', (err, results) => {
      if (err) return cb(err);
      cb(null, results);
    });
  },

  getById: (id, cb) => {
    db.query('SELECT * FROM feedback WHERE id = ?', [id], (err, results) => {
      if (err) return cb(err);
      cb(null, results[0]);
    });
  },

  add: (data, cb) => {
    const sql = 'INSERT INTO feedback (user_id, title, comment, rating, created_at) VALUES (?, ?, ?, ?, NOW())';
    const params = [data.userId, data.title, data.comment, data.rating];
    db.query(sql, params, (err, result) => cb(err, result));
  },

  delete: (id, cb) => {
    db.query('DELETE FROM feedback WHERE id = ?', [id], (err, result) => cb(err, result));
  }
};
