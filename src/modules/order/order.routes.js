const express = require("express");
const requireAuth = require("../../middleware/auth.middleware");
const requireAdmin = require("../../middleware/admin.middleware");
const requireSeller = require("../../middleware/seller.middleware");

const {
	placeOrder,
	getMyOrders,
	getAllOrders,
	updateOrderStatus,
	getVendorOrders,
} = require("./order.controller");

const router = express.Router();

router.post("/place", requireAuth, placeOrder);
router.get("/my", requireAuth, getMyOrders);
router.get("/vendor", requireSeller, getVendorOrders);
router.get("/", requireAdmin, getAllOrders);
router.patch("/:id/status", requireAdmin, updateOrderStatus);

module.exports = router;
