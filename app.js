//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));

//important placement
app.use(session({
  secret: "Our Secret",
  resave: false,
  saveUninitialized: false
}));

//important placement
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-malik:test123@mcluster-alnq7.mongodb.net/userDB", {useNewUrlParser:true});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

//important placement
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
//important placement
//important placement
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://secrets-mjm.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://secrets-mjm.herokuapp.com/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));




app.get("/", function(req,res){
  res.render("home");
});

app.get("/auth/facebook",
  passport.authenticate('facebook'));

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));


app.get("/login", function(req,res){
  res.render("login");
});

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/register", function(req,res){
  res.render("register");
});

app.get("/secrets", function(req,res){
  User.find({"secret": {$ne:null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      res.render("secrets", {usersWithSecrets: foundUsers});
    }
  });
});

app.get("/logout", function(req,res){
  req.logout();
  res.redirect("/");
});

app.get("/submit", function(req,res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req,res){
  const submittedSecret = req.body.secret;

  User.findById(req.user.id, function(err,foundUser){
    if (err){
      console.log(err);
    } else {
      if (foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });

      }
    }
  });
});




app.post("/register",function(req,res){

//passport-local-mongoose package
User.register({username: req.body.username}, req.body.password, function(err, user){
  if (err){
    console.log(err);
    res.redirect("/register");
  } else {
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
});
});

app.post("/login",function(req,res){
const user = new User ({
  username: req.body.username,
  password: req.body.password
});

req.login(user, function(err){
  if (err){
    console.log(err);
  } else {
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    });
  }
});
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function(){
  console.log("Port operating on localhost:3000");
});
