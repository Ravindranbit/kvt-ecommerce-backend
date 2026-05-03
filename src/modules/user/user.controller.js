const prisma = require('../../config/db');
const { sendSuccess, sendError } = require('../../utils/response');
const { readState, updateState } = require('./user.storage');

const formatDate = (value) => {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
};

const getProductBasics = async (productId) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      price: true,
      imageUrl: true,
      stock: true,
      categoryId: true,
      isActive: true,
    },
  });

  return product
    ? {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || '',
        stock: product.stock,
        categoryId: product.categoryId,
        isActive: product.isActive,
      }
    : null;
};

const getMyProfile = async (req, res) => {
  try {
    const { sub, type } = req.user;

    if (type === 'ADMIN') {
      const admin = await prisma.admin.findUnique({
        where: { id: sub },
      });

      if (!admin) {
        return sendError(res, {
          status: 404,
          message: 'Admin not found',
        });
      }

      const adminState = require('../admin/admin.storage').readState();
      const profile = adminState.adminProfiles?.[admin.id] || {};

      return sendSuccess(res, {
        data: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          phone: profile.phone || '',
          role: admin.role,
          avatar: profile.avatar || '',
          joinedDate: formatDate(admin.createdAt),
          type: 'ADMIN',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isPhoneVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return sendError(res, {
        status: 404,
        message: 'User not found',
      });
    }

    const state = readState();
    const profile = state.profiles?.[user.id] || {};
    const addresses = state.addresses?.[user.id] || [];
    const paymentMethods = state.paymentMethods?.[user.id] || [];
    const wishlistCount = await prisma.wishlist.count({
      where: { userId: user.id },
    });

    return sendSuccess(res, {
      data: {
        ...user,
        avatar: profile.avatar || '',
        joinedDate: formatDate(user.createdAt),
        addressesCount: addresses.length,
        paymentMethodsCount: paymentMethods.length,
        wishlistCount,
        type: 'USER',
      },
    });
  } catch (error) {
    console.error('Get My Profile Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const { sub, type } = req.user;
    const { name, email, phone, avatar } = req.body;

    if (type === 'ADMIN') {
      const admin = await prisma.admin.findUnique({ where: { id: sub } });

      if (!admin) {
        return sendError(res, {
          status: 404,
          message: 'Admin not found',
        });
      }

      const updatedAdmin = await prisma.admin.update({
        where: { id: sub },
        data: {
          name: name || admin.name,
          email: email || admin.email,
        },
      });

      const adminStorage = require('../admin/admin.storage');
      adminStorage.updateState((state) => ({
        ...state,
        adminProfiles: {
          ...(state.adminProfiles || {}),
          [sub]: {
            ...(state.adminProfiles?.[sub] || {}),
            phone: phone !== undefined ? phone : state.adminProfiles?.[sub]?.phone || '',
            avatar: avatar !== undefined ? avatar : state.adminProfiles?.[sub]?.avatar || '',
          },
        },
      }));

      const profile = adminStorage.readState().adminProfiles?.[sub] || {};

      return sendSuccess(res, {
        message: 'Admin profile updated successfully',
        data: {
          id: updatedAdmin.id,
          name: updatedAdmin.name,
          email: updatedAdmin.email,
          phone: profile.phone || '',
          role: updatedAdmin.role,
          avatar: profile.avatar || '',
          joinedDate: formatDate(updatedAdmin.createdAt),
          type: 'ADMIN',
        },
      });
    }

    const user = await prisma.user.findUnique({ where: { id: sub } });

    if (!user) {
      return sendError(res, {
        status: 404,
        message: 'User not found',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isPhoneVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    updateState((state) => ({
      ...state,
      profiles: {
        ...(state.profiles || {}),
        [user.id]: {
          ...(state.profiles?.[user.id] || {}),
          avatar: avatar !== undefined ? avatar : state.profiles?.[user.id]?.avatar || '',
        },
      },
    }));

    return sendSuccess(res, {
      message: 'Profile updated successfully',
      data: {
        ...updatedUser,
        avatar: avatar || readState().profiles?.[user.id]?.avatar || '',
        joinedDate: formatDate(updatedUser.createdAt),
        type: 'USER',
      },
    });
  } catch (error) {
    console.error('Update My Profile Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const deactivateMyAccount = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, isActive: true },
    });

    if (!user) {
      return sendError(res, {
        status: 404,
        message: 'User not found',
      });
    }

    if (!user.isActive) {
      return sendSuccess(res, {
        message: 'Account already deactivated',
        data: { id: user.id, deactivated: true },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    return sendSuccess(res, {
      message: 'Account deactivated successfully',
      data: { id: user.id, deactivated: true },
    });
  } catch (error) {
    console.error('Deactivate My Account Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const getAddresses = async (req, res) => {
  try {
    const state = readState();
    return sendSuccess(res, {
      data: state.addresses?.[req.user.sub] || [],
    });
  } catch (error) {
    console.error('Get Addresses Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const addAddress = async (req, res) => {
  try {
    const { label, name = '', line1, line2 = '', city, zip, country, phone = '', isDefault = false } = req.body;

    if (!label || !line1 || !city || !zip || !country) {
      return sendError(res, {
        status: 400,
        message: 'Label, street, city, zip and country are required',
      });
    }

    const address = {
      id: `addr_${Date.now()}`,
      label,
      name,
      line1,
      line2,
      city,
      zip,
      country,
      phone,
      isDefault,
    };

    updateState((state) => {
      const addresses = state.addresses || {};
      const current = addresses[req.user.sub] || [];
      const next = isDefault ? current.map((item) => ({ ...item, isDefault: false })) : current;

      return {
        ...state,
        addresses: {
          ...addresses,
          [req.user.sub]: [...next, address],
        },
      };
    });

    return sendSuccess(res, {
      status: 201,
      message: 'Address added successfully',
      data: address,
    });
  } catch (error) {
    console.error('Add Address Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const updates = req.body || {};
    let updatedAddress = null;

    updateState((state) => {
      const current = state.addresses?.[req.user.sub] || [];
      const addresses = current.map((item) => {
        if (item.id !== addressId) {
          return item;
        }

        updatedAddress = { ...item, ...updates };
        return updatedAddress;
      });

      if (updates.isDefault) {
        return {
          ...state,
          addresses: {
            ...(state.addresses || {}),
            [req.user.sub]: addresses.map((item) => ({
              ...item,
              isDefault: item.id === addressId,
            })),
          },
        };
      }

      return {
        ...state,
        addresses: {
          ...(state.addresses || {}),
          [req.user.sub]: addresses,
        },
      };
    });

    if (!updatedAddress) {
      return sendError(res, {
        status: 404,
        message: 'Address not found',
      });
    }

    return sendSuccess(res, {
      message: 'Address updated successfully',
      data: updatedAddress,
    });
  } catch (error) {
    console.error('Update Address Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    updateState((state) => {
      const current = state.addresses?.[req.user.sub] || [];
      return {
        ...state,
        addresses: {
          ...(state.addresses || {}),
          [req.user.sub]: current.filter((item) => item.id !== addressId),
        },
      };
    });

    return sendSuccess(res, {
      message: 'Address deleted successfully',
      data: { id: addressId, deleted: true },
    });
  } catch (error) {
    console.error('Delete Address Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const getPaymentMethods = async (req, res) => {
  try {
    const state = readState();
    return sendSuccess(res, {
      data: state.paymentMethods?.[req.user.sub] || [],
    });
  } catch (error) {
    console.error('Get Payment Methods Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const addPaymentMethod = async (req, res) => {
  try {
    const { brand, last4, expiry, isPrimary = false } = req.body;

    if (!brand || !last4 || !expiry) {
      return sendError(res, {
        status: 400,
        message: 'Brand, last4 and expiry are required',
      });
    }

    const paymentMethod = {
      id: `card_${Date.now()}`,
      brand,
      last4,
      expiry,
      isPrimary,
    };

    updateState((state) => {
      const current = state.paymentMethods?.[req.user.sub] || [];
      const next = isPrimary ? current.map((item) => ({ ...item, isPrimary: false })) : current;

      return {
        ...state,
        paymentMethods: {
          ...(state.paymentMethods || {}),
          [req.user.sub]: [...next, paymentMethod],
        },
      };
    });

    return sendSuccess(res, {
      status: 201,
      message: 'Payment method added successfully',
      data: paymentMethod,
    });
  } catch (error) {
    console.error('Add Payment Method Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const updatePaymentMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    const updates = req.body || {};
    let updatedMethod = null;

    updateState((state) => {
      const current = state.paymentMethods?.[req.user.sub] || [];
      const methods = current.map((item) => {
        if (item.id !== methodId) {
          return item;
        }

        updatedMethod = { ...item, ...updates };
        return updatedMethod;
      });

      if (updates.isPrimary) {
        return {
          ...state,
          paymentMethods: {
            ...(state.paymentMethods || {}),
            [req.user.sub]: methods.map((item) => ({
              ...item,
              isPrimary: item.id === methodId,
            })),
          },
        };
      }

      return {
        ...state,
        paymentMethods: {
          ...(state.paymentMethods || {}),
          [req.user.sub]: methods,
        },
      };
    });

    if (!updatedMethod) {
      return sendError(res, {
        status: 404,
        message: 'Payment method not found',
      });
    }

    return sendSuccess(res, {
      message: 'Payment method updated successfully',
      data: updatedMethod,
    });
  } catch (error) {
    console.error('Update Payment Method Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const deletePaymentMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    updateState((state) => {
      const current = state.paymentMethods?.[req.user.sub] || [];
      return {
        ...state,
        paymentMethods: {
          ...(state.paymentMethods || {}),
          [req.user.sub]: current.filter((item) => item.id !== methodId),
        },
      };
    });

    return sendSuccess(res, {
      message: 'Payment method deleted successfully',
      data: { id: methodId, deleted: true },
    });
  } catch (error) {
    console.error('Delete Payment Method Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const getWishlist = async (req, res) => {
  try {
    const wishlistItems = await prisma.wishlist.findMany({
      where: { userId: req.user.sub },
      select: {
        productId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const products = await Promise.all(
      wishlistItems.map((item) => getProductBasics(item.productId))
    );

    return sendSuccess(res, {
      data: products.filter(Boolean),
    });
  } catch (error) {
    console.error('Get Wishlist Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return sendError(res, {
        status: 404,
        message: 'Product not found',
      });
    }

    const existingWishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: req.user.sub,
          productId,
        },
      },
    });

    if (!existingWishlistItem) {
      await prisma.wishlist.create({
        data: {
          userId: req.user.sub,
          productId,
        },
      });
    }

    return sendSuccess(res, {
      status: 201,
      message: 'Product added to wishlist',
      data: { productId },
    });
  } catch (error) {
    console.error('Add Wishlist Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    await prisma.wishlist.deleteMany({
      where: {
        userId: req.user.sub,
        productId,
      },
    });

    return sendSuccess(res, {
      message: 'Product removed from wishlist',
      data: { productId, removed: true },
    });
  } catch (error) {
    console.error('Remove Wishlist Error:', error);
    return sendError(res, {
      status: 500,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  deactivateMyAccount,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
