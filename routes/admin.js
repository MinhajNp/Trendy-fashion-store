const express = require("express");
const router = express.Router();

const admin = require('../controller/adminController');
const auth = require("../middleware/adminAuth");




//admin route-----------------------------------------------------------------------------------------------------
router.get('/adminLogin', auth.isLogout, admin.adminLogin)
router.post('/adminLogin', admin.verifyAdminLogin)

//------------------------------------------------admin home page------------------------------------------------
router.get('/adminPanel', auth.isLogin, admin.adminHome)
router.get('/salesReportPage',admin.salesReportPage)
router.get('/pdf', admin.downloadPdf)                               //admin home page


//------------------------------------------------admin user management------------------------------------------------
router.get('/users', auth.isLogin, admin.userDetails);
router.post('/users/block', auth.isLogin, admin.userBlock);

//------------------------------------------------admin Category management------------------------------------------------
router.get('/adminCategory', auth.isLogin, admin.getCategory)
router.post('/adminCategory', auth.isLogin, admin.addCategory)
router.post('/editCategory', auth.isLogin, admin.editCategory)
router.post('/deleteCategory', auth.isLogin, admin.deleteCategory)


//------------------------------------------------admin Product management------------------------------------------------
router.get('/adminProducts', auth.isLogin, admin.getProducts)
router.post('/adminAddProduct', auth.isLogin, admin.upload, admin.addProducts)
router.post('/listProduct', auth.isLogin, admin.listProduct)
router.post('/editProduct', auth.isLogin, admin.upload, admin.editProduct)
router.delete('/removeImage', auth.isLogin, admin.removeImage)
router.delete('/removeMainImage', auth.isLogin, admin.removeMainImage)

// ---------------------------------------------admin Order Management----------------------------------------------
router.get('/adminOrders', auth.isLogin, admin.getOrderManagement)
router.get('/orderDetails', auth.isLogin, admin.getOrderDetails)
router.post('/cancelOrderAdmin', auth.isLogin, admin.cancelOrder)
router.post('/updateOrderStatus', auth.isLogin, admin.updateOrderStatus)
router.post('/adminReturnOrder', auth.isLogin, admin.returnOrder)
router.post('/rejectReturnOrder', auth.isLogin, admin.rejectReturn)

// -----------------------------------------------admin Coupon Management-----------------------------------------------
router.get('/adminCoupon', auth.isLogin, admin.getCoupon)
router.post('/adminCoupon', auth.isLogin, admin.postCoupon)
router.post('/deleteCoupon', auth.isLogin, admin.deleteCoupon)
router.post('/editCoupon', auth.isLogin, admin.editCoupon)

//------------------------------------------------admin Logout------------------------------------------------
router.get('/adminLogout', auth.isLogin, admin.adminLogout)                              //Logout


module.exports = router