const express = require("express");
const {
  adminLogin,
  createAdmin,
  changeAdminPassword,
} = require("./admin.controller");

const requireAdmin = require("../../middleware/admin.middleware");

const router = express.Router();

router.post("/login", adminLogin);
router.post("/create", requireAdmin, createAdmin);
router.patch("/change-password", requireAdmin, changeAdminPassword);

module.exports = router;