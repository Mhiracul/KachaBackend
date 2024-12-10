// backend/routes/carRoutes.js
const express = require("express");
const { getCars, addCar } = require("../controllers/carcontoller");
const router = express.Router();

// Public route to get all cars
router.get("/", getCars);

// Admin route to add a new car
router.post("/", addCar);

module.exports = router;
