const express = require('express');
const router = express.Router();

const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { tenantGuard } = require('../middleware/tenantGuard');
const { globalLimiter, authLimiter, orderLimiter } = require('../middleware/rateLimiter');

const AuthController = require('../controllers/authController');
const SuperAdminController = require('../controllers/superAdminController');
const StaffController = require('../controllers/staffController');
const MenuController = require('../controllers/menuController');
const OrderController = require('../controllers/orderController');
const SalesController = require('../controllers/salesController');
const UploadController = require('../controllers/uploadController');
const RestaurantController = require('../controllers/restaurantController');
const QRController = require('../controllers/qrController');
const WaiterSessionController = require('../controllers/waiterSessionController');
const WaiterCallController = require('../controllers/waiterCallController');

// ─── Waiter Table Session Routes ───
router.post('/waiter/sessions/start', authenticate, authorize('waiter', 'admin', 'sales_staff'), WaiterSessionController.startSession);
router.get('/waiter/sessions/active', optionalAuthenticate, WaiterSessionController.getActiveSessions);
router.post('/waiter/sessions/end', authenticate, authorize('waiter', 'admin', 'sales_staff'), WaiterSessionController.endSession);

// ─── Waiter Call Notification Routes ───
router.post('/orders/call-waiter', orderLimiter, WaiterCallController.callWaiter);
router.get('/waiter/calls/active', authenticate, authorize('waiter', 'admin', 'sales_staff'), tenantGuard, WaiterCallController.getActiveCalls);
router.post('/waiter/calls/:id/acknowledge', authenticate, authorize('waiter', 'admin', 'sales_staff'), tenantGuard, WaiterCallController.acknowledgeCall);
router.post('/waiter/calls/:id/dismiss', authenticate, authorize('waiter', 'admin', 'sales_staff'), tenantGuard, WaiterCallController.dismissCall);

// Validation schemas
const { adminLoginSchema, adminSignupSchema, staffLoginSchema, staffRefreshSchema, forgotPasswordSchema, registerTrialSchema } = require('../validators/auth.schemas');
const { createOrderSchema, updateOrderStatusSchema, completePaySchema, updateOrderItemsSchema } = require('../validators/order.schemas');
const { createMenuItemSchema, updateMenuItemSchema } = require('../validators/menu.schemas');
const { createStaffSchema, updateStaffSchema } = require('../validators/staff.schemas');
const { updateSettingsSchema } = require('../validators/restaurant.schemas');
const { createRestaurantSchema, updateRestaurantSchema } = require('../validators/superAdmin.schemas');

// ─── Secure QR & Random Table Code Routes ───
router.get('/qr/generate', QRController.generateToken);
router.get('/qr/tables', QRController.getAllTables);
router.post('/qr/verify', QRController.verifyQRToken);
router.get('/tables/resolve', QRController.verifyQRToken);
router.post('/qr/regenerate', authenticate, authorize('admin'), tenantGuard, QRController.regenerateCode);

// ─── Restaurant Settings Routes ───
router.get('/restaurants/public/:slug', RestaurantController.getPublicDetails);
router.get('/restaurants/settings', authenticate, authorize('admin', 'sales_staff', 'waiter', 'kitchen_staff'), tenantGuard, RestaurantController.getSettings);
router.put('/restaurants/settings', authenticate, authorize('admin'), tenantGuard, validate(updateSettingsSchema), RestaurantController.updateSettings);

