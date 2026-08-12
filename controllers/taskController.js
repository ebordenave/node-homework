const {
  taskSchema,
  patchTaskSchema,
} = require("../validation/taskSchema");

const prisma = require("../db/prisma");

async function create(req, res, next) {
  if (!req.body) req.body = {};

  // joi validation
  const { error, value } = taskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  try {
    const task = await prisma.task.create({
      data: {
        ...value,
        userId: global.user_id,
      },
      select: {
        title: true,
        id: true,
        isCompleted: true,
      },
    });

    return res.status(201).json(task);
  } catch (err) {
    return next(err);
  }
}

async function index(req, res) {
  const tasks = await prisma.task.findMany({
    where: {
      userId: global.user_id,
    },
    select: { title: true, isCompleted: true, id: true },
  });

  if (tasks.length === 0) {
    return res.status(404).json();
  }

  return res.status(200).json(tasks);
}

async function show(req, res, next) {
  const taskId = parseInt(req.params?.id);

  if (isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    //   const task = await prisma.task.findUniqueOrThrow({
    const task = await prisma.task.findUnique({
      where: {
        id_userId: {
          id: taskId,
          userId: global.user_id,
        },
      },
      select: { title: true, id: true, isCompleted: true },
    });
    if (!task) {
      return res.status(404).json({
        message: "The task was not found.",
      });
    }
    return res.status(200).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res
        .status(404)
        .json({ message: "The task was not found." });
    } else {
      return next(err); // pass other errors to the global error handler
    }
  }
}

async function update(req, res, next) {
  if (!req.body) req.body = {};

  const { error, value } = patchTaskSchema.validate(
    req.body,
    {
      abortEarly: false,
    },
  );

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  const id = parseInt(req.params?.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const task = await prisma.task.update({
      data: value,
      where: { id_userId: { id, userId: global.user_id } },
      select: { title: true, isCompleted: true, id: true },
    });
    return res.status(200).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res
        .status(404)
        .json({ message: "The task was not found." });
    } else {
      return next(err); // pass other errors to the global error handler
    }
  }
}

async function deleteTask(req, res, next) {
  const id = parseInt(req.params?.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const task = await prisma.task.delete({
      where: { id_userId: { id, userId: global.user_id } },
      select: {
        title: true,
        isCompleted: true,
        id: true,
      },
    });

    return res.status(200).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({
        message: "The task was not found.",
      });
    }

    return next(err);
  }
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
