const Payment = require('../models/Payment');
const PayPalController = require('./PayPalController');
const Product = require('../models/Product');

function toPromise(fn, ...args) {
  return new Promise((resolve, reject) => {
    if (typeof fn !== 'function') return reject(new Error('Not a function'));
    fn(...args, (err, result) => err ? reject(err) : resolve(result));
  });
}

async function buildCartFromSession(sessionCart) {
  const cart = sessionCart || [];
  const enriched = await Promise.all(cart.map(async (it) => {
    const product = await toPromise(Product.getById, it.productId).catch(() => null);
    const productName = product ? product.productName : (it.productName || it.name);
    const price = product ? parseFloat(product.price || 0) : parseFloat(it.price || 0);
    const quantity = it.qty || it.quantity || 1;
    return {
      productId: it.productId,
      productName,
      name: productName,
      price,
      quantity,
      qty: quantity,
      image: product ? product.image : it.image
    };
  }));
  return enriched;
}

class PaymentController {
  static async show(req, res) {
    try {
      const userId = req.session.user.id;
      const cartItems = await buildCartFromSession(req.session.cart);
      
      if (!cartItems || cartItems.length === 0) {
        req.flash('error', 'Your cart is empty');
        return res.redirect('/shopping');
      }

      let total = 0;
      const formattedItems = cartItems.map(item => {
        const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
        total += itemTotal;
        return {
          ...item,
          itemTotal: itemTotal.toFixed(2)
        };
      });
      
      res.render('payment', { 
        user: req.session.user, 
        cart: formattedItems, 
        cartItems: formattedItems,
        total: total.toFixed(2),
        paypalClientId: process.env.PAYPAL_CLIENT_ID,
        messages: req.flash()
      });
    } catch (err) {
      console.error('PaymentController.show error:', err);
      req.flash('error', 'Error loading payment page: ' + err.message);
      res.redirect('/cart');
    }
  }

  static async pay(req, res) {
    try {
      const { paymentMethod, cardName, cardNumber, expiryDate, cardPin } = req.body;
      const userId = req.session.user.id;
      const cartItems = await buildCartFromSession(req.session.cart);
      
      if (!cartItems || cartItems.length === 0) {
        req.flash('error', 'Your cart is empty');
        return res.redirect('/cart');
      }
      if (!paymentMethod) {
        req.flash('error', 'Please select a payment method');
        return res.redirect('/payment');
      }

      let total = 0;
      const formattedItems = cartItems.map(item => {
        const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
        total += itemTotal;
        return {
          ...item,
          itemTotal: itemTotal.toFixed(2)
        };
      });

      if (paymentMethod === 'credit-card') {
        const hasAnyCardField = cardName || cardNumber || expiryDate || cardPin;
        if (hasAnyCardField && (!cardNumber || !cardName || !expiryDate || !cardPin)) {
          req.flash('error', 'Please fill in all credit card fields');
        }

        if (cardNumber && cardName && expiryDate && cardPin) {
          const cardLastFour = cardNumber.toString().slice(-4);
          req.session.lastOrder = {
            items: formattedItems.map(i => ({
              productName: i.productName || i.name,
              price: parseFloat(i.price || 0),
              qty: parseInt(i.quantity || i.qty || 1, 10) || 1
            })),
            total: total.toFixed(2),
            createdAt: new Date()
          };
          const paymentId = await toPromise(Payment.add, {
            userId,
            total: total.toFixed(2),
            cardLastFour,
            status: 'completed'
          });
          req.session.cart = [];
          req.flash('success', 'Payment successful!');
          return res.redirect(`/receipt/${paymentId}`);
        }

        return res.render('checkout', { 
          user: req.session.user, 
          cart: formattedItems,
          cartItems: formattedItems, 
          total: total.toFixed(2),
          messages: req.flash()
        });
      } 
      else if (paymentMethod === 'paypal') {
        return PayPalController.createOrder(req, res);
      } 
      else if (paymentMethod === 'qr-code') {
        return res.render('netsQR', { 
          user: req.session.user, 
          cart: formattedItems,
          cartItems: formattedItems, 
          total: total.toFixed(2) 
        });
      }

      req.flash('error', 'Invalid payment method');
      return res.redirect('/payment');
    } catch (err) {
      console.error('PaymentController.pay error:', err);
      req.flash('error', 'Payment error: ' + err.message);
      return res.redirect('/payment');
    }
  }

  static async receipt(req, res) {
    try {
      const paymentId = req.params.id;
      const payment = await toPromise(Payment.getById, paymentId);

      if (!payment || payment.user_id !== req.session.user.id) {
        req.flash('error', 'Payment not found');
        return res.redirect('/');
      }

      const order = req.session.lastOrder || null;
      res.render('receipt', { user: req.session.user, payment, order });
    } catch (err) {
      console.error(err);
      req.flash('error', 'Error loading receipt');
      res.redirect('/');
    }
  }

  static async list(req, res) {
    try {
      const payments = await toPromise(Payment.getAll);
      res.render('payments', { user: req.session.user, payments });
    } catch (err) {
      console.error(err);
      req.flash('error', 'Error loading payments');
      res.redirect('/');
    }
  }
}

module.exports = PaymentController;
