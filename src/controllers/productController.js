const Product = require('../models/product.model')
const ProductImage = require("../models/productImage.model")
const ProductVariant = require('../models/productVariant.model')
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary')

const { asyncHandler, BadRequestError, UnauthorizedError, NotFoundError, ForbiddenError, ConflictError, ValidationError } = require('../errors/errorConfig')

const createProduct = asyncHandler(async (req, res) => {
    const { product_name, slug, flavor, description, manufacturer_information, categoryId } = req.body

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
        manufacturer_information,
        category: categoryId
    })

    res.status(201).json({
        success: true,
        data: product
    })
})

const getAllProducts = asyncHandler(async (req, res) => {
    // 1. .lean() add kiya taaki hum data ko JS array ki tarah manipulate kar sakein
    const products = await Product.find({ is_active: true })
        .populate({
            path: 'category',
            select: 'category_name slug description -_id'
        })
        .populate({
            path: 'images',
            select: 'images -_id'
        })
        .populate({
            path: 'variants',
            select: 'variants -_id'
        })
        .populate({
            path: 'reviews',
            select: 'rating review -_id'
        })
        .lean(); // <-- Super Important!

    // 2. Loop chalakar har product ki images array me se sirf pehli image nikaal li
    const formattedProducts = products.map(product => {
        let singleImage = null;
        let singleVariant = null;

        // Check kiya ki images object aur uske andar ka images array exist karta hai ya nahi
        if (product.images && product.images.images && product.images.images.length > 0) {
            singleImage = product.images.images; // Sirf pehla image object uthaya
        }
        // Variants array se 1st variant nikala
        if (product.variants && product.variants.variants && product.variants.variants.length > 0) {
            singleVariant = product.variants.variants;
        }

        return {
            ...product,
            images: singleImage, // Pura object hata kar sirf single image object set kar diya
            variants: singleVariant
        };
    });

    res.status(200).json({
        success: true,
        data: formattedProducts // Modified data bheja
    });
});

const getProductsByPagination = asyncHandler(async (req, res) => {

    // ─── Page aur Limit Query se lo ─────────────
    let { page, limit } = req.query

    page = Number(page) || 1  // Default page 1
    limit = Number(limit) || 4  // Default 4 products

    // ─── Validation ─────────────────────────────
    if (page < 1) {
        throw new BadRequestError('Page number must be greater than 0')
    }

    // ─── Skip Calculate karo ────────────────────
    // Page 1 → skip 0  → product 1,2,3,4
    // Page 2 → skip 4  → product 5,6,7,8
    // Page 3 → skip 8  → product 9,10,11,12
    const skip = (page - 1) * limit

    // ─── Total Products Count ────────────────────
    const totalProducts = await Product.countDocuments({
        is_active: true
    })

    // ─── Total Pages Calculate karo ─────────────
    const totalPages = Math.ceil(totalProducts / limit)

    // ─── Page exist karta hai? ───────────────────
    if (page > totalPages) {
        throw new BadRequestError(
            `Page ${page} does not exist. Total pages: ${totalPages}`
        )
    }

    // ─── Products Fetch karo ─────────────────────
    const products = await Product.find({ is_active: true })
        .populate({
            path: 'images',
            select: 'images -_id'
        })
        .populate({
            path: 'variants',
            select: 'variants -_id'
        })
        .populate({
            path: 'category',
            select: 'category_name slug -_id'
        })
        .sort({ createdAt: -1 }) // Nayi products pehle
        .skip(skip)              // Kitne skip karne hain
        .limit(limit)            // Kitne dikhane hain

    // ─── Response ────────────────────────────────
    res.status(200).json({
        success: true,
        message: 'Products fetched successfully',
        pagination: {
            currentPage: page,
            totalPages,
            totalProducts,
            limit,
            hasNextPage: page < totalPages,  // Next button enable?
            hasPrevPage: page > 1            // Prev button enable?
        },
        data: products
    })
})

const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // 1. .lean() add kiya taaki pure JavaScript object mile jise hum modify kar sakein
    const product = await Product.findById(id)
        .populate({
            path: 'category',
            select: 'category_name slug description -_id'
        })
        .populate({
            path: 'images',
            select: 'images -_id'
        })
        .populate({
            path: 'variants',
            select: 'variants -_id'
        })
        .populate({
            path: 'reviews',
            select: 'rating review -_id'
        })
        .lean(); // <-- Important for modifying the object

    if (!product) {
        throw new NotFoundError('Product not found');
    }

    // 2. Single image aur single variant nikalne ka logic
    let singleImage = null;
    let singleVariant = null;

    if (product.images && product.images.images && product.images.images.length > 0) {
        singleImage = product.images.images;
    }

    if (product.variants && product.variants.variants && product.variants.variants.length > 0) {
        singleVariant = product.variants.variants;
    }

    // 3. Original objects ko flat single object se replace kar diya
    product.images = singleImage;
    product.variants = singleVariant;

    res.status(200).json({
        success: true,
        data: product
    });
});

