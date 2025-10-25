import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay instance only if keys are provided
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// Create Razorpay Order
export const createRazorpayOrder = async (amount, currency = 'INR', receipt) => {
  if (!razorpay) {
    throw new Error('Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env file');
  }
  
  try {
    const options = {
      amount: amount * 100, // amount in smallest currency unit (paise)
      currency: currency,
      receipt: receipt,
      payment_capture: 1 // Auto capture
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay Order Creation Error:', error);
    throw new Error('Failed to create Razorpay order');
  }
};

// Verify Razorpay Payment Signature
export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  try {
    const text = `${orderId}|${paymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generated_signature === signature;
  } catch (error) {
    console.error('Razorpay Signature Verification Error:', error);
    return false;
  }
};

// Fetch Payment Details
export const fetchPaymentDetails = async (paymentId) => {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }
  
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Razorpay Payment Fetch Error:', error);
    throw new Error('Failed to fetch payment details');
  }
};

// Refund Payment
export const refundPayment = async (paymentId, amount = null) => {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }
  
  try {
    const refundData = amount ? { amount: amount * 100 } : {};
    const refund = await razorpay.payments.refund(paymentId, refundData);
    return refund;
  } catch (error) {
    console.error('Razorpay Refund Error:', error);
    throw new Error('Failed to process refund');
  }
};

// Create Payment Link
export const createPaymentLink = async (amount, description, customerDetails) => {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }
  
  try {
    const options = {
      amount: amount * 100,
      currency: 'INR',
      description: description,
      customer: {
        name: customerDetails.name,
        email: customerDetails.email,
        contact: customerDetails.phone
      },
      notify: {
        sms: true,
        email: true
      },
      reminder_enable: true,
      callback_url: `${process.env.FRONTEND_URL}/payment/success`,
      callback_method: 'get'
    };

    const paymentLink = await razorpay.paymentLink.create(options);
    return paymentLink;
  } catch (error) {
    console.error('Razorpay Payment Link Error:', error);
    throw new Error('Failed to create payment link');
  }
};
