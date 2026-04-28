const axios = require("axios");

const sendOTP = async (phone, otp) => {
  // DEV MODE → Just log OTP
  if (process.env.SMS_MODE === "DEV") {
    console.log("DEV OTP:", otp);
    return { success: true, mode: "DEV" };
  }

  // PROD MODE → Use Fast2SMS
  try {
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "otp",
        variables_values: otp,
        numbers: phone,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.return === false) {
      throw new Error(response.data.message);
    }

    return response.data;
  } catch (error) {
    console.error("SMS Error:", error.response?.data || error.message);
    throw new Error("Failed to send OTP");
  }
};

module.exports = {
  sendOTP,
};