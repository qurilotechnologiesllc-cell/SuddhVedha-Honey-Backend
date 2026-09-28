const ComboProduct = require('../models/comboProduct.model')
const ComboPack = require('../models/comboPack.model')
const ComboProductImage = require('../models/comboProductImage.model')
const cloudinary = require('../config/cloudinary')
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary')
const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError, ServiceUnavailableError } = require('../errors/errorConfig')


const createComboProduct = asyncHandler(async (req, res) => {

    const {
        combo_name,
        slug,
        brand,

        // Combo information
        combo_size,
        products,

        // Pricing
        mrp,
        selling_price,

        // Details
        description,
        key_benefits,
        manufacturer_information,
        shelf_life,
        storage_instructions,
        nutrition_info,
        country_of_origin,
        fssai_license_number,
        is_active
    } = req.body;


    // ==========================================
    // REQUIRED FIELD VALIDATION
    // ==========================================

    if (
        !combo_name ||
        !slug ||
        !description ||
        !key_benefits ||
        !manufacturer_information ||
        !shelf_life ||
        !storage_instructions ||
        !nutrition_info ||
        !fssai_license_number
    ) {
        throw new BadRequestError(
            "Missing required fields for combo product"
        );
    }


    // ==========================================
    // COMBO SIZE VALIDATION
    // ==========================================

    if (
        combo_size === undefined ||
        combo_size === null ||
        Number(combo_size) < 2
    ) {
        throw new BadRequestError(
            "Combo size must be at least 2"
        );
    }


    const finalComboSize = Number(combo_size);

    if (!Number.isInteger(finalComboSize)) {
        throw new BadRequestError(
            "Combo size must be a valid integer"
        );
    }


    // ==========================================
    // PRODUCTS VALIDATION
    // ==========================================

    if (
        !Array.isArray(products) ||
        products.length < 2
    ) {
        throw new BadRequestError(
            "Combo must contain at least 2 products"
        );
    }


    // combo_size and products count must match
    if (finalComboSize !== products.length) {
        throw new BadRequestError(
            "Combo size must match the number of products"
        );
    }


    // Validate each combo product
    for (const product of products) {

        if (!product || typeof product !== "object") {
            throw new BadRequestError(
                "Invalid combo product data"
            );
        }


        // Product name
        if (
            !product.name ||
            typeof product.name !== "string" ||
            !product.name.trim()
        ) {
            throw new BadRequestError(
                "Each combo product must have a valid name"
            );
        }


        // Product weight
        if (
            product.weight === undefined ||
            product.weight === null ||
            Number(product.weight) <= 0
        ) {
            throw new BadRequestError(
                "Each combo product must have a valid weight"
            );
        }


        // Weight should be numeric
        if (
            !Number.isFinite(Number(product.weight))
        ) {
            throw new BadRequestError(
                "Product weight must be a valid number"
            );
        }


        // Product unit
        if (!product.unit) {
            throw new BadRequestError(
                "Each combo product must have a weight unit"
            );
        }


        // Only g or kg allowed
        if (!["g", "kg"].includes(product.unit)) {
            throw new BadRequestError(
                "Product weight unit must be either 'g' or 'kg'"
            );
        }
    }


    // ==========================================
    // PRICE VALIDATION
    // ==========================================

    if (
        mrp === undefined ||
        selling_price === undefined
    ) {
        throw new BadRequestError(
            "MRP and selling price are required"
        );
    }


    const finalMrp = Number(mrp);
    const finalSellingPrice = Number(selling_price);


    if (
        !Number.isFinite(finalMrp) ||
        !Number.isFinite(finalSellingPrice)
    ) {
        throw new BadRequestError(
            "MRP and selling price must be valid numbers"
        );
    }


    if (
        finalMrp < 0 ||
        finalSellingPrice < 0
    ) {
        throw new BadRequestError(
            "MRP and selling price cannot be negative"
        );
    }


    if (finalSellingPrice > finalMrp) {
        throw new BadRequestError(
            "Selling price cannot be greater than MRP"
        );
    }


    // ==========================================
    // CALCULATE SAVE AMOUNT
    // ==========================================

    const finalSave =
        finalMrp - finalSellingPrice;


    // ==========================================
    // CALCULATE DISCOUNT PERCENT
    // ==========================================

    let finalDiscountPercent = 0;

    if (finalMrp > 0) {

        finalDiscountPercent = Math.round(
            (
                (finalMrp - finalSellingPrice) /
                finalMrp
            ) * 100
        );

    }


    // ==========================================
    // NUTRITION INFO VALIDATION
    // ==========================================

    if (
        !nutrition_info ||
        typeof nutrition_info !== "object"
    ) {
        throw new BadRequestError(
            "Nutrition information is required"
        );
    }


    // ------------------------------------------
    // Serving Size
    // ------------------------------------------

    if (nutrition_info.serving_size) {

        const servingSize =
            nutrition_info.serving_size;


        if (
            servingSize.quantity !== undefined &&
            (
                !Number.isFinite(
                    Number(servingSize.quantity)
                ) ||
                Number(servingSize.quantity) <= 0
            )
        ) {
            throw new BadRequestError(
                "Nutrition serving quantity must be a valid positive number"
            );
        }


        if (
            servingSize.weight_g !== undefined &&
            (
                !Number.isFinite(
                    Number(servingSize.weight_g)
                ) ||
                Number(servingSize.weight_g) <= 0
            )
        ) {
            throw new BadRequestError(
                "Nutrition serving weight must be a valid positive number"
            );
        }

    }


    // ------------------------------------------
    // Nutrients
    // ------------------------------------------

    if (nutrition_info.nutrients) {

        const nutrients =
            nutrition_info.nutrients;


        const nutrientFields = [
            "energy",
            "total_fat",
            "saturated_fat",
            "trans_fat",
            "cholesterol",
            "carbohydrates",
            "natural_sugar",
            "added_sugar",
            "protein",
            "sodium"
        ];


        for (const nutrientName of nutrientFields) {

            const nutrient =
                nutrients[nutrientName];


            if (!nutrient) {
                continue;
            }


            if (
                nutrient.per_100g !== undefined &&
                (
                    !Number.isFinite(
                        Number(nutrient.per_100g)
                    ) ||
                    Number(nutrient.per_100g) < 0
                )
            ) {
                throw new BadRequestError(
                    `${nutrientName} per_100g must be a valid non-negative number`
                );
            }


            if (
                nutrient.per_serving !== undefined &&
                (
                    !Number.isFinite(
                        Number(nutrient.per_serving)
                    ) ||
                    Number(nutrient.per_serving) < 0
                )
            ) {
                throw new BadRequestError(
                    `${nutrientName} per_serving must be a valid non-negative number`
                );
            }


            if (
                nutrient.rda_percent !== undefined &&
                nutrient.rda_percent !== null &&
                (
                    !Number.isFinite(
                        Number(nutrient.rda_percent)
                    ) ||
                    Number(nutrient.rda_percent) < 0
                )
            ) {
                throw new BadRequestError(
                    `${nutrientName} rda_percent must be a valid non-negative number`
                );
            }

        }

    }


    // ==========================================
    // SLUG CHECK
    // ==========================================

    const existingCombo =
        await ComboProduct.findOne({
            slug: slug.trim()
        });


    if (existingCombo) {
        throw new ConflictError(
            "A combo product with this slug already exists"
        );
    }


    // ==========================================
    // CREATE COMBO PRODUCT
    // ==========================================

    const comboProduct =
        await ComboProduct.create({

            combo_name: combo_name.trim(),

            slug: slug.trim(),

            brand:
                brand?.trim() ||
                "SudhVeda Honey",

            combo_size:
                finalComboSize,


            // ----------------------------------
            // Products
            // ----------------------------------

            products: products.map((product) => ({

                name: product.name.trim(),

                weight:
                    Number(product.weight),

                unit:
                    product.unit

            })),


            // ----------------------------------
            // Pricing
            // ----------------------------------

            mrp:
                finalMrp,

            selling_price:
                finalSellingPrice,

            discount_percent:
                finalDiscountPercent,

            save:
                finalSave,


            // ----------------------------------
            // Details
            // ----------------------------------

            description:
                description.trim(),

            key_benefits:
                key_benefits.trim(),

            manufacturer_information:
                manufacturer_information.trim(),

            shelf_life:
                shelf_life.trim(),

            storage_instructions:
                storage_instructions.trim(),


            // ----------------------------------
            // Nutrition
            // ----------------------------------

            nutrition_info:
                nutrition_info,


            country_of_origin:
                country_of_origin?.trim() ||
                "India",

            fssai_license_number:
                fssai_license_number.trim(),

            is_active:
                is_active !== undefined
                    ? is_active
                    : true

        });


    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({

        success: true,

        message:
            "Combo product created successfully",

        data:
            comboProduct

    });

});

