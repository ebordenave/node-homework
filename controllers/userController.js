const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

global.users;
const { userSchema } = require("../validation/userSchema");

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

async function register(req, res) {
  if (!req.body) req.body = {};

  // validation
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });

  // If error exists, return `400`.
  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  // otherwise
  // destructure from value
  const { name, email, password } = value;

  // Check duplicate email
  if (global.users.some((user) => user.email === email)) {
    return res.status(400).json();
  }

  // Hash password.
  const hashedPassword = await hashPassword(password);

  // Store hashedPassword
  const user = {
    email,
    name,
    hashedPassword,
  };

  global.user_id = user;
  global.users.push(user);

  // return name, email
  return res.status(201).json({
    name,
    email,
  });
}

async function logon(req, res) {
  const { email, password } = req.body;

  const currentUser = global.users.find((user) => user.email === email);

  if (currentUser) {
    const goodCredentials = await comparePassword(
      password,
      currentUser.hashedPassword,
    );
    const name = currentUser.name;
    if (goodCredentials) {
      global.user_id = currentUser;
      return res.status(200).json({
        name,
        email,
      });
    } else {
      return res.status(401).json();
    }
  } else {
    return res.status(401).json();
  }
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
