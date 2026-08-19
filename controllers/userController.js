const crypto = require("crypto");
const { randomUUID } = require("crypto");

const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

const jwt = require("jsonwebtoken");

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

const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };
};

const setJwtCookie = (req, res, user) => {
  const payload = { id: user.id, csrfToken: randomUUID() };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 });
  return payload.csrfToken;
};

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

  const { name, email, hashedPassword } = value;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, name, hashedPassword },
        select: { id: true, email: true, name: true },
      });

      const welcomeTaskData = [
        {
          title: "Complete your profile",
          userId: newUser.id,
          priority: "medium",
        },
        {
          title: "Add your first task",
          userId: newUser.id,
          priority: "high",
        },
        {
          title: "Explore the app",
          userId: newUser.id,
          priority: "low",
        },
      ];
      await tx.task.createMany({ data: welcomeTaskData });

      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: {
            in: welcomeTaskData.map((t) => t.title),
          },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });

      return { user: newUser, welcomeTasks };
    });

    const csrfToken = setJwtCookie(req, res, result.user);

    res.status(201).json({
      user: result.user,
      name: result.user.name,
      email: email,
      csrfToken,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
    });

    return;
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Email already registered" });
    } else {
      return next(err);
    }
  }
}

async function logon(req, res) {
  const { email, password } = req.body;

  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      hashedPassword: true,
    },
  });

  if (!user) {
    return res.status(401).json();
  }
  const goodCredentials = await comparePassword(password, user.hashedPassword);
  if (!goodCredentials) {
    return res.status(401).json();
  }
  const name = user.name;

  const csrfToken = setJwtCookie(req, res, user);

  return res.status(200).json({
    name: name,
    email: normalizedEmail,
    csrfToken,
    transactionStatus: "success",
  });
}

function logoff(req, res) {
  res.clearCookie("jwt", cookieFlags(req));
  res.status(200).json();
}

async function show(req, res) {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
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
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json(user);
}

module.exports = {
  register,
  logon,
  logoff,
  show,
};
