const express = require("express");
const {
  initiateRegistration,
  verifyOtpAndRegister,
  loginUser,
  getMe,
} = require("./auth.controller");

const requireAuth = require("../../middleware/auth.middleware");

const router = express.Router();

router.post("/register/initiate", initiateRegistration);
router.post("/register/verify", verifyOtpAndRegister);
router.post("/login", loginUser);

// 🔐 Protected route
router.get("/me", requireAuth, getMe);

module.exports = router;
