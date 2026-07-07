const Cart = require('../models/cart.model');
const { asyncHandler, ConflictError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } = require('../errors/errorConfig')

const getCart = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId }).populate('items.productId');
    
    if (!cart) {
        throw new NotFoundError('Cart not found for the user');
    }

    res.status(200).json({ message: 'Cart fetched successfully', data: cart });
});

const addToCart = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
        cart = new Cart({ userId, items: [] });
    }

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

    if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
    } else {
        cart.items.push({ productId, quantity });
    }

    await cart.save();
    res.status(200).json({ message: 'Item added to cart successfully', data: cart });
});

const removeFromCart = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { productId } = req.body;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
        throw new NotFoundError('Cart not found for the user');
    }

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

    if (itemIndex > -1) {
        cart.items.splice(itemIndex, 1);
        await cart.save();
        res.status(200).json({ message: 'Item removed from cart successfully', data: cart });
    } else {
        throw new NotFoundError('Product not found in the cart');
    }
});

module.exports = {
    getCart,
    addToCart,
    removeFromCart,
};