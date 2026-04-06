const express = require("express");
const requireAdmin = require("../../middleware/admin.middleware");

const {
	createCategory,
	updateCategory,
	deactivateCategory,
	getAllCategoriesAdmin,
	getCategoriesTree,
	getCategoryBySlug,
} = require("./category.controller");

const router = express.Router();

/* ---------- ADMIN ROUTES ---------- */
router.post("/", requireAdmin, createCategory);
router.put("/:id", requireAdmin, updateCategory);
router.patch("/:id/deactivate", requireAdmin, deactivateCategory);
router.get("/admin/all", requireAdmin, getAllCategoriesAdmin);

/* ---------- PUBLIC ROUTES ---------- */
router.get("/", getCategoriesTree);
router.get("/:slug", getCategoryBySlug);

module.exports = router;
