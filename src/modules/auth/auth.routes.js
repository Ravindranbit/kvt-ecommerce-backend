const express = require("express");
const {
  initiateRegistration,
  verifyOtpAndRegister,
  loginUser
} = require("./auth.controller");

const router = express.Router();

router.post("/register/initiate", initiateRegistration);
router.post("/register/verify", verifyOtpAndRegister);
router.post("/login", loginUser);


module.exports = router;
