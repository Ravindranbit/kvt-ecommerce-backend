const express = require("express");
const requireAuth = require("../../middleware/auth.middleware");

const { placeOrder, getMyOrders } = require("./order.controller");

const router = express.Router();

router.post("/place", requireAuth, placeOrder);
router.get("/my", requireAuth, getMyOrders);

module.exports = router;
