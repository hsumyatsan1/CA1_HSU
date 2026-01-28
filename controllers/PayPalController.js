const Cart = require('../models/Cart');
const Payment = require('../models/Payment');
const paypalClient = require('../services/paypal');

class PayPalController {
  static async createOrder(req, res) {
    try {
      console.log('PayPalController.createOrder called');
      const userId = req.session.user.id;
      const cartItems = await Cart.getByUserId(userId);

      if (!cartItems || cartItems.length === 0) {
        req.flash('error', 'Cart is empty');
        return res.redirect('/cart');
      }

      let total = 0;
      const itemsForPayPal = cartItems.map(item => {
        const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
        total += itemTotal;
        return {
          name: item.name,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price)
        };
      });

      console.log('Creating PayPal order with total:', total);
      const order = await paypalClient.createOrder(total, itemsForPayPal);

      console.log('PayPal order created:', order.id);
      
      // Store order info in session
      req.session.paypalOrder = {
        orderId: order.id,
        total: total,
        userId: userId,
        cartItems: cartItems
      };

      // Redirect to PayPal approval URL
      const approvalUrl = order.links.find(link => link.rel === 'approve').href;
      console.log('Redirecting to PayPal:', approvalUrl);
      res.redirect(approvalUrl);
    } catch (err) {
      console.error('PayPalController.createOrder error:', err);
      req.flash('error', 'Error creating PayPal order: ' + err.message);
      res.redirect('/payment');
    }
  }

  static async captureOrder(req, res) {
    try {
      console.log('PayPalController.captureOrder called with token:', req.query.token);
      const { token } = req.query;
      const userId = req.session.user.id;

      if (!token) {
        req.flash('error', 'Invalid PayPal order');
        return res.redirect('/payment');
      }

      // Capture the order
      const captureResult = await paypalClient.captureOrder(token);
      console.log('PayPal order captured:', captureResult.status);

      if (captureResult.status === 'COMPLETED') {
        const cartItems = req.session.paypalOrder?.cartItems || await Cart.getByUserId(userId);
        
        let total = 0;
        cartItems.forEach(item => {
          total += (parseFloat(item.price) * parseInt(item.quantity));
        });

        // Create payment record
        const paymentData = {
          user_id: userId,
          amount: total,
          payment_method: 'paypal',
          status: 'completed',
          transaction_id: captureResult.id,
          payment_date: new Date()
        };

        const paymentId = await Payment.create(paymentData);
        console.log('Payment record created:', paymentId);

        // Clear cart
        await Cart.clearByUserId(userId);

        // Clear session
        req.session.paypalOrder = null;

        req.flash('success', 'Payment successful!');
        res.redirect(`/receipt/${paymentId}`);
      } else {
        req.flash('error', 'Payment not completed. Status: ' + captureResult.status);
        res.redirect('/payment');
      }
    } catch (err) {
      console.error('PayPalController.captureOrder error:', err);
      req.flash('error', 'Error processing PayPal payment: ' + err.message);
      res.redirect('/payment');
    }
  }

  static async cancelOrder(req, res) {
    req.session.paypalOrder = null;
    req.flash('error', 'PayPal payment cancelled');
    res.redirect('/payment');
  }
}

module.exports = PayPalController;