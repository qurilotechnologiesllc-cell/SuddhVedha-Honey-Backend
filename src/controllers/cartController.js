const Cart = require('../models/cart.model');
const ProductImage = require('../models/productImage.model')
const ProductVariant = require('../models/productVariant.model')
const Product = require('../models/product.model')
const { asyncHandler, ConflictError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } = require('../errors/errorConfig')

const addToCart = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { productId, selectedWeight, quantity } = req.body;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
        cart = new Cart({ userId, items: [] });
    }

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

    if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
    } else {
        cart.items.push({ productId, selectedWeight, quantity });
    }

    await cart.save();
    res.status(200).json({ message: 'Item added to cart successfully', data: cart });
});

const getCart = asyncHandler(async (req, res) => {
    const userId = req.user.id

    // ─── Cart fetch karo ─────────────────────────
    const cart = await Cart.findOne({ userId })
        .populate('items.productId',
            'product_name brand flavor description imageDocumentId variantDocumentId'
        )

    if (!cart) {
        throw new NotFoundError('Cart not found for the user')
    }
    

    // ─── Har item ke liye image + variant fetch ───
    const itemsWithDetails = await Promise.all(
        cart.items.map(async (item) => {
            const product = item.productId

            // ── Step 1: Image fetch karo ──────────
            // Product ki images field mein main
            // document ka ID hai
            const imageDocument = await ProductImage.findById(
                product.imageDocumentId
            ).select('images')

            // Sirf pehli image chahiye cart ke liye
            const firstImage = imageDocument?.images?.[0] || null

            // ── Step 2: Variant fetch karo ────────
            // Product ki variants field mein main
            // document ka ID hai
            const variantDocument = await ProductVariant.findById(
                product.variantDocumentId
            ).select('variants')

            // Cart mein save variantId se
            // specific variant dhundo
            const selectedVariant = variantDocument?.variants.find(
                v => v._id.toString() === item.selectedWeight.toString()
            ) || null

            // ── Step 3: Response format karo ──────
            return {
                cartItemId: item._id,
                quantity: item.quantity,
                product: {
                    _id: product._id,
                    product_name: product.product_name,
                    brand: product.brand,
                    flavor: product.flavor,
                    description: product.description,

                    // Sirf pehli image
                    image: firstImage ? {
                        image_url: firstImage.image_url,
                    } : null,

                    // Selected variant only
                    variant: selectedVariant ? {
                        weight: selectedVariant.weight,
                        price: selectedVariant.price,
                        mrp: selectedVariant.mrp,
                        discount: selectedVariant.discount,
                        sku: selectedVariant.sku
                    } : null
                }
            }
        })
    )

    res.status(200).json({
        success: true,
        message: 'Cart fetched successfully',
        data: {
            _id: cart._id,
            items: itemsWithDetails
        }
    })
})

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