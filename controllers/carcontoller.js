// backend/controllers/carController.js
const Car = require("./models/Car");

// Get all cars
const getCars = async (req, res) => {
  try {
    const cars = await Car.find();
    res.json(cars);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Add a new car (admin only)
const addCar = async (req, res) => {
  const { name, type, price, details, imgSrc, status } = req.body;

  try {
    const newCar = new Car({ name, type, price, details, imgSrc, status });
    await newCar.save();
    res.status(201).json(newCar);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = { getCars, addCar };
