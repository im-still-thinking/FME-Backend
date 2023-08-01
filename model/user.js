const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: { type: String },
  walletAddress: { type: String, unique: true },
  token: { type: String },
  nonce: { type: Number },
});

module.exports = mongoose.model("user", userSchema);