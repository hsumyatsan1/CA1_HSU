const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const PayPalController = require('./PayPalController');

class PaymentController {
  static async show(req, res) {
    try {
      const userId = req.session.user.id;
      const cartItems = await Cart.getByUserId(userId);
      
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
      const { paymentMethod } = req.body;
      const userId = req.session.user.id;
      const cartItems = await Cart.getByUserId(userId);
      
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
        return res.render('checkout', { 
          user: req.session.user, 
          cart: formattedItems,
          cartItems: formattedItems, 
          total: total.toFixed(2) 
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
      const payment = await Payment.getById(paymentId);

      if (!payment || payment.user_id !== req.session.user.id) {
        req.flash('error', 'Payment not found');
        return res.redirect('/');
      }

      res.render('receipt', { user: req.session.user, payment });
    } catch (err) {
      console.error(err);
      req.flash('error', 'Error loading receipt');
      res.redirect('/');
    }
  }

  static async list(req, res) {
    try {
      const payments = await Payment.getAll();
      res.render('payments', { user: req.session.user, payments });
    } catch (err) {
      console.error(err);
      req.flash('error', 'Error loading payments');
      res.redirect('/');
    }
  }
}

module.exports = PaymentController;
