const multer = require("multer");
const User = require("../model/userSchema");
const Category = require("../model/categorySchema");
const Product = require("../model/productSchema")
const Order = require("../model/orderSchema");
const Coupon = require("../model/couponSchema");
const path = require("path");
const bcrypt = require("bcrypt");
const { response } = require("express");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const PDFDocument = require('pdfkit');




async function salesReport(dateRange, specificDate) {
  const currentDate = new Date();
  let startDate;

  if (specificDate) {
    // Convert specificDate to Date object
    startDate = new Date(specificDate);
    startDate.setHours(0, 0, 0, 0);
  } else {
    // Date range calculation
    startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() - dateRange);
    startDate.setHours(0, 0, 0, 0);
  }

  const endDate = new Date(currentDate);
  endDate.setHours(23, 59, 59, 999);

  let salesData = await Order.aggregate([
    {
      $match: {
        orderStatus: "Delivered",
        orderDate: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
        totalRevenue: { $sum: "$totalAmount" },
        totalOrders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  let users = await User.countDocuments();
  let totalRevenue = salesData.reduce((sum, day) => sum + day.totalRevenue, 0);
  let totalOrderCount = await Order.countDocuments({ orderStatus: { $in: ["Shipped", "Placed"] } });
  let monthlyRevenue = Math.round(totalRevenue / 12);
  let productCount = await Product.countDocuments();
  let categoryCount = await Category.countDocuments();
  let averageSales = salesData.length / (specificDate ? 1 : dateRange);
  let averageRevenue = totalRevenue / (specificDate ? 1 : dateRange);

  const topSellingProducts = await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        totalQuantity: { $sum: "$items.quantity" },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 6 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $project: {
        _id: "$product._id",
        name: "$product.name",
        totalQuantity: 1,
        mainImage: { $arrayElemAt: ["$product.mainImage", -1] },
      },
    },
  ]);

  const topSellingCategories = await Order.aggregate([
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$product.category",
        totalQuantity: { $sum: "$items.quantity" },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
    {
      $project: {
        _id: "$category._id",
        name: "$category.name",
        totalQuantity: 1,
      },
    },
  ]);

  let totalCouponDiscount = 0;
  let couponId;
  let coupon;
  for (const order of salesData) {
    couponId = order.couponApplied;
    if (couponId !== "not found") {
      coupon = await Coupon.findById(couponId);
      if (coupon) {
        totalCouponDiscount += coupon.discount;
      }
    }
  }

  return {
    users,
    totalOrders: salesData.length,
    totalOrderCount,
    totalRevenue,
    productCount,
    monthlyRevenue,
    averageSales,
    averageRevenue,
    categoryCount,
    salesData,
    topSellingProducts,
    topSellingCategories,
    totalCouponDiscount
  };
}


const downloadPdf = async (req, res) => {
  try {
    let salesData = null;
    const dateRange = req.query.type === 'specific' ? null : (req.query.type === 'daily' ? 1 : req.query.type === 'weekly' ? 7 : req.query.type === 'monthly' ? 30 : 365);
    const specificDate = req.query.type === 'specific' ? req.query.date : null;

    salesData = await salesReport(dateRange, specificDate);

    let doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');

    doc.pipe(res);

    doc.fontSize(20).text('Sales Report', { align: 'center' });

    const drawTable = (doc, data, headers) => {
      const startX = 50;
      let startY = 150;
      const rowHeight = 30;
      const colWidth = 250;
      const tableWidth = colWidth * headers.length;
      const cellPadding = 5;

      doc.fontSize(12);

      headers.forEach((header, i) => {
        doc.text(header, startX + i * colWidth + cellPadding, startY + cellPadding, { width: colWidth - cellPadding * 2, align: 'center' });
      });

      startY += rowHeight;

      data.forEach((row) => {
        row.forEach((cell, i) => {
          doc.text(cell, startX + i * colWidth + cellPadding, startY + cellPadding, { width: colWidth - cellPadding * 2, align: 'center' });
        });
        startY += rowHeight;
      });

      doc.lineWidth(1);

      doc.moveTo(startX, startY - rowHeight).lineTo(startX + tableWidth, startY - rowHeight).stroke();

      for (let i = 0; i <= headers.length; i++) {
        doc.moveTo(startX + i * colWidth, startY - (rowHeight * (data.length + 1)))
          .lineTo(startX + i * colWidth, startY)
          .stroke();
      }

      for (let i = 0; i <= data.length + 1; i++) {
        doc.moveTo(startX, startY - (i * rowHeight)).lineTo(startX + tableWidth, startY - (i * rowHeight)).stroke();
      }
    };

    if (salesData) {
      const headers = ['Description', 'Value'];
      const data = [
        ['Total Revenue', `INR ${salesData.totalRevenue}`],
        ['Total Orders', `${salesData.totalOrders}`],
        ['Total Pending Orders', `${salesData.totalOrderCount}`],
        ['Total Products Available', `${salesData.productCount}`],
        ['Average Sales', salesData.averageSales ? `${salesData.averageSales.toFixed(2)}%` : 'N/A'],
        ['Average Revenue', salesData.averageRevenue ? `${salesData.averageRevenue.toFixed(2)}` : 'N/A'],
        ['Total Coupon Discount', `INR ${salesData.totalCouponDiscount}`],
        ['Monthly Revenue', `INR ${salesData.monthlyRevenue}`]
      ];

      drawTable(doc, data, headers);
    } else {
      doc.text('No sales data available.', 50, 150);
    }

    doc.end();
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Error generating PDF.');
  }
};




