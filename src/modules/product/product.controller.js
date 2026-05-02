const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response");
const { readState, updateState } = require("./product.review.storage");

const toReviewPayload = (review, userName) => ({
  id: review.id,
  userId: review.userId,
  userName,
  rating: review.rating,
  comment: review.comment,
  date: new Date(review.createdAt).toISOString().split('T')[0],
});

const getProductReviews = (productId) => {
  const state = readState();
  return state.reviewsByProduct?.[productId] || [];
};

const getProductSummary = (productId) => {
  const reviews = getProductReviews(productId);
  const reviewCount = reviews.length;
  const rating = reviewCount
    ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1))
    : 0;

  return { reviews, reviewCount, rating };
};

const attachReviewSummary = (product) => {
  const summary = getProductSummary(product.id);
  return {
    ...product,
    rating: summary.rating,
    reviews: summary.reviewCount,
    feedbacks: summary.reviews.map((review) => ({
      id: review.id,
      userName: review.userName,
      rating: review.rating,
      comment: review.comment,
      date: new Date(review.createdAt).toISOString().split('T')[0],
    })),
  };
};

/**
 * CREATE PRODUCT (Admin or Vendor)
 */
const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, imageUrl, images, categoryId, vendorId: bodyVendorId } = req.body;
    
    // Determine vendorId based on user role
    const vendorId = req.user.type === "ADMIN" ? (bodyVendorId || null) : req.user.sub;

    if (!name || !description || !price || stock == null || !categoryId) {
      return sendError(res, {
        status: 400,
        message: "Name, description, price, stock and categoryId are required",
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock, 10),
        imageUrl,
        images: images || [],
        categoryId,
        vendorId,
      },
    });

    return sendSuccess(res, {
      status: 201,
      message: "Product created successfully",
      data: attachReviewSummary(product),
    });
  } catch (error) {
    console.error("Create Product Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    
    // Ensure numeric types
    if (updates.price) updates.price = parseFloat(updates.price);
    if (updates.stock) updates.stock = parseInt(updates.stock, 10);
    if (updates.images && !Array.isArray(updates.images)) updates.images = [updates.images];

    const product = await prisma.product.update({
      where: { id },
      data: updates,
    });

    return sendSuccess(res, {
      message: "Product updated successfully",
      data: attachReviewSummary(product),
    });
  } catch (error) {
    console.error("Update Product Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // We use deleteMany to avoid errors if product doesn't exist
    // and to handle potential constraints if needed, though findUnique + delete is safer for feedback
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return sendError(res, { status: 404, message: "Product not found" });
    }

    await prisma.product.delete({
      where: { id },
    });

    return sendSuccess(res, {
      message: "Product deleted permanently from database",
      data: { id },
    });
  } catch (error) {
    console.error("Delete Product Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error - check if product is linked to existing orders",
    });
  }
};

const listProducts = async (req, res) => {
  try {
    const { search, vendorId, categoryId } = req.query;

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        name: search ? { contains: search, mode: "insensitive" } : undefined,
        vendorId: vendorId || undefined,
        categoryId: categoryId || undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return sendSuccess(res, {
      data: products.map(attachReviewSummary),
    });
  } catch (error) {
    console.error("List Products Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product || !product.isActive) {
      return sendError(res, {
        status: 404,
        message: "Product not found",
      });
    }

    return sendSuccess(res, {
      data: attachReviewSummary(product),
    });
  } catch (error) {
    console.error("Get Product Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const getProductReviewsList = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return sendError(res, {
        status: 404,
        message: "Product not found",
      });
    }

    const state = readState();
    const reviews = state.reviewsByProduct?.[id] || [];
    const payload = reviews.map((review) => toReviewPayload(review, review.userName));

    return sendSuccess(res, {
      data: payload,
    });
  } catch (error) {
    console.error("Get Product Reviews Error:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error",
    });
  }
};

const addProductReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || !comment || !comment.trim()) {
      return sendError(res, {
        status: 400,
        message: "Rating and comment are required",
      });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return sendError(res, {
        status: 404,
        message: "Product not found",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, name: true },
    });

    if (!user) {
      return sendError(res, {
        status: 404,
        message: "User not found",
      });
    }

    const review = {
      id: `rev_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    updateState((state) => {
      const reviews = state.reviewsByProduct?.[id] || [];
      return {
        ...state,
        reviewsByProduct: {
          ...(state.reviewsByProduct || {}),
          [id]: [...reviews, review],
        },
      };
    });

    return sendSuccess(res, {
      status: 201,
      message: 'Review added successfully',
      data: toReviewPayload(review, review.userName),
    });
  } catch (error) {
    console.error('Add Product Review Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const updateProductReview = async (req, res) => {
  try {
    const { id, reviewId } = req.params;
    const { rating, comment } = req.body;

    updateState((state) => {
      const reviews = state.reviewsByProduct?.[id] || [];
      const nextReviews = reviews.map((review) => {
        if (review.id !== reviewId || review.userId !== req.user.sub) {
          return review;
        }

        return {
          ...review,
          rating: typeof rating === 'number' ? rating : review.rating,
          comment: typeof comment === 'string' ? comment.trim() : review.comment,
        };
      });

      return {
        ...state,
        reviewsByProduct: {
          ...(state.reviewsByProduct || {}),
          [id]: nextReviews,
        },
      };
    });

    return sendSuccess(res, {
      message: 'Review updated successfully',
      data: { id: reviewId, updated: true },
    });
  } catch (error) {
    console.error('Update Product Review Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const deleteProductReview = async (req, res) => {
  try {
    const { id, reviewId } = req.params;

    updateState((state) => {
      const reviews = state.reviewsByProduct?.[id] || [];
      return {
        ...state,
        reviewsByProduct: {
          ...(state.reviewsByProduct || {}),
          [id]: reviews.filter((review) => review.id !== reviewId || review.userId !== req.user.sub),
        },
      };
    });

    return sendSuccess(res, {
      message: 'Review deleted successfully',
      data: { id: reviewId, deleted: true },
    });
  } catch (error) {
    console.error('Delete Product Review Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  listProducts,
  getProductById,
  getProductReviewsList,
  addProductReview,
  updateProductReview,
  deleteProductReview,
};
