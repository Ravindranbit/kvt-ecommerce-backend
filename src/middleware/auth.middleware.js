const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const { sendError } = require("../utils/response");

const JWT_SECRET = process.env.JWT_SECRET;

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Token must be in format: Bearer <token>
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, {
      status: 401,
      message: "Authentication required",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type === "USER") {
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return sendError(res, {
          status: 403,
          message: "User account is inactive",
        });
      }
    }

    if (decoded.type === "ADMIN") {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.sub },
        select: { id: true, isActive: true },
      });

      if (!admin || !admin.isActive) {
        return sendError(res, {
          status: 403,
          message: "Admin account is inactive",
        });
      }
    }

    req.user = decoded; // attach decoded token to request
    next();
  } catch (error) {
    return sendError(res, {
      status: 401,
      message: "Invalid or expired token",
    });
  }
};

module.exports = requireAuth;
