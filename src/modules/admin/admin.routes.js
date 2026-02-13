const express = require("express");

const {
  adminLogin,
  createAdmin,
  changeAdminPassword,
  listAdmins,
  updateAdminStatus,
} = require("./admin.controller");

const requireAdmin = require("../../middleware/admin.middleware");


const router = express.Router();

router.post("/login", adminLogin);

router.post("/create", requireAdmin, createAdmin);
router.patch("/change-password", requireAdmin, changeAdminPassword);

router.get("/all", requireAdmin, listAdmins);
router.patch("/:id/status", requireAdmin, updateAdminStatus);

module.exports = router;