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

const sendupdateEnquiryEmail = async (userinfo) => {

    const { userEmail, fullname, message, status } = userinfo
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

                        name: fullname

                    }

                ],

                templateId: Number(process.env.BREVO__ENQUIRY_TEMPLATE_ID),

                params: {

                    userName: fullname,

                    message: message,

                    status: status
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

const sendnotificationEmailToUser = async (userInfo, orderdetails) => {
    const { email, name } = userInfo
    const { customerName, planName, orderId, orderDate, totalAmount, productName, quantity, weight, productDescription, deliveryDate, deliveryAddress } = orderdetails
    try {

        const response =
            await brevo.transactionalEmails.sendTransacEmail({

                sender: {

                    email: process.env.BREVO_SENDER_EMAIL,

                    name: process.env.BREVO_SENDER_NAME

                },

                to: [

                    {

                        email: email,

                        name: name

                    }

                ],

                templateId: Number(process.env.BREVO_ORDER_CONFIRMATION_TEMPLATE_ID),

                params: {
                    customerName,
                    planName,
                    orderId,
                    orderDate,
                    totalAmount,
                    productName,
                    quantity,
                    weight,
                    productDescription,
                    deliveryDate,
                    deliveryAddress
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

const sendWelcomeEmail = async (userEmail) => {
    try {
        const response = await brevo.transactionalEmails.sendTransacEmail({
            sender: {
                email: process.env.BREVO_SENDER_EMAIL,
                name: process.env.BREVO_SENDER_NAME,
            },
            to: [{ email: userEmail }],
            templateId: Number(process.env.BREVO_WELCOME_TEMPLATE_ID),
        });

        console.log('✅ Welcome email sent:', response?.messageId || response);

        return { success: true, data: response };
    } catch (error) {
        console.error('❌ Welcome email failed:', error?.message || error);

        return { success: false, error: error?.message || 'Failed to send email' };
    }
}

const sendEmailforSuccesfullPayment = async (userEmail, paymentDetails = {}) => {
    try {
        const {
            customer_name,
            transaction_amount,
            order_date,
            transaction_id,
            payment_method,
            payment_date,
            order_number,
        } = paymentDetails;

        console.log(paymentDetails)

        const response = await brevo.transactionalEmails.sendTransacEmail({
            sender: {
                email: process.env.BREVO_SENDER_EMAIL,
                name: process.env.BREVO_SENDER_NAME,
            },
            to: [{ email: userEmail, name: customer_name }],

            templateId: Number(process.env.BREVO_PAYMENT_SUCCESS_TEMPLATE_ID),

            params: {
                customer_name: customer_name,
                transaction_amount: transaction_amount,
                order_date: order_date,
                transaction_id: transaction_id,
                payment_method: payment_method,
                payment_date,

                // Subject aur preview text ke liye
                order_number,
                payment_amount: transaction_amount,
            },
        });

        console.log('✅ Payment success email sent:', response?.messageId || response);

        return { success: true, data: response };
    } catch (error) {
        console.error('❌ Payment success email failed:', error?.message || error);

        return { success: false, error: error?.message || 'Failed to send email' };
    }
};

module.exports = { sendThankYouEmail, sendEmailforOtp, sendupdateEnquiryEmail, sendnotificationEmailToUser, sendWelcomeEmail, sendEmailforSuccesfullPayment };