const Order = require("../models/orders.model");
const OrderGroup = require("../models/orderGoup.model");
const { checkDeliveryAvailabilityService } = require("../services/delivery.service");

const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError, ServiceUnavailableError } = require('../errors/errorConfig')

const checkdeliveryavailability = asyncHandler(async (req, res) => {
  const { pincode } = req.body;

  const role = req.user.role;

  if (role !== "user") {
    throw new ForbiddenError("Access denied. Only users can check delivery availability.");
  }

  if (!pincode) {
    throw new BadRequestError("Pincode is required");
  }

  // Call the service function to check delivery availability
    const isAvailable = await checkDeliveryAvailabilityService(pincode);

  res.status(200).json({ available: isAvailable });
});

module.exports = {
  checkdeliveryavailability,
};