const express = require("express");
const dogs = require("../dogData");

const { ValidationError, NotFoundError } = require("../errors");

const router = express.Router();

router.get("/dogs", (req, res) => {
  res.status(200).json(dogs);
});

router.post("/adopt", (req, res, next) => {
  const { name, address, email, dogName, status } = req.body;

  const isRequiredFieldMissing = [name, email, dogName].some(
    (reqField) => !reqField,
  );

  if (isRequiredFieldMissing) {
    return next(new ValidationError("Missing required fields"));
  }

  const dog = dogs.find((dog) => dog.name === dogName);

  if (dog?.status !== "available") {
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
