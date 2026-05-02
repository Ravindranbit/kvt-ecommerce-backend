const requireAuth = require("./auth.middleware");
const { sendError } = require("../utils/response");

const requireSeller = (req, res, next) => {
  requireAuth(req, res, () => {
    // Check if user is SELLER or ADMIN (Admins can also manage products)
    if (req.user.role !== "SELLER" && req.user.type !== "ADMIN") {
      return sendError(res, {
        status: 403,
        message: "Seller access only",
      });
    }
    next();
  });
};

module.exports = requireSeller;