const updateComboproductinfo = asyncHandler(async (req, res) => {

    const { comboProductId } = req.params;

    const {
        combo_name,
        slug,
        brand,

        // Combo information
        combo_size,
        products,

        // Pricing
        mrp,
        selling_price,

        // Product details
        description,
        key_benefits,
        manufacturer_information,
        shelf_life,
        storage_instructions,
        nutrition_info,
        country_of_origin,
        fssai_license_number,
        is_active
    } = req.body;


    // ==========================================
    // FIND EXISTING COMBO
    // ==========================================

    const comboProduct =
        await ComboProduct.findById(comboProductId);

    if (!comboProduct) {
        throw new NotFoundError(
            "Combo product not found."
        );
    }


    // ==========================================
    // SLUG DUPLICATE CHECK
    // ==========================================

    if (slug !== undefined) {

        if (
            typeof slug !== "string" ||
            !slug.trim()
        ) {
            throw new BadRequestError(
                "Slug must be a valid string."
            );
        }


        if (
            slug.trim() !== comboProduct.slug
        ) {

            const existingSlug =
                await ComboProduct.findOne({
                    slug: slug.trim(),
                    _id: {
                        $ne: comboProductId
                    }
                });


            if (existingSlug) {
                throw new ConflictError(
                    "A combo product with this slug already exists."
                );
            }
        }
    }


    // ==========================================
    // COMBO SIZE VALIDATION
    // ==========================================

    let finalComboSize =
        Number(comboProduct.combo_size);


    if (combo_size !== undefined) {

        finalComboSize =
            Number(combo_size);


        if (
            !Number.isInteger(finalComboSize) ||
            finalComboSize < 2
        ) {
            throw new BadRequestError(
                "Combo size must be an integer greater than or equal to 2."
            );
        }
    }


    // ==========================================
    // PRODUCTS VALIDATION
    // ==========================================

    if (products !== undefined) {

        if (
            !Array.isArray(products) ||
            products.length < 2
        ) {
            throw new BadRequestError(
                "Combo must contain at least 2 products."
            );
        }


        // combo_size and products count
        // must match
        if (
            finalComboSize !== products.length
        ) {
            throw new BadRequestError(
                "Combo size must match the number of products."
            );
        }


        // Validate every product
        for (const product of products) {

            if (
                !product ||
                typeof product !== "object"
            ) {
                throw new BadRequestError(
                    "Invalid combo product data."
                );
            }


            // -------------------------------
            // Product name
            // -------------------------------

            if (
                !product.name ||
                typeof product.name !== "string" ||
                !product.name.trim()
            ) {
                throw new BadRequestError(
                    "Each combo product must have a valid name."
                );
            }


            // -------------------------------
            // Product weight
            // -------------------------------

            if (
                product.weight === undefined ||
                product.weight === null ||
                !Number.isFinite(
                    Number(product.weight)
                ) ||
                Number(product.weight) <= 0
            ) {
                throw new BadRequestError(
                    "Each combo product must have a valid weight."
                );
            }


            // -------------------------------
            // Product unit
            // -------------------------------

            if (
                !product.unit ||
                !["g", "kg"].includes(
                    product.unit
                )
            ) {
                throw new BadRequestError(
                    "Product weight unit must be either 'g' or 'kg'."
                );
            }
        }
    }


    // ==========================================
    // FINAL PRICE VALUES
    // ==========================================

    const finalMrp =
        mrp !== undefined
            ? Number(mrp)
            : Number(comboProduct.mrp);


    const finalSellingPrice =
        selling_price !== undefined
            ? Number(selling_price)
            : Number(comboProduct.selling_price);


    // ==========================================
    // PRICE VALIDATION
    // ==========================================

    if (
        !Number.isFinite(finalMrp)
    ) {
        throw new BadRequestError(
            "MRP must be a valid number."
        );
    }


    if (
        !Number.isFinite(finalSellingPrice)
    ) {
        throw new BadRequestError(
            "Selling price must be a valid number."
        );
    }


    if (finalMrp < 0) {
        throw new BadRequestError(
            "MRP cannot be negative."
        );
    }


    if (finalSellingPrice < 0) {
        throw new BadRequestError(
            "Selling price cannot be negative."
        );
    }


    if (
        finalSellingPrice > finalMrp
    ) {
        throw new BadRequestError(
            "Selling price cannot be greater than MRP."
        );
    }


    // ==========================================
    // CALCULATE SAVE
    // ==========================================

    const finalSave =
        finalMrp - finalSellingPrice;


    // ==========================================
    // CALCULATE DISCOUNT
    // ==========================================

    let finalDiscountPercent = 0;


    if (finalMrp > 0) {

        finalDiscountPercent =
            Math.round(
                (
                    (finalMrp - finalSellingPrice) /
                    finalMrp
                ) * 100
            );
    }


    // ==========================================
    // NUTRITION INFO VALIDATION
    // ==========================================

    if (nutrition_info !== undefined) {

        if (
            !nutrition_info ||
            typeof nutrition_info !== "object" ||
            Array.isArray(nutrition_info)
        ) {
            throw new BadRequestError(
                "Nutrition information must be a valid object."
            );
        }


        // --------------------------------------
        // Serving Size
        // --------------------------------------

        if (
            nutrition_info.serving_size !== undefined
        ) {

            const servingSize =
                nutrition_info.serving_size;


            if (
                !servingSize ||
                typeof servingSize !== "object" ||
                Array.isArray(servingSize)
            ) {
                throw new BadRequestError(
                    "Invalid nutrition serving size."
                );
            }


            // quantity
            if (
                servingSize.quantity !== undefined
            ) {

                if (
                    !Number.isFinite(
                        Number(
                            servingSize.quantity
                        )
                    ) ||
                    Number(
                        servingSize.quantity
                    ) <= 0
                ) {
                    throw new BadRequestError(
                        "Serving quantity must be a valid positive number."
                    );
                }
            }


            // weight_g
            if (
                servingSize.weight_g !== undefined
            ) {

                if (
                    !Number.isFinite(
                        Number(
                            servingSize.weight_g
                        )
                    ) ||
                    Number(
                        servingSize.weight_g
                    ) <= 0
                ) {
                    throw new BadRequestError(
                        "Serving weight must be a valid positive number."
                    );
                }
            }


            // unit
            if (
                servingSize.unit !== undefined &&
                (
                    typeof servingSize.unit !== "string" ||
                    !servingSize.unit.trim()
                )
            ) {
                throw new BadRequestError(
                    "Serving unit must be a valid string."
                );
            }
        }


        // --------------------------------------
        // Nutrients
        // --------------------------------------

        if (
            nutrition_info.nutrients !== undefined
        ) {

            const nutrients =
                nutrition_info.nutrients;


            if (
                !nutrients ||
                typeof nutrients !== "object" ||
                Array.isArray(nutrients)
            ) {
                throw new BadRequestError(
                    "Invalid nutrition nutrients data."
                );
            }


            const nutrientFields = [
                "energy",
                "total_fat",
                "saturated_fat",
                "trans_fat",
                "cholesterol",
                "carbohydrates",
                "natural_sugar",
                "added_sugar",
                "protein",
                "sodium"
            ];


            for (
                const nutrientName
                of nutrientFields
            ) {

                const nutrient =
                    nutrients[nutrientName];


                if (
                    nutrient === undefined
                ) {
                    continue;
                }


                if (
                    !nutrient ||
                    typeof nutrient !== "object" ||
                    Array.isArray(nutrient)
                ) {
                    throw new BadRequestError(
                        `Invalid ${nutrientName} nutrition data.`
                    );
                }


                // per_100g
                if (
                    nutrient.per_100g !== undefined
                ) {

                    if (
                        !Number.isFinite(
                            Number(
                                nutrient.per_100g
                            )
                        ) ||
                        Number(
                            nutrient.per_100g
                        ) < 0
                    ) {
                        throw new BadRequestError(
                            `${nutrientName} per_100g must be a valid non-negative number.`
                        );
                    }
                }


                // per_serving
                if (
                    nutrient.per_serving !== undefined
                ) {

                    if (
                        !Number.isFinite(
                            Number(
                                nutrient.per_serving
                            )
                        ) ||
                        Number(
                            nutrient.per_serving
                        ) < 0
                    ) {
                        throw new BadRequestError(
                            `${nutrientName} per_serving must be a valid non-negative number.`
                        );
                    }
                }


                // rda_percent
                if (
                    nutrient.rda_percent !== undefined &&
                    nutrient.rda_percent !== null
                ) {

                    if (
                        !Number.isFinite(
                            Number(
                                nutrient.rda_percent
                            )
                        ) ||
                        Number(
                            nutrient.rda_percent
                        ) < 0
                    ) {
                        throw new BadRequestError(
                            `${nutrientName} rda_percent must be a valid non-negative number.`
                        );
                    }
                }


                // unit
                if (
                    nutrient.unit !== undefined
                ) {

                    if (
                        typeof nutrient.unit !== "string" ||
                        !nutrient.unit.trim()
                    ) {
                        throw new BadRequestError(
                            `${nutrientName} unit must be a valid string.`
                        );
                    }
                }
            }
        }
    }


    // ==========================================
    // BUILD UPDATE OBJECT
    // ==========================================

    const updateData = {};


    // ==========================================
    // BASIC INFORMATION
    // ==========================================

    if (combo_name !== undefined) {

        if (
            typeof combo_name !== "string" ||
            !combo_name.trim()
        ) {
            throw new BadRequestError(
                "Combo name must be a valid string."
            );
        }

        updateData.combo_name =
            combo_name.trim();
    }


    if (slug !== undefined) {
        updateData.slug =
            slug.trim();
    }


    if (brand !== undefined) {

        if (
            typeof brand !== "string"
        ) {
            throw new BadRequestError(
                "Brand must be a valid string."
            );
        }

        updateData.brand =
            brand.trim();
    }


    // ==========================================
    // COMBO INFORMATION
    // ==========================================

    if (combo_size !== undefined) {

        updateData.combo_size =
            finalComboSize;
    }


    if (products !== undefined) {

        updateData.products =
            products.map((product) => ({

                name:
                    product.name.trim(),

                weight:
                    Number(product.weight),

                unit:
                    product.unit

            }));
    }


    // ==========================================
    // PRICING
    // ==========================================

    updateData.mrp =
        finalMrp;

    updateData.selling_price =
        finalSellingPrice;

    updateData.discount_percent =
        finalDiscountPercent;

    updateData.save =
        finalSave;


    // ==========================================
    // PRODUCT DETAILS
    // ==========================================

    if (description !== undefined) {

        updateData.description =
            description.trim();
    }


    if (key_benefits !== undefined) {

        updateData.key_benefits =
            key_benefits.trim();
    }


    if (manufacturer_information !== undefined) {

        updateData.manufacturer_information =
            manufacturer_information.trim();
    }


    if (shelf_life !== undefined) {

        updateData.shelf_life =
            shelf_life.trim();
    }


    if (storage_instructions !== undefined) {

        updateData.storage_instructions =
            storage_instructions.trim();
    }


    // ==========================================
    // NUTRITION INFO
    // ==========================================

    if (nutrition_info !== undefined) {

        updateData.nutrition_info =
            nutrition_info;
    }


    // ==========================================
    // OTHER INFORMATION
    // ==========================================

    if (country_of_origin !== undefined) {

        updateData.country_of_origin =
            country_of_origin.trim();
    }


    if (fssai_license_number !== undefined) {

        updateData.fssai_license_number =
            fssai_license_number.trim();
    }


    if (is_active !== undefined) {

        updateData.is_active =
            is_active;
    }


    // ==========================================
    // UPDATE DATABASE
    // ==========================================

    const updatedComboProduct =
        await ComboProduct.findByIdAndUpdate(
            comboProductId,
            {
                $set: updateData
            },
            {
                returnDocument: "after",
                runValidators: true
            }
        );


    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({

        success: true,

        message:
            "Combo product info updated successfully.",

        data:
            updatedComboProduct

    });
});

