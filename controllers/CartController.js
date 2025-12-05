const Product = require('../models/Product');

function toPromise(fn, ...args) {
  return new Promise((resolve, reject) => {
    if (typeof fn !== 'function') return reject(new Error('Not a function'));
    fn(...args, (err, result) => err ? reject(err) : resolve(result));
  });
}

module.exports = {
  listCartItems: async (req, res) => {
    try {
      const cart = req.session.cart || [];
      const enriched = await Promise.all(cart.map(async (it) => {
        const product = await toPromise(Product.getById, it.productId).catch(()=>null);
        return {
          productId: it.productId,
          productName: product ? product.productName : it.productName,
          price: product ? parseFloat(product.price||0) : parseFloat(it.price||0),
          qty: it.qty || it.quantity || 1,
          image: product ? `/images/${product.image}` : (it.image ? `/images/${it.image}` : null)
        };
      }));
      const total = enriched.reduce((s,i)=> s + (i.price * i.qty), 0);
      res.render('cart', { cart: enriched, total: +total.toFixed(2), user: req.session.user, messages: [...req.flash('error'), ...req.flash('success')] });
    } catch (err) {
      console.error(err);
      req.flash('error','Failed to load cart');
      res.redirect('/shopping');
    }
  },

  addToCart: async (req, res) => {
    try {
      const productId = req.params.id;
      const qty = parseInt(req.body.qty || 1, 10) || 1;
      const product = await toPromise(Product.getById, productId);
      if (!product) { req.flash('error','Product not found'); return res.redirect('/shopping'); }
      if (qty > parseInt(product.quantity||0,10)) { req.flash('error','Not enough stock'); return res.redirect('/shopping'); }
      if (!req.session.cart) req.session.cart = [];
      const idx = req.session.cart.findIndex(i=> String(i.productId) === String(productId));
      if (idx >= 0) req.session.cart[idx].qty = (req.session.cart[idx].qty || 0) + qty;
      else req.session.cart.push({ productId: product.id, productName: product.productName, price: parseFloat(product.price||0), qty, image: product.image });
      req.flash('success','Added to cart');
      res.redirect('/shopping');
    } catch (err) {
      console.error(err);
      req.flash('error','Add failed');
      res.redirect('/shopping');
    }
  },

  updateCartItem: (req, res) => {
    const productId = req.params.id;
    const qty = parseInt(req.body.qty || 1, 10) || 1;
    const cart = req.session.cart || [];
    const idx = cart.findIndex(i => String(i.productId) === String(productId));
    if (idx === -1) { req.flash('error','Item not in cart'); return res.redirect('/cart'); }
    cart[idx].qty = qty;
    req.session.cart = cart;
    req.flash('success','Cart updated');
    res.redirect('/cart');
  },

  removeCartItem: (req, res) => {
    const productId = req.params.id;
    req.session.cart = (req.session.cart || []).filter(i => String(i.productId) !== String(productId));
    req.flash('success','Removed');
    res.redirect('/cart');
  },

  clearCart: (req, res) => {
    req.session.cart = [];
    req.flash('success','Cart cleared');
    res.redirect('/cart');
  }
};
