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
const categoryRoute = require('./routes/categoryRoute');
const videoRoutes = require('./routes/videoRoute');
const feedbackVideoRoutes = require('./routes/feedbackVideoRoute');
const filterProductRoutes = require('./routes/filterProductRoute');
const userEnquiryRoutes = require('./routes/userEnquiryRoutes');
const GiftBoxRoutes = require('./routes/giftboxRoute');
const OfferRoutes = require('./routes/offerRoutes');
const CouponRoutes = require('./routes/couponRoute');
const honeyBenefitsRoutes = require('./routes/honeyBenefitsRoute');
const OurlocationRoutes = require('./routes/ourlocationRoute');
const UpcomingProductRoutes = require('./routes/upcomingProductsRoute');

// Now from there its start the admin routes 
const adminAuthRoutes = require('./routes/adminAuthRoute')

// Middleware to parse JSON requests
app.use(express.json());

// Secret key — signed cookies ke liye
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(cors({

  origin: [
    "http://localhost:3000",

    "https://frontend-3000.devtunnels.ms"
  ],

  credentials: true

}))

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
app.use('/api/category', categoryRoute);
app.use('/api/videos', videoRoutes);
app.use('/api/feedback', feedbackVideoRoutes);
app.use('/api/filter', filterProductRoutes);
app.use('/api/enquiry', userEnquiryRoutes);
app.use('/api/offers', OfferRoutes);
app.use('/api/admin', GiftBoxRoutes);
app.use('/api/coupon', CouponRoutes);
app.use('/api/benefits', honeyBenefitsRoutes);
app.use('/api/location', OurlocationRoutes);
app.use('/api/upcoming', UpcomingProductRoutes);

// Admin Routes
app.use('/api/admin', adminAuthRoutes);

// Error handling middleware must be registered after all routes.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
