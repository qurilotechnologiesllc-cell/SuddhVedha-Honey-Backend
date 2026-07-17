const Cart = require('../models/cart.model');
const Giftcart = require('../models/giftCart.model')
const ProductImage = require('../models/productImage.model')
const ProductVariant = require('../models/productVariant.model')
const Product = require('../models/product.model')
const GiftBox = require('../models/giftBox.model')
const GiftWrap = require('../models/giftWrap.model')
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

const addToGiftCart = asyncHandler(async (req, res) => {

    const userId = req.user.id;

    const {
        giftBoxId,
        giftWrapId,
        customMessage = "",
        quantity,
        products
    } = req.body;

    let totalWeight = 0;
    let calculatedTotalAmount = 0;

    // -----------------------------
    // Basic Validation
    // -----------------------------

    if (!giftBoxId || !giftWrapId) {
        throw new BadRequestError("Gift Box and Gift Wrap is required.");
    }

    if (giftBoxId) {
        const giftBox = await GiftBox.findById(giftBoxId);

        if (!giftBox) {
            throw new NotFoundError("Gift Box not found.");
        }
        calculatedTotalAmount += giftBox.price
    }

    if (giftWrapId) {

        const giftWrap = await GiftWrap.findById(giftWrapId);

        if (!giftWrap) {
            throw new NotFoundError("Gift Wrap not found.");
        }
        calculatedTotalAmount += giftWrap.price
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
        throw new BadRequestError("Please select at least one honey.");
    }


    const productIds = products.map(item => item.productId);

    const variantDocuments = await ProductVariant.find({
        product: { $in: productIds }
    });

    const variantMap = new Map();

    variantDocuments.forEach(doc => {
        variantMap.set(doc.product.toString(), doc);
    });


    for (const item of products) {

        const { productId, selectedWeight } = item;

        // Memory se Variant Document nikalo
        const variantDocument = variantMap.get(productId.toString());

        if (!variantDocument) {
            throw new NotFoundError("Product variant not found.");
        }

        // Embedded variant find karo
        const variant = variantDocument.variants.id(selectedWeight);

        if (!variant) {
            throw new BadRequestError("Selected variant is invalid.");
        }

        // Weight
        const weight = parseInt(variant.weight);

        totalWeight += weight;

        // variant Price
        calculatedTotalAmount += variant.price;

    }


    // -----------------------------
    // Find Gift Cart
    // -----------------------------

    let giftCart = await Giftcart.findOne({ userId });

    const newGiftItem = {

        giftBoxId,

        giftWrapId,

        customMessage,

        quantity,

        products

    };

    if (!giftCart) {

        giftCart = await Giftcart.create({

            userId,

            items: [newGiftItem]

        });

    } else {

        giftCart.items.push(newGiftItem);

        await giftCart.save();

    }

    return res.status(200).json({

        success: true,

        message: "Gift added to cart successfully.",

        data: {

            giftBoxId,

            giftWrapId,

            quantity,

            customMessage,

            products,

            totalWeight,

            totalAmount: calculatedTotalAmount

        }

    });

});

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

const increaseQuantity = asyncHandler(async (req, res) => {

    const userId = req.user.id;

    const { itemId } = req.body;

    if (!itemId) {
        throw new BadRequestError("Item Id is required.");
    }

    // -----------------------------
    // Normal Cart
    // -----------------------------

    let cart = await Cart.findOne({

        userId,

        "items._id": itemId

    });

    if (cart) {

        const item = cart.items.id(itemId);

        item.quantity += 1;

        await cart.save();

        return res.status(200).json({

            success: true,

            message: "Quantity increased successfully."

        });

    }

    // -----------------------------
    // Gift Cart
    // -----------------------------

    let giftCart = await Giftcart.findOne({

        userId,

        "items._id": itemId

    });

    if (giftCart) {

        const item = giftCart.items.id(itemId);

        item.quantity += 1;

        await giftCart.save();

        return res.status(200).json({

            success: true,

            message: "Quantity increased successfully."

        });

    }

    throw new NotFoundError("Cart item not found.");

});

const decreaseQuantity = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const { itemId } = req.body;

    if (!itemId) {
        throw new BadRequestError("Item Id is required.");
    }

    // -----------------------------
    // Normal Cart
    // -----------------------------

    let cart = await Cart.findOne({

        userId,

        "items._id": itemId

    });


    if (cart) {

        const item = cart.items.id(itemId);

        if (item.quantity > 1) {

            item.quantity -= 1;

            await cart.save();

            return res.status(200).json({

                success: true,

                message: "Quantity decrease successfully."

            });

        } else {
            return res.status(200).json({

                success: true,

                message: "Quantity decrease successfully."

            });
        }
    }

    // -----------------------------
    // Gift Cart
    // -----------------------------

    let giftCart = await Giftcart.findOne({

        userId,

        "items._id": itemId

    });

    if (giftCart) {

        const item = giftCart.items.id(itemId);

        if (item.quantity > 1) {

            item.quantity -= 1;

            await giftCart.save();

            return res.status(200).json({

                success: true,

                message: "Quantity dcrease successfully."

            });
        } else {
            return res.status(200).json({

                success: true,

                message: "Quantity dcrease successfully."

            });
        }

    }

    throw new NotFoundError("Cart item not found.");

});

const removeFromCart = asyncHandler(async (req, res) => {

    const userId = req.user.id;
    const { itemId } = req.body;

    if (!itemId) {
        throw new BadRequestError("Item Id is required.");
    }

    // Find in both collections
    const [cart, giftCart] = await Promise.all([

        Cart.findOne({
            userId,
            "items._id": itemId
        }),

        Giftcart.findOne({
            userId,
            "items._id": itemId
        })

    ]);

    // -----------------------------
    // Normal Cart
    // -----------------------------
    if (cart) {

        const item = cart.items.id(itemId);

        if (!item) {
            throw new NotFoundError("Cart item not found.");
        }

        item.deleteOne();

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Item removed from cart successfully."
        });

    }

    // -----------------------------
    // Gift Cart
    // -----------------------------
    if (giftCart) {

        const item = giftCart.items.id(itemId);

        if (!item) {
            throw new NotFoundError("Gift cart item not found.");
        }

        item.deleteOne();

        await giftCart.save();

        return res.status(200).json({
            success: true,
            message: "Item removed from gift cart successfully."
        });

    }

    throw new NotFoundError("Cart item not found.");

});

module.exports = {
    addToCart,
    addToGiftCart,
    getCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
};