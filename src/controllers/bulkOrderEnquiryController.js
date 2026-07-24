const BulkOrderEnquiry = require("../models/bulkOrderEnquiry.model");
const {
    asyncHandler,
    BadRequestError,
    ConflictError
} = require("../errors/errorConfig");

const sendEnquiry = asyncHandler(async (req, res) => {

    const {
        fullname,
        businessEmail,
        expectedQuantity
    } = req.body;

    if (!fullname || !businessEmail || !expectedQuantity) {
        throw new BadRequestError(
            "Full name, business email and expected quantity are required."
        );
    }

    // -------------------------
    // Check Existing Enquiry
    // -------------------------

    const existingEnquiry = await BulkOrderEnquiry.findOne({
        business_email: businessEmail.toLowerCase().trim()
    });

    if (existingEnquiry) {

        return res.status(200).json({

            success: false,

            message: `Your enquiry has already been submitted and is currently "${existingEnquiry.status}". For more information, please contact our support team at ${process.env.ADMIN_EMAIL}.`,

            data: {
                status: existingEnquiry.status,
                adminEmail: process.env.ADMIN_EMAIL
            }

        });

    }

    // -------------------------
    // Save Enquiry
    // -------------------------

    const enquiry = await BulkOrderEnquiry.create({

        full_name: fullname,

        business_email: businessEmail.toLowerCase().trim(),

        expected_quantity: expectedQuantity

    });

    return res.status(201).json({

        success: true,

        message:
            "Your bulk order enquiry has been submitted successfully. Our team will contact you shortly.",

        data: enquiry

    });

});

const getAllBulkOrderEnquiry = asyncHandler(async (req, res) => {

    const { role } = req.user;


    if (!["admin", "superadmin"].includes(role)) {
        throw new ForbiddenError(
            "You are not authorized to access bulk order enquiries."
        );
    }

    const enquiries = await BulkOrderEnquiry
        .find()
        .sort({ createdAt: -1 });

    if (!enquiries.length) {
        throw new NotFoundError("No bulk order enquiries found.");
    }

    return res.status(200).json({

        success: true,

        message: "Bulk order enquiries fetched successfully.",

        totalEnquiries: enquiries.length,

        data: enquiries

    });

});

const updateEnquiryStatusWithNotes = asyncHandler(async (req, res) => {

    const { role } = req.user;

    const { enquiryId } = req.params;

    const {
        status,
        admin_notes
    } = req.body;

    if (!["admin", "superadmin"].includes(role)) {
        throw new ForbiddenError(
            "You are not authorized to update this enquiry."
        );
    }


    const enquiry = await BulkOrderEnquiry.findById(enquiryId);

    if (!enquiry) {
        throw new NotFoundError("Bulk order enquiry not found.");
    }

    const allowedStatus = [
        "pending",
        "contacted",
        "confirmed",
        "rejected"
    ];

    if (status && !allowedStatus.includes(status)) {
        throw new BadRequestError("Invalid enquiry status.");
    }

    // -----------------------------
    // Update Fields
    // -----------------------------

    if (status) {
        enquiry.status = status;
    }

    if (admin_notes !== undefined) {
        enquiry.admin_notes = admin_notes.trim();
    }

    enquiry.is_read = true;

    await enquiry.save();

    // -----------------------------
    // Response
    // -----------------------------

    return res.status(200).json({

        success: true,

        message: "Bulk order enquiry updated successfully.",

        data: enquiry

    });

});


module.exports = {
    sendEnquiry,
    getAllBulkOrderEnquiry,
    updateEnquiryStatusWithNotes
};