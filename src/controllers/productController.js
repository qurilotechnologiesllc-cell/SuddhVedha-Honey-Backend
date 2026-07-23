const Product = require('../models/product.model')
const ProductImage = require("../models/productImage.model")
const ProductVariant = require('../models/productVariant.model')
const cloudinary = require('../config/cloudinary')
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary')

const { asyncHandler, BadRequestError, UnauthorizedError, NotFoundError, ForbiddenError, ConflictError, ValidationError } = require('../errors/errorConfig')

const createProduct = asyncHandler(async (req, res) => {

    const {
        product_name,
        brand,
        product_type,
        floral_source,
        description,
        key_benefits,
        ingredients,
        manufacturer_information,
        shelf_life,
        storage_instructions,
        country_of_origin,
        fssai_license_number,
        batch_number,
        categoryId
    } = req.body;


    // -----------------------------------------
    // Check Product With Same Batch Number
    // -----------------------------------------

    const existingProduct = await Product.findOne({
        batch_number
    });

    if (existingProduct) {
        throw new ConflictError(
            "Product with this batch number already exists."
        );
    }


    // -----------------------------------------
    // Create Product
    // -----------------------------------------

    const product = await Product.create({

        product_name,

        brand,

        product_type,

        floral_source,

        description,

        key_benefits,

        ingredients,

        manufacturer_information,

        shelf_life,

        storage_instructions,

        country_of_origin,

        fssai_license_number,

        batch_number,

        categoryId

    });


    // -----------------------------------------
    // Response
    // -----------------------------------------

    return res.status(201).json({

        success: true,

        message: "Product created successfully.",

        data: product

    });

});

