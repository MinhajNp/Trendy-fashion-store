const express = require("express");
const router = express.Router();
const user = require("../controller/userController")
const userAuth = require("../middleware/userAuth");
const path = require("path");
const passport = require('passport');

router.use(express.static(path.join(__dirname, 'public')));


//------------------------------------------------Google SignIn OAuth Routes------------------------------------------------
router.get('/auth/google', userAuth.isLogout, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', userAuth.isLogout,
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    req.session.user_id = req.user._id;
    res.redirect('/');
  }
);


//------------------------------------------------register route------------------------------------------------
router.get('/signup', user.getSignup)                           //registion page
router.post('/signup', user.postSignup)
router.get('/resendOtp', user.resendOtp)
router.post('/otpVerification', user.postOTP)


//------------------------------------------------login route------------------------------------------------
router.get('/login', userAuth.isLogout, user.login)                                 //login page
router.post('/login', user.verifyLogin)

//-----------------------------------------------forget password------------------------------------------------
router.get('/forgetPassword', userAuth.isLogout, user.forgetPassword)
router.post('/forgetPassword', userAuth.isLogout, user.forgetPasswordPost)
router.post('/forgetPasswordOTP', userAuth.isLogout, user.forgetPasswordOTP)
router.post('/forgetPasswordReset', userAuth.isLogout, user.forgetPasswordReset)

//------------------------------------------------login Home------------------------------------------------
router.get('/', user.loginHome)                                           //home page.

//-----------------------------------------------Collection Page----------------------------------------------
router.get('/menCollection', user.getMenCollection)
router.get('/womenCollection', user.getWomenCollection)

//----------------------------------------------Contact Us Page-------------------------------------------------
router.get('/contactUs', user.getContactUs)

//---------------------------------------------Product detail Page------------------------------------------------
//product routers
router.get('/productDetails', user.productDetails)


//---------------------------------------------User Cart Management------------------------------------------------
router.get('/cart', userAuth.isLogin, user.getCart)
router.post('/cart', user.addToCart)
router.get('/removeCartProduct', userAuth.isLogin, user.removeCartProduct)
router.post('/updateCart', userAuth.isLogin, user.updateCart)
router.get('/applyCoupon', userAuth.isLogin, user.applyCoupon)
router.get('/removeCoupon', userAuth.isLogin, user.removeCoupon)

// -------------------------------------------User Wishlist Management----------------------------------------------------
router.get('/wishlist', userAuth.isLogin, user.getWishlist)
router.post('/wishlist', userAuth.isLogin, user.addToWishlist)
router.get('/removeWishlistProduct', userAuth.isLogin, user.removeWishlistItem)

// -------------------------------------------------My Account--------------------------------------------
router.get('/myAccount', userAuth.isLogin, user.getMyAccount)
router.post('/addAddress', userAuth.isLogin, user.addAddress)
router.post('/editAddress', userAuth.isLogin, user.editAddress)
router.get('/deleteAddress', userAuth.isLogin, user.deleteAddress)
router.post('/changeUsername', userAuth.isLogin, user.changeUsername)
router.post('/changeUserPassword', userAuth.isLogin, user.changeUserPassword)
router.get('/userOrderDetails', userAuth.isLogin, user.orderDetails)
router.get('/downloadOrderInvoice', userAuth.isLogin, user.downloadInvoice);
router.post('/review', userAuth.isLogin, user.review)
router.post('/cancelOrder', userAuth.isLogin, user.cancelOrder)
router.post('/returnOrder', userAuth.isLogin, user.returnOrder)
router.get('/walletHistory', userAuth.isLogin, user.walletHistory)

// -----------------------------------------------------Checkout-----------------------------------------------------
router.get('/checkout', userAuth.isLogin, user.getCheckout)
router.post('/checkout', userAuth.isLogin, user.postCheckout)
router.post('/verifyPayment', userAuth.isLogin, user.verifyPayment);

// ----------------------------------------------------Search Management-----------------------------------------------
router.get('/search', user.searchAction)

//-----------------------------------------------------logout----------------------------------------------
router.get('/logout', userAuth.isLogin, user.logout)                            //logout user




module.exports = router;