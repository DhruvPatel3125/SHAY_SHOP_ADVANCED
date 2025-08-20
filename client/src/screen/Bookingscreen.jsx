import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import Loader from "../components/Loader";
import Error from "../components/Error";
import moment from "moment";
import Swal from "sweetalert2";

const RAZORPAY_KEY_ID = "rzp_test_Dz9hd6AMtKfCZE"; // Replace with your actual Razorpay key

const Bookingscreen = () => {
  const { roomid, fromdate, todate } = useParams();
  const [room, setRoom] = useState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();

  // Decode and validate dates
  const decodedFromDate = decodeURIComponent(fromdate);
  const decodedToDate = decodeURIComponent(todate);
  const fromDateMoment = moment(decodedFromDate, "DD-MM-YYYY", true);
  const toDateMoment = moment(decodedToDate, "DD-MM-YYYY", true);
  const totalDays =
    fromDateMoment.isValid() && toDateMoment.isValid()
      ? toDateMoment.diff(fromDateMoment, "days")
      : 0;
  const totalAmount = totalDays * (room?.rentperday || 0);

  // Fetch room data
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/rooms/getroombyid/${roomid}`);
        setRoom(data);
        setLoading(false);
      } catch (error) {
        setError(true);
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomid]);

  // Load Razorpay SDK
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle payment
  const handlePayNow = async () => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || !currentUser._id) {
      alert("Please login to book a room");
      return;
    }
    if (!room || !room._id) {
      alert("Room information is not loaded properly.");
      return;
    }
    if (totalAmount <= 0) {
      alert("Invalid amount.");
      return;
    }

    const sdkLoaded = await loadRazorpayScript();
    if (!sdkLoaded) {
      alert("Razorpay SDK failed to load");
      return;
    }

    try {
      // Create order on backend
      const { data: order } = await axios.post("/api/payment/create-order", {
        amount: totalAmount * 100, // paise
      });

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "SHAY ROOMS",
        description: `Booking for ${room.name}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyRes = await axios.post("/api/payment/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data.success) {
              await bookRoomAfterPayment();
            } else {
              alert("Payment verification failed.");
            }
          } catch {
            alert("Payment verification failed.");
          }
        },
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
          contact: currentUser.phone || "",
        },
        theme: { color: "#3399cc" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(
        "Failed to initiate payment: " +
          (err.response?.data?.error || err.message)
      );
    }
  };

  // Book room after payment
  const bookRoomAfterPayment = async () => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const bookingDetails = {
      roomname: room.name,
      roomid: room._id,
      userid: currentUser._id,
      fromdate: decodedFromDate,
      todate: decodedToDate,
      totalammount: totalAmount,
      totaldays: totalDays,
    };

    try {
      const result = await axios.post("/api/bookings/bookroom", bookingDetails);
      if (result.data.success) {
        Swal.fire(
          "Congratulations",
          "Your room booked successfully",
          "success"
        ).then(() => {
          window.location.href = "/profile";
        });
      } else {
        Swal.fire("Error", result.data.message || "Booking failed", "error");
      }
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.message || error.message,
        "error"
      );
    }
  };

  return (
    <div className="m-5">
      {loading ? (
        <Loader />
      ) : room ? (
        <div>
          <div className="row justify-content-center mt-5 bs">
            <div className="col-md-6">
              <h1>{room?.name}</h1>
              <img
                src={room?.imageurls && room.imageurls[0]}
                className="bigimage"
                alt=""
                style={{
                  width: "650px",
                  height: "400px",
                  objectFit: "cover",
                  borderRadius: "8px",
                }}
              />
            </div>
            <div className="col-md-6">
              <h1>Booking details</h1>
              <hr />
              <b>
                <p>
                  Name : {JSON.parse(localStorage.getItem("currentUser")).name}
                </p>
                <p>
                  From Date :{" "}
                  {fromDateMoment.isValid()
                    ? fromDateMoment.format("DD-MM-YYYY")
                    : decodedFromDate}
                </p>
                <p>
                  To Date :{" "}
                  {toDateMoment.isValid()
                    ? toDateMoment.format("DD-MM-YYYY")
                    : decodedToDate}
                </p>
                <p>Max Count : {room.maxcount}</p>
              </b>
              <div>
                <b>
                  <h1>Amount</h1>
                  <hr />
                  <p>Total days : {totalDays}</p>
                  <p>Rent per day : {room.rentperday}</p>
                  <p>Total Amount : {totalAmount}</p>
                </b>
              </div>
              <div style={{ float: "right" }}>
                <button className="btn btn-primary" onClick={handlePayNow}>
                  Pay now
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Error />
      )}
    </div>
  );
};

export default Bookingscreen;
