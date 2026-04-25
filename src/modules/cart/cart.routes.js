const express = require("express");
const requireAuth = require("../../middleware/auth.middleware");
const { validate } = require("../../middleware/validation.middleware");
const {
  addToCartSchema,
  updateCartSchema,
} = require("./cart.validation");

const {
  addToCart,
  updateCartItem,
  removeCartItem,
  getCart,
} = require("./cart.controller");

const router = express.Router();

router.post("/add", requireAuth, validate(addToCartSchema), addToCart);
router.patch("/update", requireAuth, validate(updateCartSchema), updateCartItem);
router.delete("/remove/:productId", requireAuth, removeCartItem);
router.get("/", requireAuth, getCart);

module.exports = router;
