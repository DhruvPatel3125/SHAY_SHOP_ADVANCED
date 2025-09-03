import React, { useState, useEffect } from "react";
import { Tabs } from "antd";
import Swal from "sweetalert2";
import axios from "axios";
import MyInvoices from "../components/MyInvoices";

const { TabPane } = Tabs;

function ProfileScreen() {
  const stored = localStorage.getItem("currentUser");
  const user = stored ? JSON.parse(stored) : null;

  useEffect(() => {
    if (!user) {
      window.location.href = "/login";
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">My Profile</h2>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Profile" key="1">
          <div className="card shadow-sm border-0 p-3">
            <h4 className="mb-2">{user.name}</h4>
            <div className="text-muted">{user.email}</div>
            <span
              style={{ fontSize: "1.5rem" }}
              className={`badge ${user.isAdmin ? "bg-success" : "bg-secondary"} mt-3`}
            >
              {user.isAdmin ? "Admin" : "User"}
            </span>
          </div>
        </TabPane>
        <TabPane tab="Bookings" key="2">
          <div className="card shadow-sm border-0 p-3">
            <MyBookings />
          </div>
        </TabPane>
        <TabPane tab="Invoices" key="3">
          <div className="card shadow-sm border-0 p-3">
            <MyInvoices />
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
}

export default ProfileScreen;

export function MyBookings() {
  const stored = localStorage.getItem("currentUser");
  const user = stored ? JSON.parse(stored) : null;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.post("/api/bookings/getbookingsbyuserid", {
          userid: user._id,
        });

        if (response.data.success) {
          setBookings(response.data.bookings);
        } else {
          setError(response.data.message || "Failed to fetch bookings");
        }
      } catch (error) {
        setError(
          error.response?.data?.message ||
            error.message ||
            "Failed to fetch bookings"
        );
      } finally {
        setLoading(false);
      }
    };

    if (user && user._id) {
      fetchBookings();
    } else {
      setError("You must be logged in to view bookings.");
    }
  }, []);

  const cancelBooking = async (bookingId) => {
    try {
      setLoading(true);
      const response = await axios.post("/api/bookings/cancelbooking", {
        bookingid: bookingId,
        userid: user._id,
      });

      if (response.data.success) {
        setBookings(
          bookings.map((booking) =>
            booking._id === bookingId
              ? { ...booking, status: "cancelled" }
              : booking
          )
        );
        Swal.fire({
          title: "Success",
          text: "Your booking has been cancelled successfully!",
          icon: "success",
          confirmButtonText: "OK",
        });
      } else {
        Swal.fire({
          title: "Error",
          text: "Something went wrong",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: error.response?.data?.message || "Failed to cancel booking",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center">Loading bookings...</div>;
  }

  if (error) {
    return <div className="text-danger text-center">Error: {error}</div>;
  }

  if (bookings.length === 0) {
    return <div className="text-center">No bookings found.</div>;
  }

  return (
    <div className="table-responsive mt-3">
      <table className="table table-striped table-bordered">
        <thead className="table-dark">
          <tr>
            <th>Room</th>
            <th>Booking ID</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking._id}>
              <td>{booking.room}</td>
              <td>{booking._id}</td>
              <td>{booking.fromdate}</td>
              <td>{booking.todate}</td>
              <td>₹{booking.totalammount}</td>
              <td>
                <span
                  className={`badge ${
                    booking.status === "cancelled" ? "bg-danger" : "bg-success"
                  }`}
                >
                  {booking.status || "Confirmed"}
                </span>
              </td>
              <td>
                {(!booking.status || booking.status !== "cancelled") && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => cancelBooking(booking._id)}
                    disabled={loading}
                  >
                    Cancel Booking
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
