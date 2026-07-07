const Product = require('../models/product.model')
const ProductImage = require("../models/productImage.model")
const ProductVariant = require('../models/productVariant.model')
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary')

const { asyncHandler, BadRequestError, UnauthorizedError, NotFoundError, ForbiddenError, ConflictError, ValidationError } = require('../errors/errorConfig')

const createProduct = asyncHandler(async (req, res) => {
    const { product_name, slug, flavor, description, manufacturer_information } = req.body

    // Check if the product already exists
    const existingProduct = await Product.findOne({ slug })
    if (existingProduct) {
        throw new ConflictError('Product with this slug already exists')
    }

    // Create the new product
    const product = await Product.create({
        product_name,
        slug,
        flavor,
        description,
        manufacturer_information
    })

    res.status(201).json({
        success: true,
        data: product
    })
})

const getAllProducts = asyncHandler(async (req, res) => {
    const products = await Product.find().populate('images').populate('variants').populate('reviews')

    res.status(200).json({
        success: true,
        data: products
    })
})

const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params

    const product = await Product.findById(id).populate('images').populate('variants').populate('reviews')

    if (!product) {
        throw new NotFoundError('Product not found')
    }

    res.status(200).json({
        success: true,
        data: product
    })
})

const uploadProductImages = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        throw new BadRequestError('No files uploaded')
    }

    const productId = req.params.id
    const product = await Product.findById(productId)
    if (!product) {
        throw new NotFoundError('Product not found')
    }

    const uploadedImages = []
    for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, 'products')
        const productImage = await ProductImage.create({
            product: productId,
            image_url: result.secure_url,
            public_id: result.public_id,
        })
        uploadedImages.push(productImage)
    }

    // Update the product with the new images
    product.images.push(...uploadedImages.map(img => img._id))
    await product.save()

    res.status(200).json({
        success: true,
        data: uploadedImages
    })
})

const createProductVariant = asyncHandler(async (req, res) => {
    const productId = req.params.id
    const { quantity, sku, price, mrp, discount } = req.body

    const product = await Product.findById(productId)
    if (!product) {
        throw new NotFoundError('Product not found')
    }

    const variant = await ProductVariant.create({
        product: productId,
        quantity,
        sku,
        price,
        mrp,
        discount
    })

    // Add the variant to the product's variants array
    product.variants.push(variant._id)
    await product.save()

    res.status(201).json({
        success: true,
        data: variant
    })
});

const updateProductimage = asyncHandler(async (req, res) => {
    const { productId, imageId } = req.params;
    const file = req.file;

    const product = await Product.findById(productId);
    if (!product) {
        throw new NotFoundError('Product not found');
    }

    const image = await ProductImage.findById(imageId);
    if (!image) {
        throw new NotFoundError('Image not found');
    }

    // Check if the image belongs to the product
    if (!product.images.includes(imageId)) {
        throw new BadRequestError('Image does not belong to this product');
    }

    // delete the old image from Cloudinary
    await deleteFromCloudinary(image.public_id);

    // upload the new image to Cloudinary
    const result = await uploadToCloudinary(file.buffer, 'products');

    // update the image details
    image.image_url = result.secure_url;
    image.public_id = result.public_id;
    await image.save();

    res.status(200).json({
        success: true,
        data: image
    });

});

const updateProductVariant = asyncHandler(async (req, res) => {
    const { productId, variantId } = req.params
    const { quantity, sku, price, mrp, discount } = req.body

    const product = await Product.findById(productId)

    if (!product) {
        throw new NotFoundError('Product not found')
    }

    const variant = await ProductVariant.findOne({
        _id: variantId,
        product: productId  // ← Yeh check zaruri hai!
    })

    if (!variant) {
        throw new NotFoundError(
            'Variant not found or does not belong to this product'
        )
    }

    const updateFields = {}
    if (quantity !== undefined) updateFields.quantity = quantity
    if (sku !== undefined) updateFields.sku = sku
    if (price !== undefined) updateFields.price = price
    if (mrp !== undefined) updateFields.mrp = mrp
    if (discount !== undefined) updateFields.discount = discount

    // Kuch update karne ko hai?
    if (Object.keys(updateFields).length === 0) {
        throw new BadRequestError('No fields provided to update')
    }

    const updatedVariant = await ProductVariant.findByIdAndUpdate(
        variantId,
        { $set: updateFields }, // ← $set use karo
        { new: true }
    )

    res.status(200).json({
        success: true,
        message: 'Variant updated successfully',
        data: updatedVariant
    })
});


module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    uploadProductImages,
    createProductVariant,
    updateProductimage,
    updateProductVariant
}