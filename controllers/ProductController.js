const Product = require('../models/Product');

function toPromise(fn, ...args) {
  return new Promise((resolve, reject) => {
    if (typeof fn !== 'function') return reject(new Error('Not a function'));
    fn(...args, (err, result) => err ? reject(err) : resolve(result));
  });
}

module.exports = {
  // public listing for root (guests)
  publicList: async (req, res) => {
    try {
      const products = await toPromise(Product.getAll) || [];
      res.render('index', { products, user: req.session.user, messages: [...req.flash('error'), ...req.flash('success')] });
    } catch (err) {
      console.error('publicList err', err);
      req.flash('error', 'Cannot load products');
      res.render('index', { products: [], user: req.session.user, messages: [...req.flash('error'), ...req.flash('success')] });
    }
  },

  // listing for logged-in users (shopping with qty/add-to-cart)
  listForUser: async (req, res) => {
    try {
      const products = await toPromise(Product.getAll) || [];
      res.render('shopping', { products, user: req.session.user, messages: [...req.flash('error'), ...req.flash('success')] });
    } catch (err) {
      console.error('listForUser err', err);
      req.flash('error', 'Cannot load products');
      res.redirect('/');
    }
  },

  detail: async (req, res) => {
    try {
      const id = req.params.id;
      const product = await toPromise(Product.getById, id);
      if (!product) {
        req.flash('error', 'Product not found');
        return res.redirect('/shopping');
      }
      res.render('product', { product, user: req.session.user, messages: [...req.flash('error'), ...req.flash('success')] });
    } catch (err) {
      console.error('detail err', err);
      req.flash('error', 'Failed to load product');
      res.redirect('/shopping');
    }
  },

  inventory: async (req, res) => {
    try {
      const products = await toPromise(Product.getAll) || [];
      res.render('inventory', { products, user: req.session.user, searchTerm: '', messages: [...req.flash('error'), ...req.flash('success')] });
    } catch (err) {
      console.error('inventory err', err);
      req.flash('error', 'Cannot load inventory');
      res.redirect('/');
    }
  },

  addForm: (req, res) => res.render('addProduct', { user: req.session.user, messages: [...req.flash('error'), ...req.flash('success')] }),

  add: async (req, res) => {
    try {
      const { productName, price, quantity } = req.body;
      const image = req.file ? req.file.filename : null;
      if (!productName) { req.flash('error','Name required'); return res.redirect('/addProduct'); }
      await toPromise(Product.create, { productName: productName.trim(), price: parseFloat(price)||0, quantity: parseInt(quantity,10)||0, image });
      req.flash('success','Product added');
      res.redirect('/inventory');
    } catch (err) {
      console.error('add product err', err);
      req.flash('error','Failed to add');
      res.redirect('/addProduct');
    }
  },

  editForm: async (req, res) => {
    try {
      const product = await toPromise(Product.getById, req.params.id);
      if (!product) { req.flash('error','Not found'); return res.redirect('/inventory'); }
      res.render('editProduct', { product, user: req.session.user, messages: [...req.flash('error'), ...req.flash('success')] });
    } catch (err) {
      console.error(err);
      req.flash('error','Failed to load');
      res.redirect('/inventory');
    }
  },

  update: async (req, res) => {
    try {
      const { productName, price, quantity, currentImage } = req.body;
      const image = req.file ? req.file.filename : currentImage;
      await toPromise(Product.update, req.params.id, { productName, price: parseFloat(price)||0, quantity: parseInt(quantity,10)||0, image });
      req.flash('success','Updated');
      res.redirect('/inventory');
    } catch (err) {
      console.error(err);
      req.flash('error','Update failed');
      res.redirect('/inventory');
    }
  },

  delete: async (req, res) => {
    try {
      await toPromise(Product.delete, req.params.id);
      req.flash('success','Deleted');
      res.redirect('/inventory');
    } catch (err) {
      console.error(err);
      req.flash('error','Delete failed');
      res.redirect('/inventory');
    }
  },

  search: async (req, res) => {
    try {
      const q = (req.query.q || '').toString().trim();
      let products = [];

      if (!q) {
        products = await toPromise(require('../models/Product').getAll) || [];
      } else {
        const Product = require('../models/Product');
        if (typeof Product.search === 'function') {
          products = await toPromise(Product.search, q) || [];
        } else {
          const all = await toPromise(Product.getAll) || [];
          const lq = q.toLowerCase();
          products = (all || []).filter(p => (p.productName || '').toLowerCase().includes(lq));
        }
      }

      const messages = [...req.flash('error'), ...req.flash('success')];
      // Render appropriate view depending on user role
      if (req.session.user && (req.session.user.role || '').toLowerCase() === 'admin') {
        return res.render('inventory', { products, user: req.session.user, messages, searchTerm: q });
      } else if (req.session.user) {
        return res.render('shopping', { products, user: req.session.user, messages, searchTerm: q });
      } else {
        return res.render('index', { products, user: req.session.user, messages, searchTerm: q });
      }
    } catch (err) {
      console.error('Product.search error:', err);
      req.flash('error', 'Search failed');
      return res.redirect(req.get('Referer') || '/');
    }
  },
};