const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, ".././public/assets/uploads/"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

//to upload multiple
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Custom file filter logic (if needed)
    cb(null, true);
  },
  onError: function (err, next) {
    console.error("Multer error:", err);
    next(err);
  },
}).fields([
  { name: "images", maxCount: 3 }, // Array of images
  { name: "mainImage", maxCount: 1 } // Single main image
]);

//admin login controllers
const adminLogin = async (req, res) => {
  try {
    res.render('admin/adminLogin')
  } catch (error) {
    console.log(error.message)
  }
}


//verify admin login
const verifyAdminLogin = async (req, res) => {
  try {
    console.log(req.body);
    const email = req.body.email;
    const password = req.body.password;
    const UserData = await User.findOne({ email: email });
    if (UserData) {
      const passwordMatch = await User.findOne({ password: password });

      if (passwordMatch) {
        if (UserData.isAdmin === 1) {
          req.session.admin_id = UserData._id;
          res.redirect("/adminPanel")

        } else {
          res.render("admin/adminLogin", { message: "Email or password is incorrect" })
        }
      } else {
        res.render("admin/adminLogin", { message: "Email or password is incorrect" })
      }
    } else {
      res.render("admin/adminLogin", { message: "Email or password is incorrect" })
    }
  } catch (error) {
    console.log(error.message)
  }
}

//admin home page
const adminHome = async (req, res) => {
  try {
    const { type } = req.query;
    let orders = await Order.find().populate("userId").sort({ createdAt: -1 }).limit(10);
    let users = await User.find({ isBlock: false }).sort({ createdAt: -1 }).limit(3);

    let filterData = 365;
    let selectedType = 'Yearly';
    if (type === 'Daily') {
      filterData = 1;
      selectedType = type;
    } else if (type === 'Weekly') {
      filterData = 7;
      selectedType = type;
    } else if (type === 'Monthly') {
      filterData = 30;
      selectedType = type;
    } else if (type === 'Yearly') {
      filterData = 365;
      selectedType = type;
    }

    let orderData = await salesReport(filterData);
    res.render('admin/adminDashboard', { orders, users, orderData, selectedType });
  } catch (error) {
    console.log(error);
  }
}
//forget password
const forgetPassword = async (req, res) => {
  try {
    res.render('admin/adminForgetPass')
  } catch (error) {
    console.log(error)
  }
}

const adminLogout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      res.redirect('/adminPanel')
    } else {
      res.redirect('/adminLogin')
    }
  })
}



//User managent

//getUser                               
const userDetails = async (req, res) => {
  try {
    const userData = await User.find({ isAdmin: { $ne: 1 } });
    res.render("admin/userManagement", { userData });
  } catch (error) {
    console.log(error);
  }
}

//user block and unblock
const userBlock = async (req, res) => {
  console.log("hai1")
  try {
    const { userId } = req.body;

    const responce = await User.findOne({ _id: userId })
    console.log("hai2")
    if (responce.isBlock) {
      console.log("hai3")
      const unblocked = await User.updateOne({ _id: userId }, { $set: { isBlock: false } });

      return res.json({ success: true, message: "User Unblocked" })
    } else {
      const block = await User.updateOne({ _id: userId }, { $set: { isBlock: true } })

      return res.json({ success: true, message: "User Blocked" })
    }


  } catch (error) {
    console.log(error.message);
  }
}



//category management

