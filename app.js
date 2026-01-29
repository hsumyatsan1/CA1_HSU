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
const PayPalController = require('./controllers/PayPalController');
const NetsService = require('./services/nets');

const app = express();

// ensure images folder exists
const uploadsDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
    cb(null, Date.now() + '-' + file.originalname);
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
  if (!req.session.user || req.session.user.role !== 'admin') {
    req.flash('error', 'Admin access required');
    return res.redirect('/');
  }
  next();
};

// Routes

// Home: show public product listing
app.get('/', ProductController.publicList);
app.get('/contact', (req, res) => {
  res.render('contact', { user: req.session.user, messages: req.flash('info') });
});

// auth
app.get('/register', UserController.registerForm);
app.post('/register', UserController.register);
app.get('/login', UserController.loginForm);
app.post('/login', UserController.login);
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// shopping & product
app.get('/shopping', requireAuth, ProductController.listForUser);
app.get('/product/:id', requireAuth, ProductController.detail);
app.get('/search', ProductController.search);

// admin inventory
app.get('/inventory', requireAuth, requireAdmin, ProductController.inventory);
app.get('/addProduct', requireAuth, requireAdmin, ProductController.addForm);
app.post('/product', requireAuth, requireAdmin, upload.single('image'), ProductController.add);
app.get('/editProduct/:id', requireAuth, requireAdmin, ProductController.editForm);
app.post('/product/:id', requireAuth, requireAdmin, upload.single('image'), ProductController.update);
app.get('/deleteProduct/:id', requireAuth, requireAdmin, ProductController.delete);

// cart
app.get('/cart', requireAuth, CartController.listCartItems);
app.post('/add-to-cart/:id', requireAuth, CartController.addToCart);
app.post('/cart/update/:id', requireAuth, CartController.updateCartItem);
app.post('/cart/remove/:id', requireAuth, CartController.removeCartItem);
app.post('/cart/clear', requireAuth, CartController.clearCart);

// payment
app.get('/payment', requireAuth, PaymentController.show);
app.post('/payment', requireAuth, PaymentController.pay);
app.get('/history', requireAuth, PaymentController.history);

// PayPal routes - MUST come after /payment routes
app.post('/paypal/create-order', requireAuth, PayPalController.createOrder);
app.get('/paypal/capture-order', requireAuth, PayPalController.captureOrder);
app.get('/paypal/cancel-order', requireAuth, PayPalController.cancelOrder);

// NETS QR routes
app.post('/nets-qr/request', requireAuth, NetsService.generateQrCode);
app.get('/nets-qr/success', requireAuth, NetsService.showSuccess);
app.get('/nets-qr/fail', requireAuth, NetsService.showFail);

app.get('/receipt/:id', requireAuth, PaymentController.receipt);

// feedback
app.get('/feedback', requireAuth, FeedbackController.form);
app.post('/feedback', requireAuth, FeedbackController.submit);
app.get('/feedback/all', requireAuth, requireAdmin, FeedbackController.list);
app.get('/feedback/delete/:id', requireAuth, requireAdmin, FeedbackController.delete);

// 404
app.use((req, res) => {
  res.status(404).render('404', { user: req.session.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