const getAllProducts = asyncHandler(async (req, res) => {
    // 1. .lean() add kiya taaki hum data ko JS array ki tarah manipulate kar sakein
    const products = await Product.find({ is_active: true })
        .populate({
            path: 'categoryId',
            select: 'category_name slug description -_id'
        })
        .populate({
            path: 'imageDocumentId',
            select: 'images -_id'
        })
        .populate({
            path: 'variantDocumentId',
            select: 'variants -_id'
        })
        .select('-createdAt -updatedAt -__v')
        .lean(); // <-- Super Important!

    // 2. Loop chalakar har product ki images array me se sirf pehli image nikaal li
    const formattedProducts = products.map(product => {
        let singleImage = null;
        let singleVariant = null;

        // Check kiya ki images object aur uske andar ka images array exist karta hai ya nahi
        if (product.imageDocumentId && product.imageDocumentId.images && product.imageDocumentId.images.length > 0) {
            singleImage = product.imageDocumentId.images; // Sirf pehla image object uthaya
        }
        // Variants array se 1st variant nikala
        if (product.variantDocumentId && product.variantDocumentId.variants && product.variantDocumentId.variants.length > 0) {
            singleVariant = product.variantDocumentId.variants;
        }

        return {
            ...product,
            imageDocumentId: singleImage, // Pura object hata kar sirf single image object set kar diya
            variantDocumentId: singleVariant
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
            path: 'imageDocumentId',
            select: 'images -_id'
        })
        .populate({
            path: 'variantDocumentId',
            select: 'variants -_id'
        })
        .populate({
            path: 'categoryId',
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
            path: 'categoryId',
            select: 'category_name slug description -_id'
        })
        .populate({
            path: 'imageDocumentId',
            select: 'images -_id'
        })
        .populate({
            path: 'variantDocumentId',
            select: 'variants -_id'
        })
        .populate({
            path: 'videoDocumentId',
            select: 'videos -_id'
        })
        .select('-createdAt -updatedAt -__v')
        .lean(); // <-- Important for modifying the object

    if (!product) {
        throw new NotFoundError('Product not found');
    }

    // 2. Single image aur single variant nikalne ka logic
    let productImages = null;
    let productVariants = null;
    let productvideos = null;

    if (product.imageDocumentId && product.imageDocumentId.images && product.imageDocumentId.images.length > 0) {
        productImages = product.imageDocumentId.images;
    }

    if (product.variantDocumentId && product.variantDocumentId.variants && product.variantDocumentId.variants.length > 0) {
        productVariants = product.variantDocumentId.variants;
    }

    if (product.videoDocumentId && product.videoDocumentId.videos && product.videoDocumentId.videos.length > 0) {
        productvideos = product.videoDocumentId.videos;
    }

    const videoData = productvideos?.map((video) => {
    
            const videoUrl = cloudinary.url(video.public_id, {
                resource_type: "video",
                secure: true
            });
    
            const thumbnailUrl = cloudinary.url(video.public_id, {
                resource_type: "video",
                secure: true,
                format: "jpg",
                transformation: [
                    {
                        start_offset: "2"
                    },
                    {
                        width: 500,
                        crop: "fill"
                    }
                ]
            });
    
            return {
    
                _id: video._id,
    
                duration: video.duration,
    
                format: video.format,
    
                video_url: videoUrl,
    
                thumbnail_url: thumbnailUrl
    
            };
    
        });
    

    // 3. Original objects ko flat single object se replace kar diya
    product.imageDocumentId = productImages;
    product.variantDocumentId = productVariants;
    product.videoDocumentId = videoData

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
        product.imageDocumentId = imageDocument._id;

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
        mrp,
        price,
        discount_type,
        tax,

        sku,
        barcode,

        weight,
        unit,

        available_stock,
        low_stock_alert,

        stock_status,
        allow_backorders

    } = req.body;


    // ==========================================
    // Validate Product
    // ==========================================

    const product = await Product.findById(id);

    if (!product) {
        throw new NotFoundError("Product not found.");
    }


    // ==========================================
    // Basic Pricing Validation
    // ==========================================

    if (Number(price) > Number(mrp)) {
        throw new BadRequestError(
            "Selling price cannot be greater than MRP."
        );
    }


    // ==========================================
    // Calculate You Save
    // ==========================================

    const calculatedYouSave =
        Number(mrp) - Number(price);


    // ==========================================
    // Calculate Discount Value
    // ==========================================

    let calculatedDiscountValue = 0;

    if (discount_type === "percentage") {

        calculatedDiscountValue =
            (calculatedYouSave / Number(mrp)) * 100;

        calculatedDiscountValue =
            Number(calculatedDiscountValue.toFixed(2));

    } else if (discount_type === "fixed") {

        calculatedDiscountValue =
            Number(calculatedYouSave.toFixed(2));

    }


    // ==========================================
    // Prepare Variant
    // ==========================================

    const newVariant = {

        // Pricing
        mrp: Number(mrp),

        price: Number(price),

        discount_type,

        discount_value: calculatedDiscountValue,

        you_save: Number(calculatedYouSave.toFixed(2)),

        tax,


        // Inventory
        sku,

        barcode: barcode || null,

        weight: Number(weight),

        unit,

        available_stock: Number(available_stock),

        low_stock_alert: Number(low_stock_alert),

        stock_status,

        allow_backorders:
            allow_backorders === true ||
            allow_backorders === "true"

    };


    // ==========================================
    // Find Existing Variant Document
    // ==========================================

    let variantDoc = await ProductVariant.findOne({
        product: id
    });


    // ==========================================
    // First Variant Of Product
    // ==========================================

    if (!variantDoc) {

        variantDoc = await ProductVariant.create({

            product: id,

            variants: [
                newVariant
            ]

        });


        // Save ProductVariant document reference
        // inside Product document

        product.variantDocumentId = variantDoc._id;

        await product.save();

    }


    // ==========================================
    // Product Already Has Variants
    // ==========================================

    else {

        // --------------------------------------
        // Check Weight + Unit
        // --------------------------------------

        const alreadyExists = variantDoc.variants.find(

            item =>
                Number(item.weight) === Number(weight) &&
                item.unit === unit

        );


        if (alreadyExists) {

            throw new BadRequestError(
                `Variant ${weight}${unit} already exists.`
            );

        }


        // --------------------------------------
        // Check Duplicate SKU
        // --------------------------------------

        const skuExists = variantDoc.variants.find(

            item =>
                item.sku.toLowerCase() ===
                sku.toLowerCase()

        );


        if (skuExists) {

            throw new BadRequestError(
                "Variant with this SKU already exists."
            );

        }


        // --------------------------------------
        // Add New Variant
        // --------------------------------------

        variantDoc.variants.push(
            newVariant
        );


        await variantDoc.save();

    }


    // ==========================================
    // Response
    // ==========================================

    return res.status(201).json({

        success: true,

        message: "Product variant created successfully.",

        data: variantDoc

    });

});