//get category 
const getCategory = async (req, res) => {
  try {
    const data = await Category.find({});

    res.render("admin/categoryManagement", { data });
  } catch (error) {
    console.log(error);
  }
}
//add category
const addCategory = async (req, res) => {
  console.log("Adding category");
  try {
    const categoryName = req.body.categoryName;
    const description = req.body.description;
    console.log(categoryName)



    // // Check if the category already exists
    // Normalize categoryName to lowercase for consistent comparison
    const normalizedCategoryName = categoryName.toLowerCase();
    // Perform case-insensitive search using regular expression
    const categoryMatch = await Category.findOne({ name: { $regex: new RegExp(`^${normalizedCategoryName}$`, 'i') } });
    if (categoryMatch) {
      return res.json({ success: false, message: "Category Already Exists!" })
    }

    // save the new category
    const category = new Category({
      name: categoryName,
      description
    });
    await category.save();

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "Category Not Added,Some Error Happended!" })
  }
};

const editCategory = async (req, res) => {
  try {
    const { id, category, description } = req.body;
    await Category.findByIdAndUpdate(id, { name: category, description: description });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.json({ success: false });
  }
}


const deleteCategory = async (req, res) => {
  try {
    const Id = req.body.id;

    const response = await Category.findOne({ _id: Id })

    if (response.active) {
      const unblocked = await Category.updateOne({ _id: Id }, { $set: { active: false } });
      return res.json({ success: true, message: "Category unlisted" })
    } else {
      const block = await Category.updateOne({ _id: Id }, { $set: { active: true } })
      return res.json({ success: true, message: "Category listed" })
    }

  } catch (error) {
    console.log(error.message);
  }
}


//==================================================Products managemet==========================================================

//getProducts
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if no page parameter is provided
    const currentCategFilter = req.query.currentCategFilter;
    const currentCollFilter = req.query.currentFilter;
    const perPage = 10; // Number of products per page
    const skip = (page - 1) * perPage; // Calculate the number of products to skip

    let query = {};


    // Check if a category is selected for filtering
    let selectedCategory = req.query.category || ''; // Default to empty string if not provided
    if (selectedCategory) {
      query.category = selectedCategory;
    }
    let selectedCollection = req.query.collection || '';
    if (selectedCollection) {
      query.collection = selectedCollection;
    }

    if (currentCategFilter) {
      query.category = currentCategFilter || '';
      selectedCategory = currentCategFilter
    }
    if (currentCollFilter) {
      query.collection = currentCollFilter || '';
      selectedCollection = currentCollFilter;
    }

    const productCount = await Product.countDocuments(query);
    const totalPages = Math.ceil(productCount / perPage);//ceil will round up 

    const product = await Product.find(query)
      .populate("category")
      .skip(skip)
      .limit(perPage)
      .lean();

    const categories = await Category.find({ active: true }).lean();

    res.render("admin/productManagement", {
      product,
      categories,
      selectedCategory,
      selectedCollection,
      totalPages,
      perPage,
      currentPage: page,
    });
  } catch (error) {
    console.log(error);
  }

}

const addProducts = async (req, res, next) => {
  try {
    console.log("Entered to the add product page");
    const mainImage = req.files['mainImage'][0].filename
    const arrImages = req.files['images'].map((value) => value.filename);
    console.log(arrImages); // Ensure you see all filenames here


    let price = parseFloat(req.body.price);
    price = price.toFixed(2);
    const newProduct = new Product({
      name: req.body.productName,
      mainImage: mainImage,
      image: arrImages, // Use arrImages directly here
      price: price,
      discountPrice: req.body.discountPrice,
      afterDiscount: Math.floor(parseInt(req.body.price) - (parseInt(req.body.price) * (parseInt(req.body.discountPrice) / 100))),
      //   size: req.body.size,
      category: req.body.category,
      collection: req.body.collection,
      cloth: req.body.cloth,
      description: req.body.description,
      stock: req.body.stock,
    });

    await newProduct.save();
    return res.json({ success: true, message: "Product Added" })
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: "Product Not Added,Some Error Happended!" })
  }
}

const listProduct = async (req, res) => {
  try {
    const Id = req.body.productId;
    console.log(req.body.productId)
    const response = await Product.findOne({ _id: Id })

    console.log(response)
    if (response.delete) {
      await Product.findByIdAndUpdate({ _id: Id }, { $set: { delete: false } });
      return res.json({ success: true, message: "Product listed" })
    } else {
      await Product.findByIdAndUpdate({ _id: Id }, { $set: { delete: true } })
      return res.json({ success: true, message: "Product unlisted" })
    }
  } catch (err) {
    console.log(err)
  }

}


