const express = require("express");

const {
  signUp,
  verify,
  updateUserById,
  getUserRanking,
  getUserById
} = require("../controllers/auth");

const router = express.Router();

router.post("/signup", signUp)
router.post("/verify", verify)
router.put("/:id", updateUserById)
router.get("/rankings", getUserRanking )
router.get("/:id", getUserById)

module.exports = router;
