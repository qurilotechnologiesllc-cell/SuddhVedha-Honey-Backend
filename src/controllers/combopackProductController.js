const ComboProduct = require('../models/comboProduct.model')
const ComboPack = require('../models/comboPack.model')
const ComboProductImage = require('../models/comboProductImage.model')
const cloudinary = require('../config/cloudinary')
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary')
const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError } = require('../errors/errorConfig')


const createComboProduct = asyncHandler(async (req, res) => {
    const {
        combo_name,
        slug,
        brand,
        description,
        key_benefits,
        manufacturer_information,
        shelf_life,
        storage_instructions,
        country_of_origin,
        fssai_license_number,
        is_active
    } = req.body;

    // required fields (as per schema)
    if (
        !combo_name ||
        !slug ||
        !description ||
        !key_benefits ||
        !manufacturer_information ||
        !shelf_life ||
        !storage_instructions ||
        !fssai_license_number
    ) {
        throw new BadRequestError('Missing required fields for combo product');
    }

    const existingCombo = await ComboProduct.findOne({ slug: slug.trim() });

    if (existingCombo) {
        throw new ConflictError('A combo product with this slug already exists');
    }

    const comboProduct = await ComboProduct.create({
        combo_name,
        slug,
        brand,
        description,
        key_benefits,
        manufacturer_information,
        shelf_life,
        storage_instructions,
        country_of_origin,
        fssai_license_number,
        is_active
    });

    return res.status(201).json({
        success: true,
        message: 'Combo product created successfully',
        data: comboProduct
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

const createSetPackOfcomboProduct = asyncHandler(async (req, res) => {

    const { comboProductId } = req.params;

    const {
        pack_name,
        pack_size,
        mrp,
        selling_price,
        discount_percent
    } = req.body;

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

        mrp,

        selling_price,

        discount_percent: finalDiscountPercent,

        image: imageUrl,

        public_id: imagePublicId

    });

    // 👇 ye naya step — comboPack ki id ComboProduct ke setPacks array me push kar rahe hai
    comboProduct.setPacks.push(comboPack._id);

    await comboProduct.save();

    res.status(201).json({

        success: true,

        message: "Set pack created successfully.",

        data: comboPack

    });

});

const getAllcomboProducts = asyncHandler(async (req, res) => {

    // Saare combo products + unke setPacks populated
    const comboProducts = await ComboProduct
        .find()
        .sort({ createdAt: -1 })
        .select('-setPacks')
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
            .populate("setPacks")
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

module.exports = {
    createComboProduct,
    uploadComboProductImage,
    createSetPackOfcomboProduct,
    getAllcomboProducts,
    getComboProductDetails
}