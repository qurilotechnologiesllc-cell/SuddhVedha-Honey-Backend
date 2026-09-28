const Cart = require('../models/cart.model');
const ComboProduct = require('../models/comboProduct.model')
const ComboProductImage = require('../models/comboProductImage.model')
// const ComboCart = require('../models/ComboCart.model')
// const ComboPack = require('../models/comboPack.model')
const ProductImage = require('../models/productImage.model')
const ProductVariant = require('../models/productVariant.model')
const Product = require('../models/product.model')
const redis = require('../utils/redis')
const formatWeight = require("../helpers/formatweight");
const { asyncHandler, ConflictError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } = require('../errors/errorConfig')

const { buildCartCatalog } = require('../services/cartCatalog.service')

const buildNormalCart = require('../helpers/buildNormalCart.helper')
const buildGiftCart = require('../helpers/buildGiftCart.helper')

const addToCart = asyncHandler(async (req, res) => {

    const userId = req.user.id;

    const {
        productId,
        selectedWeight,
        comboProductId,
        quantity
    } = req.body;


    // =====================================================
    // COMMON VALIDATION
    // =====================================================

    if (!quantity) {
        throw new BadRequestError(
            "quantity is required"
        );
    }

    if (quantity < 1) {
        throw new BadRequestError(
            "Quantity cannot be less than 1"
        );
    }


    // =====================================================
    // CART FIND / CREATE
    // =====================================================

    let cart = await Cart.findOne({ userId });

    if (!cart) {
        cart = new Cart({
            userId,
            items: []
        });
    }


    // =====================================================
    // COMBO PRODUCT
    // =====================================================

    if (comboProductId) {

        const comboProduct = await ComboProduct.findById(
            comboProductId
        )
            .select(`
                combo_name
                brand
                combo_size
                products
                mrp
                selling_price
                discount_percent
                save
                is_active
            `)
            .lean();


        if (!comboProduct) {
            throw new NotFoundError(
                "Combo product not found"
            );
        }


        if (!comboProduct.is_active) {
            throw new BadRequestError(
                "Combo product is not available"
            );
        }


        // -------------------------------------------------
        // Same Combo Already Exists?
        // -------------------------------------------------

        const existingItem = cart.items.find(
            item =>
                item.type === "COMBO" &&
                item.comboProductId?.toString() ===
                comboProductId.toString()
        );


        if (existingItem) {

            // Same combo → only quantity update
            existingItem.quantity += quantity;

        } else {

            // New combo item
            cart.items.push({
                type: "COMBO",
                comboProductId: comboProduct._id,
                quantity
            });

        }


        await cart.save();

        // 🔥 Redis cache invalidate
        await redis.del(`cart:${userId}`);


        const savedItem = existingItem ||
            cart.items[cart.items.length - 1];


        return res.status(200).json({
            success: true,
            message: "Combo product added to cart successfully",

            data: {
                cartId: cart._id,

                item: {
                    cartItemId: savedItem._id,
                    type: "COMBO",
                    quantity: savedItem.quantity,

                    comboProduct: {
                        comboProductId: comboProduct._id,
                        combo_name: comboProduct.combo_name,
                        brand: comboProduct.brand,
                        combo_size: comboProduct.combo_size,
                        products: comboProduct.products,

                        mrp: comboProduct.mrp,
                        selling_price:
                            comboProduct.selling_price,
                        discount_percent:
                            comboProduct.discount_percent,
                        save: comboProduct.save
                    }
                }
            }
        });
    }


    // =====================================================
    // NORMAL PRODUCT
    // =====================================================

    if (productId && selectedWeight) {

        // -------------------------------------------------
        // Product Fetch
        // -------------------------------------------------

        const product = await Product.findById(productId)
            .select(`
                product_name
                product_type
                floral_source
                imageDocumentId
            `)
            .lean();


        if (!product) {
            throw new NotFoundError(
                "Product not found"
            );
        }


        // -------------------------------------------------
        // ProductVariant
        //
        // Direct productId se find karo
        // No variantDocumentId required
        // -------------------------------------------------

        const variantDocument =
            await ProductVariant.findOne({
                product: productId
            })
                .select("variants")
                .lean();


        if (!variantDocument) {
            throw new NotFoundError(
                "Product variants not found"
            );
        }


        // -------------------------------------------------
        // Selected Variant
        // -------------------------------------------------

        const selectedVariant =
            variantDocument.variants.find(
                variant =>
                    variant._id.toString() ===
                    selectedWeight.toString()
            );


        if (!selectedVariant) {
            throw new NotFoundError(
                "Selected variant not found"
            );
        }


        // -------------------------------------------------
        // Product Image
        // -------------------------------------------------

        const imageDocument =
            await ProductImage.findOne({
                product: productId
            })
                .select("images")
                .lean();


        const primaryImage =
            imageDocument?.images?.find(
                image => image.is_primary === true
            ) ||
            imageDocument?.images?.[0] ||
            null;


        // -------------------------------------------------
        // Same Product + Same Weight?
        // -------------------------------------------------

        const existingItem = cart.items.find(
            item =>
                item.type === "NORMAL" &&
                item.productId?.toString() ===
                productId.toString() &&
                item.selectedWeight?.toString() ===
                selectedWeight.toString()
        );


        if (existingItem) {

            // Same product + same weight
            // → only quantity update

            existingItem.quantity += quantity;

        } else {

            // New normal product
            cart.items.push({
                type: "NORMAL",
                productId: product._id,
                selectedWeight: selectedVariant._id,
                quantity
            });

        }


        await cart.save();

        // 🔥 Redis cache invalidate
        await redis.del(`cart:${userId}`);


        const savedItem = existingItem ||
            cart.items[cart.items.length - 1];


        // -------------------------------------------------
        // Response
        // -------------------------------------------------

        return res.status(200).json({
            success: true,
            message: "Item added to cart successfully",

            data: {
                cartId: cart._id,

                item: {
                    cartItemId: savedItem._id,
                    type: "NORMAL",
                    quantity: savedItem.quantity,

                    product: {
                        productId: product._id,
                        product_name:
                            product.product_name,
                        product_type:
                            product.product_type,
                        floral_source:
                            product.floral_source,

                        image: primaryImage
                            ? {
                                image_url:
                                    primaryImage.image_url,
                                public_id:
                                    primaryImage.public_id
                            }
                            : null
                    },

                    variant: {
                        variantId:
                            selectedVariant._id,
                        weight:
                            selectedVariant.weight,
                        unit:
                            selectedVariant.unit,
                        price:
                            selectedVariant.price,
                        mrp:
                            selectedVariant.mrp,
                        you_save:
                            selectedVariant.you_save,
                        discount_percentage:
                            selectedVariant.discount_percentage,
                    }
                }
            }
        });
    }


    // =====================================================
    // INVALID PAYLOAD
    // =====================================================

    throw new BadRequestError(
        "Provide either productId + selectedWeight or comboProductId"
    );
});

