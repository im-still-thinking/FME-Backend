const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: false, sparse: true },
  password: { type: String, required: false },
  walletAddress: { type: String, unique: true, required: false, sparse: true },
  token: { type: String, required: false },
  nonce: { type: Number, required: false },
});

module.exports = mongoose.model("user", userSchema);