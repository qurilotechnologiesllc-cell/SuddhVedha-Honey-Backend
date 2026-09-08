const Order = require('../models/orders.model')
const User = require('../models/user.model')
const Ordergroup = require('../models/orderGoup.model')

const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } = require('../errors/errorConfig')

const getAllOrders = asyncHandler(async (req, res) => {
    const { role } = req.user;

    if (role !== 'admin' && role !== 'superadmin') {
        throw new ForbiddenError('You do not have permission to access this resource.');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [orderGroups, totalOrders] = await Promise.all([
        Ordergroup.find()
            .populate('userId', 'name email mobile -_id')
            .select('group_id userId orderIds finalAmount cod_amount payment_mode payment_status createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec(),
        Ordergroup.countDocuments(),
    ]);

    const formattedOrders = orderGroups.map((group) => ({
        id: group._id,
        group_id: group.group_id,
        customer: group.userId,
        payment_mode: group.payment_mode,
        payment_status: group.payment_status,
        finalAmount: group.finalAmount,
        cod_amount: group.cod_amount,
        orderCount: group.orderIds.length,
        date: group.createdAt,
    }));

    res.status(200).json({
        success: true,
        data: formattedOrders,
        pagination: {
            total: totalOrders,
            page,
            limit,
            totalPages: Math.ceil(totalOrders / limit),
        },
    });
});

const getOrderfullDetails = asyncHandler(async (req, res) => {
    const { role } = req.user;

    if (role !== 'admin' && role !== 'superadmin') {
        throw new ForbiddenError('You do not have permission to access this resource.');
    }

    const groupId = req.params.id;

    const orderGroup = await Ordergroup.findById(groupId).exec();

    if (!orderGroup) {
        throw new NotFoundError('Order group not found.');
    }

    const orders = await Order.find({ _id: { $in: orderGroup.orderIds } })
        .populate('userId', 'name email mobile -_id').select('-plan_purchase_id -plan_delivery_number -plan_delivery_date -__v -_id')
        .exec();

    if (!orders.length) {
        throw new NotFoundError('Orders not found.');
    }

    res.status(200).json({
        success: true,
        data: {
            group_id: orderGroup.group_id,
            payment_mode: orderGroup.payment_mode,
            payment_status: orderGroup.payment_status,
            totalAmount: orderGroup.totalAmount,
            finalAmount: orderGroup.finalAmount,
            cod_amount: orderGroup.cod_amount,
            coupon: orderGroup.coupon,
            createdAt: orderGroup.createdAt,
            orders,
        },
    });
});

module.exports = {
    getAllOrders,
    getOrderfullDetails
}