const editProduct = async function (req, res, next) {
  try {
    const productId = req.body.productId;

    // Validate price
    if (req.body.price <= 0) {
      return res.redirect("/adminProducts");
    }

    // Extract product details from the request body
    const {
      productName,
      description,
      collection,
      stock,
      category,
      cloth,
      price,
      discountPrice
    } = req.body;



    let mergedImages = [];
    let mainImage;

    if (req.files['mainImage'] && req.files['mainImage'].length > 0) {

      mainImage = req.files['mainImage'][0].filename;

    } else {
      const product = await Product.findById(productId);
      mainImage = product.mainImage;
    }

    if (req.files['images'] && req.files['images'].length > 0) {
      const newImages = req.files['images'].map((value) => value.filename);


      const existingProduct = await Product.findById(productId);
      const existingImages = existingProduct.image || [];

      mergedImages = [...existingImages, ...newImages]

    } else {
      const product = await Product.findById(productId);
      mergedImages = product.image;
    }

    // Convert price and discountPrice to numbers
    const parsedPrice = parseInt(price);
    const parsedDiscountPrice = parseInt(discountPrice);

    // Validate category ID
    if (category && !ObjectId.isValid(category)) {
      throw new Error('Invalid category ID');
    }

    // Update the product in the database
    const updatedProduct = await Product.findByIdAndUpdate(
      productId, {
      name: productName,
      description: description,
      collection: collection,
      stock: stock,
      category: category,
      price: parsedPrice,
      discountPrice: parsedDiscountPrice,
      mainImage: mainImage,
      image: mergedImages,
      cloth: cloth,
      afterDiscount: Math.floor(parsedPrice - (parsedPrice * (parsedDiscountPrice / 100)))
    }, {
      new: true,
    }
    );
    // res.redirect('/adminProducts')
    // Send success response
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.json({ success: false });
  }

};


const removeImage = async (req, res) => {
  try {
    // Extract parameters from the request
    const { index, productId } = req.query;

    // Find the product by ID
    const product = await Product.findById(productId);

    // Check if the product exists
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.log(index)
    // Remove the image at the specified index
    product.image.splice(index, 1);

    // Save the updated product
    await product.save();

    // Send a success response
    res.status(200).json({ message: 'Image removed successfully' });
  } catch (error) {
    // Handle errors
    console.error('Error removing image:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

const removeMainImage = async (req, res) => {
  try {
    // Extract parameters from the request
    const { index, productId } = req.query;

    // Find the product by ID
    const product = await Product.findById(productId);

    // Check if the product exists
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    console.log(index)
    // Remove the image at the specified index
    product.mainImage.splice(index, 1);

    // Save the updated product
    await product.save();

    // Send a success response
    res.status(200).json({ message: 'Image removed successfully' });
  } catch (error) {
    // Handle errors
    console.error('Error removing image:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}


// ===========================================Admin Order Management=========================================================
const getOrderManagement = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if no page parameter is provided
    const perPage = 10; // Number of products per page
    const skip = (page - 1) * perPage; // Calculate the number of products to skip

    const productCount = await Order.countDocuments();
    const totalPages = Math.ceil(productCount / perPage);//ceil will round up 

    const orders = await Order.find().populate("userId").sort({ _id: -1 }).skip(skip).limit(perPage);
    res.render('admin/orderManagement', {
      orders,
      totalPages,
      currentPage: page,
      perPage,
    });
  } catch (err) {
    console.log(err);
  }
}

const getOrderDetails = async (req, res) => {
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
    subTotalAmount -= order.deliveryCharge; //delivery charge also added to total amount.so minusing that to show subtotal 



    res.render('admin/orderDetailManagement', { order, couponDiscount, subTotalAmount });
  } catch (err) {
    console.log(err)
    res.send("error page");
  }
}

// cancel order
const cancelOrder = async (req, res) => {
  try {
    const { orderId, userId } = req.body;
    console.log('Received orderId:', orderId); // Debugging log

    if (!orderId) {
      console.log('Order ID is missing');
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId },
      { $set: { orderStatus: 'Canceled By Admin' } },
      { new: true }
    );

    if (!order) {
      console.log('Order not found');
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

    // refund amount to wallet if the payment type is not cash on delivery
    if (order.paymentType !== "Cash on Delivery") {
      const user = await User.findById(userId);
      const refundAmount = order.totalAmount;
      console.log(refundAmount);
      const refundEntry = {
        amount: refundAmount,
        type: "credit",
        createdAt: new Date(),
      };
      user.wallet.push(refundEntry);
      user.walletAmount += refundAmount;
      await user.save();
    }



    console.log('Order canceled successfully:', order); // Debugging log
    res.json({ success: true, message: 'Order canceled successfully.' });
  } catch (err) {
    console.error('Error canceling the order:', err); // Error log
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }

};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, orderStatus } = req.body;
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId },
      { $set: { orderStatus: orderStatus } },
      { new: true }
    );

    if (updatedOrder) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Order not found.' });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const returnOrder = async (req, res) => {
  try {
    const { orderId, userId } = req.body;

    console.log("return order backend")
    console.log(userId)
    console.log(orderId)



    // Find the order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const returnRequest = order.requests.find(request => request.type === 'Return' && request.status === 'Pending');
    if (returnRequest) {
      returnRequest.status = 'Accepted';
      order.orderStatus = "Return Completed";
    }
    await order.save();

    // increase stock of product that included in this order
    const returnedProducts = order.items;


    // Increase stock counts for each canceled product
    for (const product of returnedProducts) {
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

    // refund amount to wallet
    const user = await User.findById(userId);
    const refundAmount = order.totalAmount;
    console.log(refundAmount);
    const refundEntry = {
      amount: refundAmount,
      type: "credit",
      remark: "Return Order Refund",
      createdAt: new Date(),
    };
    user.wallet.push(refundEntry);
    user.walletAmount += refundAmount;
    await user.save();

    res.json({ success: true });




  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const rejectReturn = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    const returnRequest = order.requests.find(request => request.type === 'Return' && request.status === 'Pending');
    if (returnRequest) {
      returnRequest.status = 'Rejected';
      order.orderStatus = "Return Rejected";
    }
    await order.save();
    res.json({ success: true });

  } catch (err) {
    console.log(err);
  }
}
// ============================================Admin Coupon Management======================================================
const getCoupon = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.render('admin/couponManagement', { coupons });
  } catch (err) {
    cosole.log(err)
  }
}

