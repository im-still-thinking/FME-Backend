require("dotenv").config();
require("./config/database").connect();

const express = require("express");
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");

const User = require("./model/user");
const auth = require("./middleware/auth");
const cors = require('cors')

const app = express();

app.use(express.json());
app.use(cors())

// Register
app.post("/register", async (req, res) => {
  try {
    const { email, password} = req.body;

    if (!(email && password)) {
      res.status(400).send("All input is required");
    }

    const oldUser = await User.findOne({ email });

    if (oldUser) {
      return res.status(409).send("User Already Exist. Please Login");
    }

    encryptedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      password: encryptedPassword,
    });

    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: "2h",
      }
    );

    user.token = token;

    res.status(201).json(user);
  } catch (err) {
    console.log(err);
    res.send(401).json(err)
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!(email && password)) {
      res.status(400).send("All input is required");
    }

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        { user_id: user._id, email },
        process.env.TOKEN_KEY,
        {
          expiresIn: "2h",
        }
      );

      user.token = token;

      res.status(200).json(user);
    }
    res.status(400).send("Invalid Credentials");
  } catch (err) {
    console.log(err);
  }
});

// Get Nonce
app.get("/:wallet_address/nonce", async (req, res) => {
  try {
    const user = await User.findOne({
      walletAddress: req.params.wallet_address,
    });
    if (user) {
      const nonce = Math.floor(Math.random() * 1000000);

      user.nonce = nonce;

      res.status(201).json(nonce);
    } else {
      const user = await User.create({
        walletAddress: req.params.wallet_address,
      });
      const nonce = Math.floor(Math.random() * 1000000);

      user.nonce = nonce;

      res.status(201).json(nonce);
    }
  } catch (err) {
    console.log(error);
  }
});

// Verify Signature
app.post("/:wallet_address/signature", async (req, res) => {
  try {
    const user = await User.findOne({
      walletAddress: req.params.wallet_address,
    });

    if (user) {
      const msg = `Nonce: ${user.nonce}`;
      // Convert msg to hex string
      const msgHex = ethUtil.bufferToHex(Buffer.from(msg));

      // Check if signature is valid
      const msgBuffer = ethUtil.toBuffer(msgHex);
      const msgHash = ethUtil.hashPersonalMessage(msgBuffer);
      const signatureBuffer = ethUtil.toBuffer(req.body.signature);
      const signatureParams = ethUtil.fromRpcSig(signatureBuffer);
      const publicKey = ethUtil.ecrecover(
        msgHash,
        signatureParams.v,
        signatureParams.r,
        signatureParams.s
      );
      const addresBuffer = ethUtil.publicToAddress(publicKey);
      const address = ethUtil.bufferToHex(addresBuffer);

      if (address.toLowerCase() === req.params.wallet_address.toLowerCase()) {
        user.nonce = Math.floor(Math.random() * 1000000);
        user.save();

        const token = jwt.sign(
          {
            _id: user._id,
            address: user.walletAddress,
          },
          process.env.TOKEN_KEY,
          { expiresIn: "2h" }
        );
        
        user.token = token;

        res.status(200).json(user);
      }

      res.status(401).send("Invalid credentials");
    }

    res.status(401).send("User does not exist");
  } catch (error) {
    console.log(error);
  }
});

app.post("/testing", auth, (req, res) => {
    res.status(200).send("Testing Authentication");
});

app.get("/", (req, res) => {
    res.status(200).send("Hello World");
})

module.exports = app;
