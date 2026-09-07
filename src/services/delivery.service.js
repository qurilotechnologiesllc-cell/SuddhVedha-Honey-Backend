const axios = require("axios");

const checkDeliveryAvailabilityService = async (toPincode) => {
    const payload = {
        from: "110059",
        to: toPincode,
        payment_mode: "prepaid",
        shipment_type: "forward",
    };

    const response = await axios.post(
        `${process.env.VELOCITY_BASE_URL}/custom/api/v1/serviceability`, // apna actual endpoint path lagao
        payload,
        {
            headers: {
                Authorization: `Bearer ${process.env.VELOCITY_TOKEN}`,
                "Content-Type": "application/json",
            },
        }
    );

    const { result, status } = response.data;

    if (status !== "SUCCESS" || !result?.serviceability_results?.length) {
        return null; // ya throw karo custom error, jo bhi tumhara convention hai
    }

    // sabse jaldi wali (earliest) delivery date nikaalo
    const earliest = result.serviceability_results.reduce((min, curr) =>
        new Date(curr.expected_delivery_date) < new Date(min.expected_delivery_date)
            ? curr
            : min
    );

    return {
        carrier_name: earliest.carrier_name,
        expected_delivery_date: earliest.expected_delivery_date,
        zone: result.zone,
    };
};

module.exports = { checkDeliveryAvailabilityService };