// backend/models/Car.js
const mongoose = require("mongoose");

const CarSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  details: { type: String, required: true },
  imgSrc: { type: String, required: true }, // Base64 image
  status: { type: String, enum: ["Available", "Sold Out"], required: true },
});

module.exports = mongoose.model("Car", CarSchema);
