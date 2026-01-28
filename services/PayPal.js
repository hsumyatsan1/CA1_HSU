require('dotenv').config();

let fetchFn = global.fetch;
if (!fetchFn) {
  try {
    const nodeFetch = require('node-fetch');
    fetchFn = nodeFetch.default || nodeFetch;
  } catch (err) {
    throw new Error('Fetch API not available. Please install node-fetch or use Node.js 18+.');
  }
}

const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = process.env.PAYPAL_API;

async function getAccessToken() {
  try {
    const response = await fetchFn(`${PAYPAL_API}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(PAYPAL_CLIENT + ':' + PAYPAL_SECRET).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    const data = await response.json();
    if (!data.access_token) {
      throw new Error('Failed to get PayPal access token');
    }
    return data.access_token;
  } catch (err) {
    console.error('getAccessToken error:', err);
    throw err;
  }
}

async function createOrder(amount, items) {
  try {
    const accessToken = await getAccessToken();
    
    // Format items for PayPal
    const itemsData = items.map(item => ({
      name: item.name,
      quantity: item.quantity.toString(),
      unit_amount: {
        currency_code: 'SGD',
        value: item.price.toFixed(2)
      }
    }));

    const response = await fetchFn(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'SGD',
            value: amount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'SGD',
                value: amount.toFixed(2)
              }
            }
          },
          items: itemsData
        }],
        application_context: {
          return_url: `${process.env.RETURN_URL || 'http://localhost:3000'}/paypal/capture-order`,
          cancel_url: `${process.env.RETURN_URL || 'http://localhost:3000'}/paypal/cancel-order`
        }
      })
    });
    
    const data = await response.json();
    if (!data.id) {
      console.error('PayPal createOrder error:', data);
      throw new Error('Failed to create PayPal order');
    }
    return data;
  } catch (err) {
    console.error('createOrder error:', err);
    throw err;
  }
}

async function captureOrder(orderId) {
  try {
    const accessToken = await getAccessToken();
    const response = await fetchFn(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    console.log('PayPal captureOrder response:', data);
    
    if (!data.status) {
      throw new Error('Failed to capture PayPal order');
    }
    return data;
  } catch (err) {
    console.error('captureOrder error:', err);
    throw err;
  }
}

module.exports = { createOrder, captureOrder };
