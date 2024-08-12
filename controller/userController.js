const User = require("../model/userSchema");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const Product = require("../model/productSchema");
const Category = require("../model/categorySchema");
const Review = require("../model/reviewSchema")
const Cart = require("../model/cartSchema");
const Order = require("../model/orderSchema");
const Wishlist = require("../model/wishlistSchema")
const Coupon = require("../model/couponSchema");
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');

const { response } = require("express");


// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEYID,
  key_secret: process.env.RAZORPAY_SECRET
});
//======================================== Get Signup Page ============================================================

const getSignup = (req, res) => {
  try {

    res.render('user/userSignup');
  } catch (error) {
    res.render('user/404error')
  }
};



//declaring those things outside to transfer the req.body to the otp page

let reqBody;
let userMail;
let hashedPassword;
let OTPData = {
  otp: null,
  expirationTime: null,
};
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});


//======================================== Post Signup ============================================================

const postSignup = async (req, res) => {
  try {
    reqBody = req.body;
    let { email, password } = req.body;

    // Check if the email already registered or not
    const userExist = await User.findOne({ email: email });
    if (userExist) {
      res.render("user/userSignup", { message: "You are already a user please Login", });
    } else {
      req.session.userMail = email;
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Generate otp

    OTPData.otp = Math.floor(100000 + Math.random() * 900000);
    OTPData.expirationTime = Date.now() + 60000;
    console.log(OTPData.otp);
    // Send otp via email
    const mailOptions = {
      from: "trendyfashions@gmail.com",
      to: email,
      subject: "otp Verification",
      text: `Your otp for registration is ${OTPData.otp}. Please use this for registration.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        res.render("user/userSignup", { message: "Error sending otp. Please try again.", });
      } else {
        res.render("user/otpVerification", { data: OTPData });
      }
    });



  } catch (error) {
    console.log(error);
    res.render("user/userSignup", { data: "Error processing registration. Please try again.", });
  }
}

//======================================== resend OTP ============================================================

const resendOtp = async (req, res) => {
  const forgetPassword = req.query.forgetPassword; //if the resend request coming from forgetpassword ,then there will be a query
  try {

    // Generate otp

    OTPData.otp = Math.floor(100000 + Math.random() * 900000);
    OTPData.expirationTime = Date.now() + 60000;

    const email = req.session.userMail;
    // Send otp via email
    const mailOptions = {
      from: "trendyfashions@gmail.com",
      to: email,
      subject: "otp Verification",
      text: `Your resended otp is ${OTPData.otp}.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        if (forgetPassword) {
          res.render("user/forgetPassOtp", { message: "Error sending otp. Please try again." })
        }
        else {
          res.render("user/userSignup", { message: "Error sending otp. Please try again.", });
        }
      } else {
        if (forgetPassword) {
          res.render("user/forgetPassOtp");
        }
        else {
          res.render("user/otpVerification");
        }
      }
    });



  } catch (error) {
    console.log(error);
    res.render("user/userSignup", { data: "Error processing registration. Please try again.", });
  }
}

//======================================== Post OTP ============================================================

const postOTP = async (req, res) => {
  const { username, email, mobile } = reqBody;
  try {
    const { otp } = req.body;
    if (
      OTPData.otp &&
      Date.now() < OTPData.expirationTime &&
      otp === OTPData.otp.toString()
    ) {
      const newUser = new User({
        name: username,
        email: email,
        mobile: mobile,
        password: hashedPassword,
      });
      await newUser.save();
      res.render("user/userLogin", { data: "Registration Completed!,Please Login" })
    } else {
      res.render("user/otpVerification", { message: "Incorrect or Expired otp" });
    }
  } catch (error) {
    console.log(error);
  }
}

//======================================== Get Login Page ============================================================

const login = async (req, res) => {
  try {

    res.render('user/userLogin')
  } catch (error) {
    console.log(error.message)
    res.render('error')
  }
}

//======================================== Post Login ================================================================

const verifyLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const userData = await User.findOne({ email: email })

    if (!userData) {
      res.render('user/userLogin', {
        message: "Email ID and Password is incorrect"
      })
    }
    if (userData.isBlock) {
      console.log("blocked")
      return res.render('user/userLogin', {
        message: "User is blocked by Admin",
      });
    }


    const passwordMatch = await bcrypt.compare(password, userData.password)
    if (!passwordMatch) {

      return res.render('user/userLogin.ejs', {
        message: "user email id or password incorrect"
      });
    }

    req.session.user_id = userData._id;
    res.redirect('/');

  } catch (error) {
    console.log(error.message)
  }
}

//======================================== ForgetPassword ============================================================
// forgetPasswordGet
const forgetPassword = async (req, res) => {
  try {
    res.render('user/forgetPassword')
  } catch (error) {
    console.log(error)
  }
}


