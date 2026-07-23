const brevo = require("../config/brevo");

const sendThankYouEmail = async (userEmail, userName) => {

    try {

        const response =
            await brevo.transactionalEmails.sendTransacEmail({

                sender: {

                    email: process.env.BREVO_SENDER_EMAIL,

                    name: process.env.BREVO_SENDER_NAME

                },

                to: [

                    {

                        email: userEmail,

                        name: userName

                    }

                ],

                templateId: Number(process.env.BREVO_TEMPLATE_ID),

                params: {

                    userName

                }

            });

        console.log("✅ Email Sent", response);

        return {

            success: true,

            data: response

        };

    }

    catch (error) {

        console.error(error);

        return {

            success: false,

            error: error.message

        };

    }

};

const sendEmailforOtp = async (adminEmail, fullname, otp) => {
    try {

        const response =
            await brevo.transactionalEmails.sendTransacEmail({

                sender: {

                    email: process.env.BREVO_SENDER_EMAIL,

                    name: process.env.BREVO_SENDER_NAME

                },

                to: [

                    {

                        email: adminEmail,

                        name: fullname

                    }

                ],

                templateId: Number(process.env.BREVO__OTP_TEMPLATE_ID),

                params: {

                    admin_name: fullname,

                    otp: otp
                }

            });

        console.log("✅ Email Sent", response);

        return {

            success: true,

            data: response

        };

    }

    catch (error) {

        console.error(error);

        return {

            success: false,

            error: error.message

        };

    }
}

module.exports = { sendThankYouEmail, sendEmailforOtp };