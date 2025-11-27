const User = require('../models/User');

module.exports = {
    registerForm: (req, res) => {
        res.render('register', { messages: req.flash('error') });
    },

    register: (req, res) => {
        User.add(req.body, () => res.redirect('/login'));
    },

    loginForm: (req, res) =>
        res.render('login', { errors: req.flash('error') }),

    login: (req, res) => {
        const { email, password } = req.body;
        User.findByEmail(email, (err, user) => {
            if (!user || user.password !== password) {
                req.flash('error', 'Invalid Email or Password');
                return res.redirect('/login');
            }
            req.session.user = user;
            res.redirect('/shopping');
        });
    }
};
