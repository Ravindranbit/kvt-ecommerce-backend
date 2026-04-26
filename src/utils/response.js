const sendSuccess = (res, { status = 200, data = null, message } = {}) => {
  const payload = {
    success: true,
    data,
  };

  if (message) {
    payload.message = message;
  }

  return res.status(status).json(payload);
};

const sendError = (res, { status = 500, message = "Internal server error", ...rest } = {}) => {
  return res.status(status).json({
    success: false,
    message,
    ...rest,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
