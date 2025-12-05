const User = require('../models/User');

function toPromise(fn, ...args) {
  return new Promise((resolve, reject) => {
    if (typeof fn !== 'function') return reject(new Error('Not a function'));
    fn(...args, (err, result) => err ? reject(err) : resolve(result));
  });
}

module.exports = {
  // render registration page
  registerForm: (req, res) => {
    const messages = [...req.flash('error'), ...req.flash('success')];
    res.render('register', { messages, user: req.session.user });
  },

  // register new user
  register: async (req, res) => {
    try {
      const { username, email, password, address, contact } = req.body;
      if (!username || !email || !password) {
        req.flash('error', 'Username, email and password required');
        return res.redirect('/register');
      }
      await toPromise(User.add, {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        address: address || '',
        contact: contact || '',
        role: 'user'
      });
      req.flash('success', 'Registered — please login');
      return res.redirect('/login');
    } catch (err) {
      console.error('Register error', err);
      req.flash('error', 'Registration failed');
      return res.redirect('/register');
    }
  },

  // render login page
  loginForm: (req, res) => {
    const messages = [...req.flash('error'), ...req.flash('success')];
    res.render('login', { messages, user: req.session.user });
  },

  // login user
  login: (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        req.flash('error', 'Email and password required');
        return res.redirect('/login');
      }
      User.findByEmail(email.toLowerCase(), (err, user) => {
        if (err || !user) {
          req.flash('error', 'Invalid credentials');
          return res.redirect('/login');
        }
        if (user.password !== password) {
          req.flash('error', 'Invalid credentials');
          return res.redirect('/login');
        }
        const role = (user.role || 'user').toLowerCase();
        req.session.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          role
        };
        // ensure session saved before redirect to avoid redirect loop
        req.session.save(saveErr => {
          if (saveErr) {
            console.error('Session save error', saveErr);
            req.flash('error', 'Login failed (session)');
            return res.redirect('/login');
          }
          req.flash('success', `Welcome ${user.username}`);
          // admin -> inventory, user -> shopping
          if (role === 'admin') return res.redirect('/inventory');
          return res.redirect('/shopping');
        });
      });
    } catch (err) {
      console.error('Login error', err);
      req.flash('error', 'Login failed');
      return res.redirect('/login');
    }
  },

  // admin: list all users (ensure messages passed to view)
  list: (req, res) => {
    User.getAll((err, users) => {
      if (err) {
        req.flash('error', 'Failed to load users');
        return res.redirect('/inventory');
      }
      res.render('users', { users: users || [], user: req.session.user, messages: [...req.flash('success'), ...req.flash('error')] });
    });
  },

  // admin: delete user
  delete: (req, res) => {
    const id = req.params.id;
    User.delete(id, (err) => {
      if (err) req.flash('error', 'Failed to remove user');
      else req.flash('success', 'User removed');
      return res.redirect('/users');
    });
  }
};