const uploadComboProductImage = asyncHandler(async (req, res) => {

    const { comboProductId } = req.params;

    if (!req.files || req.files.length === 0) {
        throw new BadRequestError("No files uploaded.");
    }

    const comboProduct = await ComboProduct.findById(comboProductId);

    if (!comboProduct) {
        throw new NotFoundError("Combo product not found.");
    }

    // Check if ComboProductImage document already exists
    let imageDocument = await ComboProductImage.findOne({
        comboProductId
    });

    // Upload all images to Cloudinary
    const uploadedImages = [];

    for (const file of req.files) {

        const result = await uploadToCloudinary(
            file.buffer,
            "comboProducts"
        );

        uploadedImages.push({

            public_id: result.public_id,

            url: result.secure_url,

            is_primary: false,

            sort_order: 0

        });

    }

    // First Image Document for this Combo Product
    if (!imageDocument) {

        // Make first uploaded image primary
        if (uploadedImages.length > 0) {
            uploadedImages[0].is_primary = true;
        }

        imageDocument = await ComboProductImage.create({

            comboProductId,

            images: uploadedImages

        });

    } else {

        // If no primary image exists yet
        if (!imageDocument.images.some(img => img.is_primary)) {
            uploadedImages[0].is_primary = true;
        }

        // sort_order continue kare existing images ke baad se
        const startOrder = imageDocument.images.length;

        uploadedImages.forEach((img, index) => {
            img.sort_order = startOrder + index;
        });

        imageDocument.images.push(...uploadedImages);

        await imageDocument.save();

    }

    res.status(201).json({

        success: true,

        message: "Combo product images uploaded successfully.",

        data: imageDocument

    });

});

