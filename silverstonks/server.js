const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const morgan = require("morgan");
const colors = require("colors");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cors = require("cors");

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey("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");

const mongoose = require("mongoose");

const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  })
}

// module.exports = generateToken

// Load env vars
dotenv.config({
  path: "config/config.env"
});

const connectDB = async () => {

  const conn = await mongoose.connect("mongodb+srv://silverstakes:silverstakes@cluster0.cb40d.mongodb.net/silver-stakes-db?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  });

  console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
};

const userSchema = new mongoose.Schema({
  email: String,
  verified: { type: Boolean, default: false },
  verificationCode: String,
  totalStaked: Number,
  walletAddress: String,
  walletAuthorized: { type: Boolean, default: false },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

User = mongoose.model("User", userSchema);


// Connect to database
connectDB();

const app = express();

app.all('*', function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.options('*', cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: false
}));

// parse application/json
app.use(bodyParser.json());

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Sanitize data
app.use(mongoSanitize());

// Set security headers
app.use(helmet());

// Prevent XSS attacks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 100
});
app.use(limiter);

// Prevent http param pollution
app.use(hpp());

// Enable CORS
app.use(cors({
    origin: '*'
}));

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  )
);

function createVerificationCode(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength));
  }
  return result;
}

//  Sending Email
const sendEmail = async (userEmail) => {
  const verificationCode = createVerificationCode(6);
  console.log('verification code = ' + verificationCode)

  return {
    success: 1,
    verificationCode: verificationCode
  };

  const msg = {
    to: userEmail,
    from: "silverstonks@silverstonksstaking.com",
    subject: "SSTX Staking Email Confirmation",
    html: `<p> Here's your Verification code:  ${verificationCode} </p>`,
    message: `Here's your Verification code:  ${verificationCode}`,
  };


  const result = await sgMail.send(msg);
  if (result && result[0].statusCode === 202) return {
    success: 1,
    verificationCode: verificationCode
  }
  else {
    return {
      success: 0
    }
  }
}


app.post('/signup/:walletAddress', async (req, res) => {
  const walletAddress = req.params.walletAddress;
  const {
    email
  } = req.body;

  // Check if user already exists
  const isFound = await User.findOneAndUpdate({
    walletAddress: walletAddress
  }, { "email": email }, {
    new: true
  });

  if (!isFound) await User.create({
    email,
    walletAddress
  });

  const isVerified = isFound && isFound.verified;

  // Sending Verification code via email
  const sendEmailStatus = await sendEmail(email);

  if (sendEmailStatus && !sendEmailStatus.success) {
    return res.status(422).json({
      success: 0,
      message: "Email Send Failed"
    })
  }

  const vuser = await User.findOne({
    email
  });
  vuser.verificationCode = sendEmailStatus.verificationCode;
  await vuser.save();

  return res.status(200).json({
    success: 1,
    message: "Successfuly sent verification code"
  })
});

app.post('/verify', async (req, res) => {
  const {
    verificationCode,
    email
  } = req.body;

  const user = await User.findOne({
    verificationCode
  });

  if (!user) {
    return res.status(401).json({
      success: 0,
      message: "Invalid Token"
    })
  }

  user.verified = true;
  await user.save();

  res.status(200).json({
    success: 1,
    user,
    token: generateToken(user._id)
  })
});

// Update User
app.patch('/updateUserById/:id', async (req, res, next) => {
  const id = req.params.id;
  const walletAddress = req.params.walletAddress;
  const userData = req.body;
  const user = await User.findOneAndUpdate({
    walletAddress: walletAddress
  }, userData, {
    new: true
  });
  res.status(200).json({
    success: true,
    data: user
  });
});

app.patch('/updateUserByWallet/:walletAddress/:totalStaked', async (req, res, next) => {
  const walletAddress = req.params.walletAddress;
  const totalStaked = parseFloat(req.params.totalStaked);
  console.log('***** BACKEND (243) updateUserByWallet walletAddress = ' + walletAddress);
  console.log('***** BACKEND (244) updateUserByWallet totalStaked = ' + totalStaked);

  let user = await User.findOneAndUpdate({
    walletAddress: walletAddress
  }, { "totalStaked": totalStaked }, {
    returnNewDocument: true
  });
  if (!user) {
    user = await User.create({
      walletAddress,
      totalStaked,
    });
  }

  console.log('****** BACKEND (251) user = ' + JSON.stringify(user));
  res.status(200).json({
    success: true,
    data: user
  });
});

