const Cart = require("../models/cart.model");
const Giftcart = require("../models/giftCart.model");

const Product = require("../models/product.model");
const ProductImage = require("../models/productImage.model");
const ProductVariant = require("../models/productVariant.model");

const GiftBox = require("../models/giftBox.model");
const Offer = require("../models/offer.model");


const buildCartCatalog = async (userId) => {

    // -----------------------------
    // Fetch Both Carts
    // -----------------------------

    const [cart, giftCart] = await Promise.all([

        Cart.findOne({ userId }).lean(),

        Giftcart.findOne({ userId }).lean()

    ]);


    // -----------------------------
    // Collect IDs
    // -----------------------------

    const productIds = new Set();
    const giftBoxIds = new Set();
    const couponIds = new Set();


    // -----------------------------
    // Normal Cart
    // -----------------------------

    if (cart?.items?.length) {

        cart.items.forEach(item => {

            // Product ID
            if (item.productId) {

                productIds.add(
                    item.productId.toString()
                );

            }


            // Coupon ID
            if (item.couponId) {

                couponIds.add(
                    item.couponId.toString()
                );

            }

        });

    }


    // -----------------------------
    // Gift Cart
    // -----------------------------

    if (giftCart?.items?.length) {

        giftCart.items.forEach(item => {

            // Gift Box ID
            if (item.giftBoxId) {

                giftBoxIds.add(
                    item.giftBoxId.toString()
                );

            }


            // Coupon ID
            if (item.couponId) {

                couponIds.add(
                    item.couponId.toString()
                );

            }


            // Products
            if (item.products?.length) {

                item.products.forEach(product => {

                    if (product.productId) {

                        productIds.add(
                            product.productId.toString()
                        );

                    }

                });

            }

        });

    }


    // -----------------------------
    // Fetch Products
    // -----------------------------

    const products = await Product.find({

        _id: {
            $in: [...productIds]
        }

    }).lean();


    // -----------------------------
    // Collect Image & Variant IDs
    // -----------------------------

    const imageIds = [];
    const variantIds = [];

    products.forEach(product => {

        if (product.imageDocumentId) {

            imageIds.push(
                product.imageDocumentId
            );

        }

        if (product.variantDocumentId) {

            variantIds.push(
                product.variantDocumentId
            );

        }

    });


    // -----------------------------
    // Fetch All Catalog Data
    // -----------------------------

    const [
        images,
        variants,
        giftBoxes,
        offers
    ] = await Promise.all([

        ProductImage.find({

            _id: {
                $in: imageIds
            }

        }).lean(),


        ProductVariant.find({

            _id: {
                $in: variantIds
            }

        }).lean(),


        GiftBox.find({

            _id: {
                $in: [...giftBoxIds]
            }

        }).lean(),


        // Only applied coupons
        Offer.find({

            _id: {
                $in: [...couponIds]
            },

            isActive: true

        }).lean()

    ]);


    // -----------------------------
    // Image Map
    // -----------------------------

    const imageMap = new Map();

    images.forEach(image => {

        imageMap.set(
            image._id.toString(),
            image
        );

    });


    // -----------------------------
    // Variant Map
    // -----------------------------

    const variantMap = new Map();

    variants.forEach(variant => {

        variantMap.set(
            variant._id.toString(),
            variant
        );

    });


    // -----------------------------
    // Product Catalog Map
    // -----------------------------

    const catalogMap = new Map();

    products.forEach(product => {

        catalogMap.set(
            product._id.toString(),
            {

                product,

                image:
                    imageMap.get(
                        product.imageDocumentId?.toString()
                    ) || null,

                variantDocument:
                    variantMap.get(
                        product.variantDocumentId?.toString()
                    ) || null

            }
        );

    });


    // -----------------------------
    // Gift Box Map
    // -----------------------------

    const giftBoxMap = new Map();

    giftBoxes.forEach(box => {

        giftBoxMap.set(
            box._id.toString(),
            box
        );

    });


    // -----------------------------
    // Offer Map
    // -----------------------------

    const offerMap = new Map();

    offers.forEach(offer => {

        offerMap.set(
            offer._id.toString(),
            offer
        );

    });


    // -----------------------------
    // Return
    // -----------------------------

    return {

        cart,

        giftCart,

        catalogMap,

        giftBoxMap,

        offerMap

    };

};


module.exports = {
    buildCartCatalog
};