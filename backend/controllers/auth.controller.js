import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registerUser = async (req, res) => {
  try {
    const { name, email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({
        message: "email, username, and password are required",
      });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "password must be at least 6 characters long and contain at least one uppercase letter, one number, and one special character",
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        message: "email already exists. Oops!!",
      });
    }
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        message: "username is already used. (TRY SOME CUTE NAME)",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      username,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "hurray!! WLECOME TO THE NEW WORLD",
      userId: user._id,
    });
  } catch (error) {
    console.error('registerUser error:', error);
    res.status(500).json({
      message: "server errorrrrr :(",
    });
  }
};

export const loginUser = async (req, res) => {
    try{
        const{email, password} = req.body;

        if(!email || !password){
            return res.status(400).json({
                message: "email and password are required",
            });
        }
        const user = await User.findOne({email}).select("+password");

        if(!user){
            return res.status(400).json({
                message: "Invalid Credentials",
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if(!isPasswordMatch){
            return res.status(400).json({
                message: "Invalid Credentials",
            });
        }
        const token = jwt.sign(
            { userId: user._id},
            process.env.JWT_SECRET,
            {expiresIn: "1d"}
        );
        res.status(200).json({
            message: "Login Successful",
            token,
            userId: user._id,
        });
        
    } catch (error) {
        res.status(500).json({
            message: "server errorrrrr :(",
        });
    }
};
