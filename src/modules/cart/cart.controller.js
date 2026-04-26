const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response");

const getUserIdFromRequest = (req) => {
  return req.user?.id || req.user?.sub || null;
};

const addToCart = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { productId, quantity } = req.body;

    if (!userId) {
      return sendError(res, { status: 401, message: "Authentication required" });
    }

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      return sendError(res, {
        status: 400,
        message: "Valid productId and quantity > 0 are required",
      });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true, price: true },
    });

    if (!product) {
      return sendError(res, { status: 404, message: "Product not found" });
    }

    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { id: true },
    });

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      select: { id: true },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
        data: {
          quantity: {
            increment: quantity,
          },
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          price: product.price,
          quantity,
        },
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return sendSuccess(res, { data: updatedCart });
  } catch (error) {
    console.error("Add To Cart Error:", error);
    return sendError(res, { status: 500, message: "Internal server error" });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { productId, quantity } = req.body;

    if (!userId) {
      return sendError(res, { status: 401, message: "Authentication required" });
    }

    if (!productId || !Number.isInteger(quantity) || quantity < 0) {
      return sendError(res, {
        status: 400,
        message: "Valid productId and quantity >= 0 are required",
      });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!cart) {
      return sendSuccess(res, {
        data: { items: [] },
        message: "Cart not found",
      });
    }

    if (quantity === 0) {
      await prisma.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          productId,
        },
      });

      const updatedCartAfterDelete = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: {
          items: {
            include: { product: true },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      return sendSuccess(res, { data: updatedCartAfterDelete });
    }

    const updatedItem = await prisma.cartItem.updateMany({
      where: {
        cartId: cart.id,
        productId,
      },
      data: {
        quantity,
      },
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: { product: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (updatedItem.count === 0) {
      return sendSuccess(res, {
        data: updatedCart,
        message: "Cart item not found",
      });
    }

    return sendSuccess(res, { data: updatedCart });
  } catch (error) {
    console.error("Update Cart Item Error:", error);
    return sendError(res, { status: 500, message: "Internal server error" });
  }
};

const removeCartItem = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { productId } = req.params;

    if (!userId) {
      return sendError(res, { status: 401, message: "Authentication required" });
    }

    if (!productId) {
      return sendError(res, { status: 400, message: "productId is required" });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!cart) {
      return sendSuccess(res, {
        data: { items: [] },
        message: "Cart not found",
      });
    }

    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: { product: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return sendSuccess(res, { data: updatedCart });
  } catch (error) {
    console.error("Remove Cart Item Error:", error);
    return sendError(res, { status: 500, message: "Internal server error" });
  }
};

const getCart = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return sendError(res, { status: 401, message: "Authentication required" });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return sendSuccess(res, {
      data: cart || { items: [] },
    });
  } catch (error) {
    console.error("Get Cart Error:", error);
    return sendError(res, { status: 500, message: "Internal server error" });
  }
};

module.exports = {
  addToCart,
  updateCartItem,
  removeCartItem,
  getCart,
};
