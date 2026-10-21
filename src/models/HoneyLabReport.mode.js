// models/HoneyLabReport.js
const mongoose = require("mongoose");

const honeyLabReportSchema = new mongoose.Schema(
    {
        // which honey this lab report belongs to
        honeyName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        // lab report PDF stored on Cloudinary
        report: {
            url: { type: String, required: true },      // secure_url from Cloudinary
            publicId: { type: String, required: true }, // needed to delete/replace the file later
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("HoneyLabReport", honeyLabReportSchema);