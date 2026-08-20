const Cart = require('../models/cart.model');
const Giftcart = require('../models/giftCart.model')
const ProductImage = require('../models/productImage.model')
const ProductVariant = require('../models/productVariant.model')
const Product = require('../models/product.model')
const GiftBox = require('../models/giftBox.model')
const { asyncHandler, ConflictError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } = require('../errors/errorConfig')

const { buildCartCatalog } = require('../services/cartCatalog.service')

const buildNormalCart = require('../helpers/buildNormalCart.helper')
const buildGiftCart = require('../helpers/buildGiftCart.helper')

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

const addToGiftBoxInCart = asyncHandler(async (req, res) => {

    const userId = req.user.id
    const { giftBoxId, quantity, products } = req.body

    // ─── Validation ───────────────────────────────
    if (!giftBoxId) {
        throw new BadRequestError('Gift Box is required')
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
        throw new BadRequestError('Please select at least one honey')
    }

    // ─── GiftBox Fetch ────────────────────────────
    const giftBox = await GiftBox.findById(giftBoxId)
    if (!giftBox) {
        throw new NotFoundError('Gift Box not found')
    }

    let totalWeight = 0
    let calculatedTotalAmount = giftBox.price  // Box ka price
    let save = 0

    // ─── Har Product ki Details Fetch karo ────────
    const productDetails = await Promise.all(
        products.map(async (item) => {
            const { productId, selectedWeight } = item

            // ── Product fetch karo ────────────────
            const product = await Product.findById(productId)
                .select('product_name brand product_type floral_source imageDocumentId variantDocumentId')
                .lean()

            if (!product) {
                throw new NotFoundError(`Product not found: ${productId}`)
            }

            // ── Primary Image fetch karo ──────────
            const imageDoc = await ProductImage.findById(
                product.imageDocumentId
            ).select('images').lean()

            const primaryImage = imageDoc?.images?.find(
                img => img.is_primary === true
            ) || imageDoc?.images?.[0] || null

            // ── Variant fetch karo ────────────────
            const variantDoc = await ProductVariant.findById(
                product.variantDocumentId
            ).select('variants').lean()

            const variant = variantDoc?.variants?.find(
                v => v._id.toString() === selectedWeight.toString()
            )

            if (!variant) {
                throw new BadRequestError(`Variant not found: ${selectedWeight}`)
            }

            // ── Totals calculate karo ─────────────
            totalWeight += parseInt(variant.weight)
            calculatedTotalAmount += variant.price
            save += variant.you_save

            return {
                productId: product._id,
                product_name: product.product_name,
                brand: product.brand,
                product_type: product.product_type,
                floral_source: product.floral_source,

                // ── Image ─────────────────────────
                image: primaryImage ? {
                    image_url: primaryImage.image_url,
                    public_id: primaryImage.public_id
                } : null,

                // ── Selected Variant ──────────────
                variant: {
                    variantId: variant._id,
                    weight: variant.weight,
                    unit: variant.unit,
                    price: variant.price,
                    mrp: variant.mrp,
                    you_save: variant.you_save,
                    discount_percentage: variant.discount_percentage,
                    stock_status: variant.stock_status,
                    available_stock: variant.available_stock
                }
            }
        })
    )

    // ─── GiftCart mein Save karo ──────────────────
    let giftCart = await Giftcart.findOne({ userId })

    const newGiftItem = { giftBoxId, quantity, products }

    if (!giftCart) {
        giftCart = await Giftcart.create({
            userId,
            items: [newGiftItem]
        })
    } else {
        giftCart.items.push(newGiftItem)
        await giftCart.save()
    }

    // ─── Naya saved item ka ID lo ─────────────────
    const savedItem = giftCart.items[giftCart.items.length - 1]

    // ─── Response ─────────────────────────────────
    res.status(200).json({
        success: true,
        message: 'Gift added to cart successfully',
        data: {
            giftCartId: giftCart._id,
            giftItemId: savedItem._id,
            quantity,

            // ── GiftBox Info ──────────────────────
            giftBox: {
                giftBoxId: giftBox._id,
                name: giftBox.name,
                image: giftBox.image,
                price: giftBox.price,
                jar_count: giftBox.jar_count,
                box_type: giftBox.box_type
            },

            // ── Products with Details ─────────────
            products: productDetails,

            // ── Summary ───────────────────────────
            totalWeight: totalWeight * quantity,
            packingPrice: giftBox.price,
            totalAmount: calculatedTotalAmount * quantity,
            save: save * quantity
        }
    })
})

const getCart = asyncHandler(async (req, res) => {

    const userId = req.user.id;

    const {
        cart,
        giftCart,
        catalogMap,
        giftBoxMap
    } = await buildCartCatalog(userId);


    const normalItems = buildNormalCart(
        cart,
        catalogMap
    );

    const giftItems = buildGiftCart(
        giftCart,
        catalogMap,
        giftBoxMap
    );


    res.status(200).json({

        success: true,

        items: [

            ...normalItems,

            ...giftItems

        ]

    });

});

