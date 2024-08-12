const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({
   userId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
   productId: { type: mongoose.Schema.Types.ObjectId, ref: "products" }
});

const Wishlist = mongoose.model("wishlist", wishlistSchema);

module.exports = Wishlist;