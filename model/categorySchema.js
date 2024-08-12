
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
name: {
    type: String,
    
    unique: true
},
description: {
    type: String,
    
},
active: {
    type:Boolean,
    default:true
}
});

const Category = mongoose.model("Categories", categorySchema);
module.exports = Category;

