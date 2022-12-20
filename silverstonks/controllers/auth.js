const sgMail = require("@sendgrid/mail");

const asyncHandler = require("../middleware/async");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");
const generateToken = require("../utils/generateToken");
// sgMail.setApiKey("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");
sgMail.setApiKey("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");

// @desc    Register User (Roles: employee, admin)
// @oute    POST /api/auth/register
// @access  Public

exports.signUp = asyncHandler(async (req, res, next) => {
  const { email} = req.body;
  // Check if user already exists
  const isFound = await User.findOne({ email });
  const isVerified = isFound && isFound.verified;
  
    
  if (!isFound) await User.create({email});

  const sendEmailStatus = await sendEmail(email);
  console.log("SEND EMAIL STATUS", sendEmailStatus)
  if(sendEmailStatus && !sendEmailStatus.success) return next(new ErrorResponse("Email Sending failed", 422));

  

  // Sending Verification Code
  const user = await User.findOne({email});
  user.temporaryToken = sendEmailStatus.temporaryToken;
  await user.save();

  return res.status(200).json({
    success: 1,
    message: "Successfuly send verification code"
  })

});

//  Sending Email
const sendEmail = async (userEmail) => {
  const verificationCode = makeid(5);
  const msg = {
    to: userEmail,
    // from: "ishtiaq.kds@gmail.com",
    from: "silverstonks@silverstonks.io",
    subject: "Email Confirmation",
    html: `<p> Here's your Verification code:  ${verificationCode} </p>`,
    message: `Here's your Verification code:  ${verificationCode}`,
 };

 const result = await sgMail.send(msg);
 if(result && result[0].statusCode === 202) return {
   success: 1,
   temporaryToken: verificationCode
 }
else {
  return {success: 0}
}
}

// Verification

exports.verify = asyncHandler(async (req, res, next) => {
  const { temporaryToken }= req.body;
  
   const user = await User.findOne({temporaryToken});
   if(!user) return next(new ErrorResponse("Invalid Token", 401));

   user.verified = true;
   await user.save();

   res.status(202).json({
    user,
    token: generateToken(user._id)
  })
});

exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.find({ _id: req.params.id });
  res.status(200).json({
    success: true,
    data: user
  });
});

// Update User
exports.updateUserById = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  console.log("REQ.BODY", req.body)
  const userData  = req.body;
  console.log("USER DATA", userData)
  const user = await User.findOneAndUpdate({ _id: id }, userData, {new: true});
  res.status(200).json({
    success: true,
    data: user
  });
});

exports.getUserRanking = asyncHandler(async (req, res, next) => {
 
  const userRankings = await User.find().sort({"totalStaked": -1})
  res.status(200).json({
    success: true,
    data: userRankings
  });
});


// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token
  });
};

function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * 
charactersLength));
 }
 return result;
}


