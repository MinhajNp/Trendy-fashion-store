const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  couponName: { type: String },
  couponCode: { type: String },
  validity: { type: Date },
  discount: { type: Number },
  limit: { type: Number },
  isActive: { type: Boolean },
});

const Coupon = mongoose.model("coupon", couponSchema);

module.exports = Coupon;