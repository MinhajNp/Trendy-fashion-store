

const mongoose=require("mongoose");

const productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    discountPrice:{
        type: Number,
        default: 0,
     },
     afterDiscount:Number,
     mainImage:[{
        type:String,
        required:false
    }
    ],
    image:[{
        type:String,
        required:false
    }
    ],
    description:{
        type:String,
        required:true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,  
        ref: 'Categories', 
        required: true
    },
    collection:{
        type:String,
        required:true
    },
    stock:{
        type:Number,
        required:true
    },
    rating:{
        type:Number,
        default:3
    },
    cloth:{
        type:String
    },
    delete:{
        type:Boolean,
        default:false
    }
},{timestamps:true});



const ProductModel=mongoose.model("products",productSchema)

module.exports=ProductModel;