//postForgetPassword
const forgetPasswordPost = async (req, res) => {
  try {
    const email = req.body.email;
    console.log(email)
    const existingUser = await User.findOne({ email: email });
    if (!existingUser) {
      res.render("user/forgetPassword", { message: "Given email is not registered,please enter your registered email", });
    } else {
      // Generate otp
      req.session.userMail = email;
      OTPData.otp = Math.floor(100000 + Math.random() * 900000);
      OTPData.expirationTime = Date.now() + 60000;

      // Send otp via email
      const mailOptions = {
        from: "trendyfashions@gmail.com",
        to: email,
        subject: "otp Verification for password reset",
        text: `Your otp for password reset is ${OTPData.otp}.`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          res.render("user/forgetPassword", { message: "Error sending otp. Please try again.", });
        } else {
          res.render("user/forgetPassOtp");
        }
      });
    }

  } catch (error) {
    console.log(error)
  }
}

//OTP Post
const forgetPasswordOTP = async (req, res) => {
  try {
    const email = req.session.userMail;
    const { otp } = req.body;
    if (!(/^\d+$/.test(otp))) {
      res.render("user/forgetPassOtp", { message: "OTP contains non-digit characters" })

    }
    // Check if OTP is exactly 6 characters long
    if (otp.length !== 6) {
      res.render("user/forgetPassOtp", { message: "OTP must have 6 digit" })

    }
    if (
      OTPData.otp &&
      Date.now() < OTPData.expirationTime &&
      otp === OTPData.otp.toString()
    ) {

      res.render("user/changePassword")

    } else {
      res.render("user/forgetPassOtp", { message: "Incorrect or Expired otp" })
    }
  } catch (err) {
    console.log(err)
  }
}

// ResetPassword 
const forgetPasswordReset = async (req, res) => {
  const email = req.session.userMail;
  try {
    if (!email) {
      res.render('user/changePassword', { message: "no data !!" })
      console.log("no email data found!")
    } else {
      const newPassword = req.body.confirmPassword;
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      // Update the user's password
      const result = await User.updateOne(
        { email: email }, // The filter to find the document
        { $set: { password: hashedPassword } } // The update operation to set the password field
      );

      if (result.nModified === 0) {
        // No document matched the filter
        console.log("user not found in database")
        res.render("user/changePassword", { message: 'User not found' });
      } else {
        // Document was updated
        console.log("password changed")
        res.render("user/userLogin", { data: "Password changed Successfully" })
      }


    }
  } catch (error) {
    console.log(error);
  }
}

//======================================== Get Home Page ============================================================

const loginHome = async (req, res) => {
  try {
    const products = await Product.find({ delete: false, stock: { $ne: 0 } }).sort({ rating: -1 }).limit(8);
    const menProducts = await Product.find({ delete: false, stock: { $ne: 0 }, collection: "Men" }).sort({ discountPrice: -1 }).limit(4);
    const womenProducts = await Product.find({ delete: false, stock: { $ne: 0 }, collection: "Women" }).sort({ discountPrice: -1 }).limit(4);

    const googleId = req.session.user_googleId
    console.log(req.session.user_id)
    res.render("user/index", { products, menProducts, womenProducts });
  } catch (error) {
    console.log(error);
  }
}

//======================================== Get Collection Page ============================================================
const getMenCollection = async (req, res) => {
  try {
    const currentCategFilter = req.query.currentCategFilter;
    const currentSort = req.query.currentSort;
    const page = parseInt(req.query.page) || 1; // Default to page 1 if no page parameter is provided
    const perPage = 12; // Number of products per page
    const skip = (page - 1) * perPage; // Calculate the number of products to skip
    let sortOption = req.query.sort || 'featured'; // Get the sort option from the request query parameters or default to 'featured


    if (currentSort) {
      sortOption = currentSort || '';

    }

    let sortCriteria = {};
    if (sortOption === 'lowToHigh') {
      sortCriteria = {
        afterDiscount: 1
      };
    } else if (sortOption === 'highToLow') {
      sortCriteria = {
        afterDiscount: -1
      };
    } else if (sortOption === 'releaseDate') {
      sortCriteria = {
        createdAt: -1
      }; // or any other field for release date
    } else if (sortOption === 'avgRating') {
      sortCriteria = {
        rating: -1
      }; // or any other field for average rating
    } else if (sortOption === 'aToZ') {
      sortCriteria = {
        name: 1
      }; // Sort alphabetically A-Z
    } else if (sortOption === 'zToA') {
      sortCriteria = {
        name: -1
      }; // Sort alphabetically Z-A
    } else {
      // Default to 'featured' or any other default sorting option
      sortCriteria = {
        rating: -1
      }; // Default sorting
    }
    let filter = {}
    // Check if a category is selected for filtering
    const selectedCategory = req.query.category || ''; // Default to empty string if not provided
    if (selectedCategory) {
      filter.category = selectedCategory;
    }

    if (currentCategFilter) {
      filter.category = currentCategFilter;
    }

    filter.delete = false;
    filter.collection = "Men";

    const productCount = await Product.countDocuments(filter);
    const totalPages = Math.ceil(productCount / perPage);//ceil will round up 


    const products = await Product.find(filter)
      .populate("category")
      .sort(sortCriteria)
      .skip(skip)
      .limit(perPage);

    const categories = await Category.find();

    res.render("user/menCollection", {
      products,
      totalPages,
      currentPage: page,
      categories,
      selectedCategory,
      sortOption
    });
  } catch (error) {
    console.log(error);
  }
}