// const getCart = asyncHandler(async (req, res) => {
//     const { id } = req.user

//     // ─── Cart Dhundo userId se ────────────────────
//     const cart = await Cart.findOne({ userId: id }).lean()

//     // ─── Cart Nahi Hai ────────────────────────────
//     if (!cart || cart.items.length === 0) {
//         return res.status(200).json({
//             success: true,
//             message: 'Cart is empty',
//             totalItems: 0,
//             data: []
//         })
//     }

//     // ─── Har Item ke liye Details Fetch karo ──────
//     const cartItems = await Promise.all(
//         cart.items.map(async (item) => {

//             // ── Product Fetch karo ────────────────
//             const product = await Product.findById(item.productId)
//                 .select('product_name product_type floral_source imageDocumentId variantDocumentId')
//                 .lean()

//             if (!product) return null

//             // ── Primary Image Fetch karo ──────────
//             // imageDocumentId se ProductImage collection
//             const imageDocument = await ProductImage.findById(
//                 product.imageDocumentId
//             ).select('images').lean()

//             const primaryImage = imageDocument?.images?.find(
//                 img => img.is_primary === true
//             ) || imageDocument?.images?.[0] || null

//             // ── Selected Variant Fetch karo ───────
//             // variantDocumentId se ProductVariant collection
//             const variantDocument = await ProductVariant.findById(
//                 product.variantDocumentId
//             ).select('variants').lean()

//             // selectedWeight ID se exact variant dhundo
//             const selectedVariant = variantDocument?.variants?.find(
//                 v => v._id.toString() === item.selectedWeight.toString()
//             ) || null

//             return {
//                 cartItemId: item._id,
//                 quantity: item.quantity,

//                 // ── Product Info ──────────────────
//                 product: {
//                     productId: product._id,
//                     product_name: product.product_name,
//                     product_type: product.product_type,
//                     floral_source: product.floral_source,

//                     // ── Primary Image ─────────────
//                     image: primaryImage ? {
//                         image_url: primaryImage.image_url,
//                         public_id: primaryImage.public_id
//                     } : null
//                 },

//                 // ── Selected Variant Info ─────────
//                 variant: selectedVariant ? {
//                     variantId: selectedVariant._id,
//                     weight: selectedVariant.weight,
//                     unit: selectedVariant.unit,
//                     price: selectedVariant.price,
//                     mrp: selectedVariant.mrp,
//                     you_save: selectedVariant.you_save,
//                     discount_percentage: selectedVariant.discount_percentage,
//                     stock_status: selectedVariant.stock_status,
//                     available_stock: selectedVariant.available_stock,
//                     sku: selectedVariant.sku
//                 } : null
//             }
//         })
//     )

//     // ─── Null Items hatao ─────────────────────────
//     // Agar koi product delete ho gaya ho
//     const validItems = cartItems.filter(item => item !== null)

//     // ─── Cart Total Calculate karo ────────────────
//     const cartTotal = validItems.reduce((total, item) => {
//         const price = item.variant?.price || 0
//         const quantity = item.quantity || 0
//         return total + (price * quantity)
//     }, 0)

//     res.status(200).json({
//         success: true,
//         message: 'Cart fetched successfully',
//         totalItems: validItems.length,
//         cartTotal,
//         data: validItems
//     })
// })

const increaseQuantity = asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { itemId } = req.body

    // ─── Validation ───────────────────────────────
    if (!itemId) {
        throw new BadRequestError('Item ID is required')
    }

    // ─── Dono Collections mein dhundo ────────────
    const [cart, giftCart] = await Promise.all([
        Cart.findOne({ userId, 'items._id': itemId }),
        Giftcart.findOne({ userId, 'items._id': itemId })
    ])

    // ─── Normal Cart mein mila ────────────────────
    if (cart) {
        const item = cart.items.id(itemId)

        if (!item) {
            throw new NotFoundError('Cart item not found')
        }

        // Quantity +1
        item.quantity += 1

        await cart.save()

        return res.status(200).json({
            success: true,
            message: 'Quantity increased successfully',
            data: {
                itemId: itemId,
                quantity: item.quantity
            }
        })
    }

    // ─── Gift Cart mein mila ──────────────────────
    if (giftCart) {
        const item = giftCart.items.id(itemId)

        if (!item) {
            throw new NotFoundError('Gift cart item not found')
        }

        // Quantity +1
        item.quantity += 1

        await giftCart.save()

        return res.status(200).json({
            success: true,
            message: 'Gift cart quantity increased successfully',
            data: {
                itemId: itemId,
                quantity: item.quantity
            }
        })
    }

    // ─── Dono mein nahi mila ──────────────────────
    throw new NotFoundError('Item not found in cart or gift cart')
})

