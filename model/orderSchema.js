const mongoose = require("mongoose");

const orderSchema=new mongoose.Schema({
  userId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"users"
  },
  items:[
      {
          product:{
              type:mongoose.Schema.Types.ObjectId,
              ref:"products"
          },
          quantity:{
              type:Number,
              require:true
          },
          price: {
            type:Number,
            require:true
          },
          orderStatus: {
            type:String,
            default:"Placed"
          },
          cancelReason: {
            type:String,
            default:null
          },
      }
  ],
  totalAmount:{
      type:Number,
  },
 
  address: {
    type: Object,
  },
  paymentType: {
    type: String,
  },
  orderStatus: {
    type:String,
    default:"Placed"
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  cancelReason: {
    type:String,
    default:null
  },
  couponApplied:{
    type:String,
    
  },
  deliveryCharge:{
    type:Number,
  },
  returnReason: {
    type:String,
    default:null
  },
  requests: [{
    type: {
      type: String,
      enum: ['Cancel', 'Return'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending',
    },
    reason: String,
    // Add other fields as needed for your specific use case
  }, ],

}
,{timestamps:true}
)

 const Orders = mongoose.model("orders", orderSchema);
 
 module.exports = Orders;