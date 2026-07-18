const nodemailer = require("nodemailer");
const envs = require("../config/envs");

const transporter = nodemailer.createTransport({
  host: envs.smtpHost || "smtp.gmail.com",
  port: Number(envs.smtpPort) || 465,
  secure: Number(envs.smtpPort) === 465,
  family: 4,
  auth: {
    user: envs.smtpUser,
    pass: envs.smtpPass,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  tls: {
    rejectUnauthorized: true,
  },
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("========================================");
    console.error("[Mailer] SMTP Verification Failed");
    console.error(error);
    console.error("========================================");
  } else {
    console.log("========================================");
    console.log("[Mailer] Gmail SMTP Connected Successfully");
    console.log("========================================");
  }
});

async function sendOtp(to, otp) {
  try {
    console.log(`[Mailer] Sending OTP to ${to}`);

    const info = await transporter.sendMail({
      from: `"Smart Ordering" <${envs.smtpUser}>`,
      to,
      subject: "Your Password Reset Code",
      html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:20px">
          <h2>Password Reset</h2>

          <p>
              Use the verification code below to reset your password.
              This code will expire in 10 minutes.
          </p>

          <div style="
              background:#f5f5f5;
              padding:20px;
              text-align:center;
              border-radius:8px;
              margin:25px 0;
          ">
              <span style="
                  font-size:34px;
                  letter-spacing:8px;
                  font-weight:bold;
                  color:#E63946;
              ">
                  ${otp}
              </span>
          </div>

          <p>If you didn't request this email, simply ignore it.</p>

          <hr>

          <small>Smart QR Ordering System</small>
      </div>
      `,
    });

    console.log("========================================");
    console.log("[Mailer] Email Sent Successfully");
    console.log(info);
    console.log("========================================");

    return true;
  } catch (err) {
    console.error("========================================");
    console.error("[Mailer] Email Sending Failed");
    console.error(err);
    console.error("========================================");

    throw err;
  }
}

module.exports = {
  sendOtp,
};
