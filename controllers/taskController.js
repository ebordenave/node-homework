const {
  taskSchema,
  patchTaskSchema,
} = require("../validation/taskSchema");

const pool = require("../db/pg-pool");

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

async function create(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error)
    return res.status(400).json({ message: error.message });
  // task is the full PostgreSQL result object
  const task = await pool.query(
    `INSERT INTO tasks (title, is_completed, user_id) 
  VALUES ( $1, $2, $3 ) RETURNING id, title, is_completed`,
    [value.title, value.isCompleted, global.user_id],
  );
  // newTask is the newly created task
  const newTask = task.rows[0];

  return res.status(201).json(newTask);
}

// gets a list of tasks-- it is an index of resources
async function index(req, res) {
  const tasks = await pool.query(
    "SELECT id, title, is_completed FROM tasks WHERE user_id = $1",
    [global.user_id],
  );

  if (tasks.rowCount <= 0) {
    return res.status(404).json();
  }

  return res.status(200).json(tasks.rows);
}

async function show(req, res) {
  const taskId = parseInt(req.params?.id);

  if (isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  const tasks = await pool.query(
    "SELECT id, title, is_completed FROM tasks WHERE user_id = $1 AND id = $2",
    [global.user_id, taskId],
  );

  if (!tasks.rows[0]) {
    return res.status(404).json();
  }

  const currentTask = tasks.rows[0];

  return res.status(200).json(currentTask);
}

async function update(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = patchTaskSchema.validate(
    req.body,
    {
      abortEarly: false,
    },
  );

  if (error)
    return res.status(400).json({
      message: error.message,
    });

  const taskId = parseInt(req.params?.id, 10);

  if (isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  const taskChange = value;

  let keys = Object.keys(taskChange);

  keys = keys.map((key) =>
    key === "isCompleted" ? "is_completed" : key,
  );

  const setClauses = keys
    .map((key, i) => `${key} = $${i + 1}`)
    .join(", ");

  const idParm = `$${keys.length + 1}`;
  const userParm = `$${keys.length + 2}`;

  const updatedTask = await pool.query(
    `UPDATE tasks SET ${setClauses} 
    WHERE id = ${idParm} AND user_id = ${userParm} RETURNING id, title, is_completed`,
    [...Object.values(taskChange), taskId, global.user_id],
  );

  if (updatedTask.rowCount === 0) {
    return res.status(404).json();
  }

  return res.status(200).json(updatedTask.rows[0]);
}

async function deleteTask(req, res) {
  const taskId = parseInt(req.params?.id, 10);

  if (isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  const tasks = await pool.query(
    "SELECT id, title, is_completed FROM tasks WHERE user_id = $1 AND id = $2",
    [global.user_id, taskId],
  );

  if (!tasks.rows[0]) {
    return res.status(404).json();
  }

  const deletedTask = tasks.rows[0];

  await pool.query(
    "DELETE FROM tasks WHERE user_id = $1 AND id = $2",
    [global.user_id, taskId],
  );

  return res.status(200).json(deletedTask);
}

module.exports = {
  create,
  taskCounter,
  index,
  show,
  update,
  deleteTask,
};