const getWomenCollection = async (req, res) => {
  try {
    const currentCategFilter = req.query.currentCategFilter;
    const currentSort = req.query.currentSort;
    const page = parseInt(req.query.page) || 1; // Default to page 1 if no page parameter is provided
    const perPage = 12; // Number of products per page
    const skip = (page - 1) * perPage; // Calculate the number of products to skip
    let sortOption = req.query.sort || 'featured'; // Get the sort option from the request query parameters or default to 'featured

    if (currentSort) {
      sortOption = currentSort || '';

    }

    let sortCriteria = {};
    if (sortOption === 'lowToHigh') {
      sortCriteria = {
        afterDiscount: 1
      };
    } else if (sortOption === 'highToLow') {
      sortCriteria = {
        afterDiscount: -1
      };
    } else if (sortOption === 'releaseDate') {
      sortCriteria = {
        createdAt: -1
      }; // or any other field for release date
    } else if (sortOption === 'avgRating') {
      sortCriteria = {
        rating: -1
      }; // or any other field for average rating
    } else if (sortOption === 'aToZ') {
      sortCriteria = {
        name: 1
      }; // Sort alphabetically A-Z
    } else if (sortOption === 'zToA') {
      sortCriteria = {
        name: -1
      }; // Sort alphabetically Z-A
    } else {
      // Default to 'featured' or any other default sorting option
      sortCriteria = {
        rating: -1
      }; // Default sorting
    }

    let filter = {}
    // Check if a category is selected for filtering
    const selectedCategory = req.query.category || ''; // Default to empty string if not provided
    if (selectedCategory) {
      filter.category = selectedCategory;
    }

    if (currentCategFilter) {
      filter.category = currentCategFilter;
    }


    filter.delete = false;
    filter.collection = "Women";

    const productCount = await Product.countDocuments(filter);
    const totalPages = Math.ceil(productCount / perPage);//ceil will round up 


    const products = await Product.find(filter)
      .populate("category")
      .sort(sortCriteria)
      .skip(skip)
      .limit(perPage);


    const categories = await Category.find();

    res.render("user/womenCollection", {
      products,
      totalPages,
      currentPage: page,
      categories,
      selectedCategory,
      sortOption
    });
  } catch (error) {
    console.log(error);
  }
}

//=============================================Contact Us==============================================================
const getContactUs = async (req, res) => {
  res.render('user/contactUs');
}

//======================================== Get ProductDetail Page ============================================================

const productDetails = async (req, res) => {
  try {

    // Function to calculate and update average rating for a product
    const productId = req.query.productId;
    const reviews = await Review.find({ productId });
    if (reviews.length != 0) {

      const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      // Update averageRating field in Product schema
      await Product.findByIdAndUpdate(productId, { rating: averageRating });

    }
    // Product rating updation Ended


    // Actuall productDetail code starts here

    const id = req.query.productId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      // Handle the case where the product with the specified id is not found
      console.log("no product found on this id")
      return res.status(404).json({
        message: "No such product found",
      });
    }

    const category = await Category.findById(product.category)
    const relatedProducts = await Product.find({
      collection: product.collection,
      category: product.category
    });
    const review = await Review.find({ productId: id })
    // console.log(relatedProducts)
    if (!product) {
      // Handle the case where the product with the specified id is not found
      return res.status(404).json({
        message: "No such product found",
      });
    }
    res.render("user/productDetails", {
      product,
      category,
      relatedProducts,
      review
    });
  } catch (error) {
    console.log(error);
    res.render('user/error');
  }
}

// Review
const review = async (req, res) => {
  try {
    const rating = req.body.rating;
    const ratingPattern = /^[0-5](\.\d{1,2})?$/;

    if (!rating.match(ratingPattern)) {

    }
    const userId = req.session.user_id;
    const userName = await User.find({ _id: userId }, { name: 1, _id: 0 });

    if (!userName) {
      return res.status(404).send("User not found.");
    }

    const name = userName[0].name;

    const pId = req.body.productId;

    // Check if pId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(pId)) {
      return res.status(400).send("Invalid product ID.");
    }

    const newReview = new Review({
      name: name,
      reviewText: req.body.review,
      rating: req.body.rating,
      productId: pId
    });

    await newReview.save();
    res.status(200).json({ success: true, message: 'Review submitted successfully!' });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: 'An error occurred while submitting the review.' });
  }
};

