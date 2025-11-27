const db = require('../db');

module.exports = {
    add(u, cb) {
        db.query("INSERT INTO users SET ?", u, cb);
    },
    findByEmail(email, cb) {
        db.query("SELECT * FROM users WHERE email=?", [email], (err, rows) =>
            cb(err, rows[0]));
    }
};
