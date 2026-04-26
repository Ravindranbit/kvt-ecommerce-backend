const { sendError } = require("../utils/response");

const errorHandler = (err, req, res, next) => {
  console.error(err);

  return sendError(res, {
    status: err.status || 500,
    message: err.message || "Internal Server Error",
  });
};

module.exports = {
  errorHandler,
};
