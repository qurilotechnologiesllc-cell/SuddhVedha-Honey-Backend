const Cart = require('../models/cart.model');
// const Giftcart = require('../models/giftCart.model')
const ProductImage = require('../models/productImage.model')
const ProductVariant = require('../models/productVariant.model')
const Product = require('../models/product.model')
// const GiftBox = require('../models/giftBox.model')
const { asyncHandler, ConflictError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } = require('../errors/errorConfig')

// const { buildCartCatalog } = require('../services/cartCatalog.service')

// const buildNormalCart = require('../helpers/buildNormalCart.helper')
// const buildGiftCart = require('../helpers/buildGiftCart.helper')

const addToCart = asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { productId, selectedWeight, quantity } = req.body

    // ─── Validation ───────────────────────────────
    if (!productId || !selectedWeight || !quantity) {
        throw new BadRequestError(
            'productId, selectedWeight and quantity are required'
        )
    }

    if (quantity < 1) {
        throw new BadRequestError('Quantity cannot be less than 1')
    }

    // ─── Product Exist Karta Hai? ─────────────────
    const product = await Product.findById(productId)
        .select('product_name product_type floral_source imageDocumentId variantDocumentId')
        .lean()

    if (!product) {
        throw new NotFoundError('Product not found')
    }

    // ─── Image Fetch karo ─────────────────────────
    // imageDocumentId se ProductImage collection mein dhundo
    const imageDocument = await ProductImage.findById(
        product.imageDocumentId
    ).select('images').lean()

    // Sirf primary image lo
    const primaryImage = imageDocument?.images?.find(
        img => img.is_primary === true
    ) || imageDocument?.images?.[0] || null

    // ─── Variant Fetch karo ───────────────────────
    // variantDocumentId se ProductVariant collection mein dhundo
    const variantDocument = await ProductVariant.findById(
        product.variantDocumentId
    ).select('variants').lean()

    // selectedWeight ID se exact variant dhundo
    const selectedVariant = variantDocument?.variants?.find(
        v => v._id.toString() === selectedWeight.toString()
    ) || null

    if (!selectedVariant) {
        throw new NotFoundError('Selected variant not found')
    }

    // ─── Cart Dhundo ya Banao ─────────────────────
    let cart = await Cart.findOne({ userId })
    if (!cart) {
        cart = new Cart({ userId, items: [] })
    }

    // ─── Same product + Same weight check ─────────
    const itemIndex = cart.items.findIndex(item =>
        item.productId.toString() === productId &&
        item.selectedWeight.toString() === selectedWeight
    )

    if (itemIndex > -1) {
        // ✅ Same product + Same weight → quantity badhao
        cart.items[itemIndex].quantity += quantity
    } else {
        // ✅ Naya item add karo
        cart.items.push({ productId, selectedWeight, quantity })
    }

    await cart.save()

    // ─── Response Format karo ─────────────────────
    res.status(200).json({
        success: true,
        message: 'Item added to cart successfully',
        data: {
            cartId: cart._id,

            // ── Added Item Details ─────────────────
            item: {
                cartItemId: cart.items[
                    itemIndex > -1 ? itemIndex : cart.items.length - 1
                ]._id,
                quantity: itemIndex > -1
                    ? cart.items[itemIndex].quantity
                    : quantity,

                // ── Product Info ───────────────────
                product: {
                    productId: product._id,
                    product_name: product.product_name,
                    product_type: product.product_type,
                    floral_source: product.floral_source,

                    // ── Primary Image ──────────────
                    image: primaryImage ? {
                        image_url: primaryImage.image_url,
                        public_id: primaryImage.public_id
                    } : null,
                },

                // ── Selected Variant Info ──────────
                variant: {
                    variantId: selectedVariant._id,
                    weight: selectedVariant.weight,
                    unit: selectedVariant.unit,
                    price: selectedVariant.price,
                    mrp: selectedVariant.mrp,
                    you_save: selectedVariant.you_save,
                    discount_percentage: selectedVariant.discount_percentage,
                    stock_status: selectedVariant.stock_status,
                    available_stock: selectedVariant.available_stock
                }
            }
        }
    })
})

// const addToGiftCart = asyncHandler(async (req, res) => {

//     const userId = req.user.id;

//     const {
//         giftBoxId,
//         customMessage = "",
//         quantity,
//         products
//     } = req.body;

//     let totalWeight = 0;
//     let calculatedTotalAmount = 0;
//     let save = 0;

//     // -----------------------------
//     // Basic Validation
//     // -----------------------------

//     if (!giftBoxId) {
//         throw new BadRequestError("Gift Box and Gift Wrap is required.");
//     }

//     if (giftBoxId) {
//         const giftBox = await GiftBox.findById(giftBoxId);

//         if (!giftBox) {
//             throw new NotFoundError("Gift Box not found.");
//         }
//         calculatedTotalAmount += giftBox.price
//     }


//     if (!products || !Array.isArray(products) || products.length === 0) {
//         throw new BadRequestError("Please select at least one honey.");
//     }


//     const productIds = products.map(item => item.productId);

//     const variantDocuments = await ProductVariant.find({
//         product: { $in: productIds }
//     });

//     const variantMap = new Map();

//     variantDocuments.forEach(doc => {
//         variantMap.set(doc.product.toString(), doc);
//     });


//     for (const item of products) {

//         const { productId, selectedWeight } = item;

