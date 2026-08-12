const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

const prisma = require("../db/prisma.js");

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

  value.hashedPassword = await hashPassword(value.password);
  delete value.password;
  let user = null;

  const { name, email, hashedPassword } = value;

  try {
    user = await prisma.user.create({
      data: { name, email, hashedPassword },
      select: { name: true, email: true, id: true }, // specify the column values to return
    });
  } catch (err) {
    if (
      err.name === "PrismaClientKnownRequestError" &&
      err.code === "P2002"
    ) {
      return res.status(400).json({
        error: "Email already registered",
      });
    } else {
      return next(err);
    }
  }

  global.user_id = user.id;

  return res.status(201).json({
    name: user.name,
    email: user.email,
  });
}

async function logon(req, res) {
  const { email, password } = req.body;

  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return res.status(401).json();
  }
  const goodCredentials = await comparePassword(
    password,
    user.hashedPassword,
  );
  if (!goodCredentials) {
    return res.status(401).json();
  }
  const name = user.name;
  global.user_id = user.id;
  return res.status(200).json({
    name,
    email: normalizedEmail,
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
