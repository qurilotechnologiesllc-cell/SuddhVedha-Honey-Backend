const Order = require('../models/orders.model')
const User = require('../models/user.model')
const Ordergroup = require('../models/orderGoup.model')
const Product = require('../models/product.model')

const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } = require('../errors/errorConfig')

const getAllOrders = asyncHandler(async (req, res) => {

    const { role } = req.user;

    if (role !== 'admin' && role !== 'superadmin') {
        throw new ForbiddenError(
            'You do not have permission to access this resource.'
        );
    }

    const page =
        parseInt(req.query.page) || 1;

    const limit =
        parseInt(req.query.limit) || 10;

    const skip =
        (page - 1) * limit;


    const [orderGroups, totalOrders] =
        await Promise.all([

            Ordergroup.find()
                .populate(
                    'userId',
                    'name email mobile -_id'
                )
                .select(
                    'group_id ' +
                    'userId ' +
                    'orderIds ' +
                    'totalAmount ' +
                    'finalAmount ' +
                    'cod_amount ' +
                    'payment_mode ' +
                    'payment_status ' +
                    'refund_status ' +
                    'total_refunded_amount ' +
                    'remaining_amount ' +
                    'createdAt'
                )
                .sort({
                    createdAt: -1
                })
                .skip(skip)
                .limit(limit)
                .exec(),

            Ordergroup.countDocuments(),

        ]);


    // Get all orders belonging to these groups
    const groupIds =
        orderGroups.map(
            (group) => group._id
        );


    const orders = await Order.find({
        order_group_id: {
            $in: groupIds
        }
    })
        .select(
            '_id ' +
            'order_group_id ' +
            'order_status'
        )
        .lean();


    // Group orders by order_group_id
    const ordersByGroup = new Map();


    for (const order of orders) {

        const groupId =
            String(order.order_group_id);

        if (!ordersByGroup.has(groupId)) {
            ordersByGroup.set(
                groupId,
                []
            );
        }

        ordersByGroup
            .get(groupId)
            .push(order);
    }


    const formattedOrders =
        orderGroups.map((group) => {

            const groupOrders =
                ordersByGroup.get(
                    String(group._id)
                ) || [];


            // Cancelled + refunded orders
            const cancelledOrders =
                groupOrders.filter(
                    (order) =>
                        order.order_status === 'cancelled' ||
                        order.order_status === 'refunded'
                );


            // Active / non-cancelled orders
            const activeOrders =
                groupOrders.filter(
                    (order) =>
                        order.order_status !== 'cancelled' &&
                        order.order_status !== 'refunded'
                );


            return {

                id: group._id,

                group_id:
                    group.group_id,

                customer:
                    group.userId,

                payment_mode:
                    group.payment_mode,

                payment_status:
                    group.payment_status,

                finalAmount:
                    group.finalAmount,

                cod_amount:
                    group.cod_amount,

                // Original total child orders
                orderCount:
                    groupOrders.length,

                // Active orders
                activeOrderCount:
                    activeOrders.length,

                // Cancelled / refunded orders
                cancelledOrderCount:
                    cancelledOrders.length,

                refund_status:
                    group.refund_status,

                total_refunded_amount:
                    group.total_refunded_amount,

                remaining_amount:
                    group.remaining_amount,

                date:
                    group.createdAt,
            };
        });


    res.status(200).json({

        success: true,

        data:
            formattedOrders,

        pagination: {

            total:
                totalOrders,

            page,

            limit,

            totalPages:
                Math.ceil(
                    totalOrders / limit
                ),
        },
    });
});

