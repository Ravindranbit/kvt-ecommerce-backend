const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'admin-state.json');

const defaultPermissions = {
  dashboard: true,
  products: true,
  orders: true,
  users: true,
  vendors: true,
  categories: true,
  banners: true,
  settings: true,
  profile: true,
};

const DEFAULT_STATE = {
  adminProfiles: {
    admin1: {
      phone: '+91 99999 00000',
      permissions: defaultPermissions,
      avatar: '',
    },
  },
  userOverrides: {},
  productAssignments: {},
  vendors: [
    { id: 'v1', name: 'Amit Kumar', email: 'amit@artisanthreads.com', storeName: 'Artisan Threadsco', storeDescription: 'Premium handcrafted fashion and accessories', status: 'approved', productsCount: 8, totalRevenue: 245000, commission: 10, joinedDate: '2026-01-20', phone: '+91 76543 21098' },
    { id: 'v2', name: 'Kavya Nair', email: 'kavya@urbansole.com', storeName: 'Urban Sole', storeDescription: 'Trendy footwear and lifestyle products', status: 'approved', productsCount: 8, totalRevenue: 189000, commission: 12, joinedDate: '2026-03-15', phone: '+91 21098 76543' },
    { id: 'v3', name: 'Vikram Singh', email: 'vikram@techgear.com', storeName: 'Tech Gear Hub', storeDescription: 'Latest electronics and gadgets', status: 'pending', productsCount: 0, totalRevenue: 0, commission: 10, joinedDate: '2026-04-01', phone: '+91 54321 09876' },
  ],
  banners: [
    { id: 'b1', title: 'Up to 60% Off', subtitle: 'Electronics & Gadgets', desc: 'Smartphones, laptops, headphones & more — top brands at unbeatable prices.', cta: 'Shop Electronics', href: '/?category=electronics', accent: '#00d4ff', image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&q=80', tag: '⚡ Best Deals', active: true },
    { id: 'b2', title: 'New Season', subtitle: 'Fashion Collection', desc: 'Discover our latest arrivals in premium fashion. Elevate your wardrobe today.', cta: 'Explore Fashion', href: '/?category=fashion', accent: '#ff6b6b', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80', tag: '🔥 Flash Sale', active: true },
    { id: 'b3', title: 'Transform Your', subtitle: 'Living Space', desc: 'Curated home decor and essentials at prices you\'ll love.', cta: 'Shop Home', href: '/?category=home', accent: '#fbbf24', image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&q=80', tag: '✨ Trending', active: true },
  ],
  settings: {
    siteName: 'KVT exports',
    tagline: 'Premium Export Quality Products',
    logoUrl: '',
    faviconUrl: '',
    defaultLanguage: 'en',
    defaultCurrency: 'USD',
    timeFormat: '12h',
    dateFormat: 'MM/DD/YYYY',
    storeEnabled: true,
    maintenanceMessage: 'We will be right back.',
    contactEmail: 'support@kvtexports.com',
    contactPhone: '+91 96 716 6879',
    whatsappNumber: '+91 96 716 6879',
    contactAddress: '8th floor, 379 Hudson St, New York, NY 10018',
    googleMapsLink: '',
    businessHours: 'Mon - Fri: 9AM - 6PM',
    supportUrl: 'https://help.kvtexports.com',
    liveChatEnabled: true,
    contactFormEmail: 'queries@kvtexports.com',
    multipleLocations: false,
    socialLinks: { facebook: '#', instagram: '#', twitter: '#' },
    metaTitle: 'KVT Exports - Premium Marketplace',
    metaDescription: 'Shop premium export-quality products at KVT Exports.',
    metaKeywords: 'export, premium, clothing, electronics',
    ogTitle: 'KVT Exports',
    ogDescription: 'Shop premium export-quality products.',
    ogImage: '',
    twitterCard: 'summary_large_image',
    sitemapEnabled: true,
    robotsTxt: 'User-agent: *\nAllow: /',
    canonicalUrl: 'https://kvtexports.com',
    googleAnalyticsId: 'G-XXXXXXXXXX',
    searchConsoleId: '',
    facebookPixelId: '',
    currency: '₹',
    currencyFormat: '₹ {amount}',
    globalCommission: 10,
    taxRate: 18,
    taxType: 'exclusive',
    multipleTaxRates: false,
    shippingZones: 'India, International',
    shippingMethods: 'Flat rate, Weight-based',
    shippingRate: 99,
    codCharges: 50,
    deliveryTimeEstimate: '3-5 Business Days',
    freeShippingThreshold: 2000,
    discountRules: 'None',
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: false,
    pushNotifications: true,
    adminAlerts: true,
    orderUpdates: true,
    emailTemplates: { orderPlaced: 'Default', orderShipped: 'Default', orderDelivered: 'Default' },
    notificationFrequency: 'instant',
    adminChannels: 'email',
    sessionTimeout: 24,
    require2FA: false,
    passwordRules: 'strong',
    loginAttemptLimit: 5,
    ipWhitelist: '',
    ipBlacklist: '',
    sessionDeviceManagement: true,
    passwordExpiryDays: 90,
    auditLogsEnabled: true,
    captchaEnabled: false,
    emailVerificationRequired: true,
    rbacEnabled: true,
    maintenanceMode: false,
    timezone: 'Asia/Kolkata',
    autoBackup: 'weekly',
    storageProvider: 'local',
    apiKeys: '',
    environmentMode: 'production',
    themeColor: '#e60000',
  },
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const readState = () => {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return deepClone(DEFAULT_STATE);
    }

    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    if (!raw.trim()) {
      return deepClone(DEFAULT_STATE);
    }

    const parsed = JSON.parse(raw);
    return {
      ...deepClone(DEFAULT_STATE),
      ...parsed,
      adminProfiles: { ...DEFAULT_STATE.adminProfiles, ...(parsed.adminProfiles || {}) },
      userOverrides: { ...(parsed.userOverrides || {}) },
      productAssignments: { ...(parsed.productAssignments || {}) },
      vendors: parsed.vendors || deepClone(DEFAULT_STATE.vendors),
      banners: parsed.banners || deepClone(DEFAULT_STATE.banners),
      settings: { ...deepClone(DEFAULT_STATE.settings), ...(parsed.settings || {}) },
    };
  } catch (error) {
    console.error('Failed to read admin state file:', error);
    return deepClone(DEFAULT_STATE);
  }
};

const writeState = (state) => {
  const nextState = {
    ...deepClone(DEFAULT_STATE),
    ...state,
    adminProfiles: state.adminProfiles || {},
    userOverrides: state.userOverrides || {},
    productAssignments: state.productAssignments || {},
    vendors: state.vendors || [],
    banners: state.banners || [],
    settings: { ...deepClone(DEFAULT_STATE.settings), ...(state.settings || {}) },
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(nextState, null, 2));
  return nextState;
};

const updateState = (updater) => {
  const current = readState();
  const next = typeof updater === 'function' ? updater(deepClone(current)) : updater;
  return writeState(next);
};

module.exports = {
  DEFAULT_STATE,
  defaultPermissions,
  readState,
  writeState,
  updateState,
};
