require('dotenv').config();
const app = require('./src/app');
const port = process.env.PORT || 3000;
const connectDb = require('./src/config/database');

connectDb()
.then(() => {
  console.log('Connected to the database');
})
.catch((error) => {
  console.error('Database connection error:', error);
  process.exit(1); // Exit the process with an error code
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});