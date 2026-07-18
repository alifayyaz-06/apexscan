const envs = require("../config/envs");

async function sendOtp(to, otp) {
  try {
    console.log(`[Mailer] Sending OTP to ${to}`);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": envs.brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: envs.brevoSenderEmail,
          name: envs.brevoSenderName,
        },

        to: [
          {
            email: to,
          },
        ],

        subject: "Your Password Reset Code",

        htmlContent: `
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

              <p>
                If you didn't request this email, ignore it.
              </p>

              <hr>

              <small>
                Smart QR Ordering System
              </small>

          </div>
          `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Mailer] Brevo Error:", errorText);
      throw new Error(errorText);
    }

    const result = await response.json();

    console.log("========================================");
    console.log("[Mailer] Email Sent Successfully");
    console.log(result);
    console.log("========================================");

    return true;
  } catch (err) {
    console.error("========================================");
    console.error("[Mailer] Email Sending Failed");
    console.error(err);
    console.error("========================================");
     console.log("[Brevo Key Exists]", envs.brevoApiKey ? "YES" : "NO");

     console.log("[Brevo Key Start]", envs.brevoApiKey?.substring(0, 10));
     console.log("Brevo key loaded:", !!envs.brevoApiKey);
     console.log("Brevo key prefix:", envs.brevoApiKey?.substring(0, 15));
     console.log("Brevo key length:", envs.brevoApiKey?.length);

    throw err;

  }
 
}

module.exports = {
  sendOtp,
};
