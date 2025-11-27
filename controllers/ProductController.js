const Product = require('../models/Product');

function toNumber(v, def = 0) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : def;
}

module.exports = {
    list: (req, res) => {
        Product.getAll((err, products) => {
            if (err) return res.status(500).send('Server error');
            res.render('shopping', { products, user: req.session.user, messages: req.flash('error') });
        });
    },

    inventory: (req, res) => {
        Product.getAll((err, products) => {
            if (err) return res.status(500).send('Server error');
            res.render('inventory', { products, user: req.session.user });
        });
    },

    detail: (req, res) => {
        const id = req.params.id;
        Product.getById(id, (err, product) => {
            if (err || !product) {
                req.flash('error', 'Product not found');
                return res.redirect('/shopping');
            }
            res.render('product', { product, user: req.session.user });
        });
    },

    addForm: (req, res) => res.render('addProduct', { user: req.session.user }),

    // add: unchanged (assumes admin only)
    add: (req, res) => {
        const { productName, price, quantity } = req.body;
        const image = req.file ? req.file.filename : null;
        const productData = {
            productName: (productName || '').trim(),
            price: toNumber(price, 0),
            quantity: parseInt(quantity || '0', 10) || 0,
            image
        };
        if (!productData.productName) {
            req.flash('error', 'Name required');
            return res.redirect('/addProduct');
        }
        Product.create(productData, (err) => {
            if (err) {
                console.error(err);
                req.flash('error', 'Failed to add product');
                return res.redirect('/addProduct');
            }
            res.redirect('/inventory');
        });
    },

    editForm: (req, res) => {
        const id = req.params.id;
        Product.getById(id, (err, product) => {
            if (err || !product) {
                req.flash('error', 'Product not found');
                return res.redirect('/inventory');
            }
            res.render('updateProduct', { product, user: req.session.user });
        });
    },

    update: (req, res) => {
        const id = req.params.id;
        Product.getById(id, (err, existing) => {
            if (err || !existing) {
                req.flash('error', 'Product not found');
                return res.redirect('/inventory');
            }
            const { productName, price, quantity, currentImage } = req.body;
            const image = req.file ? req.file.filename : (currentImage || existing.image);
            const updateData = {
                productName: (productName || existing.productName).trim(),
                price: toNumber(price || existing.price, 0),
                quantity: parseInt(quantity || existing.quantity || '0', 10) || 0,
                image
            };
            Product.update(id, updateData, (err2) => {
                if (err2) {
                    console.error(err2);
                    req.flash('error', 'Failed to update product');
                    return res.redirect(`/updateProduct/${id}`);
                }
                res.redirect('/inventory');
            });
        });
    },

    // Delete product
    delete: (req, res) => {
        const id = req.params.id;
        Product.delete(id, (err) => {
            if (err) req.flash('error', 'Failed to delete product');
            else req.flash('success', 'Product deleted');
            res.redirect('/inventory');
        });
    },

    // Add to cart: immediately reserve stock (DB quantity decremented)
    addToCart: (req, res) => {
        const id = req.params.id;
        let qty = parseInt(req.body.qty || '1', 10);
        if (!Number.isFinite(qty) || qty <= 0) qty = 1;

        Product.getById(id, (err, product) => {
            if (err || !product) {
                req.flash('error', 'Product not available');
                return res.redirect('/shopping');
            }

            const available = parseInt(product.quantity || 0, 10);
            if (qty > available) {
                req.flash('error', `Only ${available} available`);
                return res.redirect('/shopping');
            }

            // reserve stock in DB
            const newStock = available - qty;
            Product.update(id, {
                productName: product.productName,
                price: toNumber(product.price, 0),
                quantity: newStock,
                image: product.image
            }, (updErr) => {
                if (updErr) {
                    console.error(updErr);
                    req.flash('error', 'Failed to reserve stock');
                    return res.redirect('/shopping');
                }

                // update session cart
                if (!req.session.cart) req.session.cart = [];
                const existing = req.session.cart.find(i => String(i.id) === String(product.id));
                if (existing) existing.qty = (existing.qty || 0) + qty;
                else req.session.cart.push({
                    id: product.id,
                    productName: product.productName,
                    price: toNumber(product.price, 0),
                    image: product.image,
                    qty
                });

                req.flash('success', 'Added to cart');
                return res.redirect('/shopping');
            });
        });
    },

    // Update cart item qty: adjust DB stock accordingly
    updateCartItem: (req, res) => {
        const id = req.params.id;
        let newQty = parseInt(req.body.qty || '1', 10);
        if (!Number.isFinite(newQty) || newQty < 0) newQty = 0;

        const cart = req.session.cart || [];
        const item = cart.find(i => String(i.id) === String(id));
        if (!item) {
            req.flash('error', 'Item not in cart');
            return res.redirect('/cart');
        }
        const oldQty = item.qty || 0;
        const delta = newQty - oldQty;

        // If newQty is 0, perform remove logic
        if (newQty === 0) {
            return module.exports.removeFromCart(req, res);
        }

        Product.getById(id, (err, product) => {
            if (err || !product) {
                req.flash('error', 'Product not available');
                return res.redirect('/cart');
            }

            // Note: product.quantity is DB available (already reserved by previous cart entries)
            if (delta > 0) {
                // trying to increase cart: need to ensure DB has enough stock
                const available = parseInt(product.quantity || 0, 10);
                if (delta > available) {
                    req.flash('error', `Only ${available} more available`);
                    return res.redirect('/cart');
                }
                const newStock = available - delta;
                Product.update(id, {
                    productName: product.productName,
                    price: toNumber(product.price, 0),
                    quantity: newStock,
                    image: product.image
                }, (updErr) => {
                    if (updErr) {
                        console.error(updErr);
                        req.flash('error', 'Failed to update stock');
                        return res.redirect('/cart');
                    }
                    item.qty = newQty;
                    req.flash('success', 'Cart updated');
                    return res.redirect('/cart');
                });
            } else if (delta < 0) {
                // decreasing cart: release stock back to DB
                const release = Math.abs(delta);
                const newStock = parseInt(product.quantity || 0, 10) + release;
                Product.update(id, {
                    productName: product.productName,
                    price: toNumber(product.price, 0),
                    quantity: newStock,
                    image: product.image
                }, (updErr) => {
                    if (updErr) {
                        console.error(updErr);
                        req.flash('error', 'Failed to update stock');
                        return res.redirect('/cart');
                    }
                    item.qty = newQty;
                    req.flash('success', 'Cart updated');
                    return res.redirect('/cart');
                });
            } else {
                // no change
                return res.redirect('/cart');
            }
        });
    },

    // Remove item from cart and restore DB stock
    removeFromCart: (req, res) => {
        const id = req.params.id;
        const cart = req.session.cart || [];
        const idx = cart.findIndex(i => String(i.id) === String(id));
        if (idx === -1) {
            req.flash('error', 'Item not in cart');
            return res.redirect('/cart');
        }
        const item = cart[idx];
        const restoreQty = parseInt(item.qty || 0, 10);

        Product.getById(id, (err, product) => {
            if (err || !product) {
                // if product missing in DB, still remove from cart
                cart.splice(idx, 1);
                req.session.cart = cart;
                req.flash('success', 'Removed from cart');
                return res.redirect('/cart');
            }
            const newStock = parseInt(product.quantity || 0, 10) + restoreQty;
            Product.update(id, {
                productName: product.productName,
                price: toNumber(product.price, 0),
                quantity: newStock,
                image: product.image
            }, (updErr) => {
                // remove from session regardless of DB error to avoid stuck cart
                cart.splice(idx, 1);
                req.session.cart = cart;
                if (updErr) {
                    console.error(updErr);
                    req.flash('error', 'Removed from cart but failed to restore stock');
                } else {
                    req.flash('success', 'Removed from cart');
                }
                return res.redirect('/cart');
            });
        });
    },

    // Confirm cart: create order snapshot; no stock mutation here (already reserved on add/update)
    confirmCart: (req, res) => {
        const cart = req.session.cart || [];
        if (!cart.length) {
            req.flash('error', 'Cart is empty');
            return res.redirect('/cart');
        }
        const order = cart.map(it => ({
            id: it.id,
            productName: it.productName,
            qty: parseInt(it.qty || 0, 10),
            price: toNumber(it.price, 0)
        }));
        req.session.order = order;
        req.session.cart = [];
        req.flash('success', 'Order confirmed');
        return res.redirect('/checkout');
    },

    checkout: (req, res) => {
        const order = req.session.order || [];
        res.render('checkout', { order, user: req.session.user });
        req.session.order = [];
    },
    viewCart: (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart', {
        cart,
        user: req.session.user,
        messages: req.flash()
    });
},

};
