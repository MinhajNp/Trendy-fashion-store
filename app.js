const express = require("express");
const app = express();
const path = require("path");
//const bcrypt = require("bcrypt");
const session = require("express-session");

const passport = require('passport');
require('dotenv').config();
require('./middleware/passportSetup'); // Include Passport setup
// const UserModel=require("./model/userSchema");



app.use((req, res, next) => {
    res.header("cache-control", "no-cache private,no-store,must-revalidate");// ,max-stale=0,post-check=0,pre--check=0 
    next();
})
//import the database connection function
const connectToDatabase = require("./config/database")
connectToDatabase();

//Set up views and view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

//serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")))

//use body parsing middleware before session middleware
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

//Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 3600000
    }
}))

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

//Routes
const userRouter = require("./routes/user");
const adminRouter = require("./routes/admin");

app.use("/", userRouter);
app.use("/", adminRouter);

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
    console.log(`server started on:${PORT}`)
})