const postCoupon = async (req, res) => {
  try {
    const { couponName, couponCode, validity, discount, limit } = req.body;
    console.log('Received data:', { couponName, couponCode, validity, discount, limit });
    // Check if coupon code already exists
    const existingCouponCode = await Coupon.findOne({ couponCode });
    if (existingCouponCode) {
      return res.status(400).json({ error: "Coupon code already exists" });
    }

    // Check if coupon name already exists
    const existingCouponName = await Coupon.findOne({ couponName });
    if (existingCouponName) {
      return res.status(400).json({ error: "Coupon name already exists" });
    }

    // Create new coupon
    const newCoupon = new Coupon({
      couponName,
      couponCode,
      validity,
      discount,
      limit,
      isActive: true
    });

    await newCoupon.save();

    res.status(201).json({ message: 'Coupon created successfully', coupon: newCoupon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}


const deleteCoupon = async (req, res) => {
  try {
    const Id = req.body.id;

    const response = await Coupon.findOne({ _id: Id })

    if (response.isActive) {
      const unblocked = await Coupon.updateOne({ _id: Id }, { $set: { isActive: false } });
      return res.json({ success: true, message: "Coupon unlisted" })
    } else {
      const block = await Coupon.updateOne({ _id: Id }, { $set: { isActive: true } })
      return res.json({ success: true, message: "Coupon listed" })
    }

  } catch (error) {
    console.log(error.message);
  }
}

const editCoupon = async (req, res) => {
  try {

    const { couponId, couponName, couponCode, validity, discount, limit } = req.body;
    const id = couponId;
    console.log('Received data:', { couponName, couponCode, validity, discount, limit });

    // Check if coupon code already exists, excluding the current coupon
    const existingCouponCode = await Coupon.findOne({ couponCode, _id: { $ne: id } });
    if (existingCouponCode) {
      return res.status(400).json({ error: "Coupon code already exists" });
    }

    // Check if coupon name already exists, excluding the current coupon
    const existingCouponName = await Coupon.findOne({ couponName, _id: { $ne: id } });
    if (existingCouponName) {
      return res.status(400).json({ error: "Coupon name already exists" });
    }

    // Find the coupon by ID and update it
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      { couponName, couponCode, validity, discount, limit },
      { new: true, runValidators: true }
    );

    if (!updatedCoupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.status(200).json({ message: 'Coupon updated successfully', coupon: updatedCoupon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}




module.exports = {
  downloadPdf,
  upload,
  adminLogin,
  verifyAdminLogin,
  adminHome,
  forgetPassword,
  adminLogout,
  userDetails,
  userBlock,
  getCategory,
  addCategory,
  editCategory,
  deleteCategory,
  getProducts,
  addProducts,
  listProduct,
  editProduct,
  removeImage,
  removeMainImage,
  getOrderManagement,
  getOrderDetails,
  cancelOrder,
  updateOrderStatus,
  returnOrder,
  rejectReturn,
  getCoupon,
  postCoupon,
  deleteCoupon,
  editCoupon

}
