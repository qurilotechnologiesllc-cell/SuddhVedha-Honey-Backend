const Order = require('../models/orders.model')
const User = require('../models/user.model')
const Ordergroup = require('../models/orderGoup.model')

const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } = require('../errors/errorConfig')

const getAllOrders = asyncHandler(async (req, res) => {
    const { role } = req.user;

    if (role !== 'admin' && role !== 'superadmin') {
        throw new ForbiddenError('You do not have permission to access this resource.');
    }

    const orders = await Order.find().populate('userId', 'name email mobile -_id').populate('order_group_id', 'group_id finalAmount cod_amount -_id').select('-shipping_address -billing_address').exec();

    res.status(200).json({ success: true, data: orders });
});

const getOrderById = asyncHandler(async (req, res) => {
    const { role } = req.user;

    if (role !== 'admin' && role !== 'superadmin') {
        throw new ForbiddenError('You do not have permission to access this resource.');
    }

    const orderId = req.params.id;

    const order = await Order.findById(orderId).populate('userId', 'name email mobile -_id').populate('order_group_id', 'group_id totalAmount finalAmount cod_amount -_id').select('-totalAmount').exec();

    if (!order) {
        throw new NotFoundError('Order not found.');
    }

    res.status(200).json({ success: true, data: order });
});

module.exports = {
    getAllOrders,
    getOrderById
}