// ========================================User Cart==================================================================
const getCart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const cartItem = await Cart.find({ userId: userId }).populate("productId");

    let couponCode;
    let coupon;
    let couponMessage;
    if (req.query.coupon) {
      couponCode = req.query.coupon;
      // Trim whitespace from the coupon code
      if (couponCode) {
        couponCode = couponCode.trim();
      }
      coupon = await Coupon.findOne({ couponCode });
      console.log(coupon)
      if (!coupon) {
        couponMessage = "No coupon found!"
      } else {
        // Check if the coupon is active and not expired
        const currentDate = new Date();
        if (coupon.isActive == false || new Date(coupon.validity) < currentDate) {
          couponMessage = "Coupon not available";
          coupon = "";
        }
      }
    }

    // Ensure quantities do not exceed available stock
    await Promise.all(
      cartItem.map(async (item) => {
        if (item.quantity > item.productId.stock && item.productId.stock != 0) {
          await Cart.findOneAndUpdate(
            { _id: item._id },
            { $set: { quantity: item.productId.stock } },
            { new: true }
          );
          // Update item quantity in memory to reflect changes for total price calculations
          item.quantity = item.productId.stock;
          item.totalPrice = item.productId.stock * item.productId.price;
          item.totalDiscountPrice = item.productId.stock * item.productId.afterDiscount;
        }
      })
    );

    // Calculate total prices
    let allTotalPrice = 0;
    let allTotalDiscountPrice = 0;

    cartItem.forEach((item) => {
      allTotalPrice += item.totalPrice;
      allTotalDiscountPrice += item.totalDiscountPrice;
    });




    let allTotalFinalPrice = allTotalDiscountPrice;
    // Check if a user coupon is there or not
    const user = await User.findOne({ _id: userId });
    let discount = 0;
    let limit;
    let appliedCoupon;
    if (user.coupon != "not found") {
      const couponId = user.coupon;
      //  const idString = couponId.toString();
      //  console.log(idString)
      appliedCoupon = await Coupon.findOne({ _id: couponId });


      // Check if the coupon is active and not expired
      const currentDate = new Date();
      if (appliedCoupon.isActive == false || new Date(appliedCoupon.validity) < currentDate) {
        // Update the coupon feild in user 
        const updateUser = await User.findOneAndUpdate(
          { _id: userId },
          { $set: { coupon: "not found" } },
          { new: true }
        );
      }

      discount = appliedCoupon.discount;
      limit = appliedCoupon.limit;

      console.log(discount)
      allTotalFinalPrice -= discount;
      console.log(allTotalDiscountPrice)
      // Check if allTotalDiscountPrice is less than coupon's minimum applicable condition
      if (allTotalDiscountPrice < limit) {
        allTotalFinalPrice += discount;
        discount = 0;

        const updateUser = await User.findOneAndUpdate(
          { _id: userId },
          { $set: { coupon: "not found" } },
          { new: true }
        );

      }
    }


    let deliveryCharge = 0;
    // checking if the totalprice is below 500 to add additional delivery charges.
    if (allTotalDiscountPrice < 700) {
      allTotalFinalPrice += 50;
      deliveryCharge = 50;
    }







    res.render('user/cart', { user, cartItem, allTotalPrice, allTotalDiscountPrice, coupon, discount, allTotalFinalPrice, appliedCoupon, couponMessage, deliveryCharge });
  } catch (err) {
    console.error("Error in getCart:", err);
    res.status(500).send("Internal Server Error");
  }
};


// add To Cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    console.log(req.body);

    const userId = req.session.user_id;
    if (!userId) {
      return res.json({ success: false, message: "Login/Signup to add product in the cart!" })
    }
    const product = await Product.findById(productId);
    const existingCartItem = await Cart.findOne({
      userId: userId,
      productId: productId,
    });
    if (existingCartItem) {
      return res.json({ success: false, message: "Already in Cart" })
    } else {
      if (product.stock < 1) {
        return res.json({ success: false, message: "Out of Stock" })
      }


      const totalPrice = product.price * parseInt(quantity);
      const totalDiscountPrice = product.afterDiscount * parseInt(quantity);
      const cartItem = new Cart({
        userId: req.session.user_id,
        productId: productId,
        totalPrice: totalPrice,
        totalDiscountPrice: totalDiscountPrice
      });
      await cartItem.save();
      return res.json({ success: true, message: "Product Added To Cart" })
    }
  } catch (error) {
    console.log(error);
    // return res.redirect("/error");
  }
}

// REmoce Cart Product
const removeCartProduct = async (req, res) => {
  try {
    const { cartItemId } = req.query;
    await Cart.findByIdAndDelete(cartItemId);
    res.redirect("/cart");
  } catch (error) {
    console.log(error);
    return res.redirect("/error");
  }
}

// update cart
const updateCart = async (req, res) => {
  try {
    console.log("entered updateCart")
    const productId = req.body.productId;
    const quantity = req.body.quantity;
    console.log(quantity);
    console.log(productId);
    const parsedQuantity = parseInt(quantity);
    const userId = await User.findById(req.session.user_id)
    const product = await Product.findById(productId);

    if (product.delete == true) {
      return res.json({ success: false, message: "Product Currently Not Available!" });
    }

    if (parsedQuantity <= product.stock) {
      const totalPrice = product.price * parsedQuantity;
      const totalDiscountPrice = product.afterDiscount * parsedQuantity;

      // Update the cart item
      const cart = await Cart.findOneAndUpdate(
        { userId, productId },
        {
          $set: {
            quantity: parsedQuantity,
            totalPrice: totalPrice,
            totalDiscountPrice: totalDiscountPrice
          }
        },
        { new: true }
      );


      if (cart) {
        console.log("done cart");
        return res.json({ success: true, message: "Cart updated successfully!" });
      } else {
        return res.json({ success: false, message: "Cart item not found!" });
      }
    } else {
      console.log("Out of Stock")
      return res.json({ success: false, message: "No more stock available!" });
    }


  } catch (err) {
    console.log(err);
    return res.json({ success: false, message: "Error in updating quantity!" });

  }
}

