const express = require("express");
const requireAuth = require("../../middleware/auth.middleware");
const requireAdmin = require("../../middleware/admin.middleware");
const requireSeller = require("../../middleware/seller.middleware");

const {
  createProduct,
  updateProduct,
  deleteProduct,
  listProducts,
  getProductById,
  getProductReviewsList,
  addProductReview,
  updateProductReview,
  deleteProductReview,
} = require("./product.controller");

const router = express.Router();

/* ---------- VENDOR/ADMIN ROUTES ---------- */
router.post("/", requireSeller, createProduct);
router.put("/:id", requireSeller, updateProduct);
router.delete("/:id", requireSeller, deleteProduct);

/* ---------- PUBLIC ROUTES ---------- */
router.get("/", listProducts);
router.get("/:id", getProductById);
router.get("/:id/reviews", getProductReviewsList);
router.post("/:id/reviews", requireAuth, addProductReview);
router.patch("/:id/reviews/:reviewId", requireAuth, updateProductReview);
router.delete("/:id/reviews/:reviewId", requireAuth, deleteProductReview);

module.exports = router;
