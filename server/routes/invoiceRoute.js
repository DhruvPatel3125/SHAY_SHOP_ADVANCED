const express = require("express");
const router = express.Router();
const Invoice = require("../models/invoice");
const Booking = require("../models/booking"); // Assuming a Booking model exists
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

// Configure Nodemailer transporter
// Make sure to set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in your .env file
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // Use 'true' if port is 465 (SSL/TLS), 'false' otherwise
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Get invoices by User ID
router.post("/getinvoicesbyuserid", async (req, res) => {
    try {
        const { userId } = req.body;
        console.log("Fetching invoices for userId:", userId); // Added log

        if (!userId) {
            console.error("User ID is missing for getinvoicesbyuserid"); // Added log
            return res.status(400).json({ message: "User ID is required" });
        }

        const invoices = await Invoice.find({ userId }).sort({ createdAt: -1 });
        console.log("Found invoices:", invoices.length); // Added log

        res.status(200).json({ invoices });

    } catch (error) {
        console.error("Error fetching invoices by user ID:", error);
        return res.status(400).json({ message: "Error fetching invoices", error: error.message });
    }
});

router.post("/generateinvoice", async (req, res) => {
    try {
        const { bookingId, userId } = req.body;
        console.log("Received generateinvoice request for bookingId:", bookingId, "userId:", userId); // Added log

        // 1. Fetch booking details
        const booking = await Booking.findById(bookingId).populate("userid").populate("room");
        console.log("Fetched booking object:", booking); // Added log

        if (!booking) {
            console.error("Booking not found for ID:", bookingId);
            return res.status(404).json({ message: "Booking not found" });
        }

        // Basic GST calculation (adjust rate as needed)
        const gstRate = 0.18; // 18% GST
        const amount = booking.totalammount; // Ensure this is correct field name from booking model
        const gstAmount = amount * gstRate;
        const totalAmountWithGst = amount + gstAmount;
        console.log("GST Calculation:", { amount, gstRate, gstAmount, totalAmountWithGst }); // Added log

        // Generate unique invoice number
        const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        console.log("Generated invoice number:", invoiceNumber); // Added log

        // Create PDF
        const doc = new PDFDocument();
        const pdfFileName = `${invoiceNumber}.pdf`;
        const pdfPath = path.join(__dirname, "../invoices", pdfFileName);
        doc.pipe(fs.createWriteStream(pdfPath));

        // Add content to the PDF (this is a basic example, customize heavily)
        doc.fontSize(25).text("Invoice", { align: "center" });
        doc.fontSize(12).text(`Invoice Number: ${invoiceNumber}`, 50, 100);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 120);
        doc.text(`\nBill To:`);
        doc.text(`Name: ${booking.userid.name}`);
        doc.text(`Email: ${booking.userid.email}`);
        doc.text(`\nRoom: ${booking.room.name}`);
        doc.text(`Check-in: ${booking.fromdate}`);
        doc.text(`Check-out: ${booking.todate}`);
        doc.text(`Total Days: ${booking.totaldays}`);
        doc.text(`Rent Per Day: ${booking.rentperday}`);
        doc.text(`Total Amount (Excl. GST): $${amount.toFixed(2)}`);
        doc.text(`GST (${(gstRate * 100).toFixed(0)}%): $${gstAmount.toFixed(2)}`);
        doc.fontSize(14).text(`Total Amount (Incl. GST): $${totalAmountWithGst.toFixed(2)}`, { continued: true });
        doc.end();
        console.log("PDF content written to stream."); // Added log

        // Save invoice details to database
        const newInvoice = new Invoice({
            invoiceNumber,
            userId,
            bookingId,
            amount: totalAmountWithGst, // Save total amount with GST in the invoice record
            gstDetails: { gstRate, gstAmount, totalAmountWithGst },
            pdfPath: `/invoices/${pdfFileName}`, // Store relative path
        });

        await newInvoice.save();
        console.log("Invoice saved to DB successfully:", newInvoice._id); // Added log

        // Send email with invoice
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: booking.userid.email, // Fixed to use populated userid
            subject: `Your Invoice for Booking ID: ${booking._id}`,
            html: `
                <p>Dear ${booking.userid.name},</p>
                <p>Thank you for booking with us! Please find your invoice attached.</p>
                <p>Booking Details:</p>
                <ul>
                    <li>Room: ${booking.room.name}</li>
                    <li>Check-in: ${booking.fromdate}</li>
                    <li>Check-out: ${booking.todate}</li>
                    <li>Total Amount: $${totalAmountWithGst.toFixed(2)}</li>
                </ul>
                <p>Best regards,</p>
                <p>SHAY ROOMS Team</p>
            `,
            attachments: [
                {
                    filename: pdfFileName,
                    path: pdfPath,
                    contentType: "application/pdf",
                },
            ],
        };
        console.log("Attempting to send email to:", booking.userid.email); // Added log

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
            } else {
                console.log("Email sent: " + info.response);
            }
        });

        res.status(200).json({
            message: "Invoice generated, stored, and emailed successfully",
            invoice: newInvoice,
            pdfUrl: `/invoices/${pdfFileName}`,
        });

    } catch (error) {
        console.error("Caught error in generateinvoice:", error);
        return res.status(400).json({ message: "Error generating invoice", error: error.message });
    }
});

module.exports = router;
