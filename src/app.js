const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { notFoundHandler, errorHandler } = require('./errors/errorConfig');
const userAuthRoute = require('./routes/userAuthRoute');
const userAddressRoute = require('./routes/userAddressRoutes');
const cartRoute = require('./routes/cartRoute');
const productRoute = require('./routes/productsRoute');
const reviewRoute = require('./routes/reviewRoute');
const wishlistRoute = require('./routes/wishlistRoute');
const categoryRoute = require('./routes/categoryRoute')

// Middleware to parse JSON requests
app.use(express.json());

// Secret key — signed cookies ke liye
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(cors());

// Sample route
app.get('/', (req, res) => {
  res.send('Welcome to Sudhveda Honey API');
});

// User authentication routes
app.use('/api/users', userAuthRoute);
app.use('/api/addresses', userAddressRoute);
app.use('/api/cart', cartRoute);
app.use('/api/products', productRoute);
app.use('/api/reviews', reviewRoute);
app.use('/api/wishlist', wishlistRoute);
app.use('/api/category', categoryRoute)
// Error handling middleware must be registered after all routes.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
