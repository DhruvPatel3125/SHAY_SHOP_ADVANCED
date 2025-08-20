const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpayInstance = new Razorpay({
  key_id: process.env.RZP_KEY_ID,
  key_secret: process.env.RZP_KEY_SEC
});

exports.createOrder = async (req, res) => {
  try {
    const { amount, ...rest } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    const options = {
      amount: Math.round(Number(amount)), // amount in paise
      currency: "INR",
      receipt: "order_rcptid_" + Date.now(),
      notes: rest && Object.keys(rest).length ? rest : undefined,
    };
    const order = await razorpayInstance.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Failed to create order", details: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const key_secret = process.env.RZP_KEY_SEC;

  const hmac = crypto.createHmac('sha256', key_secret);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generated_signature = hmac.digest('hex');

  if (generated_signature === razorpay_signature) {
    res.json({ success: true, message: "Payment verified successfully" });
  } else {
    res.status(400).json({ success: false, message: "Payment verification failed" });
  }
};

// Fallback: Payment Link + QR approach
exports.createPaymentLink = async (req, res) => {
  try {
    const { amount, description = 'Order payment', customer, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const payload = {
      amount: Math.round(Number(amount)), // paise
      currency: 'INR',
      description,
      customer: customer || undefined, // {name, email, contact}
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: notes || undefined,
      callback_url: undefined,
      callback_method: 'get',
    };

    const link = await razorpayInstance.paymentLink.create(payload);
    res.json(link);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment link', details: error.message });
  }
};

exports.fetchPaymentLinkStatus = async (req, res) => {
  try {
    const { id } = req.params; // payment link id
    if (!id) return res.status(400).json({ error: 'Missing link id' });
    const link = await razorpayInstance.paymentLink.fetch(id);
    res.json({ id: link.id, status: link.status, amount_paid: link.amount_paid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment link status', details: error.message });
  }
};