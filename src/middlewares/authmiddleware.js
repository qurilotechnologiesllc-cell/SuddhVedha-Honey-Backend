const JWT = require('jsonwebtoken');
const { UnauthorizedError } = require('../errors/errorConfig');

const authMiddleware = (req, res, next) => {

    const token = req.signedCookies.token; // Assuming the token is stored in a signed cookie named 'token'

    if (!token) {
        throw new UnauthorizedError('No token provided. Please log in to access this resource.');
    }

    try {
        const decoded = JWT.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach the decoded user information to the request object
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        throw new UnauthorizedError('Unauthorized: Invalid token');
    }
};

const generateToken = (payload) => {
    const token = JWT.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }); // Token valid for 1 hour
    return token;
}

module.exports = { authMiddleware, generateToken };