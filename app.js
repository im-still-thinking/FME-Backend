require("dotenv").config();
require("./config/database").connect();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./model/user");
const auth = require("./middleware/auth");
const cors = require("cors");
const {Web3} = require("Web3");

const app = express();

app.use(express.json());
app.use(cors());

const web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/ba9f989627a147db94806086792b6409'))

// Register
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

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

    await user.updateOne({ $set: { token: token } });

    res.status(201).json(user);
  } catch (err) {
    console.log(err);
    res.send(401).json(err);
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

      await user.updateOne({ $set: { token: token } });

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

      await user.updateOne({ $set: { nonce: nonce.toString() } });

      res.status(201).json(nonce);
    } else {
      const user = await User.create({
        walletAddress: req.params.wallet_address,
      });
      const nonce = Math.floor(Math.random() * 1000000);

      await user.updateOne({ $set: { nonce: nonce.toString() } });

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

      console.log(user.walletAddress)

      const recoveredAddress = web3.eth.accounts.recover(msg, req.body.signature);

      console.log(recoveredAddress)

      if (recoveredAddress) {
        console.log("Bruh")
        user.nonce = Math.floor(Math.random() * 1000000).toString();
        user.save();

        const token = jwt.sign(
          {
            _id: user._id,
            address: user.walletAddress,
          },
          process.env.TOKEN_KEY,
          { expiresIn: "2h" }
        );

        await user.updateOne({ $set: { token: token } });

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
});

module.exports = app;
