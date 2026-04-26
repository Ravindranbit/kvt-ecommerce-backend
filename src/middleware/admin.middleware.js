const requireAuth = require("./auth.middleware");
const { sendError } = require("../utils/response");

const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user.type !== "ADMIN") {
      return sendError(res, {
        status: 403,
        message: "Admin access only",
      });
    }
    next();
  });
};

module.exports = requireAdmin;
