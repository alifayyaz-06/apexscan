const brevo = require("@getbrevo/brevo");
const envs = require("../config/envs");

const apiInstance = new brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  envs.brevoApiKey,
);

async function sendOtp(to, otp) {
  try {
    console.log(`[Mailer] Sending OTP to ${to}`);

    const email = new brevo.SendSmtpEmail();

    email.sender = {
      email: envs.brevoSenderEmail,
      name: "Smart QR Ordering System",
    };

    email.to = [
      {
        email: to,
      },
    ];

    email.subject = "Your Password Reset Code";

    email.htmlContent = `
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
    `;

    const response = await apiInstance.sendTransacEmail(email);

    console.log("========================================");
    console.log("[Mailer] Email Sent Successfully");
    console.log(response);
    console.log("========================================");

    return true;
  } catch (err) {
    console.error("========================================");
    console.error("[Mailer] Email Sending Failed");
    console.error(err.response?.body || err);
    console.error("========================================");

    throw err;
  }
}

module.exports = {
  sendOtp,
};