// const addToComboPackInCart = asyncHandler(async (req, res) => {

//     const userId = req.user.id;

//     const {
//         setPackId,
//         quantity = 1
//     } = req.body;


//     // =========================================================
//     // Validation
//     // =========================================================

//     if (!userId) {
//         throw new BadRequestError("User authentication is required");
//     }

//     if (!setPackId) {
//         throw new BadRequestError("Set Pack is required");
//     }

//     if (!quantity || Number(quantity) < 1) {
//         throw new BadRequestError(
//             "Quantity must be at least 1"
//         );
//     }

//     const finalQuantity = Number(quantity);


//     // =========================================================
//     // Find ComboPack using setPackId
//     // =========================================================

//     const comboPack = await ComboPack.findById(setPackId)
//         .lean();

//     if (!comboPack) {
//         throw new NotFoundError(
//             "Set Pack not found"
//         );
//     }


//     // =========================================================
//     // Validate ComboPack Products
//     // =========================================================

//     if (
//         !comboPack.products ||
//         !Array.isArray(comboPack.products) ||
//         comboPack.products.length === 0
//     ) {
//         throw new BadRequestError(
//             "No products found in this Set Pack"
//         );
//     }


//     // =========================================================
//     // Product Details
//     // =========================================================

//     let totalWeight = 0;

//     const productDetails = await Promise.all(

//         comboPack.products.map(async (item) => {

//             const {
//                 productId,
//                 selectedWeight
//             } = item;


//             // =================================================
//             // Find Product
//             // =================================================

