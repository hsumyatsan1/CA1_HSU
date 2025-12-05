const db = require('../db');

module.exports = {
  getAll: (cb) => {
    db.query('SELECT * FROM products ORDER BY id DESC', (err, results) => {
      if (err) return cb(err);
      cb(null, results);
    });
  },

  search: (term, cb) => {
    const likeTerm = `%${term}%`;
    db.query('SELECT * FROM products WHERE productName LIKE ? ORDER BY id DESC', [likeTerm], (err, results) => {
      if (err) return cb(err);
      cb(null, results);
    });
  },

  getById: (id, cb) => {
    db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
      if (err) return cb(err);
      cb(null, results[0]);
    });
  },

  create: (data, cb) => {
    const sql = 'INSERT INTO products (productName, price, quantity, image) VALUES (?, ?, ?, ?)';
    const params = [data.productName, data.price, data.quantity || 0, data.image || null];
    db.query(sql, params, (err, result) => cb(err, result));
  },

  update: (id, data, cb) => {
    const sql = 'UPDATE products SET productName = ?, price = ?, quantity = ?, image = ? WHERE id = ?';
    const params = [data.productName, data.price, data.quantity || 0, data.image || null, id];
    db.query(sql, params, (err, result) => cb(err, result));
  },

  delete: (id, cb) => {
    db.query('DELETE FROM products WHERE id = ?', [id], (err, result) => cb(err, result));
  }
};
