# SudhvedaHoney Backend API

This project provides the backend API for SudhvedaHoney user authentication.

## Features

- Create a new user and send an OTP to the provided mobile number
- Verify the OTP to complete registration
- Login a user with mobile number and OTP
- Manage user addresses securely after login
- Stores registered users in MongoDB
- Uses Redis for temporary OTP storage

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- Redis
- AutoBySMS for OTP delivery

## Prerequisites

Make sure the following services are available:

- MongoDB
- Redis
- AutoBySMS credentials (API key, sender ID, template ID)

## Environment Variables

Create a `.env` file in the project root with values similar to:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
AUTOBYSMS_API_KEY=your_autobysms_api_key
AUTOBYSMS_SENDER_ID=your_autobysms_sender_id
AUTOBYSMS_TEMPLATE_ID=your_autobysms_template_id
```

## Installation

```bash
npm install
```

## Run the Server

```bash
node index.js
```

Or with nodemon:

```bash
npx nodemon index.js
```

## API Endpoints

### Health Check

- Method: GET
- URL: `/`

Example:

```bash
curl http://localhost:3000/
```

## Authentication Endpoints

### 1) Create User / Send OTP

- Method: POST
- URL: `/api/users/create`
- Body:

```json
{
  "name": "John Doe",
  "mobile": "+919999999999"
}
```

Response:

```json
{
  "success": true,
  "message": "OTP sent to mobile number. Verify to complete registration.",
  "data": {
    "verificationId": "generated-uuid"
  }
}
```

### 2) Verify OTP (Registration)

- Method: POST
- URL: `/api/users/verify-otp`
- Body:

```json
{
  "verificationId": "generated-uuid",
  "otp": "1234"
}
```

Response:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "user-id",
    "name": "John Doe",
    "mobile": "+919999999999"
  }
}
```

### 3) Login User / Send OTP

- Method: POST
- URL: `/api/users/login`
- Body:

```json
{
  "mobile": "+919999999999"
}
```

Response:

```json
{
  "success": true,
  "message": "OTP sent to mobile number. Verify to complete login.",
  "data": {
    "verificationId": "generated-uuid"
  }
}
```

### 4) Verify Login OTP

- Method: POST
- URL: `/api/users/verify-login-otp`
- Body:

```json
{
  "verificationId": "generated-uuid",
  "otp": "1234"
}
```

Response:

```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "_id": "user-id",
    "token": "jwt-token"
  }
}
```

## Address Endpoints

### 5) Add User Address

- Method: POST
- URL: `/api/addresses/add`
- Auth: Requires a valid logged-in user session/token
- Body:

```json
{
  "full_name": "John Doe",
  "phone": "+919999999999",
  "address_line1": "123 Main Street",
  "address_line2": "Near Market",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "country": "India",
  "address_type": "Home"
}
```

Response:

```json
{
  "success": true,
  "message": "Address added successfully",
  "data": {
    "_id": "address-id"
  }
}
```

### 6) Get All User Addresses

- Method: GET
- URL: `/api/addresses/all`
- Auth: Requires a valid logged-in user session/token

### 7) Update User Address

- Method: PUT
- URL: `/api/addresses/update/:addressId`
- Auth: Requires a valid logged-in user session/token
- Body:

```json
{
  "full_name": "John Doe",
  "phone": "+919999999999",
  "address_line1": "456 Updated Street",
  "address_line2": "Near Park",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400002",
  "country": "India",
  "address_type": "Office"
}
```

### 8) Delete User Address

- Method: DELETE
- URL: `/api/addresses/delete/:addressId`
- Auth: Requires a valid logged-in user session/token

## Cart Endpoints

### 9) Get Cart

- Method: GET
- URL: `/api/cart/`
- Auth: Requires a valid logged-in user session/token

Response:

```json
{
  "message": "Cart fetched successfully",
  "data": {
    "_id": "cart-id",
    "userId": "user-id",
    "items": [
      {
        "_id": "item-id",
        "productId": "product-id",
        "quantity": 2
      }
    ]
  }
}
```

### 10) Add to Cart

- Method: POST
- URL: `/api/cart/add`
- Auth: Requires a valid logged-in user session/token
- Body:

```json
{
  "productId": "product-id-here",
  "quantity": 1
}
```

Response:

```json
{
  "message": "Item added to cart successfully",
  "data": {
    "_id": "cart-id",
    "userId": "user-id",
    "items": [
      {
        "_id": "item-id",
        "productId": "product-id",
        "quantity": 1
      }
    ]
  }
}
```

### 11) Remove from Cart

