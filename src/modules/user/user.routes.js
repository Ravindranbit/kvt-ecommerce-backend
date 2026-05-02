const express = require('express');
const requireAuth = require('../../middleware/auth.middleware');

const {
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
} = require('./user.controller');

const router = express.Router();

router.get('/me/profile', requireAuth, getMyProfile);
router.patch('/me/profile', requireAuth, updateMyProfile);
router.patch('/me/deactivate', requireAuth, deactivateMyAccount);
router.delete('/me', requireAuth, deactivateMyAccount);

router.get('/me/addresses', requireAuth, getAddresses);
router.post('/me/addresses', requireAuth, addAddress);
router.patch('/me/addresses/:addressId', requireAuth, updateAddress);
router.delete('/me/addresses/:addressId', requireAuth, deleteAddress);

router.get('/me/payment-methods', requireAuth, getPaymentMethods);
router.post('/me/payment-methods', requireAuth, addPaymentMethod);
router.patch('/me/payment-methods/:methodId', requireAuth, updatePaymentMethod);
router.delete('/me/payment-methods/:methodId', requireAuth, deletePaymentMethod);

router.get('/me/wishlist', requireAuth, getWishlist);
router.post('/me/wishlist/:productId', requireAuth, addToWishlist);
router.delete('/me/wishlist/:productId', requireAuth, removeFromWishlist);

module.exports = router;