//             const product = await Product.findById(productId)
//                 .select(
//                     "product_name brand product_type floral_source imageDocumentId variantDocumentId"
//                 )
//                 .lean();

//             if (!product) {
//                 throw new NotFoundError(
//                     `Product not found: ${productId}`
//                 );
//             }


//             // =================================================
//             // Find Product Image
//             // =================================================

//             const imageDoc = await ProductImage.findById(
//                 product.imageDocumentId
//             )
//                 .select("images")
//                 .lean();


//             const primaryImage =
//                 imageDoc?.images?.find(
//                     img => img.is_primary === true
//                 ) ||
//                 imageDoc?.images?.[0] ||
//                 null;


//             // =================================================
//             // Find Product Variant
//             // =================================================

//             const variantDoc =
//                 await ProductVariant.findById(
//                     product.variantDocumentId
//                 )
//                     .select("variants")
//                     .lean();


//             const variant = variantDoc?.variants?.find(v => v._id.toString() === selectedWeight.toString());


//             if (!variant) {
//                 throw new BadRequestError(
//                     `Variant not found: ${selectedWeight}`
//                 );
//             }


//             // =================================================
//             // Calculate Total Weight
//             // =================================================

//             totalWeight += Number(
//                 variant.weight || 0
//             );


//             // =================================================
//             // Return Product Details
//             // =================================================

//             return {

//                 productId: product._id,

//                 product_name:
//                     product.product_name,

//                 brand:
//                     product.brand,

//                 product_type:
//                     product.product_type,

//                 floral_source:
//                     product.floral_source,


//                 // ---------------------------------------------
//                 // Image
//                 // ---------------------------------------------

//                 image: primaryImage
//                     ? {
//                         image_url:
//                             primaryImage.image_url,

//                         public_id:
//                             primaryImage.public_id
//                     }
//                     : null,


//                 // ---------------------------------------------
//                 // Selected Variant
//                 // ---------------------------------------------

//                 variant: {

//                     variantId:
//                         variant._id,

//                     weight:
//                         variant.weight,

//                     unit:
//                         variant.unit,

//                     price:
//                         variant.price,

//                     mrp:
//                         variant.mrp,

//                     you_save:
//                         variant.you_save,

//                     discount_percentage:
//                         variant.discount_percentage,

//                     stock_status:
//                         variant.stock_status,

//                     available_stock:
//                         variant.available_stock
//                 }
//             };
//         })
//     );


//     // =========================================================
//     // Save Product IDs + Selected Weight IDs in ComboCart
//     // =========================================================

//     const productsForCart =
//         comboPack.products.map(item => ({

//             productId:
//                 item.productId,

//             selectedWeight:
//                 item.selectedWeight

//         }));


//     // =========================================================
//     // Find User's ComboCart
//     // =========================================================

//     let comboCart = await ComboCart.findOne({
//         userId
//     });


//     // =========================================================
//     // New Cart Item
//     // =========================================================

//     const newGiftItem = {

//         setPackId:
//             comboPack._id,

//         quantity:
//             finalQuantity,

//         products:
//             productsForCart
//     };


//     let savedItem;

//     if (!comboCart) {

//         // -----------------------------------------
//         // No cart exists for this user
//         // -----------------------------------------

//         comboCart = await ComboCart.create({
//             userId,

//             items: [
//                 newGiftItem
//             ]
//         });

//         savedItem = comboCart.items[0];

//     } else {

//         // -----------------------------------------
//         // Check same SetPack already exists
//         // -----------------------------------------

//         const existingItem = comboCart.items.find(
//             item =>
//                 item.setPackId &&
//                 item.setPackId.toString() ===
//                 comboPack._id.toString()
//         );


//         if (existingItem) {

//             // -----------------------------------------
//             // Same SetPack → Increase Quantity
//             // -----------------------------------------

//             existingItem.quantity += finalQuantity;

//             savedItem = existingItem;

//         } else {

//             // -----------------------------------------
//             // Different SetPack → Add New Item
//             // -----------------------------------------

//             comboCart.items.push(newGiftItem);

//             savedItem =
//                 comboCart.items[
//                 comboCart.items.length - 1
//                 ];
//         }

//         await comboCart.save();
//     }


//     // =========================================================
//     // Combo Pricing
//     // =========================================================

//     const mrp =
//         Number(comboPack.mrp || 0);

