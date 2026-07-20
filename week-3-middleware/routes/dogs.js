const express = require("express");
const dogs = require("../dogData");
//! This will contain custom Errors
const { ValidationError, NotFoundError } = require("../errors");

const router = express.Router();

router.get("/dogs", (req, res) => {
  res.status(200).json(dogs);
});

//! In POST /adopt, throw or pass a ValidationError if required fields are missing
router.post("/adopt", (req, res, next) => {
  const { name, address, email, dogName, status } = req.body;

  const isRequiredFieldMissing = [name, email, dogName].some(
    (reqField) => !reqField,
  );

  if (isRequiredFieldMissing) {
    return next(new ValidationError("Missing required fields"));
  }

  //POST /adopt with nonexistent or unavailable dog responds with status 404 (1 ms)
  const dog = dogs.find((dog) => dog.name === dogName);

  if (status === "unavailable" || !dog) {
    return next(new NotFoundError("not found or not available"));
  }

  res.status(201).json({
    message: `Adoption request received. We will contact you at ${email} for further details.`,
    application: {
      name,
      address,
      email,
      dogName,
      applicationId: Date.now(),
    },
  });
});

module.exports = router;
