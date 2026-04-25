const { z } = require("zod");

const addToCartSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  }),
});

const updateCartSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().nonnegative(),
  }),
});

module.exports = {
  addToCartSchema,
  updateCartSchema,
};
