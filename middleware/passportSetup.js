// passport-setup.js

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const UserModel = require('../model/userSchema'); // Import your user schema

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:8000/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    // Check if user already exists in your database
    const existingUser = await UserModel.findOne({ email: profile.emails[0].value });
    if (existingUser) {
      return done(null, existingUser);
    }
    // If user doesn't exist, create a new user
    const newUser = new UserModel({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      image: profile.photos[0].value
    });
    await newUser.save();
    
    
    done(null, newUser);
  }
));

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
    try {
      const user = await UserModel.findById(id).exec();
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });



