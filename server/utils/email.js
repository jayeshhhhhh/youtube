import nodemailer from "nodemailer";

export const sendPaymentConfirmation = async (userEmail, plan, amount, transactionId) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: '"YourTube Premium" <no-reply@yourtube.com>',
    to: userEmail,
    subject: "Payment Confirmation - Plan Upgrade Successful!",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Thank you for upgrading your plan!</h2>
        <p>Hello,</p>
        <p>Your payment for the <strong>${plan.toUpperCase()}</strong> plan has been successfully processed.</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Transaction ID:</strong> ${transactionId}</p>
          <p><strong>Amount Paid:</strong> ₹${amount}</p>
          <p><strong>Plan:</strong> ${plan.toUpperCase()}</p>
        </div>
        <p>You now have access to all the benefits of the ${plan} plan. Happy watching!</p>
        <br>
        <p>Best Regards,<br>The YourTube Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Confirmation email sent successfully");
  } catch (error) {
    console.error("Email sending error:", error);
  }
};


export const sendOTP = async (userEmail, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: '"YourTube Security" <security@yourtube.com>',
    to: userEmail,
    subject: "Your YourTube Verification Code",
    text: `Your verification code is: ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd;">
        <h2>Security Verification</h2>
        <p>A login was detected from a new device or location.</p>
        <div style="font-size: 24px; font-weight: bold; color: #EF4444; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p style="font-size: 12px; color: #888;">If this wasn't you, please secure your account.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP email sent successfully");
  } catch (error) {
    console.error("OTP email sending error:", error);
  }
};

