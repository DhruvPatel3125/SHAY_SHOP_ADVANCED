// server/routes/payment.js
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
// const verifyCaptcha = require("../middleware/verifyCaptcha");

// Routes with captcha protection
router.post("/create-order", paymentController.createOrder);

// Other payment routes
router.post("/verify-payment", paymentController.verifyPayment);
router.post("/create-payment-link", paymentController.createPaymentLink);
router.get("/payment-link/:id", paymentController.fetchPaymentLinkStatus);

module.exports = router;
//payment