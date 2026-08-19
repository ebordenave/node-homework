const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");

async function create(req, res, next) {
  if (!req.body) req.body = {};

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
        userId: req.user.id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
      },
    });

    return res.status(201).json(task);
  } catch (err) {
    return next(err);
  }
}

async function index(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1 || limit < 1 || limit > 100) {
    return res.status(400).json({
      message: "Invalid pagination parameters",
    });
  }

  const skip = (page - 1) * limit;

  const sortBy = req.query.sortBy;
  const sortDirection = req.query.sortDirection;

  const whereClause = {
    userId: req.user.id,
  };

  const { find } = req.query;

  if (find) {
    whereClause.title = {
      contains: find,
      mode: "insensitive",
    };
  }

  const { priority } = req.query;
  const validPriorities = ["low", "medium", "high"];

  if (validPriorities.includes(priority)) {
    whereClause.priority = priority;
  }

  const { isCompleted } = req.query;

  if (isCompleted !== undefined) {
    whereClause.isCompleted = isCompleted === "true";
  }

  const { min_date, max_date } = req.query;

  if (min_date || max_date) {
    whereClause.createdAt = {};

    if (min_date) {
      whereClause.createdAt.gte = new Date(min_date);
    }

    if (max_date) {
      whereClause.createdAt.lte = new Date(max_date);
    }
  }

  function getOrderBy(sortBy, sortDirection) {
    const validSortFields = ["title", "priority", "createdAt"];
    const validSortDirections = ["asc", "desc"];

    if (!validSortFields.includes(sortBy)) {
      sortBy = "createdAt";
    }

    if (!validSortDirections.includes(sortDirection)) {
      sortDirection = "desc";
    }

    return {
      [sortBy]: sortDirection,
    };
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    skip,
    take: limit,
    orderBy: getOrderBy(sortBy, sortDirection),
  });

  const totalTasks = await prisma.task.count({
    where: whereClause,
  });

  const pagination = {
    page,
    limit,
    total: totalTasks,
    pages: Math.ceil(totalTasks / limit),
    hasNext: page * limit < totalTasks,
    hasPrev: page > 1,
  };

  return res.status(200).json({
    tasks,
    pagination,
  });
}

async function show(req, res, next) {
  const taskId = parseInt(req.params?.id);

  if (isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const task = await prisma.task.findUnique({
      where: {
        id_userId: {
          id: taskId,
          userId: req.user.id,
        },
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({
        message: "The task was not found.",
      });
    }

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

async function update(req, res, next) {
  if (!req.body) req.body = {};

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });

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
      where: {
        id_userId: {
          id,
          userId: req.user.id,
        },
      },
      data: value,
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
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

async function deleteTask(req, res, next) {
  const id = parseInt(req.params?.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  try {
    const task = await prisma.task.delete({
      where: {
        id_userId: {
          id,
          userId: req.user.id,
        },
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
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

async function bulkCreate(req, res, next) {
  const { tasks } = req.body;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  const validTasks = [];

  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);

    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details,
      });
    }

    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || "medium",
      userId: req.user.id,
    });
  }

  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    return res.status(201).json({
      message: "success!",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
  bulkCreate,
};
