const axios = require("axios");
const { ServiceUnavailableError } = require("../errors/errorConfig");

const {
    AUTOBYSMS_API_KEY,
    AUTOBYSMS_SENDER_ID,
    AUTOBYSMS_TEMPLATE_ID,
} = process.env;

const sendOtp = async (phoneNumber, otp) => {
    try {
        if (!phoneNumber || !otp) {
            throw new Error("Phone number and OTP are required.");
        }

        // const message = encodeURIComponent(
        //     `Dear Customer, use OTP ${otp} to verify your Shuddhveda Honey account. This OTP is valid for 10 minutes. Please do not disclose it to anyone. Team Shuddhveda Honey`
        // );

        const message = encodeURIComponent(`Your OTP is ${otp} SELECTIAL`);

        const apiUrl = `https://sms.autobysms.com/app/smsapi/index.php?key=${AUTOBYSMS_API_KEY}&campaign=0&routeid=9&type=text&contacts=${phoneNumber}&senderid=${AUTOBYSMS_SENDER_ID}&msg=${message}&template_id=${AUTOBYSMS_TEMPLATE_ID}`;

        const { data } = await axios.get(apiUrl, {
            timeout: 10000,
        });

        if (!data) {
            throw new Error("Failed to send OTP.");
        }

        return data;

    } catch (error) {
        throw new ServiceUnavailableError(
            "Failed to send OTP. Please try again later.",
            error.response?.data || error.message
        );
    }
};

module.exports = sendOtp;