- Method: POST
- URL: `/api/cart/remove`
- Auth: Requires a valid logged-in user session/token
- Body:

```json
{
  "productId": "product-id-here"
}
```

Response:

```json
{
  "message": "Item removed from cart successfully",
  "data": {
    "_id": "cart-id",
    "userId": "user-id",
    "items": []
  }
}
```

## Wishlist Endpoints

### 17) Get Wishlist

- Method: GET
- URL: `/api/wishlist`
- Auth: Requires a valid logged-in user token/cookie

### 18) Add Product to Wishlist

- Method: POST
- URL: `/api/wishlist/add/:productId`
- Auth: Requires a valid logged-in user token/cookie
- Path Param: `productId`

### 19) Remove Product from Wishlist

- Method: DELETE
- URL: `/api/wishlist/remove/:productId`
- Auth: Requires a valid logged-in user token/cookie
- Path Param: `productId`

## OTP Delivery

OTP messages are sent using the AutoBySMS service through [src/utils/sendOtp.js](src/utils/sendOtp.js). The service uses:

- `AUTOBYSMS_API_KEY`
- `AUTOBYSMS_SENDER_ID`
- `AUTOBYSMS_TEMPLATE_ID`

## Product Video Endpoints

### 20) Upload Product Video

- Method: POST
- URL: `/api/videos/upload/:productId`
- Body: multipart/form-data with key `video`
- Path Param: `productId`

### 21) Get Product Videos

- Method: GET
- URL: `/api/videos/:productId`
- Path Param: `productId`

### 22) Delete Product Video

- Method: DELETE
- URL: `/api/videos/:videoId`
- Path Param: `videoId`

## Feedback Video Endpoints

### 23) Upload Feedback Video

- Method: POST
- URL: `/api/feedback/video/upload`
- Body: multipart/form-data with key `video`

### 24) Get All Feedback Videos

- Method: GET
- URL: `/api/feedback/all-feedback/videos`

### 25) Remove Feedback Video

- Method: DELETE
- URL: `/api/feedback/remove-feedback/:videoId`
- Path Param: `videoId`

## Filter Product Endpoints

### 26) Filter Products by Category Slug

- Method: GET
- URL: `/api/filter/category/:slug`
- Path Param: `slug`

### 27) Filter Products by Price Range

- Method: GET
- URL: `/api/filter/price?minPrice=100&maxPrice=500`
- Query Params: `minPrice`, `maxPrice`

### 28) Filter Products by Rating

- Method: GET
- URL: `/api/filter/rating?minRating=4&maxRating=5`
- Query Params: `minRating`, `maxRating`

### 29) Filter Products by Quantity

- Method: GET
- URL: `/api/filter/quantity?quantity=500g`
- Query Param: `quantity`
- Allowed values: `100g`, `250g`, `500g`, `1kg`, `2kg`

## Postman Collection

A ready-to-import Postman collection is available at:

- [sudhvedahoney.postman_collection.json](sudhvedahoney.postman_collection.json)

Import it into Postman and update the `baseUrl` variable if your server runs on a different port.

## Notes

- OTPs are temporary and stored in Redis for 5 minutes.
- If a mobile number is already registered, the API returns a conflict error.
- Address APIs require an authenticated user token/cookie from the login flow.

## Products Endpoints

### 12) Create Product

- Method: POST
- URL: `/api/products`
- Body (JSON):

```json
{
  "product_name": "Honey 250g",
  "slug": "honey-250g",
  "flavor": "Natural",
  "description": "Pure honey",
  "manufacturer_information": "Sudhveda Foods"
}
```

Fields taken from: request body (`req.body`).

### 13) Get All Products

- Method: GET
- URL: `/api/products`

No request body; returns list of products.

### 14) Get Product By ID

- Method: GET
- URL: `/api/products/:id`

Field taken from: URL parameter `id` (`req.params.id`).

### 15) Upload Product Images

- Method: POST
- URL: `/api/products/:id/images`
- Body: multipart/form-data with key `images` (file, multiple allowed)

Fields taken from: URL parameter `id` (`req.params.id`) and files in `req.files` (form-data key `images`).

### 16) Create Product Variant

- Method: POST
- URL: `/api/products/:id/variants`
- Body (JSON):

```json
{
  "quantity": 10,
  "sku": "SKU123",
  "price": 199.99,
  "mrp": 249.99,
  "discount": 20
}
```

Fields taken from: URL parameter `id` (`req.params.productId` in controller variable named `productId`) and request body (`req.body`) for variant fields.

Refer to the Postman collection for ready-to-import examples.
