const db = require('../db');

class Cart {
  static async getByUserId(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT ci.id, ci.user_id, ci.product_id, ci.quantity, 
               p.id as product_id, p.productName as name, p.price, p.image 
        FROM cart_items ci 
        JOIN products p ON ci.product_id = p.id 
        WHERE ci.user_id = ?
      `;
      db.query(query, [userId], (err, results) => {
        if (err) {
          console.error('Cart.getByUserId error:', err);
          reject(err);
        } else {
          resolve(results || []);
        }
      });
    });
  }

  static async addItem(userId, productId, quantity) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO cart_items (user_id, product_id, quantity) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + ?
      `;
      db.query(query, [userId, productId, quantity, quantity], (err, results) => {
        if (err) reject(err);
        else resolve(results.insertId || true);
      });
    });
  }

  static async updateItem(userId, productId, quantity) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE cart_items 
        SET quantity = ? 
        WHERE user_id = ? AND product_id = ?
      `;
      db.query(query, [quantity, userId, productId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static async removeItem(userId, productId) {
    return new Promise((resolve, reject) => {
      const query = `
        DELETE FROM cart_items 
        WHERE user_id = ? AND product_id = ?
      `;
      db.query(query, [userId, productId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static async clearByUserId(userId) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM cart_items WHERE user_id = ?`;
      db.query(query, [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Cart;
