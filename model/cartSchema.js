const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
   userId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
   productId: { type: mongoose.Schema.Types.ObjectId, ref: "products" },
   quantity: { type: Number, default: 1 }, 
   totalPrice: { type: Number, default: 0 },
   totalDiscountPrice:{type:Number,default:0}
});

const Cart = mongoose.model("Carts", cartSchema);

module.exports = Cart;