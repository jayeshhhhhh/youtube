import nodemailer from "nodemailer";

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendPaymentConfirmation = async (
  userEmail,
  plan,
  amount,
  transactionId
) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"YourTube Premium" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject:
      "Payment Confirmation - Plan Upgrade Successful!",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Thank you for upgrading your plan!</h2>

        <p>Hello,</p>

        <p>
          Your payment for the
          <strong>${plan.toUpperCase()}</strong>
          plan has been successfully processed.
        </p>

        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p>
            <strong>Transaction ID:</strong>
            ${transactionId}
          </p>

          <p>
            <strong>Amount Paid:</strong>
            ₹${amount}
          </p>

          <p>
            <strong>Plan:</strong>
            ${plan.toUpperCase()}
          </p>
        </div>

        <p>
          You now have access to the benefits of the
          ${plan} plan.
        </p>

        <p>
          Best Regards,<br>
          The YourTube Team
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Confirmation email sent successfully");
  } catch (error) {
    console.error(
      "Payment email sending error:",
      error.message
    );
  }
};

export const sendOTP = async (userEmail, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"YourTube Security" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: "Your YourTube Verification Code",

    text: `
Your YourTube verification code is ${otp}.

This code expires in 10 minutes.

If you did not attempt to log in, please secure your account.
    `,

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 500px;
        margin: auto;
        padding: 30px;
        border: 1px solid #ddd;
        border-radius: 12px;
        text-align: center;
      ">

        <h2>YourTube Security Verification</h2>

        <p>
          A login was detected from a new device or location.
        </p>

        <p>
          Enter this verification code to continue:
        </p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          margin: 25px 0;
        ">
          ${otp}
        </div>

        <p>
          This code will expire in
          <strong>10 minutes</strong>.
        </p>

        <p style="
          font-size: 12px;
          color: #888;
          margin-top: 25px;
        ">
          If this login was not made by you,
          please secure your account.
        </p>

      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP email sent successfully");
  } catch (error) {
    console.error(
      "OTP email sending error:",
      error.message
    );

    throw error;
  }
};