//         // Memory se Variant Document nikalo
//         const variantDocument = variantMap.get(productId.toString());

//         if (!variantDocument) {
//             throw new NotFoundError("Product variant not found.");
//         }

//         // Embedded variant find karo
//         const variant = variantDocument.variants.id(selectedWeight);

//         if (!variant) {
//             throw new BadRequestError("Selected variant is invalid.");
//         }

//         // Weight
//         const weight = parseInt(variant.weight);

//         totalWeight += weight;

//         // variant Price
//         calculatedTotalAmount += variant.price;

//         save += variant.you_save

//     }


//     // -----------------------------
//     // Find Gift Cart
//     // -----------------------------

//     let giftCart = await Giftcart.findOne({ userId });

//     const newGiftItem = {

//         giftBoxId,

//         customMessage,

//         quantity,

//         products

//     };

//     if (!giftCart) {

//         giftCart = await Giftcart.create({

//             userId,

//             items: [newGiftItem]

//         });

//     } else {

//         giftCart.items.push(newGiftItem);

//         await giftCart.save();

//     }

//     return res.status(200).json({

//         success: true,

//         message: "Gift added to cart successfully.",

//         data: {

//             giftBoxId,

//             quantity,

//             customMessage,

//             products,

//             totalWeight,

//             totalAmount: calculatedTotalAmount,

//             save

//         }

//     });

// });

// const getCart = asyncHandler(async (req, res) => {

//     const userId = req.user.id;

//     const {
//         cart,
//         giftCart,
//         catalogMap,
//         giftBoxMap
//     } = await buildCartCatalog(userId);

//     const normalItems = buildNormalCart(
//         cart,
//         catalogMap
//     );

//     const giftItems = buildGiftCart(
//         giftCart,
//         catalogMap,
//         giftBoxMap
//     );


//     res.status(200).json({

//         success: true,

//         items: [

//             ...normalItems,

//             ...giftItems

//         ]

//     });

// });

const getCart = asyncHandler(async (req, res) => {
    const { id } = req.user

    // ─── Cart Dhundo userId se ────────────────────
    const cart = await Cart.findOne({ userId: id }).lean()

    // ─── Cart Nahi Hai ────────────────────────────
    if (!cart || cart.items.length === 0) {
        return res.status(200).json({
            success: true,
            message: 'Cart is empty',
            totalItems: 0,
            data: []
        })
    }

    // ─── Har Item ke liye Details Fetch karo ──────
    const cartItems = await Promise.all(
        cart.items.map(async (item) => {

            // ── Product Fetch karo ────────────────
            const product = await Product.findById(item.productId)
                .select('product_name product_type floral_source imageDocumentId variantDocumentId')
                .lean()

            if (!product) return null

            // ── Primary Image Fetch karo ──────────
            // imageDocumentId se ProductImage collection
            const imageDocument = await ProductImage.findById(
                product.imageDocumentId
            ).select('images').lean()

            const primaryImage = imageDocument?.images?.find(
                img => img.is_primary === true
            ) || imageDocument?.images?.[0] || null

            // ── Selected Variant Fetch karo ───────
            // variantDocumentId se ProductVariant collection
            const variantDocument = await ProductVariant.findById(
                product.variantDocumentId
            ).select('variants').lean()

            // selectedWeight ID se exact variant dhundo
            const selectedVariant = variantDocument?.variants?.find(
                v => v._id.toString() === item.selectedWeight.toString()
            ) || null

            return {
                cartItemId: item._id,
                quantity: item.quantity,

                // ── Product Info ──────────────────
                product: {
                    productId: product._id,
                    product_name: product.product_name,
                    product_type: product.product_type,
                    floral_source: product.floral_source,

                    // ── Primary Image ─────────────
                    image: primaryImage ? {
                        image_url: primaryImage.image_url,
                        public_id: primaryImage.public_id
                    } : null
                },

                // ── Selected Variant Info ─────────
                variant: selectedVariant ? {
                    variantId: selectedVariant._id,
                    weight: selectedVariant.weight,
                    unit: selectedVariant.unit,
                    price: selectedVariant.price,
                    mrp: selectedVariant.mrp,
                    you_save: selectedVariant.you_save,
                    discount_percentage: selectedVariant.discount_percentage,
                    stock_status: selectedVariant.stock_status,
                    available_stock: selectedVariant.available_stock,
                    sku: selectedVariant.sku
                } : null
            }
        })
    )

    // ─── Null Items hatao ─────────────────────────
    // Agar koi product delete ho gaya ho
    const validItems = cartItems.filter(item => item !== null)

    // ─── Cart Total Calculate karo ────────────────
    const cartTotal = validItems.reduce((total, item) => {
        const price = item.variant?.price || 0
        const quantity = item.quantity || 0
        return total + (price * quantity)
    }, 0)

    res.status(200).json({
        success: true,
        message: 'Cart fetched successfully',
        totalItems: validItems.length,
        cartTotal,
        data: validItems
    })
})

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

const getCartProductCount = asyncHandler(async (req, res) => {
    const { id } = req.user

    if (!id) {
        throw new BadRequestError('UserId Not found!')
    }

    const cartCount = await Cart.findOne({ userId: id }).select('items').countDocuments()

    res.status(200).json({
        success: true,
        message: 'Cart count fetched successfully',
        data: {
            cartCount
        }
    })
})


module.exports = {
    addToCart,
    getCart,
    getCartProductCount,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
};