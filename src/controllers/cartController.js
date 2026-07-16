const Cart = require('../models/cart.model');
const ProductImage = require('../models/productImage.model')
const ProductVariant = require('../models/productVariant.model')
const Product = require('../models/product.model')
const { asyncHandler, ConflictError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } = require('../errors/errorConfig')

const { buildCartCatalog } = require('../services/cartCatalog.service')

const buildNormalCart = require('../helpers/buildNormalCart.helper')
const buildGiftCart = require('../helpers/buildGiftCart.helper')

const addToCart = asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { productId, selectedWeight, quantity } = req.body

    // ─── Validation ──────────────────────────────
    if (!productId || !selectedWeight || !quantity) {
        throw new BadRequestError(
            'productId, selectedWeight and quantity are required'
        )
    }

    if (quantity < 1) {
        throw new BadRequestError('Quantity cannot be less than 1')
    }

    // ─── Cart Dhundo ya Banao ─────────────────────
    let cart = await Cart.findOne({ userId })
    if (!cart) {
        cart = new Cart({ userId, items: [] })
    }

    // ─── Same product + Same weight check ────────
    const itemIndex = cart.items.findIndex(item =>
        item.productId.toString() === productId &&
        item.selectedWeight.toString() === selectedWeight
        //   ↑                              ↑
        // productId match            selectedWeight bhi match
    )

    if (itemIndex > -1) {
        // ✅ Same product + Same weight → quantity badhao
        cart.items[itemIndex].quantity += quantity
    } else {
        // ✅ Naya item — Different weight ya different product
        cart.items.push({ productId, selectedWeight, quantity })
    }

    await cart.save()

    res.status(200).json({
        success: true,
        message: 'Item added to cart successfully',
        data: cart
    })
})


const getCart = asyncHandler(async (req, res) => {

    const userId = req.user.id;

    const {
        cart,
        giftCart,
        catalogMap,
        giftBoxMap,
        giftWrapMap
    } = await buildCartCatalog(userId);

    const normalItems = buildNormalCart(
        cart,
        catalogMap
    );

    const giftItems = buildGiftCart(
        giftCart,
        catalogMap,
        giftBoxMap,
        giftWrapMap
    );


    res.status(200).json({

        success: true,

        items: [

            ...normalItems,

            ...giftItems

        ]

    });

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