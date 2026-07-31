const {
  taskSchema,
  patchTaskSchema,
} = require("../validation/taskSchema");

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

function create(req, res) {
  if (!req.body) req.body = {};
  const { error, value } = taskSchema.validate(req.body);
  if (error) return res.status(400).json();

  const newTask = {
    id: taskCounter(),
    userId: global.user_id.email,
    ...value,
  };

  global.tasks.push(newTask);

  const { userId, ...sanitizedTask } = newTask;

  return res.status(201).json(sanitizedTask);
}

function index(req, res) {
  const userTasks = global.tasks.filter(
    (task) => task.userId === global.user_id.email,
  );

  const sanitizedTasks = userTasks.map(
    ({ userId, ...sanitizedTask }) => sanitizedTask,
  );

  if (sanitizedTasks.length <= 0)
    return res.status(404).json();

  return res.status(200).json(sanitizedTasks);
}

function show(req, res) {
  const taskId = parseInt(req.params?.id);

  if (isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  const userTask = global.tasks.find(
    (task) =>
      task.id === taskId &&
      task.userId === global.user_id.email,
  );
  if (!userTask) {
    return res.status(404).json();
  }

  const { userId, ...sanitizedTask } = userTask;
  return res.status(200).json(sanitizedTask);
}

function update(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = patchTaskSchema.validate(
    req.body,
    {
      abortEarly: false,
    },
  );
  console.log(error);
  console.log(value);

  if (error)
    return res.status(400).json({
      message: error.message,
    });

  const taskId = parseInt(req.params?.id);

  if (isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  const userTask = global.tasks.find(
    (task) =>
      task.id === taskId &&
      task.userId === global.user_id.email,
  );

  if (!userTask) {
    return res.status(404).json();
  }

  Object.assign(userTask, value);

  const { userId, ...sanitizedTask } = userTask;

  return res.status(200).json(sanitizedTask);
}

function deleteTask(req, res) {
  const taskId = parseInt(req.params?.id);

  if (isNaN(taskId)) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  const index = global.tasks.findIndex(
    (task) =>
      task.id === taskId &&
      task.userId === global.user_id.email,
  );

  if (index === -1) {
    return res.status(404).json();
  }

  const deletedTask = global.tasks[index];

  global.tasks.splice(index, 1);

  const { userId, ...sanitizedTask } = deletedTask;

  return res.status(200).json(sanitizedTask);
}

module.exports = {
  create,
  taskCounter,
  index,
  show,
  update,
  deleteTask,
};