//     const sellingPrice =
//         Number(comboPack.selling_price || 0);

//     const save =
//         mrp - sellingPrice;


//     // =========================================================
//     // Response
//     // =========================================================

//     return res.status(200).json({

//         success: true,

//         message:
//             "Combo product added to cart successfully.",

//         data: {

//             comboCartId:
//                 comboCart._id,

//             comboItemId:
//                 savedItem._id,

//             quantity:
//                 finalQuantity,


//             // =================================================
//             // Set Pack Information
//             // =================================================

//             setPack: {

//                 setPackId:
//                     comboPack._id,

//                 comboProductId:
//                     comboPack.comboProductId,

//                 pack_name:
//                     comboPack.pack_name,

//                 pack_size:
//                     comboPack.pack_size,

//                 mrp:
//                     comboPack.mrp,

//                 selling_price:
//                     comboPack.selling_price,

//                 discount_percent:
//                     comboPack.discount_percent,

//                 image:
//                     comboPack.image,

//                 public_id:
//                     comboPack.public_id
//             },


//             // =================================================
//             // Products Information
//             // =================================================

//             products:
//                 productDetails,


//             // =================================================
//             // Summary
//             // =================================================

//             totalWeight:
//                 totalWeight * finalQuantity,

//             totalAmount:
//                 sellingPrice * finalQuantity,

//             save:
//                 save * finalQuantity
//         }
//     });
// });

// const getCart = asyncHandler(async (req, res) => {

//     const userId = req.user.id;


//     // =====================================================
//     // Build Cart Catalog
//     // =====================================================

//     const {
//         cart,
//         comboCart,
//         catalogMap,
//         comboPackMap
//     } = await buildCartCatalog(userId);


//     // =====================================================
//     // Normal Cart
//     // =====================================================

//     const normalItems = buildNormalCart(
//         cart,
//         catalogMap
//     );


//     // =====================================================
//     // Combo Cart
//     // =====================================================

//     const comboItems = buildGiftCart(
//         comboCart,
//         catalogMap,
//         comboPackMap
//     );


//     // =====================================================
//     // Response
//     // =====================================================

//     return res.status(200).json({

//         success: true,

//         items: [

//             ...normalItems,

//             ...comboItems

//         ]

//     });

// });

// const getCart = asyncHandler(async (req, res) => {

//     const userId = req.user.id;


//     // =====================================================
//     // Build Cart Catalog
//     // =====================================================

//     const {
//         cart,
//         comboCart,
//         catalogMap,
//         comboPackMap
//     } = await buildCartCatalog(userId);


//     // =====================================================
//     // Normal Cart
//     // =====================================================

//     const normalItems = buildNormalCart(
//         cart,
//         catalogMap
//     );


//     // =====================================================
//     // Combo Cart
//     // =====================================================

//     const comboItems = buildGiftCart(
//         comboCart,
//         catalogMap,
//         comboPackMap
//     );


//     // =====================================================
//     // Response
//     // =====================================================

//     return res.status(200).json({

//         success: true,

//         items: [

//             ...normalItems,

//             ...comboItems

//         ]

//     });

// });


