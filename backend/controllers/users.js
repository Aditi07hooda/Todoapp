import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { userModel } from "../models/schemaModel.js";
import {
  validateLoginUser,
  validateRegisterUser,
} from "../middlewares/validationZod.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const userSignup = async (req, res) => {
  try {
    const { username, emailId, password, confirmPassword } = req.body;
    const email = req.body.emailId;

    let user = await userModel.findOne({ email });
    if (user) {
      return res.status(400).json({ error: "Email is already in use" });
    }

    const validateUser = validateRegisterUser.safeParse({
      username,
      emailId,
      password,
    });

    if (!validateUser.success) {
      return res.status(400).send("Register failed");
    }

    const confirmPasswordMatch = req.body.password === req.body.confirmPassword;
    if (!confirmPasswordMatch) {
      return res.status(404).send("Password and confirm password didn't match");
    }

    user = await userModel.create({
      username: validateUser.data.username,
      emailId: validateUser.data.emailId,
      password: await bcrypt.hash(validateUser.data.password, 10),
    });
    if (!user) {
      return res.status(500).json({ error: "Error creating user" });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    return res
      .status(201)
      .cookie("token", token, {
        httpOnly: true,
        expires: new Date(Date.now() + 15 * 60 * 1000),
      })
      .json({
        msg: "User created successfully",
        userCreated: user,
      });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

const userSignin = async (req, res) => {
  const { emailId, password } = req.body;
  const validatingLoginUser = validateLoginUser.safeParse({
    emailId,
    password,
  });
  if (!validatingLoginUser.success) {
    return res
      .status(406)
      .send("Enter username and password in correct format");
  }
  const userFound = await userModel.findOne({ emailId: emailId });
  if (!userFound) {
    return res.send("user not found");
  }
  const passwordMatch = await bcrypt.compare(
    req.body.password,
    userFound.password
  );
  if (!passwordMatch) {
    return res.status(403).send("Invalid Password");
  }
  const token = jwt.sign({ _id: userFound._id }, process.env.JWT_SECRET);
  res.cookie("token", token, {
    httpOnly: true,
    expires: new Date(Date.now() + 60 * 1000),
  });
  res.status(200).json({ user: userFound });
};
const userSignout = (req, res) => {
  res.cookie("token", null, {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.send("User log out");
};

const userDetail = (req, res) => {
  const { token } = req.cookies;
  if(!token){
    res.status(404).send("Not found")
  }
  res.send("token found");
};

export { userSignin, userSignout, userSignup, userDetail };