const deleteImageOfComboProduct = asyncHandler(async (req, res) => {

    const { comboProductId, imageId } = req.params;

    const comboProductImageDoc = await ComboProductImage.findOne({
        comboProductId
    });

    if (!comboProductImageDoc) {
        throw new NotFoundError("No images found for this combo product.");
    }

    const image = comboProductImageDoc.images.id(imageId);

    if (!image) {
        throw new NotFoundError("Image not found.");
    }

    // 1. Delete image from Cloudinary first
    const cloudinaryResponse = await deleteFromCloudinary(
        image.public_id
    );

    if (
        cloudinaryResponse.result !== "ok" &&
        cloudinaryResponse.result !== "not found"
    ) {
        throw new ServiceUnavailableError(
            "Unable to delete image from Cloudinary."
        );
    }

    // 2. Cloudinary se delete ho gaya — ab images array se pull karo
    comboProductImageDoc.images.pull(imageId);

    // 3. Agar images array empty ho gaya, to poora document delete kar do
    if (comboProductImageDoc.images.length === 0) {

        await ComboProductImage.findByIdAndDelete(comboProductImageDoc._id);

        return res.status(200).json({

            success: true,

            message: "Image deleted and image document removed (no images left).",

            data: null

        });

    }

    // Agar deleted image hi primary thi, to next image ko primary bana do
    if (image.is_primary) {
        comboProductImageDoc.images[0].is_primary = true;
    }

    await comboProductImageDoc.save();

    res.status(200).json({

        success: true,

        message: "Image deleted successfully.",

        data: comboProductImageDoc

    });

});

