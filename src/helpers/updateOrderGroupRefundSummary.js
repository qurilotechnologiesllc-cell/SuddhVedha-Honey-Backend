const Ordergroup = require("../models/orderGoup.model");
const Order = require("../models/orders.model");

const updateOrderGroupRefundSummary = async (orderGroupId) => {

    const orderGroup = await Ordergroup.findById(
        orderGroupId
    )
        .select("finalAmount")
        .lean();

    if (!orderGroup) {
        return null;
    }


    const orders = await Order.find({
        order_group_id: orderGroupId
    })
        .select("_id refunds")
        .lean();


    let totalRefundedAmount = 0;
    let refundCount = 0;

    const refundedOrderIds = new Set();

    let hasPendingRefund = false;


    // ─────────────────────────────────────────
    // Calculate refund summary
    // ─────────────────────────────────────────

    for (const order of orders) {

        let orderHasProcessedRefund = false;


        for (const refund of order.refunds || []) {

            // Processed refund
            if (refund.status === "processed") {

                totalRefundedAmount +=
                    Number(refund.amount || 0);

                refundCount += 1;

                orderHasProcessedRefund = true;
            }


            // Refund is still processing
            if (refund.status === "pending") {
                hasPendingRefund = true;
            }
        }


        if (orderHasProcessedRefund) {

            refundedOrderIds.add(
                String(order._id)
            );
        }
    }


    // ─────────────────────────────────────────
    // Calculate remaining amount
    // ─────────────────────────────────────────

    const remainingAmount =
        Math.max(
            Number(orderGroup.finalAmount) -
            totalRefundedAmount,
            0
        );


    // ─────────────────────────────────────────
    // Determine refund status
    // ─────────────────────────────────────────

    let refundStatus = "none";


    if (
        totalRefundedAmount >=
        Number(orderGroup.finalAmount)
    ) {

        refundStatus = "refunded";

    } else if (
        totalRefundedAmount > 0
    ) {

        refundStatus =
            "partially_refunded";

    } else if (
        hasPendingRefund
    ) {

        refundStatus = "pending";
    }


    // ─────────────────────────────────────────
    // Update OrderGroup
    // ─────────────────────────────────────────

    const updatedOrderGroup =
        await Ordergroup.findByIdAndUpdate(
            orderGroupId,
            {
                $set: {

                    total_refunded_amount:
                        totalRefundedAmount,

                    remaining_amount:
                        remainingAmount,

                    refund_count:
                        refundCount,

                    refunded_order_count:
                        refundedOrderIds.size,

                    refunded_order_ids:
                        Array.from(
                            refundedOrderIds
                        ),

                    refund_status:
                        refundStatus
                }
            },
            {
                new: true
            }
        );


    return updatedOrderGroup;
};

module.exports = updateOrderGroupRefundSummary;