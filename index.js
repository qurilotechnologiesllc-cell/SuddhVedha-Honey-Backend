require('dotenv').config();
const app = require('./src/app');
const http = require('http')
const port = process.env.PORT || 3000;
const connectDb = require('./src/config/database');
const { initializeSocket } = require('./src/utils/socketHandler');

connectDb()
  .then(() => {
    console.log('Connected to the database');
  })
  .catch((error) => {
    console.error('Database connection error:', error);
    process.exit(1); // Exit the process with an error code
  });


const server = http.createServer(app);

initializeSocket(server);

server.listen(port, () => {

  console.log(`Server Running ${port}`);

});