const updateComboProductImages = asyncHandler(async (req, res) => {

    const { comboProductId } = req.params;

    if (!req.file) {
        throw new BadRequestError("No file uploaded.");
    }

    // 1. Find the existing ComboProductImage document
    const comboProductImageDoc = await ComboProductImage.findOne({
        comboProductId
    });

    if (!comboProductImageDoc) {
        throw new NotFoundError("No image document found for this combo product.");
    }

    // 2. Upload the new image to Cloudinary
    const result = await uploadToCloudinary(
        req.file.buffer,
        "comboProducts"
    );

    // 3. Agar koi primary image already nahi hai to isko primary bana do
    const hasPrimary = comboProductImageDoc.images.some(img => img.is_primary);

    const newImage = {

        url: result.secure_url,

        public_id: result.public_id,

        is_primary: !hasPrimary,

        sort_order: comboProductImageDoc.images.length

    };

    // 4. Push into images array
    comboProductImageDoc.images.push(newImage);

    await comboProductImageDoc.save();

    res.status(200).json({

        success: true,

        message: "Combo product image updated successfully.",

        data: comboProductImageDoc

    });

});

const createSetPackOfcomboProduct = asyncHandler(async (req, res) => {

    const { comboProductId } = req.params;

    const {
        pack_name,
        pack_size,
        mrp,
        selling_price,
        discount_percent,
    } = req.body;

    let { products } = req.body;

    // 👇 form-data se products string ke roop me aati hai, JSON.parse karo
    if (typeof products === "string") {
        try {
            products = JSON.parse(products);
        } catch (err) {
            throw new BadRequestError("products must be a valid JSON array.");
        }
    }

    // required fields check
    if (!pack_name || !pack_size || !mrp || !selling_price) {
        throw new BadRequestError(
            "pack_name, pack_size, mrp and selling_price are required."
        );
    }

    // pack_size sirf 2, 3, 4 hi allowed hai (schema enum ke hisab se)
    if (![2, 3, 4].includes(Number(pack_size))) {
        throw new BadRequestError("pack_size must be 2, 3 or 4.");
    }

    // products array validation
    if (!Array.isArray(products) || products.length === 0) {
        throw new BadRequestError("products array is required.");
    }

    // products array ki length exactly pack_size ke barabar honi chahiye
    if (products.length !== Number(pack_size)) {
        throw new BadRequestError(
            `products array must contain exactly ${pack_size} items for pack_size ${pack_size}.`
        );
    }

    // har product me productId aur selectedWeight dono hone chahiye
    const isValidProducts = products.every(
        p => p && p.productId && p.selectedWeight
    );

    if (!isValidProducts) {
        throw new BadRequestError(
            "Each product in products array must have productId and selectedWeight."
        );
    }

    const comboProduct = await ComboProduct.findById(comboProductId);

    if (!comboProduct) {
        throw new NotFoundError("Combo product not found.");
    }

    let imageUrl = "";
    let imagePublicId = "";

    // image optional hai — agar file bheji hai to upload karo
    if (req.file) {

        const result = await uploadToCloudinary(
            req.file.buffer,
            "comboPacks"
        );

        imageUrl = result.secure_url;
        imagePublicId = result.public_id;

    }

    // agar discount_percent frontend se nahi aaya to mrp aur selling_price se calculate kar lo
    let finalDiscountPercent = discount_percent;

    if (finalDiscountPercent === undefined || finalDiscountPercent === null) {
        finalDiscountPercent = mrp > 0
            ? Math.round(((mrp - selling_price) / mrp) * 100)
            : 0;
    }

    const comboPack = await ComboPack.create({

        comboProductId,

        pack_name,

        pack_size,

        products,

        mrp,

        selling_price,

        discount_percent: finalDiscountPercent,

        image: imageUrl,

        public_id: imagePublicId

    });

    res.status(201).json({

        success: true,

        message: "Set pack created successfully.",

        data: comboPack

    });

});

