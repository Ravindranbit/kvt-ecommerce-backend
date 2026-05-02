const express = require("express");
const requireAdmin = require("../../middleware/admin.middleware");

const {
	createCategory,
	updateCategory,
	deleteCategory,
	getAllCategoriesAdmin,
	getCategoriesTree,
	getCategoryBySlug,
} = require("./category.controller");

const router = express.Router();

/* ---------- ADMIN ROUTES ---------- */
router.post("/", requireAdmin, createCategory);
router.put("/:id", requireAdmin, updateCategory);
router.delete("/:id", requireAdmin, deleteCategory);
router.get("/admin/all", requireAdmin, getAllCategoriesAdmin);

/* ---------- PUBLIC ROUTES ---------- */
router.get("/", getCategoriesTree);
router.get("/:slug", getCategoryBySlug);

module.exports = router;
