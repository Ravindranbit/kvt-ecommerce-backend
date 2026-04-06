const express = require("express");
const requireAuth = require("../../middleware/auth.middleware");

const {
  addToCart,
  updateCartItem,
  removeCartItem,
  getCart,
} = require("./cart.controller");

const router = express.Router();

router.post("/add", requireAuth, addToCart);
router.patch("/update", requireAuth, updateCartItem);
router.delete("/remove/:productId", requireAuth, removeCartItem);
router.get("/", requireAuth, getCart);

module.exports = router;
