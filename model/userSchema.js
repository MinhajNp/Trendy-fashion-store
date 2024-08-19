const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    number: {
        type: Number,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    pincode: {
        type: Number,
        required: true
    },
    landmark: {
        type: String,
        required: true
    },
});

const walletHistorySchema = new mongoose.Schema({
    amount: {
        type: Number,
        default: 0
    },
    type: {
        type: String,
        enum: ['credit', 'debit'],
    },
    remark: {
        type: String,

    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
});



const userSchema = new mongoose.Schema({


    googleId: {
        type: String,
        required: false
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: false,
    },
    mobile: {
        type: Number,
        required: false,
    },
    password: {
        type: String,
        required: false,
    },
    isBlock: {
        type: Boolean,
        default: false
    },
    address: [addressSchema],
    isAdmin: {
        type: Number,
        default: 0,
    },
    isVerified: {
        type: String,
        default: 0
    },
    walletAmount: {
        type: Number,
        default: 0
    }
    ,
    wallet: [walletHistorySchema],
    coupon: {
        type: String,
        default: "not found"
    },
    usedCoupon:[{
        type:String,
        default:null
    }
    ],
}, { timestamps: true })

const UserModel = mongoose.model("users", userSchema)

module.exports = UserModel;