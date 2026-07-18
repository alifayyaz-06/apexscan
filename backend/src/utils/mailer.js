const nodemailer = require("nodemailer");
const envs = require("../config/envs");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: envs.smtpUser,
    pass: envs.smtpPass,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

async function sendOtp(to, otp) {
  try {
    console.log(`[Mailer] Sending OTP to ${to}`);

    await transporter.sendMail({
      from: `"Apex Scan" <${envs.smtpUser}>`,
      to,
      subject: "Your Password Reset Code",
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #2B2D42; margin-bottom: 8px;">Password Reset</h2>

          <p style="color: #555; font-size: 14px;">
            Use the code below to reset your password.
            It expires in 10 minutes.
          </p>

          <div style="
              background:#f4f4f4;
              border-radius:8px;
              padding:20px;
              text-align:center;
              margin:24px 0;
          ">
            <span style="
                font-size:32px;
                font-weight:bold;
                letter-spacing:6px;
                color:#E63946;
            ">
              ${otp}
            </span>
          </div>

          <p style="color:#888;font-size:12px;">
            If you didn't request this email, simply ignore it.
          </p>
        </div>
      `,
    });

    console.log("[Mailer] Email sent successfully.");
  } catch (err) {
    console.error("[Mailer] Failed to send email:", err);
    throw err;
  }
}

module.exports = { sendOtp };
