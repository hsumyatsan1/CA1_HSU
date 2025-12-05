const request = require('supertest');
const app = require('../../app');
const db = require('../../db');

describe('CartController', () => {
  beforeAll(async () => {
    await db.query('DELETE FROM cart_items'); // Clear cart_items before tests
  });

  afterAll(async () => {
    await db.end(); // Close database connection after tests
  });

  describe('GET /cart', () => {
    it('should return the cart items for a logged-in user', async () => {
      const response = await request(app)
        .get('/cart')
        .set('Cookie', 'sessionId=mockSessionId'); // Mock session

      expect(response.status).toBe(200);
      expect(response.text).toContain('Your Shopping Cart'); // Check for cart title
    });
  });

  describe('POST /add-to-cart/:id', () => {
    it('should add a product to the cart', async () => {
      const response = await request(app)
        .post('/add-to-cart/1')
        .send({ qty: 2 })
        .set('Cookie', 'sessionId=mockSessionId'); // Mock session

      expect(response.status).toBe(302); // Redirect after adding
      expect(response.headers.location).toBe('/shopping'); // Redirect to shopping
    });
  });

  describe('POST /cart/update/:id', () => {
    it('should update the quantity of a cart item', async () => {
      const response = await request(app)
        .post('/cart/update/1')
        .send({ qty: 3 })
        .set('Cookie', 'sessionId=mockSessionId'); // Mock session

      expect(response.status).toBe(302); // Redirect after updating
      expect(response.headers.location).toBe('/cart'); // Redirect to cart
    });
  });

  describe('POST /cart/remove/:id', () => {
    it('should remove a product from the cart', async () => {
      const response = await request(app)
        .post('/cart/remove/1')
        .set('Cookie', 'sessionId=mockSessionId'); // Mock session

      expect(response.status).toBe(302); // Redirect after removing
      expect(response.headers.location).toBe('/cart'); // Redirect to cart
    });
  });

  describe('POST /cart/clear', () => {
    it('should clear all items from the cart', async () => {
      const response = await request(app)
        .post('/cart/clear')
        .set('Cookie', 'sessionId=mockSessionId'); // Mock session

      expect(response.status).toBe(302); // Redirect after clearing
      expect(response.headers.location).toBe('/cart'); // Redirect to cart
    });
  });
});