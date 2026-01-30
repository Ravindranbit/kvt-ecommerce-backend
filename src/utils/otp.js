const bcrypt = require("bcrypt");

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP before storing
const hashOTP = async (otp) => {
  return await bcrypt.hash(otp, 10);
};

// Verify OTP
const verifyOTP = async (otp, hash) => {
  return await bcrypt.compare(otp, hash);
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP,
};