const removeSetPackfromComboProduct = asyncHandler(async (req, res) => {

    const { comboProductId, setPackId } = req.params;

    const { role } = req.user;

    if (role !== 'admin' && role !== 'superadmin') {
        throw new ForbiddenError(
            'You do not have permission to access this resource.'
        );
    }

    const comboProduct = await ComboProduct.findById(comboProductId);

    if (!comboProduct) {
        throw new NotFoundError("Combo product not found.");
    }

    const setPack = await ComboPack.findById(setPackId);

    if (!setPack) {
        throw new NotFoundError("Set pack not found.");
    }

    // Confirm setPack belongs to this comboProduct
    if (setPack.comboProductId.toString() !== comboProductId) {
        throw new NotFoundError(
            "Set pack does not belong to this combo product."
        );
    }

    // Delete image from Cloudinary first (agar image hai)
    if (setPack.public_id) {

        const cloudinaryResponse = await deleteFromCloudinary(
            setPack.public_id
        );

        if (
            cloudinaryResponse.result !== "ok" &&
            cloudinaryResponse.result !== "not found"
        ) {
            throw new ServiceUnavailableError(
                "Unable to delete set pack image from Cloudinary."
            );
        }

    }

    // Cloudinary se delete ho gaya (ya image thi hi nahi) — ab DB se remove karo
    await ComboPack.findByIdAndDelete(setPackId);

    res.status(200).json({

        success: true,

        message: "Set pack removed successfully.",

        data: {
            comboProductId,
            removedSetPackId: setPackId
        }

    });

});

