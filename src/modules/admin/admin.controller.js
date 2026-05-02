const bcrypt = require("bcrypt");
const prisma = require("../../config/db");
const { generateAdminToken } = require("../../utils/jwt");
const { sendSuccess, sendError } = require("../../utils/response");
const { readState, updateState, defaultPermissions } = require("./admin.storage");
const { readState: readProductReviewState } = require("../product/product.review.storage");

const permissionKeys = Object.keys(defaultPermissions);

const normalizePermissions = (permissions = {}) => {
  return permissionKeys.reduce((accumulator, key) => {
    accumulator[key] = typeof permissions[key] === "boolean" ? permissions[key] : defaultPermissions[key];
    return accumulator;
  }, {});
};

const getAdminProfile = (admin) => {
  const state = readState();
  const profile = state.adminProfiles?.[admin.id] || {};

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    isActive: admin.isActive,
    isTemporaryPassword: admin.isTemporaryPassword,
    lastLogin: admin.lastLogin,
    createdAt: admin.createdAt,
    phone: profile.phone || "",
    permissions: normalizePermissions(profile.permissions),
    avatar: profile.avatar || "",
  };
};

const formatDate = (value) => {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString().split("T")[0];
};

const getMonthlyBuckets = (months = 6) => {
  const now = new Date();
  const buckets = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleString("en-US", { month: "short" }),
      revenue: 0,
    });
  }

  return buckets;
};

const getReviewSummary = (productId) => {
  const reviewState = readProductReviewState();
  const reviews = reviewState.reviewsByProduct?.[productId] || [];
  const reviewCount = reviews.length;
  const rating = reviewCount
    ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1))
    : 0;

  return { reviewCount, rating };
};

const getVendorProductAssignments = (state, vendorId) => {
  const assignments = state.productAssignments?.[vendorId];

  if (!assignments) {
    return [];
  }

  if (Array.isArray(assignments)) {
    return assignments;
  }

  return Object.entries(assignments).map(([productId, details]) => ({
    productId,
    ...(details || {}),
  }));
};

const saveVendorProductAssignment = (state, vendorId, productId, updates) => {
  const vendorAssignments = state.productAssignments?.[vendorId];
  const normalizedAssignments = Array.isArray(vendorAssignments)
    ? vendorAssignments.reduce((accumulator, assignment) => {
        accumulator[assignment.productId] = {
          hidden: Boolean(assignment.hidden),
          hiddenReason: assignment.hiddenReason || "",
          hiddenAt: assignment.hiddenAt || null,
          updatedAt: assignment.updatedAt || null,
        };
        return accumulator;
      }, {})
    : { ...(vendorAssignments || {}) };

  const current = normalizedAssignments[productId] || {};
  normalizedAssignments[productId] = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...state,
    productAssignments: {
      ...(state.productAssignments || {}),
      [vendorId]: normalizedAssignments,
    },
  };
};

const formatVendorProduct = (product, assignment = {}) => {
  const reviewSummary = getReviewSummary(product.id);

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    image: product.imageUrl || "",
    category: product.category?.slug || product.category?.name || "uncategorized",
    categoryName: product.category?.name || "",
    categoryId: product.categoryId,
    isActive: product.isActive,
    rating: reviewSummary.rating,
    reviews: reviewSummary.reviewCount,
    hidden: Boolean(assignment.hidden),
    hiddenReason: assignment.hiddenReason || "",
    hiddenAt: assignment.hiddenAt || null,
  };
};

const getVendorProductsById = async (vendorId) => {
  const state = readState();
  const assignments = getVendorProductAssignments(state, vendorId);

  if (assignments.length === 0) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: assignments.map((assignment) => assignment.productId),
      },
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  const assignmentMap = assignments.reduce((accumulator, assignment) => {
    accumulator[assignment.productId] = assignment;
    return accumulator;
  }, {});

  return products.map((product) => formatVendorProduct(product, assignmentMap[product.id] || {}));
};

