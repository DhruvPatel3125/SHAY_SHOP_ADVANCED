import React, { useCallback, useState } from 'react';
import axios from 'axios';

/**
 * PaymentButton opens Razorpay Checkout.
 * - amountInINR: number (e.g., 499) — will be sent as paise to server
 * - metadata: optional object to pass notes/receipt context
 */
export default function PaymentButton({ amountInINR, metadata }) {
  const [loading, setLoading] = useState(false);

  const startPayment = useCallback(async () => {
    try {
      setLoading(true);
      // 1) Try Checkout order flow first
      const { data: order } = await axios.post('/api/payment/create-order', {
        amount: Math.round(Number(amountInINR) * 100), // to paise
        ...metadata,
      });

      // Guard SDK load
      if (!window.Razorpay) {
        throw new Error('SDK not loaded');
      }

      // 2) Configure checkout options (UPI first)
      const options = {
        key: process.env.REACT_APP_RZP_KEY_ID || 'rzp_test_key',
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Shay Shop',
        description: 'Order payment',
        order_id: order.id,
        prefill: {
          name: metadata?.name || '',
          email: metadata?.email || '',
          contact: metadata?.contact || '',
        },
        notes: metadata || {},
        method: { upi: true, card: false, netbanking: false, wallet: false, emi: false, paylater: false },
        config: {
          display: {
            blocks: { upi: { name: 'UPI', instruments: [{ method: 'upi' }] } },
            sequence: ['block.upi'],
            preferences: { show_default_blocks: false },
          },
        },
        handler: async function (response) {
          try {
            await axios.post('/api/payment/verify-payment', response);
            alert('Payment successful and verified');
          } catch (err) {
            console.error(err);
            alert('Payment captured but verification failed');
          }
        },
        theme: { color: '#3399cc' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        console.warn('Payment failed', resp?.error);
        alert('Payment failed. Please try again.');
      });

      // Open checkout; if it doesn't render QR on desktop, fall back to Payment Link QR modal
      try {
        rzp.open();
      } catch (openErr) {
        console.warn('Checkout open failed, fallback to Payment Link QR', openErr);
        throw openErr;
      }
    } catch (err) {
      console.warn('Falling back to Payment Link QR...', err?.message || err);

      try {
        // Fallback: create payment link (server returns link + short_url + "upi_qr" info if available)
        const payload = {
          amount: Math.round(Number(amountInINR) * 100),
          description: 'Order payment',
          customer: metadata?.name || metadata?.email || metadata?.contact ? {
            name: metadata?.name,
            email: metadata?.email,
            contact: metadata?.contact,
          } : undefined,
          notes: metadata || undefined,
        };
        const { data: link } = await axios.post('/api/payment/create-payment-link', payload);

        // Show a simple modal with the QR or short_url for scanning
        const imgHtml = link?.short_url
          ? `Scan or open: ${link.short_url}`
          : 'Open your UPI app and pay via link provided.';
        alert(`Payment Link Created. ${imgHtml}`);

        // Optionally poll status
        const maxTries = 20;
        let tries = 0;
        const poll = setInterval(async () => {
          tries += 1;
          try {
            const { data: status } = await axios.get(`/api/payment/payment-link/${link.id}`);
            if (status?.status === 'paid' || status?.status === 'completed') {
              clearInterval(poll);
              alert('Payment completed via QR/Link');
            }
          } catch (e) {
            console.warn('Polling error', e?.message || e);
          }
          if (tries >= maxTries) clearInterval(poll);
        }, 3000);
      } catch (fallbackErr) {
        console.error('Fallback failed', fallbackErr);
        alert('Unable to initiate payment');
      }
    } finally {
      setLoading(false);
    }
  }, [amountInINR, metadata]);

  return (
    <button className="btn btn-primary" onClick={startPayment} disabled={loading}>
      {loading ? 'Processing...' : `Pay ₹${amountInINR}`}
    </button>
  );
}