const getAllcomboProducts = asyncHandler(async (req, res) => {

    // Saare combo products + unke setPacks populated
    const comboProducts = await ComboProduct
        .find()
        .sort({ createdAt: -1 })
        .lean();

    // Empty result -> 200 with empty array
    if (comboProducts.length === 0) {
        return res.status(200).json({
            success: true,
            message: "No combo products found.",
            data: []
        });
    }

    const comboProductIds = comboProducts.map(cp => cp._id);

    // Un sab combo products ki images ek hi query me nikal lo
    const comboProductImages = await ComboProductImage
        .find({ comboProductId: { $in: comboProductIds } })
        .lean();

    // comboProductId -> images array ka quick lookup map bana lo
    const imageMap = {};

    comboProductImages.forEach(doc => {
        imageMap[doc.comboProductId.toString()] = doc.images;
    });

    // Har combo product ke saath uski images attach kar do
    const data = comboProducts.map(cp => ({
        ...cp,
        images: imageMap[cp._id.toString()] || []
    }));

    res.status(200).json({

        success: true,

        message: "Combo products fetched successfully.",

        data

    });

});

const getComboProductDetails = asyncHandler(async (req, res) => {

    const { comboProductId } = req.params;

    const [comboProduct, comboProductImageDoc] = await Promise.all([

        ComboProduct
            .findById(comboProductId)
            .lean(),

        ComboProductImage
            .findOne({ comboProductId })
            .lean()

    ]);

    if (!comboProduct) {
        throw new NotFoundError("Combo product not found.");
    }

    const data = {
        ...comboProduct,
        images: comboProductImageDoc ? comboProductImageDoc.images : []
    };

    res.status(200).json({

        success: true,

        message: "Combo product details fetched successfully.",

        data

    });

});

