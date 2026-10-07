import User from "../Modals/Auth.js";
import Payment from "../Modals/payment.js";
import { sendPaymentConfirmation } from "../utils/email.js";

const PLAN_PRICES = {
  bronze: 499,
  silver: 999,
  gold: 1999,
};

export const createOrder = async (req, res) => {
  const { plan, userId } = req.body;

  if (!PLAN_PRICES[plan]) {
    return res.status(400).json({ message: "Invalid plan selected" });
  }

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const orderId = `demo_order_${Date.now()}`;

    return res.status(200).json({
      id: orderId,
      amount: PLAN_PRICES[plan] * 100,
      currency: "INR",
      plan,
      demo: true,
    });
  } catch (error) {
    console.error("Demo Order Error:", error);
    return res.status(500).json({ message: "Failed to create order" });
  }
};

export const verifyPayment = async (req, res) => {
  const {
    demo_order_id,
    userId,
    plan,
  } = req.body;

  if (!demo_order_id || !userId || !PLAN_PRICES[plan]) {
    return res.status(400).json({
      message: "Invalid payment details",
    });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const transactionId = `demo_payment_${Date.now()}`;

    const planExpiry = new Date();
    planExpiry.setDate(planExpiry.getDate() + 30);

    user.plan = plan;
    user.planExpiry = planExpiry;

    await user.save();
    console.log("PLAN UPDATED:", user.plan);
console.log("PLAN EXPIRY:", user.planExpiry);

    await Payment.create({
      userId,
      plan,
      amount: PLAN_PRICES[plan],
      transactionId,
      orderId: demo_order_id,
      status: "captured",
    });

    try {
      await sendPaymentConfirmation(
        user.email,
        plan,
        PLAN_PRICES[plan],
        transactionId
      );
    } catch (emailError) {
      console.error("Email Error:", emailError);
    }

    return res.status(200).json({
      message: "Demo payment successful and plan upgraded!",
      plan,
      transactionId,
      planExpiry,
    });
  } catch (error) {
    console.error("Demo Payment Verification Error:", error);
    return res.status(500).json({
      message: "Something went wrong during payment",
    });
  }
};