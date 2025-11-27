const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const path = require('path');

const ProductController = require('./controllers/ProductController');
const UserController = require('./controllers/UserController');

console.log('ProductController keys:', Object.keys(ProductController || {}));
console.log('UserController keys:', Object.keys(UserController || {}));

// check required handlers used by routes
const needed = [
  ['ProductController', 'list'],
  ['ProductController', 'detail'],
  ['ProductController', 'addToCart'],
  ['ProductController', 'viewCart'],
  ['ProductController', 'updateCartItem'],
  ['ProductController', 'removeFromCart'],
  ['ProductController', 'confirmCart'],
  ['ProductController', 'checkout'],
  ['ProductController', 'inventory'],
  ['ProductController', 'addForm'],
  ['ProductController', 'add'],
  ['ProductController', 'editForm'],
  ['ProductController', 'update'],
  ['ProductController', 'delete'],
  ['UserController', 'registerForm'],
  ['UserController', 'register'],
  ['UserController', 'loginForm'],
  ['UserController', 'login']
];

for (const [objName, key] of needed) {
  const obj = objName === 'ProductController' ? ProductController : UserController;
  if (!obj || typeof obj[key] !== 'function') {
    console.error(`ERROR: ${objName}.${key} is missing or not a function`);
  }
}

const app = express();

// View engine
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));

app.use(flash());

// Multer config
const storage = multer.diskStorage({
    destination: './public/images',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Auth middlewares
const checkAuth = (req, res, next) => req.session.user ? next() : res.redirect('/login');
const checkAdmin = (req, res, next) =>
    req.session.user?.role === 'admin' ? next() : res.redirect('/shopping');

// Pages
app.get('/', (req, res) => res.render('index', { user: req.session.user }));

// Register
app.get('/register', UserController.registerForm);
app.post('/register', UserController.register);

// Login
app.get('/login', UserController.loginForm);
app.post('/login', UserController.login);

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Shopping
app.get('/shopping', checkAuth, ProductController.list);
app.get('/product/:id', checkAuth, ProductController.detail);

// Cart
app.post('/add-to-cart/:id', checkAuth, ProductController.addToCart);
app.post('/cart/update/:id', checkAuth, ProductController.updateCartItem);
app.post('/cart/remove/:id', checkAuth, ProductController.removeFromCart);
app.get('/cart', checkAuth, ProductController.viewCart);
app.post('/confirm-cart', checkAuth, ProductController.confirmCart);
app.get('/checkout', checkAuth, ProductController.checkout);
// Admin Product CRUD
app.get('/inventory', checkAuth, checkAdmin, ProductController.inventory);
app.get('/addProduct', checkAuth, checkAdmin, ProductController.addForm);
app.post('/addProduct', checkAuth, checkAdmin, upload.single('image'), ProductController.add);
app.get('/updateProduct/:id', checkAuth, checkAdmin, ProductController.editForm);
app.post('/updateProduct/:id', checkAuth, checkAdmin, upload.single('image'), ProductController.update);
app.get('/deleteProduct/:id', checkAuth, checkAdmin, ProductController.delete);

app.listen(3000, () => console.log("Server running on port 3000"));
