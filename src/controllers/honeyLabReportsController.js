const mongoose = require('mongoose')
const HoneyLabReport = require("../models/HoneyLabReport.mode");
const { asyncHandler, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ServiceUnavailableError } = require('../errors/errorConfig')
const { uploadPdfToCloudinary, deleteFromCloudinary } = require('../utils/uploadToCloudinary')

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

const removeHoneylabReports = asyncHandler(async (req, res) => {
    // const { role } = req.user;
    const { reportId } = req.params;

    // // only admin can delete (change this to match your role names)
    // if (role !== "admin") {
    //     return res.status(403).json({
    //         success: false,
    //         message: "You are not allowed to delete lab reports",
    //     });
    // }

    if (!mongoose.isValidObjectId(reportId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid report id",
        });
    }

    const report = await HoneyLabReport.findById(reportId);

    if (!report) {
        return res.status(404).json({
            success: false,
            message: "Lab report not found",
        });
    }

    // 1. delete the PDF from Cloudinary (PDFs are stored as 'raw')
    const cloudinaryResult = await deleteFromCloudinary(report.report.publicId, "raw");

    // 'ok' = deleted, 'not found' = file is already gone from Cloudinary
    if (cloudinaryResult.result !== "ok" && cloudinaryResult.result !== "not found") {
        return res.status(500).json({
            success: false,
            message: "Failed to delete PDF from Cloudinary",
        });
    }

    // 2. only after Cloudinary succeeds, delete from database
    await report.deleteOne();

    res.status(200).json({
        success: true,
        message: "Lab report removed successfully",
    });
});

module.exports = { createLabReport, getAllHoneyLabReports, removeHoneylabReports }