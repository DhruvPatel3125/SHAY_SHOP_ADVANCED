const mongoose = require("mongoose");

const invoiceSchema = mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    amount: { type: Number, required: true },
    gstDetails: {
      gstRate: { type: Number, required: true },
      gstAmount: { type: Number, required: true },
      totalAmountWithGst: { type: Number, required: true },
    },
    pdfPath: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;