const updateProductVariant = asyncHandler(async (req, res) => {

    const { productId, variantId } = req.params;

    const {
        price,
        mrp,
        available_stock,
        low_stock_alert
    } = req.body;


    // ==========================================
    // At Least One Field Required
    // ==========================================

    if (
        price === undefined &&
        mrp === undefined &&
        available_stock === undefined &&
        low_stock_alert === undefined
    ) {
        throw new BadRequestError(
            "At least one field is required: price, mrp, available_stock or low_stock_alert."
        );
    }


    // ==========================================
    // Find Product Variant Document
    // ==========================================

    const variantDocument = await ProductVariant.findOne({
        product: productId
    });

    if (!variantDocument) {
        throw new NotFoundError(
            "Product variant document not found."
        );
    }


    // ==========================================
    // Find Particular Variant
    // ==========================================

    const variant = variantDocument.variants.id(variantId);

    if (!variant) {
        throw new NotFoundError(
            "Variant not found with this ID."
        );
    }


    // ==========================================
    // Update Only Allowed Fields
    // ==========================================

    if (price !== undefined) {
        variant.price = Number(price);
    }

    if (mrp !== undefined) {
        variant.mrp = Number(mrp);
    }

    if (available_stock !== undefined) {
        variant.available_stock = Number(available_stock);
    }

    if (low_stock_alert !== undefined) {
        variant.low_stock_alert = Number(low_stock_alert);
    }


    // ==========================================
    // Price Validation
    // ==========================================

    if (variant.price < 0 || variant.mrp < 0) {
        throw new BadRequestError(
            "Price and MRP cannot be negative."
        );
    }

    if (variant.price > variant.mrp) {
        throw new BadRequestError(
            "Selling price cannot be greater than MRP."
        );
    }


    // ==========================================
    // Inventory Validation
    // ==========================================

    if (variant.available_stock < 0) {
        throw new BadRequestError(
            "Available stock cannot be negative."
        );
    }

    if (variant.low_stock_alert < 0) {
        throw new BadRequestError(
            "Low stock alert cannot be negative."
        );
    }


    // ==========================================
    // Recalculate Discount
    // ==========================================

    const youSave =
        Number(variant.mrp) - Number(variant.price);

    variant.you_save =
        Number(youSave.toFixed(2));


    // Percentage discount
    if (variant.discount_type === "percentage") {

        const discountPercentage =
            variant.mrp > 0
                ? (youSave / variant.mrp) * 100
                : 0;

        variant.discount_value =
            Number(discountPercentage.toFixed(2));

    }

    // Fixed discount
    else if (variant.discount_type === "fixed") {

        variant.discount_value =
            Number(youSave.toFixed(2));

    }


    // ==========================================
    // Automatically Update Stock Status
    // ==========================================

    if (variant.available_stock > 0) {

        variant.stock_status = "in_stock";

    } else {

        variant.stock_status = "out_of_stock";

    }


    // ==========================================
    // Save
    // ==========================================

    await variantDocument.save();


    // ==========================================
    // Response
    // ==========================================

    return res.status(200).json({

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