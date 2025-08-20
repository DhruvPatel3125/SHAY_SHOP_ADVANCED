const express = require("express");
const router = express.Router();
const moment = require("moment");
const Booking = require("../models/booking");
const Room = require("../models/room");
const User = require("../models/user");
const { sendMail } = require("../utils/mailer");
const axios = require("axios"); // Import axios

router.post("/bookroom", async (req, res) => {
  const {
    roomname,
    roomid,
    userid,
    fromdate,
    todate,
    totalammount,
    totaldays,
  } = req.body;

  try {
    console.log("Booking request received:", req.body);

    // Validate required fields
    if (
      !roomname ||
      !roomid ||
      !userid ||
      !fromdate ||
      !todate ||
      !totalammount ||
      !totaldays
    ) {
      console.log("Missing required fields:", {
        roomname,
        roomid,
        userid,
        fromdate,
        todate,
        totalammount,
        totaldays,
      });
      return res.status(400).json({
        success: false,
        message: "All booking fields are required",
        missing: {
          roomname: !roomname,
          roomid: !roomid,
          userid: !userid,
          fromdate: !fromdate,
          todate: !todate,
          totalammount: !totalammount,
          totaldays: !totaldays,
        },
      });
    }

    // Validate and parse dates
    console.log("Parsing dates:", { fromdate, todate });
    const fromDateObj = moment(fromdate, "DD-MM-YYYY", true);
    const toDateObj = moment(todate, "DD-MM-YYYY", true);

    console.log("Date validation:", {
      fromDateValid: fromDateObj.isValid(),
      toDateValid: toDateObj.isValid(),
      fromDateParsed: fromDateObj.format("DD-MM-YYYY"),
      toDateParsed: toDateObj.format("DD-MM-YYYY"),
    });

    if (!fromDateObj.isValid()) {
      console.log("Invalid from date:", fromdate);
      return res.status(400).json({
        success: false,
        message: `Invalid from date format: "${fromdate}". Please use DD-MM-YYYY format.`,
      });
    }

    if (!toDateObj.isValid()) {
      console.log("Invalid to date:", todate);
      return res.status(400).json({
        success: false,
        message: `Invalid to date format: "${todate}". Please use DD-MM-YYYY format.`,
      });
    }

    // Check if from date is before to date
    if (fromDateObj.isSameOrAfter(toDateObj)) {
      console.log("Date order issue:", {
        fromDateObj: fromDateObj.format("DD-MM-YYYY"),
        toDateObj: toDateObj.format("DD-MM-YYYY"),
      });
      return res.status(400).json({
        success: false,
        message: "Check-in date must be before check-out date.",
      });
    }

    // Check if from date is not in the past
    const today = moment().startOf("day");
    console.log("Date comparison:", {
      fromDate: fromDateObj.format("DD-MM-YYYY"),
      today: today.format("DD-MM-YYYY"),
      isInPast: fromDateObj.isBefore(today),
    });

    if (fromDateObj.isBefore(today)) {
      console.log("Past date detected:", fromDateObj.format("DD-MM-YYYY"));
      return res.status(400).json({
        success: false,
        message: "Check-in date cannot be in the past.",
      });
    }

    // Get room and check for booking conflicts
    const room = await Room.findOne({ _id: roomid });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Check for overlapping bookings
    for (const booking of room.currentbookings) {
      const existingFromDate = moment(booking.fromdate, "DD-MM-YYYY");
      const existingToDate = moment(booking.todate, "DD-MM-YYYY");

      if (
        fromDateObj.isSameOrBefore(existingToDate) &&
        toDateObj.isSameOrAfter(existingFromDate)
      ) {
        return res.status(400).json({
          success: false,
          message: `Room is already booked from ${booking.fromdate} to ${booking.todate}`,
        });
      }
    }

    // Validate calculated total days
    const calculatedDays = toDateObj.diff(fromDateObj, "days");
    console.log("Days calculation:", {
      calculatedDays,
      receivedTotalDays: totaldays,
      match: calculatedDays === totaldays,
      fromDate: fromDateObj.format("DD-MM-YYYY"),
      toDate: toDateObj.format("DD-MM-YYYY"),
    });

    if (calculatedDays !== totaldays) {
      console.log("Days mismatch:", { calculatedDays, totaldays });
      return res.status(400).json({
        success: false,
        message: `Total days mismatch. Expected ${calculatedDays} days but received ${totaldays} days.`,
      });
    }

    const newBooking = new Booking({
      room: roomid,
      roomid: roomid,
      userid,
      fromdate: fromDateObj.format("DD-MM-YYYY"),
      todate: toDateObj.format("DD-MM-YYYY"),
      totalammount,
      totaldays,
      transactionId: "1234",
    });
    await newBooking.save();

    // Update room's current bookings
    room.currentbookings.push({
      bookingid: newBooking._id,
      fromdate: fromDateObj.format("DD-MM-YYYY"),
      todate: toDateObj.format("DD-MM-YYYY"),
    });
    await room.save();

    // Trigger invoice generation and email sending
    console.log("Attempting to trigger invoice generation for booking:", newBooking._id, "user:", userid);
    try {
        const invoiceResponse = await axios.post("http://localhost:5000/api/invoice/generateinvoice", {
            bookingId: newBooking._id,
            userId: userid,
        });
        console.log("Invoice generation trigger response:", invoiceResponse.status, invoiceResponse.data);
        console.log("Invoice generation triggered successfully.");
    } catch (invoiceError) {
        console.error("Error triggering invoice generation:", invoiceError.message);
        if (invoiceError.response) {
            console.error("Invoice trigger response status:", invoiceError.response.status);
            console.error("Invoice trigger response data:", invoiceError.response.data);
        }
        // Decide how to handle this error: rollback booking, log, alert admin, etc.
    }

    //node mailer added here
    try {
      const user = await User.findById(userid).select("name email");
      if (user?.email) {
        const subject = `Booking confirmed: ${roomname} (${fromDateObj.format(
          "DD-MM-YYYY"
        )} - ${toDateObj.format("DD-MM-YYYY")})`;
        const html = `
        <h2>Your booking is confirmed</h2>
        <p>Hi ${user.name || "Guest"},</p>
        <p>Your booking details:</p>
        <ul>
         <li>Room: <strong>${roomname}</strong></li>
        <li>From: <strong>${fromDateObj.format("DD-MM-YYYY")}</strong></li>
        <li>To: <strong>${toDateObj.format("DD-MM-YYYY")}</strong></li>
        <li>Total days: <strong>${totaldays}</strong></li>
        <li>Total amount: <strong>${totalammount}</strong></li>
        <li>Booking ID: <strong>${newBooking._id}</strong></li>
      </ul>
      <p>Thank you for booking with us!</p>

        `;
        await sendMail({ to: user.email, subject, html });
      }
    } catch (mailError) {
      console.error("Error sending mail:", mailError);
    }

    res.json({
      success: true,
      message: "Room booked successfully",
      booking: newBooking,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || String(error),
    });
  }
});

