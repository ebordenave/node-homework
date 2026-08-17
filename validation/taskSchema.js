const Joi = require("joi");

const taskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30).required(),
  isCompleted: Joi.boolean().default(false).not(null),
  priority: Joi.valid("low", "medium", "high").default("medium"),
});

const patchTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30),
  isCompleted: Joi.boolean(),
  priority: Joi.string().valid("low", "medium", "high"),
});

module.exports = { taskSchema, patchTaskSchema };
