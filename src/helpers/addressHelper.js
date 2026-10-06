const crypto = require("crypto")

const normalize = (value) =>
    String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")   // punctuation hatao
        .replace(/\s+/g, " ")           // multiple spaces ek karo
        .trim()

const generateAddressHash = (address) => {
    const key = [
        address.address_line1,
        address.address_line2,
        address.city,
        address.state,
        address.pincode,
        address.country || "India",
    ]
        .map(normalize)
        .join("|")

    return crypto.createHash("sha256").update(key).digest("hex")
}

module.exports = { generateAddressHash }