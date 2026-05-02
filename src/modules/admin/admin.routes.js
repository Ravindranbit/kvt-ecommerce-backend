const express = require("express");

const {
  adminLogin,
  createAdmin,
  changeAdminPassword,
  listAdmins,
  updateAdminStatus,
  deleteAdmin,
  updateAdminPermissions,
  getAdminDashboardStats,
  listCombinedUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  listVendors,
  getVendorById,
  listVendorProducts,
  hideVendorProduct,
  showVendorProduct,
  listVendorOrders,
  updateVendorStatus,
  updateVendorCommission,
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getSettings,
  updateSettings,
  getMyAdminProfile,
  updateMyAdminProfile,
} = require("./admin.controller");

const requireAdmin = require("../../middleware/admin.middleware");


const router = express.Router();

router.post("/login", adminLogin);

router.post("/create", requireAdmin, createAdmin);
router.patch("/change-password", requireAdmin, changeAdminPassword);

router.get("/all", requireAdmin, listAdmins);
router.get("/dashboard/stats", requireAdmin, getAdminDashboardStats);
router.get("/users", requireAdmin, listCombinedUsers);
router.patch("/users/:id/status", requireAdmin, updateUserStatus);
router.patch("/users/:id/role", requireAdmin, updateUserRole);
router.delete("/users/:id", requireAdmin, deleteUser);
router.get("/vendors", requireAdmin, listVendors);
router.get("/vendors/:id", requireAdmin, getVendorById);
router.get("/vendors/:id/products", requireAdmin, listVendorProducts);
router.get("/vendors/:id/orders", requireAdmin, listVendorOrders);
router.patch("/vendors/:id/status", requireAdmin, updateVendorStatus);
router.patch("/vendors/:id/commission", requireAdmin, updateVendorCommission);
router.patch("/vendors/:id/products/:productId/hide", requireAdmin, hideVendorProduct);
router.patch("/vendors/:id/products/:productId/show", requireAdmin, showVendorProduct);
router.get("/banners", requireAdmin, listBanners);
router.post("/banners", requireAdmin, createBanner);
router.patch("/banners/:id", requireAdmin, updateBanner);
router.delete("/banners/:id", requireAdmin, deleteBanner);
router.get("/settings", requireAdmin, getSettings);
router.put("/settings", requireAdmin, updateSettings);
router.get("/me", requireAdmin, getMyAdminProfile);
router.patch("/me", requireAdmin, updateMyAdminProfile);
router.patch("/:id/permissions", requireAdmin, updateAdminPermissions);
router.delete("/:id", requireAdmin, deleteAdmin);
router.patch("/:id/status", requireAdmin, updateAdminStatus);

module.exports = router;