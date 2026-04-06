const prisma = require("../../config/db");

const getUserIdFromRequest = (req) => {
  return req.user?.id || req.user?.sub || null;
};

const addToCart = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { productId, quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid productId and quantity > 0 are required",
      });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
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

    return res.status(200).json({ success: true, data: updatedCart });
  } catch (error) {
    console.error("Add To Cart Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { productId, quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!productId || !Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid productId and quantity >= 0 are required",
      });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!cart) {
      return res.status(200).json({ success: true, message: "Cart not found" });
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

      return res.status(200).json({ success: true, data: updatedCartAfterDelete });
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

    if (updatedItem.count === 0) {
      return res.status(200).json({ success: true, message: "Cart item not found" });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: { product: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return res.status(200).json({ success: true, data: updatedCart });
  } catch (error) {
    console.error("Update Cart Item Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const removeCartItem = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!productId) {
      return res.status(400).json({ success: false, message: "productId is required" });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!cart) {
      return res.status(200).json({ success: true, message: "Cart not found" });
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

    return res.status(200).json({ success: true, data: updatedCart });
  } catch (error) {
    console.error("Remove Cart Item Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getCart = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
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

    return res.status(200).json({
      success: true,
      data: cart || { items: [] },
    });
  } catch (error) {
    console.error("Get Cart Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  addToCart,
  updateCartItem,
  removeCartItem,
  getCart,
};