const uploadProductImages = asyncHandler(async (req, res) => {

    if (!req.files || req.files.length === 0) {
        throw new BadRequestError("No files uploaded.");
    }

    const { id: productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
        throw new NotFoundError("Product not found.");
    }

    // Check if ProductImage document already exists
    let imageDocument = await ProductImage.findOne({
        product: productId
    });

    // Upload all images to Cloudinary
    const uploadedImages = [];

    for (const file of req.files) {

        const result = await uploadToCloudinary(
            file.buffer,
            "products"
        );

        uploadedImages.push({

            public_id: result.public_id,

            image_url: result.secure_url,

            is_primary: false

        });

    }

    // First Image Document for this Product
    if (!imageDocument) {

        // Make first uploaded image primary
        if (uploadedImages.length > 0) {
            uploadedImages[0].is_primary = true;
        }

        imageDocument = await ProductImage.create({

            product: productId,

            images: uploadedImages

        });

        // Save ProductImage document id in Product
        product.images = imageDocument._id;

        await product.save();

    } else {

        // If no primary image exists
        if (!imageDocument.images.some(img => img.is_primary)) {
            uploadedImages[0].is_primary = true;
        }

        imageDocument.images.push(...uploadedImages);

        await imageDocument.save();

    }

    res.status(201).json({

        success: true,

        message: "Product images uploaded successfully.",

        data: imageDocument

    });

});

const updateProductImage = asyncHandler(async (req, res) => {

    const { productId, imageId } = req.params;
    const file = req.file;

    if (!file) {
        throw new BadRequestError("Please upload an image.");
    }

    // Check Product
    const product = await Product.findById(productId);

    if (!product) {
        throw new NotFoundError("Product not found.");
    }

    // Find Image Document
    const imageDocument = await ProductImage.findOne({
        product: productId
    });

    if (!imageDocument) {
        throw new NotFoundError(
            "Product images not found."
        );
    }

    // Find Image inside images array
    const image = imageDocument.images.id(imageId);

    if (!image) {
        throw new NotFoundError(
            "Image not found."
        );
    }

    // Delete old image from Cloudinary
    const cloudinaryResponse = await deleteFromCloudinary(
        image.public_id
    );

    if (
        cloudinaryResponse.result !== "ok" &&
        cloudinaryResponse.result !== "not found"
    ) {
        throw new ServiceUnavailableError(
            "Unable to delete old image from Cloudinary."
        );
    }

    // Upload new image
    const result = await uploadToCloudinary(
        file.buffer,
        "products"
    );

    // Update Database
    image.public_id = result.public_id;
    image.image_url = result.secure_url;

    await imageDocument.save();

    res.status(200).json({

        success: true,

        message: "Product image updated successfully.",

        data: image

    });

});

const createProductVariant = asyncHandler(async (req, res) => {

    const { id } = req.params;

    const {
        quantity,
        sku,
        price,
        mrp,
        discount
    } = req.body;

    const product = await Product.findById(id);

    if (!product) {
        throw new NotFoundError("Product not found");
    }

    let variant = await ProductVariant.findOne({
        product: id
    });

    if (!variant) {

        variant = await ProductVariant.create({

            product: id,

            variants: [{

                quantity,

                sku,

                price,

                mrp,

                discount

            }]

        });

        product.variants = variant._id;

        await product.save();

    } else {

        const alreadyExists =
            variant.variants.find(
                item => item.quantity === quantity
            );

        if (alreadyExists) {
            throw new BadRequestError(
                "Variant already exists."
            );
        }

        variant.variants.push({

            quantity,

            sku,

            price,

            mrp,

            discount

        });

        await variant.save();

    }

    res.status(201).json({

        success: true,

        data: variant

    });

});

const updateProductVariant = asyncHandler(async (req, res) => {

    const { productId } = req.params;

    const { quantity, price, mrp, discount } = req.body;

    // Validate quantity
    if (!quantity) {
        throw new BadRequestError("Quantity is required.");
    }

    // Find Variant Document using Product Id
    const variantDocument = await ProductVariant.findOne({
        product: productId
    });

    if (!variantDocument) {
        throw new NotFoundError("Product variant not found.");
    }

    // Find particular quantity
    const variant = variantDocument.variants.find(
        item => item.quantity === quantity
    );

    if (!variant) {
        throw new NotFoundError(
            `Variant with quantity '${quantity}' not found.`
        );
    }

    // Update only allowed fields
    if (price !== undefined) {
        variant.price = price;
    }

    if (mrp !== undefined) {
        variant.mrp = mrp;
    }

    if (discount !== undefined) {
        variant.discount = discount;
    }

    await variantDocument.save();

    res.status(200).json({

        success: true,

        message: "Product variant updated successfully.",

        data: variant

    });

});


module.exports = {
    createProduct,
    getAllProducts,
    getProductsByPagination,
    getProductById,
    uploadProductImages,
    createProductVariant,
    updateProductImage,
    updateProductVariant
}