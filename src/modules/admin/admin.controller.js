const bcrypt = require("bcrypt");
const prisma = require("../../config/db");
const { generateAdminToken } = require("../../utils/jwt");

/**
 * ADMIN LOGIN
 */
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        message: "Admin account is inactive",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      admin.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    const token = generateAdminToken(admin);

    return res.status(200).json({
      message: "Admin login successful",
      token,
      forcePasswordChange: admin.isTemporaryPassword,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    return res.status(500).json({
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
      return res.status(403).json({
        message: "Only Super Admin can create admins",
      });
    }

    const { name, email, role, temporaryPassword } = req.body;

    if (!name || !email || !role || !temporaryPassword) {
      return res.status(400).json({
        message: "Name, email, role and temporary password are required",
      });
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      return res.status(409).json({
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

    return res.status(201).json({
      message: "Admin created successfully",
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        temporaryPassword: true,
      },
    });
  } catch (error) {
    console.error("Create Admin Error:", error);
    return res.status(500).json({
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
      return res.status(400).json({
        message: "Old and new password required",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    const isValid = await bcrypt.compare(
      oldPassword,
      admin.passwordHash
    );

    if (!isValid) {
      return res.status(401).json({
        message: "Old password incorrect",
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.admin.update({
      where: { id: adminId },
      data: {
        passwordHash: newHash,
        isTemporaryPassword: false,
      },
    });

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  adminLogin,
  createAdmin,
  changeAdminPassword,
};

/**
 * SUPER ADMIN → LIST ALL ADMINS
 * GET /admin/all
 */
const listAdmins = async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
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

    return res.status(200).json({
      admins,
    });
  } catch (error) {
    console.error("List Admins Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};