// ─── Auth Routes (Public) ───
router.post('/auth/admin/login', authLimiter, validate(adminLoginSchema), AuthController.adminLogin);
router.post('/auth/admin/signup', authLimiter, validate(adminSignupSchema), AuthController.adminSignup);
router.post('/auth/admin/register-trial', authLimiter, validate(registerTrialSchema), AuthController.registerRestaurantTrial);
router.post('/auth/admin/forgot-password', authLimiter, validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/auth/admin/reset-password-otp', authLimiter, AuthController.resetPasswordOtp);
router.post('/auth/staff/login', authLimiter, validate(staffLoginSchema), AuthController.staffLogin);
router.post('/auth/staff/refresh', authLimiter, validate(staffRefreshSchema), AuthController.staffRefresh);
router.get('/auth/me', authenticate, AuthController.getMe);

// ─── Super Admin Routes (Google OAuth protected) ───
router.get('/super/restaurants', authenticate, authorize('super_admin'), SuperAdminController.getAllRestaurants);
router.post('/super/restaurants', authenticate, authorize('super_admin'), validate(createRestaurantSchema), SuperAdminController.createRestaurant);
router.patch('/super/restaurants/:id', authenticate, authorize('super_admin'), validate(updateRestaurantSchema), SuperAdminController.updateRestaurant);
router.delete('/super/restaurants/:id', authenticate, authorize('super_admin'), SuperAdminController.deleteRestaurant);
router.get('/super/trial-history', authenticate, authorize('super_admin'), SuperAdminController.getTrialHistory);
router.patch('/super/restaurants/:id/trial/extend', authenticate, authorize('super_admin'), SuperAdminController.extendTrial);
router.patch('/super/restaurants/:id/trial/end', authenticate, authorize('super_admin'), SuperAdminController.endTrial);
router.patch('/super/restaurants/:id/trial/convert', authenticate, authorize('super_admin'), SuperAdminController.convertTrialToPaid);

// ─── Staff Management Routes (Admin protected) ───
router.get('/staff', authenticate, authorize('admin', 'sales_staff'), tenantGuard, StaffController.getAll);
router.post('/staff', authenticate, authorize('admin'), tenantGuard, validate(createStaffSchema), StaffController.create);
router.patch('/staff/:id', authenticate, authorize('admin'), tenantGuard, validate(updateStaffSchema), StaffController.update);
router.delete('/staff/:id', authenticate, authorize('admin'), tenantGuard, StaffController.delete);

// ─── Menu Routes ───
router.get('/menu/public/:slug', MenuController.getPublicMenu);
router.get('/menu', optionalAuthenticate, MenuController.getMenu);
router.get('/menu/:id', optionalAuthenticate, MenuController.getMenuItem);
router.post('/menu', authenticate, authorize('admin'), tenantGuard, validate(createMenuItemSchema), MenuController.createMenuItem);
router.put('/menu/:id', authenticate, authorize('admin'), tenantGuard, validate(updateMenuItemSchema), MenuController.updateMenuItem);
router.delete('/menu/:id', authenticate, authorize('admin'), tenantGuard, MenuController.deleteMenuItem);

// ─── Order Routes ───
router.post('/orders', orderLimiter, validate(createOrderSchema), OrderController.createOrder);
router.get('/orders', authenticate, authorize('admin', 'kitchen_staff', 'sales_staff', 'waiter'), tenantGuard, OrderController.getAllOrders);
router.get('/orders/active', authenticate, authorize('admin', 'kitchen_staff', 'sales_staff', 'waiter'), tenantGuard, OrderController.getActiveOrders);
// Public order tracking for customers (no auth required — scoped by restaurant slug query param)
router.get('/orders/track/:id', OrderController.trackOrder);
router.get('/orders/table-status/:table', OrderController.checkTableStatus);
router.get('/orders/:id', authenticate, authorize('admin', 'kitchen_staff', 'sales_staff', 'waiter'), tenantGuard, OrderController.getOrderById);
router.patch('/orders/:id/status', authenticate, authorize('admin', 'kitchen_staff', 'sales_staff', 'waiter'), tenantGuard, validate(updateOrderStatusSchema), OrderController.updateOrderStatus);
router.post('/orders/:id/pay', authenticate, authorize('admin', 'kitchen_staff', 'sales_staff', 'waiter'), tenantGuard, validate(completePaySchema), OrderController.completeAndPayOrder);
router.put('/orders/:id', authenticate, authorize('admin', 'kitchen_staff', 'sales_staff'), tenantGuard, validate(updateOrderItemsSchema), OrderController.updateOrderItems);

// ─── Sales Routes ───
router.get('/sales/summary', authenticate, authorize('admin', 'sales_staff'), tenantGuard, SalesController.getSalesSummary);

// ─── Upload Route (Admin only) ───
router.post('/upload', authenticate, authorize('admin'), tenantGuard, UploadController.getMiddleware(), UploadController.uploadImage);

module.exports = router;
