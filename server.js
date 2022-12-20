var express = require("express");
var app = express();
var cfenv = require("cfenv");
var bodyParser = require('body-parser')
const fetch = require('node-fetch');
const axios = require('axios');
const {
  Int32
} = require("mongodb");

var twmwLocker = 0;
var treasuryWallet = 0;
var burnAddress = 0;
var total = 0;
var totalAmounts = 0;
var returnMsg = '';
const URL = 'https://api.bscscan.com/api?module=account&action=tokenbalance'
const API_KEY = 'TTA81VFV38X6FN98ZRYKPSR8WNJTTAII5V'
const CONTRACTADDRESS = '0x5396734569e26101677Eb39C89413F7fa7d8006f'
const TWMWLOCKER = '0xa9a9be77475f32f70ccaaf87b4a71cab7c4184a1'
const TREASURYWALLET = '0xa7be364a73f63c2f03b86822bb340a462edba4aa'
const BURNADDRESS = '0x000000000000000000000000000000000000DEAD'
const MAXSUPPLYAMT = 2300000000000
const request = require('request');
const {
  promisify
} = require('util')
const sleep = promisify(setTimeout)


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: false
}))

// parse application/json
app.use(bodyParser.json())

let mydb, cloudant;
var vendor; // Because the MongoDB and Cloudant use different API commands, we
// have to check which command should be used based on the database
// vendor.
var dbName = 'mydb';

// Separate functions are provided for inserting/retrieving content from
// MongoDB and Cloudant databases. These functions must be prefixed by a
// value that may be assigned to the 'vendor' variable, such as 'mongodb' or
// 'cloudant' (i.e., 'cloudantInsertOne' and 'mongodbInsertOne')

var insertOne = {};
var getAll = {};

insertOne.cloudant = function (doc, response) {
  mydb.insert(doc, function (err, body, header) {
    if (err) {
      console.log('[mydb.insert] ', err.message);
      response.send("Error");
      return;
    }
    doc._id = body.id;
    response.send(doc);
  });
}

getAll.cloudant = function (response) {
  var names = [];
  mydb.list({
    include_docs: true
  }, function (err, body) {
    if (!err) {
      body.rows.forEach(function (row) {
        if (row.doc.name)
          names.push(row.doc.name);
      });
      response.json(names);
    }
  });
  //return names;
}

let collectionName = 'mycollection'; // MongoDB requires a collection name.

insertOne.mongodb = function (doc, response) {
  mydb.collection(collectionName).insertOne(doc, function (err, body, header) {
    if (err) {
      console.log('[mydb.insertOne] ', err.message);
      response.send("Error");
      return;
    }
    doc._id = body.id;
    response.send(doc);
  });
}

getAll.mongodb = function (response) {
  var names = [];
  mydb.collection(collectionName).find({}, {
    fields: {
      _id: 0,
      count: 0
    }
  }).toArray(function (err, result) {
    if (!err) {
      result.forEach(function (row) {
        names.push(row.name);
      });
      response.json(names);
    }
  });
}

/* Endpoint to greet and add a new visitor to database.
 * Send a POST request to localhost:3000/api/visitors with body
 * {
 *   "name": "Bob"
 * }
 */
app.post("/api/visitors", function (request, response) {
  var userName = request.body.name;
  var doc = {
    "name": userName
  };
  if (!mydb) {
    console.log("No database.");
    response.send(doc);
    return;
  }
  insertOne[vendor](doc, response);
});

/**
 * Endpoint to get a JSON array of all the visitors in the database
 * REST API example:
 * <code>
 * GET http://localhost:3000/api/visitors
 * </code>
 *
 * Response:
 * [ "Bob", "Jane" ]
 * @return An array of all the visitor names
 */


getTokensInWallet = async function (wAddress, wDescription, divisor) {
  this.numTokens = 0;

  axios.get(URL + '&contractaddress=' + CONTRACTADDRESS + '&address=' + wAddress + '&tag=latest&apikey=' + API_KEY)
    .then((res) => {
      const r = Number(res.data.result) / divisor
      this.totalAmounts = this.totalAmounts + r
      console.log('*** ' + wDescription + ' = ' + r)
      console.log('*** totalAmounts = ' + this.totalAmounts)
      return r
    })
    .catch((err => console.log(err)))
  // sleep(2000).then(() => {})
}


