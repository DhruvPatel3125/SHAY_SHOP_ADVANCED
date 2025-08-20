require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
require('express-async-errors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs'); // Import fs module
const path = require('path');

// DB init
require('./db');
require('./models/user'); // Ensure User model schema is registered
require('./models/room');  // Ensure Room model schema is registered

const app = express();
// Trust the first proxy (e.g., CRA dev server / reverse proxies)
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Swagger definition (fixed key and safer apis path)
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Shay shop API', version: '1.0.0' },
    servers: [{ url: `http://localhost:${PORT}` }],
  },
  apis: [path.join(__dirname, 'routes/**/*.js')],
});

// Routes
const roomsRoute = require('./routes/roomsRoute');
const usersRoute = require('./routes/usersRoute');
const bookingRoute = require('./routes/bookingRoute');
const paymentRoute = require('./routes/paymentRoute');
const invoiceRoute = require('./routes/invoiceRoute');
const testMailRouter = require('./routes/usersRoute');

// Rate limiters (apply before handlers)
const authLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
});
const paymentLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
});

// Core middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(morgan('combined'));

// Custom logging middleware to log to file
app.use((req, res, next) => {
  const now = new Date();
  
  // Format date as dd/mm/yyyy, hh:mm:ss am/pm
  const date = now.toLocaleDateString("en-GB"); 
  const time = now.toLocaleTimeString("en-GB"); 
  
  const logEntry = `${req.url} ${req.method} ${date}, ${time}\n`;

  fs.appendFile("log.txt", logEntry, (err) => {
    if (err) {
      console.error("Error writing to log.txt:", err);
    }
    next(); // Always continue
  });
});
// Serve static invoice PDFs
app.use('/invoices', express.static(path.join(__dirname, 'invoices')));

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Test route (kept as in original)
app.use('/api/test', testMailRouter);

// Apply per-path limiters BEFORE routers
app.use('/api/users/login', authLimit);
app.use('/api/payment', paymentLimit);

// Mount routers
app.use('/api/rooms', roomsRoute);
app.use('/api/users', usersRoute);
app.use('/api/bookings', bookingRoute);
app.use('/api/payment', paymentRoute);
app.use('/api/invoice', invoiceRoute);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on: http://localhost:${PORT}`);
});