const decreaseQuantity = asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { itemId } = req.body

    // ─── Validation ───────────────────────────────
    if (!itemId) {
        throw new BadRequestError('Item ID is required')
    }

    // ─── Dono Collections mein dhundo ────────────
    const [cart, giftCart] = await Promise.all([
        Cart.findOne({ userId, 'items._id': itemId }),
        Giftcart.findOne({ userId, 'items._id': itemId })
    ])

    // ─── Normal Cart mein mila ────────────────────
    if (cart) {
        const item = cart.items.id(itemId)

        if (!item) {
            throw new NotFoundError('Cart item not found')
        }

        // ✅ Minimum 1 maintain karo
        if (item.quantity <= 1) {
            return res.status(200).json({
                success: true,
                message: 'Minimum quantity is 1',
                data: {
                    itemId: itemId,
                    quantity: 1
                }
            })
        }

        item.quantity -= 1
        await cart.save()

        return res.status(200).json({
            success: true,
            message: 'Quantity decreased successfully',
            data: {
                itemId: itemId,
                quantity: item.quantity
            }
        })
    }

    // ─── Gift Cart mein mila ──────────────────────
    if (giftCart) {
        const item = giftCart.items.id(itemId)

        if (!item) {
            throw new NotFoundError('Gift cart item not found')
        }

        // ✅ Minimum 1 maintain karo
        if (item.quantity <= 1) {
            return res.status(200).json({
                success: true,
                message: 'Minimum quantity is 1',
                data: {
                    itemId: itemId,
                    quantity: 1
                }
            })
        }

        item.quantity -= 1
        await giftCart.save()

        return res.status(200).json({
            success: true,
            message: 'Gift cart quantity decreased successfully',
            data: {
                itemId: itemId,
                quantity: item.quantity
            }
        })
    }

    // ─── Dono mein nahi mila ──────────────────────
    throw new NotFoundError('Item not found in cart or gift cart')
})

const removeFromCart = asyncHandler(async (req, res) => {
    const userId = req.user.id
    const { itemId } = req.body

    // ─── Validation ───────────────────────────────
    if (!itemId) {
        throw new BadRequestError('Item ID is required')
    }

    // ─── Dono Collections mein dhundo ────────────
    const [cart, giftCart] = await Promise.all([
        Cart.findOne({ userId, 'items._id': itemId }),
        Giftcart.findOne({ userId, 'items._id': itemId })
    ])

    // ─── Normal Cart mein mila ────────────────────
    if (cart) {
        const item = cart.items.id(itemId)
        if (!item) {
            throw new NotFoundError('Item not found in cart')
        }

        // Item remove karo
        item.deleteOne()

        // Items array empty ho gaya?
        if (cart.items.length === 0) {
            // Poora cart document delete karo
            await Cart.findByIdAndDelete(cart._id)

            return res.status(200).json({
                success: true,
                message: 'Item removed and cart deleted as it is now empty',
                remainingItems: 0,
                cartDeleted: true
            })
        }

        await cart.save()

        return res.status(200).json({
            success: true,
            message: 'Item removed from cart successfully',
            remainingItems: cart.items.length,
            cartDeleted: false
        })
    }

    // ─── Gift Cart mein mila ──────────────────────
    if (giftCart) {
        const item = giftCart.items.id(itemId)
        if (!item) {
            throw new NotFoundError('Item not found in gift cart')
        }

        // Item remove karo
        item.deleteOne()

        // Items array empty ho gaya?
        if (giftCart.items.length === 0) {
            // Poora gift cart document delete karo
            await Giftcart.findByIdAndDelete(giftCart._id)

            return res.status(200).json({
                success: true,
                message: 'Item removed and gift cart deleted as it is now empty',
                remainingItems: 0,
                cartDeleted: true
            })
        }

        await giftCart.save()

        return res.status(200).json({
            success: true,
            message: 'Item removed from gift cart successfully',
            remainingItems: giftCart.items.length,
            cartDeleted: false
        })
    }

    // ─── Dono mein nahi mila ──────────────────────
    throw new NotFoundError('Item not found in cart or gift cart')
})


const getCartProductCount = asyncHandler(async (req, res) => {
    const { id } = req.user

    // ─── Dono Collections ek saath fetch karo ─────
    const [cart, giftCart] = await Promise.all([
        Cart.findOne({ userId: id }).select('items'),
        Giftcart.findOne({ userId: id }).select('items')
    ])

    // ─── Count karo ───────────────────────────────
    const cartCount = cart?.items?.length || 0
    const giftCartCount = giftCart?.items?.length || 0
    const totalCount = cartCount + giftCartCount

    res.status(200).json({
        success: true,
        message: 'Cart count fetched successfully',
        data: {
            cartCount,       // ← Normal cart items
            giftCartCount,   // ← Gift cart items
            totalCount       // ← Dono ka total
        }
    })
})


module.exports = {
    addToCart,
    addToGiftBoxInCart,
    getCart,
    getCartProductCount,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
};