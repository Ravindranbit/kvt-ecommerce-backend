const express = require("express");
const {
  initiateRegistration,
  verifyOtpAndRegister,
  loginUser,
  getMe,
  resendOtp,
  registerVendor,
} = require("./auth.controller");
const { adminLogin } = require("../admin/admin.controller");

const requireAuth = require("../../middleware/auth.middleware");

const router = express.Router();

router.post("/register/initiate", initiateRegistration);
router.post("/register/verify", verifyOtpAndRegister);
router.post("/register-vendor", registerVendor);
router.post("/login", loginUser);
router.post("/admin/login", adminLogin);

// 🔐 Protected route
router.get("/me", requireAuth, getMe);
router.post("/register/resend-otp", resendOtp);

module.exports = router;
