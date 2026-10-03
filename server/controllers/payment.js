import Razorpay from "razorpay";
import User from "../Modals/Auth.js";
import Payment from "../Modals/payment.js";
import crypto from "crypto";
import { sendPaymentConfirmation } from "../utils/email.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLAN_PRICES = {
  bronze: 499,
  silver: 999,
  gold: 1999,
};

export const createOrder = async (req, res) => {
  const { plan } = req.body;
  if (!PLAN_PRICES[plan]) {
    return res.status(400).json({ message: "Invalid plan selected" });
  }

  try {
    const options = {
      amount: PLAN_PRICES[plan] * 100, // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    return res.status(200).json(order);
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    return res.status(500).json({ message: "Failed to create order" });
  }
};

export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    plan,
  } = req.body;

  try {
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (razorpay_signature === expectedSignature) {
      // 1. Update User Plan
      const user = await User.findByIdAndUpdate(userId, { plan: plan }, { new: true });
      if (!user) return res.status(404).json({ message: "User not found" });

      // 2. Record Payment
      await Payment.create({
        userId,
        plan,
        amount: PLAN_PRICES[plan],
        transactionId: razorpay_payment_id,
        status: "captured",
      });

      // 3. Send Confirmation Email
      await sendPaymentConfirmation(user.email, plan, PLAN_PRICES[plan], razorpay_payment_id);

      return res.status(200).json({ message: "Payment successful and plan upgraded!" });
    } else {
      return res.status(400).json({ message: "Invalid payment signature" });
    }
  } catch (error) {
    console.error("Payment Verification Error:", error);
    return res.status(500).json({ message: "Something went wrong during verification" });
  }
};