const getCart = asyncHandler(async (req, res) => {

    const userId = req.user.id;

    // =====================================================
    // REDIS CACHE KEY
    // =====================================================

    const cacheKey = `cart:${userId}`;


    // =====================================================
    // 1️⃣ CHECK REDIS CACHE
    // =====================================================

    const cachedCart = await redis.get(cacheKey);

    if (cachedCart) {

        console.log("🟢 Cart fetched from Redis");

        return res.status(200).json(
            JSON.parse(cachedCart)
        );
    }


    console.log("🟡 Cart cache MISS - fetching from MongoDB");


    // =====================================================
    // 2️⃣ FIND CART FROM MONGODB
    // =====================================================

    const cart = await Cart.findOne({ userId })
        .lean();


    if (!cart || !cart.items?.length) {

        const emptyResponse = {
            success: true,
            items: []
        };


        // Cache empty cart also
        await redis.set(
            cacheKey,
            JSON.stringify(emptyResponse),
            "EX",
            600
        );


        return res.status(200).json(
            emptyResponse
        );
    }


    // =====================================================
    // 3️⃣ SEPARATE NORMAL + COMBO
    // =====================================================

    const normalItems = cart.items.filter(
        item => item.type === "NORMAL"
    );

    const comboItems = cart.items.filter(
        item => item.type === "COMBO"
    );


    // =====================================================
    // 4️⃣ NORMAL PRODUCT IDS
    // =====================================================

    const productIds = normalItems
        .map(item => item.productId)
        .filter(Boolean);


    // =====================================================
    // 5️⃣ COMBO PRODUCT IDS
    // =====================================================

    const comboProductIds = comboItems
        .map(item => item.comboProductId)
        .filter(Boolean);


    // =====================================================
    // 6️⃣ FETCH DATA FROM MONGODB
    // =====================================================

    const [
        products,
        productVariants,
        productImages,
        comboProducts,
        comboProductImages
    ] = await Promise.all([

        // -----------------------------
        // Normal Products
        // -----------------------------

        Product.find({
            _id: { $in: productIds }
        })
            .select(`
                product_name
                brand
                description
                product_type
                floral_source
            `)
            .lean(),


        // -----------------------------
        // Product Variants
        // -----------------------------

        ProductVariant.find({
            product: { $in: productIds }
        })
            .select("product variants")
            .lean(),


        // -----------------------------
        // Product Images
        // -----------------------------

        ProductImage.find({
            product: { $in: productIds }
        })
            .select("product images")
            .lean(),


        // -----------------------------
        // Combo Products
        // -----------------------------

        ComboProduct.find({
            _id: { $in: comboProductIds }
        })
            .select(`
                combo_name
                brand
                products
                mrp
                selling_price
                discount_percent
                save
                description
                is_active
            `)
            .lean(),


        // -----------------------------
        // Combo Images
        // -----------------------------

        ComboProductImage.find({
            comboProductId: {
                $in: comboProductIds
            }
        })
            .select("comboProductId images")
            .lean()

    ]);


    // =====================================================
    // 7️⃣ CREATE MAPS
    // =====================================================

    const productMap = new Map();

    products.forEach(product => {

        productMap.set(
            product._id.toString(),
            product
        );

    });


    const variantMap = new Map();

    productVariants.forEach(document => {

        variantMap.set(
            document.product.toString(),
            document.variants || []
        );

    });


    const productImageMap = new Map();

    productImages.forEach(document => {

        productImageMap.set(
            document.product.toString(),
            document.images || []
        );

    });


    const comboProductMap = new Map();

    comboProducts.forEach(combo => {

        comboProductMap.set(
            combo._id.toString(),
            combo
        );

    });


    const comboImageMap = new Map();

    comboProductImages.forEach(document => {

        comboImageMap.set(
            document.comboProductId.toString(),
            document.images || []
        );

    });


    // =====================================================
    // 8️⃣ BUILD CART RESPONSE
    // =====================================================

    const items = cart.items.map(item => {


        // =================================================
        // NORMAL PRODUCT
        // =================================================

        if (item.type === "NORMAL") {

            const product = productMap.get(
                item.productId.toString()
            );

            if (!product) {
                return null;
            }


            const variants = variantMap.get(
                item.productId.toString()
            ) || [];


            const variant = variants.find(
                v =>
                    v._id.toString() ===
                    item.selectedWeight.toString()
            );


            if (!variant) {
                return null;
            }


            const images = productImageMap.get(
                item.productId.toString()
            ) || [];


            const primaryImage =
                images.find(
                    image =>
                        image.is_primary === true
                ) ||
                images[0] ||
                null;


            const quantity =
                Number(item.quantity || 1);


            const totalAmount =
                Number(variant.price || 0) *
                quantity;


            const totalWeightInGrams =
                Number(variant.weight || 0) *
                quantity;

            const formattedTotalWeight =
                formatWeight(totalWeightInGrams);


            const totalsave =
                Number(variant.you_save || 0) *
                quantity;


            return {

                type: "NORMAL",

                cartItemId: item._id,

                quantity,

                product: {

                    _id: product._id,

                    product_name:
                        product.product_name,

                    brand:
                        product.brand,

                    description:
                        product.description,

                    product_type:
                        product.product_type,

                    floral_source:
                        product.floral_source,

                    image: primaryImage
                        ? {
                            image_url:
                                primaryImage.image_url,

                            public_id:
                                primaryImage.public_id
                        }
                        : null,

                    variant: {

                        _id:
                            variant._id,

                        weight:
                            variant.weight,

                        unit:
                            variant.unit,

                        sku:
                            variant.sku,

                        price:
                            variant.price,

                        mrp:
                            variant.mrp,

                        save:
                            variant.you_save

                    }

                },

                totalAmount,

                totalWeight: formattedTotalWeight.weight,

                totalWeightUnit: formattedTotalWeight.unit,

                totalsave

            };
        }


        // =================================================
        // COMBO PRODUCT
        // =================================================

        if (item.type === "COMBO") {

            const comboProduct =
                comboProductMap.get(
                    item.comboProductId.toString()
                );


            if (!comboProduct) {
                return null;
            }


            const images =
                comboImageMap.get(
                    item.comboProductId.toString()
                ) || [];


            const primaryImage =
                images.find(
                    image =>
                        image.is_primary === true
                ) ||
                images[0] ||
                null;


            const quantity =
                Number(item.quantity || 1);


            // -----------------------------------------
            // Single combo weight
            // -----------------------------------------

            const singleComboWeight =
                (comboProduct.products || [])
                    .reduce(
                        (total, comboItem) => {

                            return total +
                                Number(
                                    comboItem.weight || 0
                                );

                        },
                        0
                    );


            // -----------------------------------------
            // Total weight
            // -----------------------------------------

            const totalWeightInGrams =
                singleComboWeight * quantity;

            const formattedTotalWeight =
                formatWeight(totalWeightInGrams);


            // -----------------------------------------
            // Total amount
            //
            // ONLY combo selling price
            // -----------------------------------------

            const totalAmount =
                Number(
                    comboProduct.selling_price || 0
                ) * quantity;


            // -----------------------------------------
            // Total saving
            // -----------------------------------------

            const totalsave =
                (
                    Number(
                        comboProduct.mrp || 0
                    ) -
                    Number(
                        comboProduct.selling_price || 0
                    )
                ) * quantity;


            return {

                type: "COMBO",

                cartItemId: item._id,

                quantity,

                product: {

                    _id:
                        comboProduct._id,

                    product_name:
                        comboProduct.combo_name,

                    brand:
                        comboProduct.brand,

                    description:
                        comboProduct.description,

                    product_type:
                        "combo",

                    image: primaryImage
                        ? {
                            image_url:
                                primaryImage.url,

                            public_id:
                                primaryImage.public_id
                        }
                        : null,

                    variant: {

                        _id:
                            comboProduct._id,

                        weight:
                            singleComboWeight,

                        unit:
                            "g",

                        price:
                            comboProduct.selling_price,

                        mrp:
                            comboProduct.mrp,

                        save:
                            Number(
                                comboProduct.mrp || 0
                            ) -
                            Number(
                                comboProduct.selling_price || 0
                            )

                    }

                },

                totalAmount,

                totalWeight:
                    formattedTotalWeight.weight,

                totalWeightUnit:
                    formattedTotalWeight.unit,

                totalsave

            };
        }


        return null;

    })
        .filter(Boolean);


    // =====================================================
    // 9️⃣ FINAL RESPONSE
    // =====================================================

    const responseData = {
        success: true,
        items
    };


    // =====================================================
    // 🔟 SAVE COMPLETE RESPONSE IN REDIS
    // =====================================================

    await redis.set(
        cacheKey,
        JSON.stringify(responseData),
        "EX",
        600
    );


    console.log("💾 Cart saved in Redis");


    // =====================================================
    // 1️⃣1️⃣ SEND RESPONSE
    // =====================================================

    return res.status(200).json(
        responseData
    );
});

