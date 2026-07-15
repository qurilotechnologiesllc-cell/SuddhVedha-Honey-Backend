const Giftcart = require('../models/giftCart.model')
const Product = require('../models/product.model')
const ProductVariants = require('../models/productVariant.model')
const GiftBox = require('../models/giftBox.model')
const GiftWrap = require('../models/giftWrap.model')
const { asyncHandler, BadRequestError, UnauthorizedError, NotFoundError, ConflictError } = require('../errors/errorConfig')

const addToGiftCart = asyncHandler(async (req, res) => {

    const userId = req.user.id;

    const {
        giftBoxId,
        giftWrapId,
        customMessage = "",
        packingPrice,
        products
    } = req.body;

    let totalWeight = 0;
    let calculatedTotalAmount = 0;

    if (packingPrice > 0) {
        calculatedTotalAmount += packingPrice
    }

    // -----------------------------
    // Basic Validation
    // -----------------------------

    if (!giftBoxId || !giftWrapId) {
        throw new BadRequestError("Gift Box and Gift Wrap is required.");
    }

    if (giftBoxId) {
        const giftBox = await GiftBox.findById(giftBoxId);

        if (!giftBox) {
            throw new NotFoundError("Gift Box not found.");
        }
        calculatedTotalAmount += giftBox.price
    }

    if (giftWrapId) {

        const giftWrap = await GiftWrap.findById(giftWrapId);

        if (!giftWrap) {
            throw new NotFoundError("Gift Wrap not found.");
        }
        calculatedTotalAmount += giftWrap.price
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
        throw new BadRequestError("Please select at least one honey.");
    }
    

    const productIds = products.map(item => item.productId);

    const variantDocuments = await ProductVariants.find({
        product: { $in: productIds }
    });

    const variantMap = new Map();

    variantDocuments.forEach(doc => {
        variantMap.set(doc.product.toString(), doc);
    });


    for (const item of products) {

        const { productId, selectedWeight } = item;

        // Memory se Variant Document nikalo
        const variantDocument = variantMap.get(productId.toString());

        if (!variantDocument) {
            throw new NotFoundError("Product variant not found.");
        }

        // Embedded variant find karo
        const variant = variantDocument.variants.id(selectedWeight);

        if (!variant) {
            throw new BadRequestError("Selected variant is invalid.");
        }

        // Weight
        const weight = parseInt(variant.weight);

        totalWeight += weight;

        // variant Price
        calculatedTotalAmount += variant.price;

    }


    // -----------------------------
    // Find Gift Cart
    // -----------------------------

    let giftCart = await Giftcart.findOne({ userId });

    const newGiftItem = {

        giftBoxId,

        giftWrapId,

        customMessage,

        packingPrice,

        totalWeight,

        totalAmount: calculatedTotalAmount,

        products

    };

    if (!giftCart) {

        giftCart = await Giftcart.create({

            userId,

            items: [newGiftItem]

        });

    } else {

        giftCart.items.push(newGiftItem);

        await giftCart.save();

    }

    return res.status(200).json({

        success: true,

        message: "Gift added to cart successfully.",

        data: giftCart

    });

});


module.exports = { addToGiftCart }