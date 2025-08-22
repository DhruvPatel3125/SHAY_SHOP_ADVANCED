const express = require("express");
const router = express.Router();
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { sendMail } = require('../utils/mailer');
const { forgotPassword, resetPassword } = require('../controllers/userController');


// Registration validation
const validateUserRegistration = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Invalid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  },
];

router.get("/test-email",async(req,res)=>{
  try{
    await sendMail({
      to:process.env.ADMIN_EMAIL,
      subject:"Test Email",
      html:"<p>If you see this,SMTP works</p>",
    })
    res.json({success:true,message:'Email sent successfully'})
  }
  catch(error){
    res.status(500).json({message:error.message})
  }
});


// Login validation (basic)
const validateLogin = [
  body("email").isEmail().withMessage("Invalid email"),
  body("password").notEmpty().withMessage("Password is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  },
];

router.post("/register", validateUserRegistration, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const newUser = new User({ name, email, password });

    const user = await newUser.save();

    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Server misconfigured: missing JWT secret" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.send({ message: "User registered SuccessFully", token });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Email already exists. Please use a different email." });
    }
    return res.status(400).json({ message: error.message || "Registration failed" });
  }
});

router.post("/login", validateLogin, async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid Email or Password" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Email or Password" });
    }

    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Server misconfigured: missing JWT secret" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.send({ message: "Login SuccessFully", token, user });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Login failed" });
  }
});

// Google login/upsert
router.post('/google-login', async (req, res) => {
  try {
    const { email, name, uid } = req.body || {};
    if (!email || !uid) {
      return res.status(400).json({ message: 'Missing email or uid' });
    }

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name: name || email.split('@')[0],
        email,
        password: uid, // will be hashed; not used for Google auth
        provider: 'google',
        googleUid: uid,
      });
      await user.save();
    } else {
      // Ensure google fields set for existing account
      if (!user.googleUid) user.googleUid = uid;
      if (!user.provider || user.provider === 'local') user.provider = 'google';
      await user.save();
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Server misconfigured: missing JWT secret' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send safe user object
    const safeUser = { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin };
    return res.json({ message: 'Login SuccessFully', token, user: safeUser });
  } catch (err) {
    console.error('Google login error', err);
    return res.status(500).json({ message: err.message || 'Google login failed' });
  }
});

// Forgot Password Request
router.post("/forgotpassword", forgotPassword);

// Reset Password
router.put("/resetpassword/:resetToken", resetPassword);

// Admin: get all users (exclude passwords)
router.get('/getallusers', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json({ users });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to fetch users' });
  }
});

module.exports = router;