const getVendorOrdersById = async (vendorId) => {
  const vendorProducts = await getVendorProductsById(vendorId);
  const vendorProductIds = vendorProducts.map((product) => product.id);

  if (!vendorProductIds.length) {
    return [];
  }

  const orders = await prisma.order.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders
    .map((order) => {
      const vendorItems = order.items.filter((item) => vendorProductIds.includes(item.productId));

      if (!vendorItems.length) {
        return null;
      }

      return {
        id: order.id,
        customerId: order.userId,
        customerName: order.user?.name || "",
        customerEmail: order.user?.email || "",
        customerPhone: order.user?.phone || "",
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: vendorItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.product?.imageUrl || "",
        })),
      };
    })
    .filter(Boolean);
};

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
    const profile = getAdminProfile(admin);

    return sendSuccess(res, {
      message: "Admin login successful",
      data: {
        token,
        forcePasswordChange: admin.isTemporaryPassword,
        admin: profile,
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

    const { name, email, role, temporaryPassword, phone, permissions } = req.body;

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

    const createPermissions = permissionKeys.reduce((accumulator, key) => {
      accumulator[key] = typeof permissions?.[key] === "boolean" ? permissions[key] : false;
      return accumulator;
    }, {});

    updateState((state) => ({
      ...state,
      adminProfiles: {
        ...state.adminProfiles,
        [admin.id]: {
          phone: phone || "",
          permissions: createPermissions,
          avatar: state.adminProfiles?.[admin.id]?.avatar || "",
        },
      },
    }));

    return sendSuccess(res, {
      status: 201,
      message: "Admin created successfully",
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        temporaryPassword: true,
        phone: phone || "",
        permissions: createPermissions,
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

    const profiles = readState().adminProfiles || {};
    const adminsWithProfiles = admins.map((admin) => ({
      ...admin,
      phone: profiles[admin.id]?.phone || "",
      permissions: normalizePermissions(profiles[admin.id]?.permissions),
      avatar: profiles[admin.id]?.avatar || "",
    }));

    return sendSuccess(res, {
      data: adminsWithProfiles,
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

const getAdminDashboardStats = async (req, res) => {
  try {
    const [users, admins, products, orders] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, email: true, isActive: true, createdAt: true } }),
      prisma.admin.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } }),
      prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, price: true, imageUrl: true, createdAt: true } }),
      prisma.order.findMany({
        include: {
          user: {
            select: {
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const revenueByMonth = getMonthlyBuckets(6);
    const orderStatusCounts = {
      PENDING: 0,
      CONFIRMED: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    const productSalesMap = new Map();

    for (const order of orders) {
      const monthKey = `${new Date(order.createdAt).getFullYear()}-${String(new Date(order.createdAt).getMonth() + 1).padStart(2, "0")}`;
      const monthBucket = revenueByMonth.find((bucket) => bucket.key === monthKey);
      if (monthBucket && order.status !== "CANCELLED") {
        monthBucket.revenue += Number(order.totalAmount || 0);
      }

      if (order.status in orderStatusCounts) {
        orderStatusCounts[order.status] += 1;
      }

      for (const item of order.items) {
        const productId = item.productId;
        const previous = productSalesMap.get(productId) || {
          id: productId,
          name: item.product?.name || item.name,
          image: item.product?.imageUrl || "",
          soldCount: 0,
          revenue: 0,
        };

        previous.soldCount += item.quantity;
        previous.revenue += Number(item.price) * Number(item.quantity);
        productSalesMap.set(productId, previous);
      }
    }

    const topProducts = [...productSalesMap.values()]
      .sort((left, right) => right.soldCount - left.soldCount)
      .slice(0, 5);

    const recentOrders = orders.slice(0, 5).map((order) => ({
      id: order.id,
      customerName: order.user?.name || "Unknown customer",
      total: Number(order.totalAmount),
      date: formatDate(order.createdAt),
      status: order.status.toLowerCase(),
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.product?.name || item.name,
        quantity: item.quantity,
        price: Number(item.price),
        image: item.product?.imageUrl || "",
      })),
    }));

    return sendSuccess(res, {
      data: {
        totalRevenue: orders.reduce((sum, order) => sum + (order.status === "CANCELLED" ? 0 : Number(order.totalAmount || 0)), 0),
        totalOrders: orders.length,
        totalUsers: users.length + admins.length,
        totalProducts: products.length,
        revenueByMonth: revenueByMonth.map(({ label, revenue }) => ({ month: label, revenue })),
        ordersByStatus: orderStatusCounts,
        topProducts,
        recentOrders,
      },
    });
  } catch (error) {
    console.error("Admin Dashboard Stats Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const listCombinedUsers = async (req, res) => {
  try {
    const state = readState();
    const { search = "", role, status } = req.query;

    const [users, admins, orders] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true } }),
      prisma.admin.findMany({ select: { id: true, name: true, email: true, isActive: true, createdAt: true, role: true } }),
      prisma.order.findMany({ select: { userId: true, totalAmount: true } }),
    ]);

    const orderStatsMap = orders.reduce((accumulator, order) => {
      if (!accumulator[order.userId]) {
        accumulator[order.userId] = { ordersCount: 0, totalSpent: 0 };
      }

      accumulator[order.userId].ordersCount += 1;
      accumulator[order.userId].totalSpent += Number(order.totalAmount || 0);
      return accumulator;
    }, {});

    const userRows = users.map((user) => {
      const override = state.userOverrides?.[user.id] || {};
      const currentRole = override.role || "buyer";
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: currentRole,
        status: user.isActive ? "active" : "banned",
        joinedDate: formatDate(user.createdAt),
        avatar: override.avatar || "",
        ordersCount: orderStatsMap[user.id]?.ordersCount || 0,
        totalSpent: orderStatsMap[user.id]?.totalSpent || 0,
        type: "user",
      };
    });

    const adminRows = admins.map((admin) => {
      const profile = state.adminProfiles?.[admin.id] || {};
      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: profile.phone || "",
        role: "admin",
        status: admin.isActive ? "active" : "suspended",
        joinedDate: formatDate(admin.createdAt),
        avatar: profile.avatar || "",
        permissions: normalizePermissions(profile.permissions),
        ordersCount: 0,
        totalSpent: 0,
        type: "admin",
      };
    });

    const combined = [...adminRows, ...userRows].filter((row) => {
      const searchText = `${row.name} ${row.email}`.toLowerCase();
      const matchesSearch = !search || searchText.includes(search.toLowerCase());
      const matchesRole = !role || role === "all" || row.role === role;
      const matchesStatus = !status || status === "all" || row.status === status;
      return matchesSearch && matchesRole && matchesStatus;
    });

    return sendSuccess(res, {
      data: combined,
    });
  } catch (error) {
    console.error("List Combined Users Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "banned", "suspended"].includes(status)) {
      return sendError(res, {
        status: 400,
        message: "Status must be active, banned, or suspended",
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (user) {
      const isActive = status === "active";
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive },
      });

      return sendSuccess(res, {
        message: "User status updated successfully",
        data: {
          id: updatedUser.id,
          status: isActive ? "active" : "banned",
        },
      });
    }

    const admin = await prisma.admin.findUnique({ where: { id } });
    if (admin) {
      if (req.user.role !== "SUPER_ADMIN") {
        return sendError(res, {
          status: 403,
          message: "Only Super Admin can update admin status",
        });
      }

      const isActive = status === "active";
      const updatedAdmin = await prisma.admin.update({
        where: { id },
        data: { isActive },
      });

      return sendSuccess(res, {
        message: "Admin status updated successfully",
        data: {
          id: updatedAdmin.id,
          status: isActive ? "active" : "suspended",
        },
      });
    }

    return sendError(res, {
      status: 404,
      message: "User not found",
    });
  } catch (error) {
    console.error("Update User Status Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["buyer", "seller"].includes(role)) {
      return sendError(res, {
        status: 400,
        message: "Role must be buyer or seller",
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return sendError(res, {
        status: 404,
        message: "User not found",
      });
    }

    updateState((state) => ({
      ...state,
      userOverrides: {
        ...state.userOverrides,
        [id]: {
          ...(state.userOverrides?.[id] || {}),
          role,
        },
      },
    }));

    return sendSuccess(res, {
      message: "User role updated successfully",
      data: { id, role },
    });
  } catch (error) {
    console.error("Update User Role Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (user) {
      await prisma.user.delete({ where: { id } });
      updateState((state) => ({
        ...state,
        userOverrides: {
          ...(state.userOverrides || {}),
          [id]: undefined,
        },
      }));

      return sendSuccess(res, {
        message: "User deleted successfully",
        data: { id, deleted: true },
      });
    }

    const admin = await prisma.admin.findUnique({ where: { id } });
    if (admin) {
      if (req.user.role !== "SUPER_ADMIN") {
        return sendError(res, {
          status: 403,
          message: "Only Super Admin can delete admins",
        });
      }

      if (admin.id === req.user.sub) {
        return sendError(res, {
          status: 400,
          message: "You cannot delete yourself",
        });
      }

      await prisma.admin.delete({ where: { id } });
      updateState((state) => {
        const nextProfiles = { ...(state.adminProfiles || {}) };
        delete nextProfiles[id];
        return {
          ...state,
          adminProfiles: nextProfiles,
        };
      });

      return sendSuccess(res, {
        message: "Admin deleted successfully",
        data: { id, deleted: true },
      });
    }

    return sendError(res, {
      status: 404,
      message: "User not found",
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const listVendors = async (req, res) => {
  try {
    const { search = "", status } = req.query;
    const vendors = readState().vendors || [];

    const filtered = vendors.filter((vendor) => {
      const matchesSearch = !search || [vendor.name, vendor.email, vendor.storeName, vendor.storeDescription].join(" ").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !status || status === "all" || vendor.status === status;
      return matchesSearch && matchesStatus;
    });

    return sendSuccess(res, {
      data: filtered,
    });
  } catch (error) {
    console.error("List Vendors Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = (readState().vendors || []).find((item) => item.id === id);

    if (!vendor) {
      return sendError(res, {
        status: 404,
        message: "Vendor not found",
      });
    }

    const products = await getVendorProductsById(id);

    return sendSuccess(res, {
      data: {
        ...vendor,
        products,
        productsCount: products.length,
      },
    });
  } catch (error) {
    console.error("Get Vendor Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const listVendorProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = (readState().vendors || []).find((item) => item.id === id);

    if (!vendor) {
      return sendError(res, {
        status: 404,
        message: "Vendor not found",
      });
    }

    const products = await getVendorProductsById(id);

    return sendSuccess(res, {
      data: products,
    });
  } catch (error) {
    console.error("List Vendor Products Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const hideVendorProduct = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const { reason = "" } = req.body || {};

    const vendor = (readState().vendors || []).find((item) => item.id === id);
    if (!vendor) {
      return sendError(res, {
        status: 404,
        message: "Vendor not found",
      });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return sendError(res, {
        status: 404,
        message: "Product not found",
      });
    }

    updateState((state) => saveVendorProductAssignment(state, id, productId, {
      hidden: true,
      hiddenReason: reason || "Hidden by admin",
      hiddenAt: new Date().toISOString(),
    }));

    const updatedProducts = await getVendorProductsById(id);
    const updatedProduct = updatedProducts.find((item) => item.id === productId);

    return sendSuccess(res, {
      message: "Vendor product hidden successfully",
      data: updatedProduct || { id: productId, hidden: true, hiddenReason: reason || "Hidden by admin" },
    });
  } catch (error) {
    console.error("Hide Vendor Product Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const showVendorProduct = async (req, res) => {
  try {
    const { id, productId } = req.params;

    const vendor = (readState().vendors || []).find((item) => item.id === id);
    if (!vendor) {
      return sendError(res, {
        status: 404,
        message: "Vendor not found",
      });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return sendError(res, {
        status: 404,
        message: "Product not found",
      });
    }

    updateState((state) => saveVendorProductAssignment(state, id, productId, {
      hidden: false,
      hiddenReason: "",
      hiddenAt: null,
    }));

    const updatedProducts = await getVendorProductsById(id);
    const updatedProduct = updatedProducts.find((item) => item.id === productId);

    return sendSuccess(res, {
      message: "Vendor product shown successfully",
      data: updatedProduct || { id: productId, hidden: false },
    });
  } catch (error) {
    console.error("Show Vendor Product Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const listVendorOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = (readState().vendors || []).find((item) => item.id === id);

    if (!vendor) {
      return sendError(res, {
        status: 404,
        message: "Vendor not found",
      });
    }

    const orders = await getVendorOrdersById(id);

    return sendSuccess(res, {
      data: orders,
    });
  } catch (error) {
    console.error("List Vendor Orders Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const updateVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "suspended"].includes(status)) {
      return sendError(res, {
        status: 400,
        message: "Invalid vendor status",
      });
    }

    let updatedVendor = null;
    updateState((state) => {
      const vendors = (state.vendors || []).map((vendor) => {
        if (vendor.id !== id) {
          return vendor;
        }

        updatedVendor = { ...vendor, status };
        return updatedVendor;
      });

      return {
        ...state,
        vendors,
      };
    });

    if (!updatedVendor) {
      return sendError(res, {
        status: 404,
        message: "Vendor not found",
      });
    }

    return sendSuccess(res, {
      message: "Vendor status updated successfully",
      data: updatedVendor,
    });
  } catch (error) {
    console.error("Update Vendor Status Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const updateVendorCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const { commission } = req.body;

    if (typeof commission !== "number" || commission < 0) {
      return sendError(res, {
        status: 400,
        message: "Commission must be a positive number",
      });
    }

    let updatedVendor = null;
    updateState((state) => {
      const vendors = (state.vendors || []).map((vendor) => {
        if (vendor.id !== id) {
          return vendor;
        }

        updatedVendor = { ...vendor, commission };
        return updatedVendor;
      });

      return {
        ...state,
        vendors,
      };
    });

    if (!updatedVendor) {
      return sendError(res, {
        status: 404,
        message: "Vendor not found",
      });
    }

    return sendSuccess(res, {
      message: "Vendor commission updated successfully",
      data: updatedVendor,
    });
  } catch (error) {
    console.error("Update Vendor Commission Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const listBanners = async (req, res) => {
  try {
    return sendSuccess(res, {
      data: readState().banners || [],
    });
  } catch (error) {
    console.error("List Banners Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const createBanner = async (req, res) => {
  try {
    const { title, subtitle, desc, cta, href, accent, image, tag, active } = req.body;

    if (!title || !subtitle) {
      return sendError(res, {
        status: 400,
        message: "Title and subtitle are required",
      });
    }

    const banner = {
      id: `b_${Date.now()}`,
      title,
      subtitle,
      desc: desc || "",
      cta: cta || "Shop Now",
      href: href || "/",
      accent: accent || "#ff6b6b",
      image: image || "",
      tag: tag || "",
      active: typeof active === "boolean" ? active : true,
    };

    updateState((state) => ({
      ...state,
      banners: [...(state.banners || []), banner],
    }));

    return sendSuccess(res, {
      status: 201,
      message: "Banner created successfully",
      data: banner,
    });
  } catch (error) {
    console.error("Create Banner Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    let updatedBanner = null;

    updateState((state) => {
      const banners = (state.banners || []).map((banner) => {
        if (banner.id !== id) {
          return banner;
        }

        updatedBanner = { ...banner, ...updates };
        return updatedBanner;
      });

      return {
        ...state,
        banners,
      };
    });

    if (!updatedBanner) {
      return sendError(res, {
        status: 404,
        message: "Banner not found",
      });
    }

    return sendSuccess(res, {
      message: "Banner updated successfully",
      data: updatedBanner,
    });
  } catch (error) {
    console.error("Update Banner Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const state = readState();
    const bannerExists = (state.banners || []).some((banner) => banner.id === id);

    if (!bannerExists) {
      return sendError(res, {
        status: 404,
        message: "Banner not found",
      });
    }

    updateState((nextState) => ({
      ...nextState,
      banners: (nextState.banners || []).filter((banner) => banner.id !== id),
    }));

    return sendSuccess(res, {
      message: "Banner deleted successfully",
      data: { id, deleted: true },
    });
  } catch (error) {
    console.error("Delete Banner Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const getSettings = async (req, res) => {
  try {
    return sendSuccess(res, {
      data: readState().settings,
    });
  } catch (error) {
    console.error("Get Settings Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const updateSettings = async (req, res) => {
  try {
    const incomingSettings = req.body || {};

    updateState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        ...incomingSettings,
      },
    }));

    return sendSuccess(res, {
      message: "Settings updated successfully",
      data: readState().settings,
    });
  } catch (error) {
    console.error("Update Settings Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const getMyAdminProfile = async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.sub },
    });

    if (!admin) {
      return sendError(res, {
        status: 404,
        message: "Admin not found",
      });
    }

    return sendSuccess(res, {
      data: getAdminProfile(admin),
    });
  } catch (error) {
    console.error("Get Admin Profile Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const updateMyAdminProfile = async (req, res) => {
  try {
    const { name, email, phone, avatar } = req.body;
    const admin = await prisma.admin.findUnique({ where: { id: req.user.sub } });

    if (!admin) {
      return sendError(res, {
        status: 404,
        message: "Admin not found",
      });
    }

    const updatedAdmin = await prisma.admin.update({
      where: { id: admin.id },
      data: {
        name: name || admin.name,
        email: email || admin.email,
      },
    });

    updateState((state) => ({
      ...state,
      adminProfiles: {
        ...(state.adminProfiles || {}),
        [admin.id]: {
          ...(state.adminProfiles?.[admin.id] || {}),
          phone: phone !== undefined ? phone : state.adminProfiles?.[admin.id]?.phone || "",
          avatar: avatar !== undefined ? avatar : state.adminProfiles?.[admin.id]?.avatar || "",
          permissions: normalizePermissions(state.adminProfiles?.[admin.id]?.permissions),
        },
      },
    }));

    return sendSuccess(res, {
      message: "Admin profile updated successfully",
      data: getAdminProfile(updatedAdmin),
    });
  } catch (error) {
    console.error("Update Admin Profile Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const updateAdminPermissions = async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return sendError(res, {
        status: 403,
        message: "Only Super Admin can update permissions",
      });
    }

    const { id } = req.params;
    const { permissions } = req.body;

    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) {
      return sendError(res, {
        status: 404,
        message: "Admin not found",
      });
    }

    updateState((state) => ({
      ...state,
      adminProfiles: {
        ...(state.adminProfiles || {}),
        [id]: {
          ...(state.adminProfiles?.[id] || {}),
          permissions: normalizePermissions(permissions),
          phone: state.adminProfiles?.[id]?.phone || "",
          avatar: state.adminProfiles?.[id]?.avatar || "",
        },
      },
    }));

    return sendSuccess(res, {
      message: "Admin permissions updated successfully",
      data: getAdminProfile(admin),
    });
  } catch (error) {
    console.error("Update Admin Permissions Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    if (req.user.role !== "SUPER_ADMIN") {
      return sendError(res, {
        status: 403,
        message: "Only Super Admin can delete admins",
      });
    }

    const { id } = req.params;

    if (req.user.sub === id) {
      return sendError(res, {
        status: 400,
        message: "You cannot delete yourself",
      });
    }

    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) {
      return sendError(res, {
        status: 404,
        message: "Admin not found",
      });
    }

    await prisma.admin.delete({ where: { id } });
    updateState((state) => {
      const nextProfiles = { ...(state.adminProfiles || {}) };
      delete nextProfiles[id];
      return {
        ...state,
        adminProfiles: nextProfiles,
      };
    });

    return sendSuccess(res, {
      message: "Admin deleted successfully",
      data: { id, deleted: true },
    });
  } catch (error) {
    console.error("Delete Admin Error:", error);
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
  updateAdminPermissions,
  deleteAdmin,
};
