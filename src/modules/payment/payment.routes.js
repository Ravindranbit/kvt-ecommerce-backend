const express = require("express");
const requireAuth = require("../../middleware/auth.middleware");

const { createOrder, verifyPayment } = require("./payment.controller");

const router = express.Router();

router.post("/create-order", requireAuth, createOrder);
router.post("/verify", requireAuth, verifyPayment);

module.exports = router;
