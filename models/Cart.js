const db = require('../db');

module.exports = {
  getByUser: (userId, cb) => {
    db.query('SELECT * FROM cart_items WHERE user_id = ?', [userId], (err, results) => {
      if (err) return cb(err);
      cb(null, results);
    });
  },

  getItem: (userId, productId, cb) => {
    db.query('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId], (err, results) => {
      if (err) return cb(err);
      cb(null, results[0]);
    });
  },

  addItem: (userId, item, cb) => {
    const { productId, productName, qty, price } = item;
    db.query('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId], (err, results) => {
      if (err) return cb(err);
      if (results && results.length > 0) {
        // update qty
        const newQty = results[0].quantity + qty;
        db.query('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?', [newQty, userId, productId], cb);
      } else {
        // insert new
        const sql = 'INSERT INTO cart_items (user_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [userId, productId, productName, qty, price], cb);
      }
    });
  },

  updateItem: (userId, productId, data, cb) => {
    const sql = 'UPDATE cart_items SET quantity = ?, price = ? WHERE user_id = ? AND product_id = ?';
    db.query(sql, [data.qty, data.price, userId, productId], cb);
  },

  removeItem: (userId, productId, cb) => {
    db.query('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId], cb);
  },

  clear: (userId, cb) => {
    db.query('DELETE FROM cart_items WHERE user_id = ?', [userId], cb);
  }
};