// apply coupon
const applyCoupon = async (req, res) => {
  try {
    const { couponId } = req.query;
    const userId = req.session.user_id;


    // Update the coupon feild in user 
    const updateUser = await User.findOneAndUpdate(
      { _id: userId },
      { $set: { coupon: couponId } },
      { new: true }
    );

    res.redirect('/cart')
  } catch (err) {
    console.log(err);
  }

}

const removeCoupon = async (req, res) => {
  try {
    const userId = req.session.user_id;

    // Update the coupon feild in user 
    const updateUser = await User.findOneAndUpdate(
      { _id: userId },
      { $set: { coupon: "not found" } },
      { new: true }
    );

    res.redirect('/cart');

  } catch (err) {
    console.log(err);
  }
}

// ========================================Wishlist====================================================================
const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const wishlistItem = await Wishlist.find({ userId }).populate(
      "productId");

    res.render('user/wishlist', { wishlistItem })
  } catch (err) {
    console.log(err);
  }
}

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { productId } = req.body;
    if (!userId) {
      return res.json({ success: false, message: "Login/Signup to add product in the cart!" })
    }
    const existingItem = await Wishlist.findOne({
      userId,
      productId,
    })
    if (existingItem) {
      return res.json({ success: false, message: "product already in wishlist" });
    } else {
      const wishlistItem = new Wishlist({
        userId: userId,
        productId: productId
      });

      await wishlistItem.save();
      return res.json({ success: true, message: "product added to the wishlist" });

    }
  } catch (err) {
    console.log(err)
  }
}

const removeWishlistItem = async (req, res) => {
  try {
    const { itemId } = req.query;
    await Wishlist.findByIdAndDelete(itemId);
    res.redirect('/wishlist')
  } catch (err) {
    console.log(err);
  }
}

// =======================================My Account================================================================
const getMyAccount = async (req, res) => {
  try {
    const user = await User.findById(req.session.user_id);
    const orders = await Order.find({ userId: user })
      .populate("userId")
      .populate({
        path: 'items.product', // Nested population for items.product
        // No `select` option here, so all fields from Product are included
      }).sort({ _id: -1 });
    let selectedAddressTypes = [];
    if (user) {
      selectedAddressTypes = user.address.map(
        (address) => address.address
      );
    }
    res.render('user/myAccount', { user, selectedAddressTypes, orders });
  } catch (err) {
    console.log(err);
  }
}

// addAddress 
const addAddress = async (req, res) => {
  try {
    const { name, number, address, city, state, country, pincode, landmark } = req.body;

    // Find the user by their session ID
    const user = await User.findById(req.session.user_id);
    if (!user) {
      return res.json({ success: false, message: "User not found!" });
    }

    // Create a new address object
    const newAddress = {
      name,
      number,
      address,
      city,
      state,
      country,
      pincode,
      landmark,
    };

    // Add the new address to the user's addresses
    user.address.push(newAddress);
    await user.save();

    return res.json({ success: true, message: "New Address Added" });
  } catch (err) {
    console.log(err);
    return res.json({ success: false, message: "Some Error Happened!" });
  }
};


// edit Address
const editAddress = async (req, res) => {
  try {
    const { name, number, address, city, state, country, pincode, landmark } = req.body;

    const addressIndex = req.query.addressIndex;
    const fromMyAccount = req.query.from;
    const user = await User.findById(req.session.user_id);

    if (!addressIndex) {
      console.log("no addressIndex");
    } else {
      user.address[addressIndex].name = name;
      user.address[addressIndex].number = number;
      user.address[addressIndex].address = address;
      user.address[addressIndex].city = city;
      user.address[addressIndex].state = state;
      user.address[addressIndex].country = country;
      user.address[addressIndex].pincode = pincode;
      user.address[addressIndex].landmark = landmark;

      await user.save();
      if (fromMyAccount) {
        res.redirect("/myAccount");
      }
      res.redirect("/checkout");

    }


  } catch (err) {
    console.log(err);
  }
}

// delete Address
const deleteAddress = async (req, res) => {
  try {

    const { addressIndex, from } = req.query;
    const fromMyAccount = from;
    console.log(fromMyAccount)
    const user = await User.findById(req.session.user_id);

    user.address.splice(addressIndex, 1)
    await user.save();
    if (fromMyAccount) {
      return res.redirect('/myAccount');
    }

    res.redirect('/checkout');
  } catch (err) {
    console.log(err)
  }
}

// ====Change Username=====
const changeUsername = async (req, res) => {
  try {
    const newUsername = req.body.name;
    const user = await User.findById(req.session.user_id);

    await User.findOneAndUpdate(
      { _id: user },
      { $set: { name: newUsername } },
      { new: true }
    )

    return res.json({ success: true, message: "Username Changed!" })
  } catch (err) {
    console.log(err)
    return res.json({ success: false, message: "Error happened in backend" })
  }
}

