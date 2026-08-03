const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const pool = require("../db/pg-pool.js");

const { userSchema } = require("../validation/userSchema");

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  if (!storedHash) return false;
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

async function register(req, res, next) {
  if (!req.body) req.body = {};

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
    // this means the unique constraint for email was violated
    // here you return the 400 and the error message.  Use a return statement, so that
    // you don't keep going in this function
    if (e.code === "23505") {
      return res.status(400).json({
        error: "Email already registered",
      });
    }
    return next(e); // all other errors get passed to the error handler
  }

  const newUser = user.rows[0];

  // otherwise user now contains the new user.  You can return a 201 and the appropriate
  // object.  Be sure to also set global.user_id with the id of the user record you just created.
  global.user_id = newUser.id;

  return res.status(201).json({
    name: newUser.name,
    email: newUser.email,
  });
  // Do not return the hashed_password or user_id for the user you just created. Those values should stay internal. Return only the name and email in the response body.
}

async function logon(req, res) {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email],
  );

  const currentUser = result.rows[0];

  if (!currentUser) {
    return res.status(401).json();
  }
  const goodCredentials = await comparePassword(
    password,
    currentUser.hashed_password,
  );
  if (!goodCredentials) {
    return res.status(401).json();
  }
  const name = currentUser.name;
  global.user_id = currentUser.id;
  return res.status(200).json({
    name,
    email,
  });
}

function logoff(req, res) {
  global.user_id = null;
  res.status(200).json();
}

module.exports = {
  register,
  logon,
  logoff,
};
