const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const ProductController = require('./controllers/ProductController');
const UserController = require('./controllers/UserController');
const CartController = require('./controllers/CartController');
const FeedbackController = require('./controllers/FeedbackController');
const PaymentController = require('./controllers/PaymentController');

const app = express();

// ensure images folder exists
const uploadsDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'supermarket-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));
app.use(flash());

// file upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2,9) + ext);
  }
});
const upload = multer({ storage });

// auth helpers
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error', 'Please login first');
    return res.redirect('/login');
  }
  next();
};
const requireAdmin = (req, res, next) => {
  if (!req.session.user || (req.session.user.role || '').toLowerCase() !== 'admin') {
    req.flash('error', 'Admin only');
    return res.redirect('/');
  }
  next();
};

// Routes

// Home: show public product listing (guests see no quantity or buy button)
app.get('/', async (req, res) => {
  if (req.session.user && (req.session.user.role || '').toLowerCase() === 'admin') {
    return res.redirect('/inventory');
  }
  return ProductController.publicList(req, res);
});

// auth
app.get('/register', UserController.registerForm);
app.post('/register', UserController.register);
app.get('/login', UserController.loginForm);
app.post('/login', UserController.login);
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// shopping & product
app.get('/shopping', requireAuth, ProductController.listForUser);
app.get('/product/:id', requireAuth, ProductController.detail);

// cart
app.get('/cart', requireAuth, CartController.listCartItems);
app.post('/add-to-cart/:id', requireAuth, CartController.addToCart);
app.post('/cart/update/:id', requireAuth, CartController.updateCartItem);
app.post('/cart/remove/:id', requireAuth, CartController.removeCartItem);
app.post('/cart/clear', requireAuth, CartController.clearCart);

// payment
app.get('/payment', requireAuth, PaymentController.show);
// accept legacy /payment and form action /payment/process
app.post('/payment', requireAuth, PaymentController.pay);
app.post('/payment/process', requireAuth, PaymentController.pay);
app.get('/receipt/:id', requireAuth, PaymentController.receipt);

// feedback
app.get('/feedback', requireAuth, FeedbackController.form);
app.post('/feedback', requireAuth, FeedbackController.submit);
app.get('/feedback/all', requireAuth, requireAdmin, FeedbackController.list);
app.get('/feedback/delete/:id', requireAuth, requireAdmin, FeedbackController.delete);

// admin inventory & product management
app.get('/inventory', requireAuth, requireAdmin, ProductController.inventory);
app.get('/addProduct', requireAuth, requireAdmin, ProductController.addForm);
app.post('/product', requireAuth, requireAdmin, upload.single('image'), ProductController.add);
app.get('/editProduct/:id', requireAuth, requireAdmin, ProductController.editForm);
app.post('/product/:id', requireAuth, requireAdmin, upload.single('image'), ProductController.update);
app.get('/deleteProduct/:id', requireAuth, requireAdmin, ProductController.delete);

// admin user management & payments
app.get('/users', requireAuth, requireAdmin, UserController.list);
app.get('/deleteUser/:id', requireAuth, requireAdmin, UserController.delete);
app.get('/payments', requireAuth, requireAdmin, PaymentController.list);

// search route (used by forms on index/shopping)
app.get('/search', (req, res) => {
  return ProductController.search(req, res);
});

// contact page (public + logged-in)
app.get('/contact', (req, res) => {
  const messages = [...req.flash('error'), ...req.flash('success')];
  res.render('contact', { user: req.session.user, messages });
});

// 404 + error handler
app.use((req, res) => res.status(404).render('404', { user: req.session.user }));
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  res.status(500).render('error', { user: req.session.user, error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

module.exports = app;