// change User Password
const changeUserPassword = async (req, res) => {
  try {
    const oldPassword = req.body.oldPassword;
    const newPassword = req.body.password;
    console.log(oldPassword + newPassword)
    const user = await User.findById(req.session.user_id);

    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
      console.log("old password wrong");
      return res.json({ success: false, message: "Old password is not correct" })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate(
      { _id: user },
      { $set: { password: hashedPassword } },
      { new: true }
    )

    // return res.status(200).json({message:"Successfullyl changed the password"}) 
    return res.json({ success: true, message: "Successfully changed the password" })
  } catch (err) {
    console.log(err);
    // return res.status(500).json({ message: "An error occurred. Please try again later." });
    return res.json({ success: false, message: "An error occurred. Please try again later." })
  }
}

// orderDetails page
const orderDetails = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    console.log(orderId)
    const order = await Order.findById(orderId)
      .populate('userId') // Populate the entire userId field with all fields from User
      .populate({
        path: 'items.product', // Nested population for items.product
        // No `select` option here, so all fields from Product are included
      });

    let subTotalAmount = order.totalAmount;

    let couponDiscount = 0;
    const couponId = order.couponApplied;
    if (couponId !== "not found") {
      const coupon = await Coupon.findById(couponId);
      couponDiscount = coupon.discount;
      // the discount amount already added to totalamount in postcheckout so minusing now to show totalproduct amount
      subTotalAmount -= couponDiscount;
    }
    subTotalAmount -= order.deliveryCharge;

    res.render('user/orderDetails', { order, couponDiscount, subTotalAmount });
  } catch (err) {
    console.log(err)
  }
}
// Cancel Order 
const cancelOrder = async (req, res) => {
  try {
    const { orderId, cancelReason } = req.body;

    if (!orderId || !cancelReason) {
      return res.status(400).json({ success: false, message: 'Order ID and cancel reason are required.' });
    }

    // Find the order and update its status to 'Canceled By Admin' or 'Canceled By User'
    const order = await Order.findOneAndUpdate(
      { _id: orderId },
      {
        $set: {
          orderStatus: "Canceled By User",
          cancelReason: cancelReason // Optionally store the cancellation reason
        }
      },
      { new: true } // Return the updated order document
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // increase stock of product that included in this order
    const canceledProducts = order.items;

    console.log(canceledProducts)
    // Increase stock counts for each canceled product
    for (const product of canceledProducts) {
      const productId = product.product;
      const quantity = product.quantity;

      // Find the product in your database
      const productToUpdate = await Product.findById(productId);

      if (!productToUpdate) {
        return res.status(404).json({
          success: false,
          error: "Product not found for restocking",
        });
      }

      // Increase the stock count
      productToUpdate.stock += quantity;

      // Save the updated product
      await productToUpdate.save();
    }

    // refund amount to wallet if payment type is not cash on delivery
    if (order.paymentType !== "Cash on Delivery") {
      const user = await User.findById(req.session.user_id);
      const refundAmount = order.totalAmount;
      console.log(refundAmount);
      const refundEntry = {
        amount: refundAmount,
        type: "credit",
        remark: "Canceled Order Refund",
        createdAt: new Date(),
      };
      user.wallet.push(refundEntry);
      user.walletAmount += refundAmount;
      await user.save();
    }

    // Return success response
    res.json({ success: true, message: 'Order canceled successfully.' });
  } catch (err) {
    console.error('Error canceling the order:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const returnOrder = async (req, res) => {
  try {
    const { orderId, returnReason } = req.body;

    const order = await Order.findById(orderId);
    // Add the return request
    order.requests.push({
      type: 'Return',
      status: 'Pending',
      reason: returnReason,
    });
    order.orderStatus = "Return Pending";
    await order.save();
    // Return success response
    res.json({ success: true, message: 'Return requested successfully.' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

// wallet
const walletHistory = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    res.render('user/walletHistory', { user });
  } catch (err) {
    console.log(err);
  }
}

// =========================================Checkout===================================================================
const getCheckout = async (req, res) => {
  try {
    const user = await User.findById(req.session.user_id);
    const cartItem = await Cart.find({ userId: user }).populate("productId");
    let selectedAddressTypes = [];
    if (user) {
      selectedAddressTypes = user.address.map(
        (address) => address.address
      );
    }

    let allTotalDiscountPrice = 0;

    cartItem.forEach((item) => {
      allTotalDiscountPrice += item.totalDiscountPrice;
    });

    let allTotalFinalPrice = allTotalDiscountPrice;
    // Check if a user coupon is there or not

    let discount = 0;
    let limit;
    let appliedCoupon;
    if (user.coupon != "not found") {
      const couponId = user.coupon;
      appliedCoupon = await Coupon.findOne({ _id: couponId });
      discount = appliedCoupon.discount;
      limit = appliedCoupon.limit;
      allTotalFinalPrice -= discount;
    }


    // checking if the totalprice is below 600 to add additional delivery charges.
    let deliveryCharge = 0;
    if (allTotalDiscountPrice < 600) {
      allTotalFinalPrice += 50;
      deliveryCharge = 50;
    }


    res.render('user/checkout', { user, selectedAddressTypes, cartItem, allTotalDiscountPrice, allTotalFinalPrice, discount, deliveryCharge });
  } catch (err) {
    console.log(err)
  }
}


// postcheckout
const postCheckout = async (req, res) => {
  try {
    const { selectedAddressType, paymentOption } = req.body;
    console.log(selectedAddressType + " selected addressId");
    const user = await User.findById(req.session.user_id);
    const cartItem = await Cart.find({ userId: user }).populate("productId");

    let orderedItems = [];
    let totalAmount = 0;
    for (const item of cartItem) {
      totalAmount += item.totalDiscountPrice;
      orderedItems.push({
        product: item.productId._id,
        quantity: item.quantity,
        price: item.totalDiscountPrice,
      });

    }

    let allTotalFinalPrice = totalAmount;

    // checking if the totalprice is below 600 to add additional delivery charges.
    let deliveryCharge = 0;
    if (allTotalFinalPrice < 700) {
      allTotalFinalPrice += 50;
      deliveryCharge = 50;
    }

    // Check if a user coupon is there or not
    let discount = 0;
    let limit;
    let appliedCoupon;
    const couponId = user.coupon;
    if (user.coupon != "not found") {
      appliedCoupon = await Coupon.findOne({ _id: couponId });
      discount = appliedCoupon.discount;
      limit = appliedCoupon.limit;
      allTotalFinalPrice -= discount;
    }


    // Handle Razorpay payment option
    if (paymentOption === "RAZORPAY") {
      const razorpayOrder = await razorpay.orders.create({
        amount: allTotalFinalPrice * 100, // Amount in paise
        currency: 'INR',
        receipt: `order_${Date.now()}`,
        payment_capture: 1,
      });

      return res.json({
        success: true,
        message: "Order placed successfully",
        razorpayKey: process.env.RAZORPAY_KEYID,
        razorpayOrderId: razorpayOrder.id,
        amount: allTotalFinalPrice * 100,
        orderedItems,
        totalAmount: allTotalFinalPrice,
        selectedAddressType,
        paymentOption,
        couponId,
        deliveryCharge,
      });
    } else {
      // This will work only if patment type is not razorpay

      const order = new Order({
        userId: req.session.user_id,
        items: orderedItems,
        totalAmount: allTotalFinalPrice,
        address: selectedAddressType,
        paymentType: paymentOption,
        couponApplied: couponId,
        deliveryCharge: deliveryCharge,
      });

      await order.save();
      await User.findOneAndUpdate(
        { _id: req.session.user_id },
        { $set: { coupon: "not found" } },
        { new: true }
      );

      // This will work only if patment type is not razorpay
      for (const item of cartItem) {
        // Retrieve the product and update the stock
        let product = await Product.findById(item.productId._id);
        if (product) {
          product.stock -= item.quantity; // Adjust stock based on item quantity
          await product.save();
        } else {
          console.error(`Product with ID ${item.productId._id} not found.`);
        }
        // Remove the item from the cart
        await Cart.findByIdAndDelete(item._id);
      }

      // managing wallet amount if the payment method is wallet
      if (paymentOption === "Wallet") {
        let amount = user.walletAmount;
        amount = amount - allTotalFinalPrice;

        const walletEntry = {
          amount: allTotalFinalPrice,
          type: "debit",
          remark: "Product Purchase",
          createdAt: new Date(),
        };
        user.wallet.push(walletEntry);
        await user.save();

        await User.findOneAndUpdate(
          { _id: req.session.user_id },
          { $set: { walletAmount: amount } },
          { new: true }
        );
      }

      return res.json({ success: true, message: "Order placed successfully" });
    }

  } catch (err) {
    console.log(err);
    return res.json({ success: false, message: "An error occurred. Please try again later." });
  }
};

// VERIFY PAYMENT
const verifyPayment = async (req, res) => {
  const user = await User.findById(req.session.user_id);
  const cartItem = await Cart.find({ userId: user }).populate("productId");
  const { payment_id, order_id, signature, orderedItems, totalAmount, selectedAddressType, paymentOption, couponId, deliveryCharge } = req.body;
  const crypto = require('crypto');
  const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET)
    .update(order_id + "|" + payment_id)
    .digest('hex');

  if (generatedSignature === signature) {
    // Payment verification successful
    const order = new Order({
      userId: user,
      items: orderedItems,
      totalAmount: totalAmount,
      address: selectedAddressType,
      paymentType: paymentOption,
      couponApplied: couponId,
      deliveryCharge: deliveryCharge,
    });
    console.log("orders", order)
    await order.save();
    await User.findOneAndUpdate(
      { _id: req.session.user_id },
      { $set: { coupon: "not found" } },
      { new: true }
    );

    for (const item of cartItem) {
      // Retrieve the product and update the stock
      let product = await Product.findById(item.productId._id);
      if (product) {
        product.stock -= item.quantity; // Adjust stock based on item quantity
        await product.save();
      } else {
        console.error(`Product with ID ${item.productId._id} not found.`);
      }
      // Remove the item from the cart
      await Cart.findByIdAndDelete(item._id);
    }

    return res.json({ success: true });
  } else {
    // Payment verification failed
    console.log("continue payment")
    return res.json({ success: false });
  }
};

// ========================================download invoice=====================================================

const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.query.orderId; // Assuming orderId is passed as a query parameter
    if (!orderId) {
      return res.status(400).send('Order ID is required');
    }

    // Fetch the order details from the database
    const order = await Order.findById(orderId).populate('userId').populate('items.product userId').exec();
    if (!order) {
      return res.status(404).send('Order not found');
    }

    const user = await User.findById(order.userId._id).exec();
    if (!user) {
      return res.status(404).send('User not found');
    }
    let coupon = 0;
    if (order.couponApplied !== "not found") {
      const couponApplied = await Coupon.findById(order.couponApplied);
      coupon = couponApplied.discount;
    }

    // Create a new PDF document
    const doc = new PDFDocument();
    let filename = `invoice_${orderId}.pdf`;
    filename = encodeURIComponent(filename);

    // Set response headers
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    // Pipe the PDF into the response
    doc.pipe(res);

    // Add header and user details
    doc.fontSize(25).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text(`Order ID: ${order._id}`);
    doc.text(`Customer Name: ${user.name}`);
    doc.text(`Email: ${user.email}`);
    doc.text(`Order Date: ${order.orderDate.toLocaleDateString()}`);
    doc.moveDown();
    doc.fontSize(16).text('Delivery Address:');
    order.userId.address.forEach((address) => {
      if (address.address === order.address) {
        doc.fontSize(14).text(`${address.name}`);
        doc.text(`${address.address} address`);
        doc.text(`${address.city}, ${address.state}, ${address.country} - ${address.pincode}`);
        doc.text(`Landmark: ${address.landmark}`);
      }
    });

    doc.moveDown();

    // Add table header for items
    doc.fontSize(16).text('Ordered Items:', { underline: true });
    doc.moveDown();

    // Prepare table data
    const headers = ['Product', 'Quantity', 'Price', 'Total'];
    const data = order.items.map(item => [
      item.product.name,
      item.quantity,
      item.price.toFixed(2),
      (item.quantity * item.price).toFixed(2)
    ]);

    // Function to draw the table
    const drawTable = (doc, data, headers) => {
      const startX = 50;
      let startY = doc.y;
      const rowHeight = 30;
      const colWidth = 100;
      const tableWidth = colWidth * headers.length;
      const cellPadding = 5;

      doc.fontSize(12);

      // Draw headers
      headers.forEach((header, i) => {
        doc.text(header, startX + i * colWidth + cellPadding, startY + cellPadding, { width: colWidth - cellPadding * 2, align: 'center' });
      });

      startY += rowHeight;

      // Draw rows
      data.forEach((row) => {
        row.forEach((cell, i) => {
          doc.text(cell, startX + i * colWidth + cellPadding, startY + cellPadding, { width: colWidth - cellPadding * 2, align: 'center' });
        });
        startY += rowHeight;
      });

      // Draw lines for table
      doc.lineWidth(1);

      // Draw header line
      doc.moveTo(startX, startY - rowHeight).lineTo(startX + tableWidth, startY - rowHeight).stroke();

      // Draw vertical lines
      for (let i = 0; i <= headers.length; i++) {
        doc.moveTo(startX + i * colWidth, startY - (rowHeight * (data.length + 1)))
          .lineTo(startX + i * colWidth, startY)
          .stroke();
      }

      // Draw horizontal lines
      for (let i = 0; i <= data.length + 1; i++) {
        doc.moveTo(startX, startY - (i * rowHeight)).lineTo(startX + tableWidth, startY - (i * rowHeight)).stroke();
      }
    };

    // Draw the table
    drawTable(doc, data, headers);

    doc.moveDown(2);
    doc.fontSize(13).text(`Coupon Discount: INR ${coupon.toFixed(2)}`, { align: 'right' });
    doc.fontSize(16).text(`Total Amount: INR ${order.totalAmount.toFixed(2)}`, { align: 'right' });

    // Finalize the PDF and end the stream
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while generating the invoice');
  }
};

// =======================================SearchAction=============================================================
const searchAction = async (req, res) => {
  try {
    const query = req.query.q;

    const trimmedSearch = query.trim()
    if (!trimmedSearch) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const products = await Product.find({
      $or: [
        { name: { $regex: trimmedSearch, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    });



    res.render('user/searchResult', { products });
  } catch (err) {
    console.error('Error during search:', err);
    res.status(500).json({ error: 'Internal server error' });
  }

}

//======================================== User Logout  ============================================================

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Failed to destroy session:', err);
      // Optionally, you could redirect to an error page or handle the error appropriately
      res.redirect('/'); // Adjust this path as necessary
    } else {
      res.redirect('/login'); // Redirect to home route after successful logout
    }
  });
};




module.exports = {
  getSignup,
  postSignup,
  resendOtp,
  postOTP,
  login,
  verifyLogin,
  forgetPassword,
  forgetPasswordPost,
  forgetPasswordOTP,
  forgetPasswordReset,
  loginHome,
  getMenCollection,
  getWomenCollection,
  getContactUs,
  productDetails,
  review,
  getCart,
  addToCart,
  removeCartProduct,
  updateCart,
  applyCoupon,
  removeCoupon,
  getWishlist,
  addToWishlist,
  removeWishlistItem,
  getMyAccount,
  addAddress,
  editAddress,
  deleteAddress,
  changeUsername,
  changeUserPassword,
  orderDetails,
  cancelOrder,
  returnOrder,
  walletHistory,
  getCheckout,
  postCheckout,
  verifyPayment,
  searchAction,
  downloadInvoice,
  logout,

}