const getOrderfullDetails = asyncHandler(async (req, res) => {

    const { role } = req.user;

    if (role !== 'admin' && role !== 'superadmin') {
        throw new ForbiddenError(
            'You do not have permission to access this resource.'
        );
    }

    const groupId = req.params.id;

    const orderGroup = await Ordergroup
        .findById(groupId)
        .exec();

    if (!orderGroup) {
        throw new NotFoundError(
            'Order group not found.'
        );
    }

    const orders = await Order.find({
        _id: {
            $in: orderGroup.orderIds
        }
    })
        .populate(
            'userId',
            'name email mobile -_id'
        )
        .select(
            '-plan_purchase_id ' +
            '-plan_delivery_number ' +
            '-plan_delivery_date ' +
            '-__v ' +
            '-_id'
        )
        .exec();

    if (!orders.length) {
        throw new NotFoundError(
            'Orders not found.'
        );
    }


    // ==========================================
    // ACTIVE ORDERS
    // ==========================================

    const activeOrders = orders.filter(
        (order) =>
            order.order_status !== 'cancelled' &&
            order.order_status !== 'refunded'
    );


    // ==========================================
    // CANCELLED / REFUNDED ORDERS
    // ==========================================

    const cancelledOrders = orders.filter(
        (order) =>
            order.order_status === 'cancelled' ||
            order.order_status === 'refunded'
    );


    // ==========================================
    // ACTIVE ORDERS TOTAL AMOUNT
    // ==========================================

    const activeTotalAmount =
        activeOrders.reduce(
            (total, order) =>
                total +
                Number(order.totalAmount || 0),
            0
        );


    // ==========================================
    // ACTIVE ORDERS FINAL AMOUNT
    // ==========================================

    const activeFinalAmount =
        activeOrders.reduce(
            (total, order) => {

                const orderFinalAmount =
                    order.items?.reduce(
                        (itemTotal, item) =>
                            itemTotal +
                            (
                                Number(
                                    item.product_details
                                        ?.finalAmount || 0
                                ) *
                                Number(
                                    item.quantity || 1
                                )
                            ),
                        0
                    ) || 0;

                return total + orderFinalAmount;
            },
            0
        );


    // ==========================================
    // RESPONSE
    // ==========================================

    res.status(200).json({

        success: true,

        data: {

            // ------------------------------------
            // GROUP INFORMATION
            // ------------------------------------

            group_id:
                orderGroup.group_id,

            payment_mode:
                orderGroup.payment_mode,

            payment_status:
                orderGroup.payment_status,


            // ------------------------------------
            // ORIGINAL GROUP AMOUNT
            // ------------------------------------

            original_totalAmount:
                orderGroup.totalAmount,

            original_finalAmount:
                orderGroup.finalAmount,


            // ------------------------------------
            // REFUND INFORMATION
            // ------------------------------------

            refund_status:
                orderGroup.refund_status,

            total_refunded_amount:
                orderGroup.total_refunded_amount,

            remaining_amount:
                orderGroup.remaining_amount,


            // ------------------------------------
            // ACTIVE ORDER AMOUNT
            // ------------------------------------

            // IMPORTANT:
            // Only active orders amount

            totalAmount:
                activeTotalAmount,

            finalAmount:
                activeFinalAmount,


            // ------------------------------------
            // OTHER GROUP INFORMATION
            // ------------------------------------

            cod_amount:
                orderGroup.cod_amount,

            coupon:
                orderGroup.coupon,

            createdAt:
                orderGroup.createdAt,


            // ------------------------------------
            // ORDER COUNTS
            // ------------------------------------

            totalOrderCount:
                orders.length,

            activeOrderCount:
                activeOrders.length,

            cancelledOrderCount:
                cancelledOrders.length,


            // ------------------------------------
            // ORDERS
            // ------------------------------------

            activeOrders,

            cancelledOrders,
        },
    });
});

const getOrderWithStatus = asyncHandler(async (req, res) => {
    const { role } = req.user;

    // Admin permission
    if (role !== "admin" && role !== "superadmin") {
        throw new ForbiddenError(
            "You do not have permission to access this resource."
        );
    }

    // Get ALL orders
    // Only required fields will be returned
    const orders = await Order.find(
        {},
        {
            _id: 0,
            order_id: 1,
            userId: 1,
            order_group_id: 1,
            payment_mode: 1,
            payment_status: 1,
            order_status: 1,
            inventory_status: 1
        }
    ).lean();

    return res.status(200).json({
        success: true,
        message: "Order status details fetched successfully",
        totalOrders: orders.length,
        orders
    });
});

const getLowStockproductDetails = asyncHandler(async (req, res) => {
    const { role } = req.user;

    // Admin permission
    if (role !== "admin" && role !== "superadmin") {
        throw new ForbiddenError(
            "You do not have permission to access this resource."
        );
    }

    const products = await Product.find({ is_active: true })
        .select("product_name brand product_type floral_source variantDocumentId")
        .populate({
            path: "variantDocumentId",
            select: "variants"
        })
        .lean();

    const lowStockProducts = products
        .map((product) => {
            const lowStockVariants =
                product.variantDocumentId?.variants?.filter(
                    (variant) => variant.stock_status === "low_stock"
                ) || [];

            if (lowStockVariants.length === 0) {
                return null;
            }

            return {
                _id: product._id,
                product_name: product.product_name,
                brand: product.brand,
                product_type: product.product_type,
                floral_source: product.floral_source,
                variants: lowStockVariants
            };
        })
        .filter(Boolean);

    return res.status(200).json({
        success: true,
        message: "Low stock products fetched successfully.",
        count: lowStockProducts.length,
        data: lowStockProducts
    });
});

module.exports = {
    getAllOrders,
    getOrderfullDetails,
    getOrderWithStatus,
    getLowStockproductDetails
}