app.patch('/updateWalletAuthorization/:walletAddress', async (req, res, next) => {
  const walletAddress = req.params.walletAddress;
  const user = await User.findOneAndUpdate({
    walletAddress: walletAddress
  }, { "walletAuthorized": true }, {
    returnNewDocument: true
  });
  res.status(200).json({
    success: true,
    data: user
  });
});

app.patch('/updateWAByWalletAddress/:id', async (req, res, next) => {
  const id = req.params.id;
  const user = await User.findOneAndUpdate({
    _id: id
  }, { "walletAuthorized": true }, {
    new: true
  });
  res.status(200).json({
    success: true,
    data: user
  });
});


// app.use(errorHandler);

getTokensInWallet = async function (wAddress, wDescription, divisor) {
  this.numTokens = 0;

  axios.get(URL + '&contractaddress=' + CONTRACTADDRESS + '&address=' + wAddress + '&tag=latest&apikey=' + API_KEY)
    .then((res) => {
      const r = Number(res.data.result) / divisor
      this.totalAmounts = this.totalAmounts + r
      return r
    })
    .catch((err => console.log(err)))
  // sleep(2000).then(() => {})
}


app.get("/circulatingsupply", async function (request, response) {
  this.total = 0;
  this.totalAmounts = 0;
  await this.getTokensInWallet(TWMWLOCKER, "Team Wallet & Marketing Wallet Locker Amount", 10000000)
    .then((returnVal) => {
      this.twmwLocker = this.numTokens
    }).then(async () => {
      await this.getTokensInWallet(TREASURYWALLET, "Treasury Wallet Amount", 10000000)
        .then((returnVal) => {
          this.treasuryWallet = this.numTokens
        })
      await this.getTokensInWallet(BURNADDRESS, "Burn Address Amount", 10000000)
        .then(async (returnVal) => {


          sleep(2000).then(() => {
            this.burnAddress = this.numTokens
            this.total = MAXSUPPLYAMT - this.totalAmounts
            // this.total = MAXSUPPLYAMT - (twmwLocker + treasuryWallet + burnAddress);
            returnMsg = this.total
            response.json(returnMsg)
          })
        })

    })
  return
})

app.get("/totalsupply", async function (request, response) {
  this.total = 0;
  this.totalAmounts = 0;
  await this.getTokensInWallet(BURNADDRESS, "Burn Address Amount", 10000000)
    .then(async (returnVal) => {
      sleep(3000).then(() => {
        this.burnAddress = this.totalAmounts
        this.total = MAXSUPPLYAMT - this.burnAddress
        returnMsg = this.total
        response.json(returnMsg)
      })
    })
  return
})

/*
 * Retrieves user information from the database, sorted
 * by totalStaked amounts
*/
app.get('/rankings', async (req, res) => {
  const userRankings = await User.find().sort({
    'totalStaked': -1
  })

  res.status(200).json({
    success: true,
    data: userRankings
  });
});

app.get('/getUserById/:id', async (req, res) => {
  const id = req.params.id;
  const user = await User.find({
    _id: id
  });
  res.status(200).json({
    success: true,
    data: user
  });
});

app.get('/getUserByWalletAddress/:walletAddress', async (req, res) => {
  console.log('BACKEND /getUserByWalletAddress...')
  const walletAddress = req.params.walletAddress;
  const user = await User.find({
    walletAddress: walletAddress
  });
  res.status(200).json({
    success: true,
    data: user
  });
});

app.get('/walletauthorized/:walletAddress', async (req, res) => {
  const walletAddress = req.params.walletAddress;
  const user = await User.find({
    walletAddress: walletAddress
  });

  const isAuthorized = user.data.walletAuthorized;
  console.log('**** BACKEND (walletauthorized): ' + isAuthorized)

  res.status(200).json({
    success: true,
    data: isAuthorized
  });
});



// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`.red);
});