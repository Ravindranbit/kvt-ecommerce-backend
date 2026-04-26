const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/response");

const JWT_SECRET = process.env.JWT_SECRET;

const requireAuth = (req, res, next) => {
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
