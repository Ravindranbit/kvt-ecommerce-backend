const bcrypt = require("bcrypt");
const prisma = require("../../config/db");
const { generateAdminToken } = require("../../utils/jwt");
const { sendSuccess, sendError } = require("../../utils/response");

/**
 * ADMIN LOGIN
 */
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, {
        status: 400,
        message: "Email and password are required",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return sendError(res, {
        status: 401,
        message: "Invalid credentials",
      });
    }

    if (!admin.isActive) {
      return sendError(res, {
        status: 403,
        message: "Admin account is inactive",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      return sendError(res, {
        status: 401,
        message: "Invalid credentials",
      });
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    const token = generateAdminToken(admin);

    return sendSuccess(res, {
      message: "Admin login successful",
      data: {
        token,
        forcePasswordChange: admin.isTemporaryPassword,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

/**
 * SUPER ADMIN → CREATE ADMIN
 */
const createAdmin = async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return sendError(res, {
        status: 403,
        message: "Only Super Admin can create admins",
      });
    }

    const { name, email, role, temporaryPassword } = req.body;

    if (!name || !email || !role || !temporaryPassword) {
      return sendError(res, {
        status: 400,
        message: "Name, email, role and temporary password are required",
      });
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      return sendError(res, {
        status: 409,
        message: "Admin already exists",
      });
    }

    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        role,
        passwordHash,
        isTemporaryPassword: true,
      },
    });

    return sendSuccess(res, {
      status: 201,
      message: "Admin created successfully",
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        temporaryPassword: true,
      },
    });
  } catch (error) {
    console.error("Create Admin Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

/**
 * ADMIN → CHANGE PASSWORD
 */
const changeAdminPassword = async (req, res) => {
  try {
    const adminId = req.user.sub;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return sendError(res, {
        status: 400,
        message: "Old and new password required",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    const isValid = await bcrypt.compare(oldPassword, admin.passwordHash);
    if (!isValid) {
      return sendError(res, {
        status: 401,
        message: "Old password incorrect",
      });
    }

    await prisma.admin.update({
      where: { id: adminId },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        isTemporaryPassword: false,
      },
    });

    return sendSuccess(res, {
      message: "Password updated successfully",
      data: { updated: true },
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

/**
 * SUPER ADMIN → LIST ALL ADMINS
 * GET /admin/all
 */
const listAdmins = async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return sendError(res, {
        status: 403,
        message: "Only Super Admin can view admins",
      });
    }

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isTemporaryPassword: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return sendSuccess(res, {
      data: admins,
    });
  } catch (error) {
    console.error("List Admins Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

/**
 * SUPER ADMIN → ACTIVATE / DEACTIVATE ADMIN
 * PATCH /admin/:id/status
 */
const updateAdminStatus = async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return sendError(res, {
        status: 403,
        message: "Only Super Admin can update admin status",
      });
    }

    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return sendError(res, {
        status: 400,
        message: "isActive must be true or false",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!admin) {
      return sendError(res, {
        status: 404,
        message: "Admin not found",
      });
    }

    if (admin.id === req.user.sub) {
      return sendError(res, {
        status: 400,
        message: "You cannot deactivate yourself",
      });
    }

    await prisma.admin.update({
      where: { id },
      data: { isActive },
    });

    return sendSuccess(res, {
      message: `Admin ${isActive ? "activated" : "deactivated"} successfully`,
      data: { id, isActive },
    });
  } catch (error) {
    console.error("Update Admin Status Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

module.exports = {
  adminLogin,
  createAdmin,
  changeAdminPassword,
  listAdmins,
  updateAdminStatus,
};
