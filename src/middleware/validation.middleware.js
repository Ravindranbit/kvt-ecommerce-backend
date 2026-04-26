const { ZodError } = require("zod");
const { sendError } = require("../utils/response");

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return sendError(res, {
        status: 400,
        message: "Validation failed",
        errors: error.issues || error.errors,
      });
    }
    next(error);
  }
};

module.exports = {
  validate,
};
