const HoneyLabReport = require("../models/HoneyLabReport.mode");
const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ServiceUnavailableError } = require('../errors/errorConfig')
const { uploadPdfToCloudinary } = require('../utils/uploadToCloudinary')

const createLabReport = asyncHandler(async (req, res) => {
    try {
        const { honeyName } = req.body;
        if (!honeyName) {
            return res.status(400).json({ message: "honeyName is required" });
        }

        const pdf = await uploadPdfToCloudinary(
            req.file.buffer,
            'HoneyLabReports',
            req.file.originalname
        );

        const doc = await HoneyLabReport.create({
            honeyName,
            report: { url: pdf.url, publicId: pdf.public_id },
        });

        res.status(201).json(doc);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

const getAllHoneyLabReports = asyncHandler(async (req, res) => {
    const reports = await HoneyLabReport.find()
        .sort({ createdAt: -1 }) // newest first
        .lean();

    res.status(200).json({
        success: true,
        count: reports.length,
        data: reports,
    });
});

module.exports = { createLabReport, getAllHoneyLabReports }