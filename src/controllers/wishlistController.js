const Wishlist = require('../models/wishlist.model');
const Product = require('../models/product.model')
const User = require('../models/user.model')
const ProductImage = require('../models/productImage.model')
const ProductVariant = require('../models/productVariant.model')

const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } = require("../errors/errorConfig")

const addProductToWishlist = asyncHandler(async (req, res) => {
    const { productId } = req.params
    const userId = req.user.id

    const user = await User.findById(userId)

    if (!user) {
        throw new NotFoundError('User not found')
    }

    let wishlist = await Wishlist.findOne({ userId })

    if (!wishlist) {
        wishlist = new Wishlist({ userId, products: [] })
    }

    const alreadyProductExists = wishlist.products.findIndex((item) => item.productId.toString() === productId)

    if (alreadyProductExists !== -1) {
        throw new ConflictError(' Product already exists in the wishlist')
    }

    const product = await Product.findById(productId)

    if (!product) {
        throw new NotFoundError('Product not found')
    }

    wishlist.products.push({ productId, addedAt: new Date() })
    await wishlist.save()

    res.status(200).json({ message: 'Product added to wishlist successfully', data: wishlist }) 

})

const removeProductFromWishlist = asyncHandler(async (req, res) => {
    const { productId } = req.params
    const userId = req.user.id

    const user = await User.findById(userId)

    if (!user) {
        throw new NotFoundError('User not found')
    }

    const wishlist = await Wishlist.findOne({ userId })

    if (!wishlist) {
        throw new NotFoundError('Wishlist not found for the user')
    }

    const productIndex = wishlist.products.findIndex((item) => item.productId.toString() === productId)

    if (productIndex === -1) {
        throw new NotFoundError('Product not found in the wishlist')
    }

    wishlist.products.splice(productIndex, 1)
    await wishlist.save()

    res.status(200).json({ message: 'Product removed from wishlist successfully', data: wishlist })
})

const getWishlist = asyncHandler(async (req, res) => {
    const userId = req.user.id

    // User check
    const user = await User.findById(userId)
    if (!user) {
        throw new NotFoundError('User not found')
    }

    // Wishlist + nested populate
    const wishlist = await Wishlist.findOne({ userId })
        .populate({
            path: 'products.productId',
            populate: [
                {
                    path: 'imageDocumentId',
                    model: 'ProductImage',   // ← Model name explicitly do
                    select: 'images -_id'
                },
                {
                    path: 'variantDocumentId',
                    model: 'ProductVariant', // ← Model name explicitly do
                    select: 'variants -_id'
                }
            ]
        })

    if (!wishlist) {
        throw new NotFoundError('Wishlist not found')
    }

    res.status(200).json({
        success: true,
        message: 'Wishlist fetched successfully',
        data: wishlist
    })
})

module.exports = {
    addProductToWishlist,
    removeProductFromWishlist,
    getWishlist
}