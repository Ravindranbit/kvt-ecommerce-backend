const express = require("express");
const requireAdmin = require("../../middleware/admin.middleware");

const {
  createProduct,
  updateProduct,
  deactivateProduct,
  listProducts,
  getProductById,
} = require("./product.controller");

const router = express.Router();

/* ---------- ADMIN ROUTES ---------- */
router.post("/", requireAdmin, createProduct);
router.put("/:id", requireAdmin, updateProduct);
router.patch("/:id/deactivate", requireAdmin, deactivateProduct);

/* ---------- PUBLIC ROUTES ---------- */
router.get("/", listProducts);
router.get("/:id", getProductById);

module.exports = router;
