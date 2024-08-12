
const mongoose=require("mongoose");

const reviewSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
   
    image:{
        type:String,
        default:"/assets/images/reviewUserImage.png"
    },
    reviewText:{
        type:String,
        required:true
    },
    rating:{
        type:Number,
        default:3
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,  
        ref: 'products', 
        required: true
    },
    
    
},{timestamps:true});



const reviewModel=mongoose.model("review",reviewSchema)

module.exports=reviewModel;