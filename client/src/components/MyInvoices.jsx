import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";

function MyInvoices() {
    const stored = localStorage.getItem("currentUser");
    const user = stored ? JSON.parse(stored) : null;
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchInvoices = async () => {
            if (loading) return; // Prevent re-fetching if already loading

            if (!user || !user._id) {
                setError("User not logged in.");
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "User not logged in. Please log in to view invoices.",
                });
                return;
            }

            setLoading(true);
            console.log("Attempting to fetch invoices for userId:", user._id); // Log the userId
            try {
                const response = await axios.post("/api/invoice/getinvoicesbyuserid", { userId: user._id });
                console.log("API response for invoices:", response.data); // Log API response
                if (response.status === 200) {
                    setInvoices(response.data.invoices);
                } else {
                    const errorMessage = response.data.message || "Failed to fetch invoices";
                    setError(errorMessage);
                    Swal.fire({
                        icon: "error",
                        title: "Oops...",
                        text: errorMessage,
                    });
                }
            } catch (err) {
                console.error("Error fetching invoices:", err); // Detailed error log
                const errorMessage = err.response?.data?.message || err.message || "Failed to fetch invoices";
                setError(errorMessage);
                Swal.fire({
                    icon: "error",
                    title: "Oops...",
                    text: errorMessage,
                });
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, [user?._id]); // Depend only on user._id to prevent infinite loop

    if (loading) {
        return <div>Loading invoices...</div>;
    }

    if (error) {
        return <div style={{ color: "red" }}>Error: {error}</div>;
    }

    if (invoices.length === 0) {
        return <div>No invoices found.</div>;
    }

    return (
        <div>
            <div style={{ overflowX: "auto" }}>
                <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginTop: "20px",
                    }}
                >
                    <thead>
                        <tr style={{ backgroundColor: "#f5f5f5" }}>
                            <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "left" }}>Invoice Number</th>
                            <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "left" }}>Booking ID</th>
                            <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "left" }}>Amount (Excl. GST)</th>
                            <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "left" }}>GST Amount</th>
                            <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "left" }}>Total (Incl. GST)</th>
                            <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "left" }}>Date</th>
                            <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "left" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map((invoice) => (
                            <tr key={invoice._id}>
                                <td style={{ border: "1px solid #ddd", padding: "12px" }}>{invoice.invoiceNumber}</td>
                                <td style={{ border: "1px solid #ddd", padding: "12px" }}>{invoice.bookingId}</td>
                                <td style={{ border: "1px solid #ddd", padding: "12px" }}>₹{invoice.amount.toFixed(2)}</td>
                                <td style={{ border: "1px solid #ddd", padding: "12px" }}>₹{invoice.gstDetails.gstAmount.toFixed(2)}</td>
                                <td style={{ border: "1px solid #ddd", padding: "12px" }}>₹{invoice.gstDetails.totalAmountWithGst.toFixed(2)}</td>
                                <td style={{ border: "1px solid #ddd", padding: "12px" }}>{new Date(invoice.createdAt).toLocaleDateString()}</td>
                                <td style={{ border: "1px solid #ddd", padding: "12px" }}>
                                    <a
                                        href={`http://localhost:5000${invoice.pdfPath}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            backgroundColor: "#007bff",
                                            color: "white",
                                            border: "none",
                                            padding: "8px 16px",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            textDecoration: "none",
                                        }}
                                    >
                                        Download PDF
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default MyInvoices;