const increaseQuantity = asyncHandler(async (req, res) => {

    const userId = req.user.id;
    const { itemId } = req.body;


    // =====================================================
    // VALIDATION
    // =====================================================

    if (!itemId) {
        throw new BadRequestError(
            "Item ID is required"
        );
    }


    // =====================================================
    // FIND USER CART
    // =====================================================

    const cart = await Cart.findOne({
        userId,
        "items._id": itemId
    });


    if (!cart) {
        throw new NotFoundError(
            "Cart item not found"
        );
    }


    // =====================================================
    // FIND ITEM
    // =====================================================

    const item = cart.items.id(itemId);


    if (!item) {
        throw new NotFoundError(
            "Cart item not found"
        );
    }


    // =====================================================
    // INCREASE QUANTITY
    // =====================================================

    item.quantity += 1;


    // =====================================================
    // SAVE CART
    // =====================================================

    await cart.save();


    // =====================================================
    // INVALIDATE REDIS CART CACHE
    // =====================================================

    await redis.del(`cart:${userId}`);


    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({

        success: true,

        message: "Quantity increased successfully",

        data: {
            itemId: item._id,
            quantity: item.quantity
        }

    });

});

const decreaseQuantity = asyncHandler(async (req, res) => {

    const userId = req.user.id;
    const { itemId } = req.body;


    // =====================================================
    // VALIDATION
    // =====================================================

    if (!itemId) {
        throw new BadRequestError(
            "Item ID is required"
        );
    }


    // =====================================================
    // FIND CART
    // =====================================================

    const cart = await Cart.findOne({
        userId,
        "items._id": itemId
    });


    if (!cart) {
        throw new NotFoundError(
            "Cart item not found"
        );
    }


    // =====================================================
    // FIND ITEM
    // =====================================================

    const item = cart.items.id(itemId);


    if (!item) {
        throw new NotFoundError(
            "Cart item not found"
        );
    }


    // =====================================================
    // MINIMUM QUANTITY = 1
    // =====================================================

    if (item.quantity <= 1) {

        return res.status(200).json({

            success: true,

            message: "Minimum quantity is 1",

            data: {
                itemId: item._id,
                quantity: 1
            }

        });
    }


    // =====================================================
    // DECREASE QUANTITY
    // =====================================================

    item.quantity -= 1;


    // =====================================================
    // SAVE CART
    // =====================================================

    await cart.save();


    // =====================================================
    // INVALIDATE REDIS CACHE
    // =====================================================

    await redis.del(`cart:${userId}`);


    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({

        success: true,

        message: "Quantity decreased successfully",

        data: {
            itemId: item._id,
            quantity: item.quantity
        }

    });
});