// getTokensInWallet = function (wAddress, wDescription) {
//   this.numTokens = 0;
//   return (axios.get(URL + '&contractaddress=' + CONTRACTADDRESS + '&address=' + wAddress + '&tag=latest&apikey=' + API_KEY) / 100)
//     .then((response) => {
//       this.numTokens = Number(response.data.result) / 100;
//       // console.log('*** response.data = ' + JSON.stringify(response.data));
//       console.log('*** ' + wDescription + ' = ' + this.numTokens);
//     })
// }

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
            console.log('*** MAXSUPPLYAMT = ' + MAXSUPPLYAMT);
            console.log('*** totalAmounts = ' + this.totalAmounts);
            console.log('*** total = ' + this.total);
            returnMsg = this.total
            console.log('**** Circulating Supply Amount = ' + this.total);
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
      sleep(5000).then(() => {
        this.burnAddress = this.totalAmounts
        this.total = MAXSUPPLYAMT - this.burnAddress
        console.log('*** MAXSUPPLYAMT = ' + MAXSUPPLYAMT);
        console.log('*** totalAmounts = ' + this.totalAmounts);
        console.log('*** total = ' + this.total);
        returnMsg = this.total
        response.json(returnMsg)
      })
    })
  return
})

// app.get("/api/csupplyamt", function (request, response) {
//   var amt = { "status": "1", "message": "OK", "result": "1876362965006" }
//   response.json(amt)
//   return;
// });

app.get("/api/visitors", function (request, response) {
  var names = [];
  if (!mydb) {
    response.json(names);
    return;
  }
  getAll[vendor](response);
});

// load local VCAP configuration  and service credentials
var vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
  console.log("Loaded local VCAP", vcapLocal);
} catch (e) {}

const appEnvOpts = vcapLocal ? {
  vcap: vcapLocal
} : {}

const appEnv = cfenv.getAppEnv(appEnvOpts);

if (appEnv.services['compose-for-mongodb'] || appEnv.getService(/.*[Mm][Oo][Nn][Gg][Oo].*/)) {
  // Load the MongoDB library.
  var MongoClient = require('mongodb').MongoClient;

  dbName = 'mydb';

  // Initialize database with credentials
  if (appEnv.services['compose-for-mongodb']) {
    MongoClient.connect(appEnv.services['compose-for-mongodb'][0].credentials.uri, null, function (err, db) {
      if (err) {
        console.log(err);
      } else {
        mydb = db.db(dbName);
        console.log("Created database: " + dbName);
      }
    });
  } else {
    // user-provided service with 'mongodb' in its name
    MongoClient.connect(appEnv.getService(/.*[Mm][Oo][Nn][Gg][Oo].*/).credentials.uri, null,
      function (err, db) {
        if (err) {
          console.log(err);
        } else {
          mydb = db.db(dbName);
          console.log("Created database: " + dbName);
        }
      }
    );
  }

  vendor = 'mongodb';
} else if (appEnv.services['cloudantNoSQLDB'] || appEnv.getService(/[Cc][Ll][Oo][Uu][Dd][Aa][Nn][Tt]/)) {
  // Load the Cloudant library.
  var Cloudant = require('@cloudant/cloudant');

  // Initialize database with credentials
  if (appEnv.services['cloudantNoSQLDB']) {
    cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);
  } else {
    // user-provided service with 'cloudant' in its name
    cloudant = Cloudant(appEnv.getService(/cloudant/).credentials);
  }
} else if (process.env.CLOUDANT_URL) {
  // Load the Cloudant library.
  var Cloudant = require('@cloudant/cloudant');

  if (process.env.CLOUDANT_IAM_API_KEY) { // IAM API key credentials
    let cloudantURL = process.env.CLOUDANT_URL
    let cloudantAPIKey = process.env.CLOUDANT_IAM_API_KEY
    cloudant = Cloudant({
      url: cloudantURL,
      plugins: {
        iamauth: {
          iamApiKey: cloudantAPIKey
        }
      }
    });
  } else { //legacy username/password credentials as part of cloudant URL
    cloudant = Cloudant(process.env.CLOUDANT_URL);
  }
}
if (cloudant) {
  //database name
  dbName = 'mydb';

  // Create a new "mydb" database.
  cloudant.db.create(dbName, function (err, data) {
    if (!err) //err if database doesn't already exists
      console.log("Created database: " + dbName);
  });

  // Specify the database we are going to use (mydb)...
  mydb = cloudant.db.use(dbName);

  vendor = 'cloudant';
}

//serve static file (index.html, images, css)
app.use(express.static(__dirname + '/views'));

var port = process.env.PORT || 3000
app.listen(port, function () {
  console.log("To view your app, open this link in your browser: http://localhost:" + port);
});