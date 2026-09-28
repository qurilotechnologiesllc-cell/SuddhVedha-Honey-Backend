const Cart = require("../models/cart.model");
const ComboCart = require("../models/ComboCart.model");
const Product = require("../models/product.model");
const ProductImage = require("../models/productImage.model");
const ProductVariant = require("../models/productVariant.model");
const ComboPack = require("../models/comboPack.model");


const buildCartCatalog = async (userId) => {

    // =====================================================
    // Fetch Both Carts
    // =====================================================

    const [cart, comboCart] = await Promise.all([

        Cart.findOne({ userId }).lean(),

        ComboCart.findOne({ userId }).lean()

    ]);


    // =====================================================
    // Collect IDs
    // =====================================================

    const productIds = new Set();

    const setPackIds = new Set();


    // =====================================================
    // Normal Cart Products
    // =====================================================

    if (cart?.items?.length) {

        cart.items.forEach(item => {

            if (item.productId) {

                productIds.add(
                    item.productId.toString()
                );

            }

        });

    }


    // =====================================================
    // Combo Cart
    // =====================================================

    if (comboCart?.items?.length) {

        comboCart.items.forEach(item => {

            // ---------------------------------------------
            // SetPack ID
            // ---------------------------------------------

            if (item.setPackId) {

                setPackIds.add(
                    item.setPackId.toString()
                );

            }


            // ---------------------------------------------
            // Products inside Combo
            // ---------------------------------------------

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


    // =====================================================
    // Fetch Products
    // =====================================================

    const products = await Product.find({

        _id: {
            $in: [...productIds]
        }

    }).lean();


    // =====================================================
    // Collect Image + Variant Document IDs
    // =====================================================

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


    // =====================================================
    // Fetch All Catalog Data
    // =====================================================

    const [
        images,
        variants,
        comboPacks
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


        ComboPack.find({

            _id: {
                $in: [...setPackIds]
            }

        }).lean()

    ]);


    // =====================================================
    // Image Map
    // =====================================================

    const imageMap = new Map();

    images.forEach(image => {

        imageMap.set(
            image._id.toString(),
            image
        );

    });


    // =====================================================
    // Variant Map
    // =====================================================

    const variantMap = new Map();

    variants.forEach(variant => {

        variantMap.set(
            variant._id.toString(),
            variant
        );

    });


    // =====================================================
    // Product Catalog Map
    // =====================================================

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


    // =====================================================
    // ComboPack Map
    // =====================================================

    const comboPackMap = new Map();

    comboPacks.forEach(comboPack => {

        comboPackMap.set(

            comboPack._id.toString(),

            comboPack

        );

    });


    // =====================================================
    // Return
    // =====================================================

    return {

        cart,

        comboCart,

        catalogMap,

        comboPackMap

    };

};


module.exports = {
    buildCartCatalog
};