const removeFromCart = asyncHandler(async (req, res) => {

    const userId = req.user.id;
    const { itemId } = req.body;

    console.log(userId, itemId)


    // =====================================================
    // VALIDATION
    // =====================================================

    if (!itemId) {
        throw new BadRequestError(
            "Item ID is required"
        );
    }


    // =====================================================
    // FIND USER CART
    // =====================================================

    const cart = await Cart.findOne({
        userId,
        "items._id": itemId
    });


    if (!cart) {
        throw new NotFoundError(
            "Item not found in cart"
        );
    }


    // =====================================================
    // FIND ITEM
    // =====================================================

    const item = cart.items.id(itemId);


    if (!item) {
        throw new NotFoundError(
            "Item not found in cart"
        );
    }


    // =====================================================
    // REMOVE ITEM
    // =====================================================

    item.deleteOne();


    // =====================================================
    // CHECK CART EMPTY
    // =====================================================

    if (cart.items.length === 0) {

        // Delete complete cart document
        await Cart.findByIdAndDelete(
            cart._id
        );


        // Invalidate Redis cache
        await redis.del(
            `cart:${userId}`
        );


        return res.status(200).json({

            success: true,

            message:
                "Item removed and cart deleted as it is now empty",

            remainingItems: 0,

            cartDeleted: true

        });
    }


    // =====================================================
    // SAVE UPDATED CART
    // =====================================================

    await cart.save();


    // =====================================================
    // INVALIDATE REDIS CACHE
    // =====================================================

    await redis.del(
        `cart:${userId}`
    );


    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({

        success: true,

        message:
            "Item removed from cart successfully",

        remainingItems:
            cart.items.length,

        cartDeleted: false

    });
});

const getCartProductCount = asyncHandler(async (req, res) => {

    const { id } = req.user;


    // =====================================================
    // FIND USER CART
    // =====================================================

    const cart = await Cart.findOne({
        userId: id
    })
        .select("items")
        .lean();


    // =====================================================
    // COUNT CART ITEMS
    // =====================================================

    const totalCount = cart?.items?.length || 0;


    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({

        success: true,

        message: "Cart count fetched successfully",

        data: {
            totalCount
        }

    });
});


module.exports = {
    addToCart,
    getCart,
    getCartProductCount,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
};