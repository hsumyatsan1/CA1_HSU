const Payment = require('../models/Payment');
const Product = require('../models/Product');

function toPromise(fn, ...args) {
  return new Promise((resolve, reject) => {
    if (typeof fn !== 'function') return reject(new Error('Not a function'));
    fn(...args, (err, result) => err ? reject(err) : resolve(result));
  });
}

module.exports = {
  // show payment page with per-item totals
  show: async (req, res) => {
    try {
      const sessionCart = req.session.cart || [];
      const cart = (sessionCart || []).map(item => {
        const price = parseFloat(item.price || 0) || 0;
        const qty = parseInt(item.qty || item.quantity || 1, 10) || 1;
        return {
          ...item,
          price: +price.toFixed(2),
          qty,
          totalPrice: +((price * qty)).toFixed(2)
        };
      });
      const total = cart.reduce((s, i) => s + (i.totalPrice || 0), 0);
      return res.render('payment', { cart, total: +total.toFixed(2), user: req.session.user, messages: [...req.flash('error'), ...req.flash('success')] });
    } catch (err) {
      console.error('Payment.show error', err);
      req.flash('error', 'Cannot load payment page');
      return res.redirect('/cart');
    }
  },

  // process payment and save order in session for receipt
  pay: async (req, res) => {
    try {
      const { cardNumber, cardHolder, expiryDate, cvv } = req.body;
      const cart = req.session.cart || [];
      const userId = req.session.user && req.session.user.id;
      if (!userId) { req.flash('error','Login required'); return res.redirect('/login'); }
      if (!cart.length) { req.flash('error','Cart empty'); return res.redirect('/cart'); }
      if (!cardNumber || !cardHolder || !expiryDate || !cvv) { req.flash('error','Payment details required'); return res.redirect('/payment'); }

      const total = cart.reduce((s, it) => {
        const price = parseFloat(it.price || 0) || 0;
        const qty = parseInt(it.qty || it.quantity || 1, 10) || 1;
        return s + (price * qty);
      }, 0);

      // create a stable payment id (try model, fallback to timestamp)
      const Payment = require('../models/Payment');
      let paymentId = null;
      if (Payment && typeof Payment.add === 'function') {
        try {
          paymentId = await new Promise((resolve, reject) => {
            Payment.add({ userId, total: +total.toFixed(2), cardLastFour: String(cardNumber).slice(-4), status: 'completed' }, (err, id) => err ? reject(err) : resolve(id));
          });
        } catch (e) {
          console.error('Payment.add failed, falling back id', e);
        }
      }
      if (!paymentId) paymentId = String(Date.now());

      // decrement product stock (best-effort)
      const Product = require('../models/Product');
      for (const it of cart) {
        if (!Product || typeof Product.getById !== 'function') continue;
        const p = await new Promise((resolve) => Product.getById(it.productId, (err, row) => resolve(row || null)));
        if (!p) continue;
        const newQty = Math.max(0, (parseInt(p.quantity || 0, 10) - (it.qty || 1)));
        if (typeof Product.update === 'function') {
          await new Promise((resolve) => Product.update(it.productId, { productName: p.productName, price: p.price, quantity: newQty, image: p.image }, () => resolve()));
        }
      }

      // store order info in session for receipt rendering
      req.session.order = {
        paymentId,
        items: cart.map(it => {
          const price = parseFloat(it.price || 0) || 0;
          const qty = parseInt(it.qty || it.quantity || 1, 10) || 1;
          return { productId: it.productId, productName: it.productName, price: +price.toFixed(2), qty, totalPrice: +((price * qty)).toFixed(2), image: it.image || null };
        }),
        total: +total.toFixed(2),
        cardLastFour: String(cardNumber).slice(-4),
        createdAt: new Date()
      };

      // clear cart and redirect to receipt
      req.session.cart = [];
      req.flash('success','Payment successful');
      return res.redirect(`/receipt/${paymentId}`);
    } catch (err) {
      console.error('Payment.pay error', err);
      req.flash('error','Payment failed');
      return res.redirect('/payment');
    }
  },

  receipt: async (req, res) => {
    const id = req.params.id;
    let payment = null;
    const Payment = require('../models/Payment');
    if (Payment && typeof Payment.getById === 'function') {
      try { payment = await new Promise((resolve) => Payment.getById(id, (err, p) => resolve(p || null))); } catch(e) { /* ignore */ }
    }
    // fallback to session order (match by id)
    if ((!payment || Object.keys(payment).length === 0) && req.session.order && String(req.session.order.paymentId) === String(id)) {
      payment = { id: req.session.order.paymentId, total: req.session.order.total, card_last_four: req.session.order.cardLastFour || req.session.order.cardLastFour, status: 'completed', created_at: req.session.order.createdAt };
    }
    if (!payment) { req.flash('error','Receipt not found'); return res.redirect('/shopping'); }
    const order = req.session.order && String(req.session.order.paymentId) === String(id) ? req.session.order : null;
    res.render('receipt', { payment, order, user: req.session.user, messages: [...req.flash('error'), ...req.flash('success')] });
  },

  list: (req, res) => {
    Payment.getAll((err, payments) => {
      if (err) { req.flash('error','Cannot load payments'); return res.redirect('/inventory'); }
      res.render('payments', { payments: payments || [], user: req.session.user, messages: [...req.flash('error'), ...req.flash('success')] });
    });
  }
};