const getRandomComboProducts = asyncHandler(async (req, res) => {

    // Randomly fetch maximum 3 active combo products
    const comboProducts = await ComboProduct.aggregate([
        {
            $match: {
                is_active: true
            }
        },
        {
            $sample: {
                size: 3
            }
        }
    ]);

    // No combo products found
    if (comboProducts.length === 0) {
        return res.status(200).json({
            success: true,
            message: "No combo products found.",
            data: []
        });
    }

    // Get all combo product IDs
    const comboProductIds = comboProducts.map(
        cp => cp._id
    );

    // Fetch images for all combo products in one query
    const comboProductImages = await ComboProductImage
        .find({
            comboProductId: {
                $in: comboProductIds
            }
        })
        .lean();

    // Create comboProductId -> images map
    const imageMap = {};

    comboProductImages.forEach(doc => {
        imageMap[doc.comboProductId.toString()] =
            doc.images || [];
    });

    // Attach images to each combo product
    const data = comboProducts.map(cp => ({
        ...cp,
        images:
            imageMap[cp._id.toString()] || []
    }));

    return res.status(200).json({
        success: true,
        message: "Random combo products fetched successfully.",
        data
    });
});


module.exports = {
    createComboProduct,
    updateComboproductinfo,
    uploadComboProductImage,
    deleteImageOfComboProduct,
    updateComboProductImages,
    createSetPackOfcomboProduct,
    getAllcomboProducts,
    getComboProductDetails,
    removeSetPackfromComboProduct,
    getRandomComboProducts

}