// Get all bookings for a user
router.post("/getbookingsbyuserid", async (req, res) => {
  try {
    console.log("getbookingsbyuserid request received:", {
      body: req.body,
      headers: req.headers,
    });

    // Check if req.body exists and has userid
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Request body is missing",
      });
    }

    const { userid } = req.body;

    if (!userid) {
      return res.status(400).json({
        success: false,
        message: "userid is required",
        receivedBody: req.body,
      });
    }

    const bookings = await Booking.find({ userid: userid });
    res.json({
      success: true,
      bookings: bookings,
    });
  } catch (error) {
    console.error("Error in getbookingsbyuserid:", error);
    return res.status(400).json({
      success: false,
      message: error.message || String(error),
    });
  }
});

// Cancel a booking
router.post("/cancelbooking", async (req, res) => {
  const { bookingid, userid } = req.body;

  try {
    // Find the booking
    const booking = await Booking.findOne({ _id: bookingid, userid: userid });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or unauthorized",
      });
    }

    // Check if booking can be cancelled (not in the past)
    const fromDateObj = moment(booking.fromdate, "DD-MM-YYYY");
    if (fromDateObj.isBefore(moment(), "day")) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel booking that has already started",
      });
    }

    // Update booking status
    booking.status = "cancelled";
    await booking.save();

    // Remove from room's current bookings
    const room = await Room.findOne({ _id: booking.roomid });
    if (room) {
      room.currentbookings = room.currentbookings.filter(
        (item) => item.bookingid.toString() !== bookingid
      );
      await room.save();
    }

    res.json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || String(error),
    });
  }
});

// Get all bookings (admin)
router.get("/getallbookings", async (req, res) => {
  try {
    const bookings = await Booking.find({});
    res.json({
      success: true,
      bookings: bookings,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || String(error),
    });
  }
});

module.exports = router;
