const prisma = require("../../db/prisma");
const userSchema =
  require("../validation/userSchema").userSchema;
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const pool = require("../../db/pg-pool");

const cookieFlags = (req) => {
  return {
    ...(process.env.NODE_ENV === "production" && {
      domain: req.hostname,
    }), // add domain into cookie for production only
    // httpOnly: true, bug
    secure: process.env.NODE_ENV === "production",
    sameSite:
      process.env.NODE_ENV === "production"
        ? "None"
        : "Lax",
  };
};

const setJwtCookie = (req, res, user) => {
  // Sign JWT
  const payload = { id: user.id, csrfToken: randomUUID() };
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1h",
  }); // 1 hour expiration
  // Set cookie.  Note that the cookie flags have to be different in production and in test.
  res.cookie("jwt", token, {
    ...cookieFlags(req),
    maxAge: 3600000,
  }); // 1 hour expiration
  return payload.csrfToken; // this is needed in the body returned by logon() or register()
};

const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

exports.register = async (req, res, next) => {
  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  let user = null;

  value.hashed_password = await hashPassword(
    value.password,
  );

  // the code to here is like the in-memory version
  try {
    user = await pool.query(
      `INSERT INTO users (email, name, hashed_password) 
      VALUES ($1, $2, $3) RETURNING id, email, name`,
      [value.email, value.name, value.hashed_password],
    ); // note that you use a parameterized query
  } catch (e) {
    // the email might already be registered
    if (e.code === "23505") {
      // this means the unique constraint for email was violated
      // here you return the 400 and the error message.  Use a return statement, so that
      return res.status(400).json({
        error: "Email already registered",
      });
      // you don't keep going in this function
    }
    return next(e); // all other errors get passed to the error handler
  }
  // otherwise user now contains the new user.  You can return a 201 and the appropriate
  const newUser = user.rows[0];

  // object.  Be sure to also set global.user_id with the id of the user record you just created.
  global.user_id = newUser.id;

  return res.status(201).json({
    name: newUser.name,
    email: newUser.email,
  });
};

exports.logon = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required" });
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res
      .status(401)
      .json({ message: "Invalid credentials" });
  }

  // const isValidPassword = await comparePassword(
  //   password,
  //   user.hashedPassword,
  // );

  // if (!isValidPassword) {
  //   return res.status(401).json({ message: "Invalid credentials" });
  // } bug

  // Store user ID globally for session management (not secure for production)
  const csrfToken = setJwtCookie(req, res, user);

  res.status(200).json({
    name: user.name,
    email: user.email,
    csrfToken,
  });
};

exports.logoff = async (req, res) => {
  // Clear the global user ID for session management
  // res.clearCookie("jwt", cookieFlags(req));
  res.sendStatus(200);
};

exports.show = async (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res
      .status(400)
      .json({ error: "Invalid user ID" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      Task: {
        where: { isCompleted: false },
        select: {
          id: true,
          title: true,
          priority: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
  if (!user) {
    return res
      .status(404)
      .json({ message: "User not found" });
  }

  res.status(200).json(user);
};
