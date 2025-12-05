const db = require('../../db');
const Product = require('../../models/Product');

describe('Product Model', () => {
  beforeAll(async () => {
    await db.query('DELETE FROM products'); // Clear the products table before tests
  });

  afterAll(async () => {
    await db.end(); // Close the database connection after tests
  });

  it('should create a new product', async () => {
    const productData = {
      productName: 'Test Product',
      price: 10.99,
      quantity: 100,
      image: 'test-image.jpg'
    };
    const result = await new Promise((resolve, reject) => {
      Product.create(productData, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
    expect(result).toBeDefined();
    expect(result.insertId).toBeGreaterThan(0);
  });

  it('should retrieve a product by ID', async () => {
    const productId = 1; // Assuming the product created in the previous test has ID 1
    const product = await new Promise((resolve, reject) => {
      Product.getById(productId, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
    expect(product).toBeDefined();
    expect(product.productName).toBe('Test Product');
  });

  it('should update a product', async () => {
    const productId = 1; // Assuming the product created in the first test has ID 1
    const updatedData = {
      productName: 'Updated Product',
      price: 12.99,
      quantity: 150,
      image: 'updated-image.jpg'
    };
    await new Promise((resolve, reject) => {
      Product.update(productId, updatedData, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
    const updatedProduct = await new Promise((resolve, reject) => {
      Product.getById(productId, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
    expect(updatedProduct.productName).toBe('Updated Product');
    expect(updatedProduct.price).toBe(12.99);
  });

  it('should delete a product', async () => {
    const productId = 1; // Assuming the product created in the first test has ID 1
    await new Promise((resolve, reject) => {
      Product.delete(productId, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
    const deletedProduct = await new Promise((resolve, reject) => {
      Product.getById(productId, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
    expect(deletedProduct).toBeUndefined();
  });
});