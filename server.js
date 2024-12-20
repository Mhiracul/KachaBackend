const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bodyParser = require("body-parser");

// Initialize app
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" })); // Increase the JSON limit
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// MongoDB URI
const mongoURI =
  "mongodb+srv://Kacha:Kacha123@kacha.8k2oz.mongodb.net/Kacha?retryWrites=true&w=majority";
mongoose
  .connect(mongoURI)
  .then(() => console.log("Mongo connection successful"))
  .catch((err) => console.error("Mongo connection failed", err));

// Car and Admin Models
const Car = mongoose.model(
  "Car",
  new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    price: { type: Number, required: true },
    details: { type: String, required: true },
    imgSrc: { type: String, required: true },
    status: {
      type: String,
      enum: ["Available", "Sold Out"],
      default: "Available",
    },
  })
);

const carRentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  people: { type: Number, required: true }, // Number of people
  driveType: { type: String, required: true }, // Driver or Self Drive
  imgSrc: { type: String, required: true }, // Base64 image
});

const CarRent = mongoose.model("CarRent", carRentSchema);

const Admin = mongoose.model(
  "Admin",
  new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  })
);

// JWT Secret
const JWT_SECRET =
  "a8738a2a7d51928e68f923ed8234311e09cdb0e2401af91abf6a7c5cc5db6aded542e9b11912cbae02abdfad4afa836c643262d1c087b24b05b23e0a045e6546";

// Admin login endpoint
// Admin login endpoint
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ msg: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ username: admin.username }, JWT_SECRET, {
      expiresIn: "1h",
    });

    // Log successful login to the console
    console.log(`Admin ${admin.username} logged in successfully`);

    res.json({ token });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Middleware for JWT authentication
const auth = (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token)
    return res.status(401).json({ msg: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
};

app.post("/api/rentals", auth, async (req, res) => {
  const { name, price, people, driveType, imgSrc, details, status } = req.body;

  try {
    const newCarRent = new CarRent({
      name,
      price,
      people,
      driveType,
      imgSrc,
    });

    await newCarRent.save();
    res.status(201).json({
      message: "Car for rent added successfully!",
      carRent: newCarRent,
    });
  } catch (err) {
    res.status(500).json({ msg: "Error saving car rental", error: err });
  }
});

// Get all car rentals (public endpoint)
app.get("/api/rentals", async (req, res) => {
  try {
    const carRents = await CarRent.find();
    res.json(carRents);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching car rentals" });
  }
});
// Add car endpoint (only accessible by admin)
app.post("/api/cars", auth, async (req, res) => {
  const { name, type, price, details, imgSrc, status } = req.body;

  try {
    const newCar = new Car({ name, type, price, details, imgSrc, status });
    await newCar.save();
    res.json(newCar);
  } catch (err) {
    res.status(500).json({ msg: "Error saving car" });
  }
});

// Get all cars (public endpoint)
app.get("/api/cars", async (req, res) => {
  try {
    const cars = await Car.find();
    res.json(cars);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching cars" });
  }
});

app.put("/api/cars/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !["Available", "Sold Out"].includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }

  try {
    const car = await Car.findById(id);
    if (!car) {
      return res.status(404).json({ message: "Car not found." });
    }

    car.status = status;
    await car.save();
    res.status(200).json({ message: "Car status updated successfully.", car });
  } catch (error) {
    console.error("Error updating car status:", error);
    res.status(500).json({ message: "Failed to update car status." });
  }
});
// Admin creation endpoint (secured)
app.post("/api/admin/create", auth, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ msg: "Username and password are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
    const newAdmin = new Admin({ username, password: hashedPassword });
    await newAdmin.save();
    res.status(201).json({ msg: "Admin created successfully" });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ msg: "Username already exists" });
    } else {
      res.status(500).json({ msg: "Error creating admin" });
    }
  }
});

// Script to programmatically create an admin (run only once)
const createAdmin = async () => {
  const username = "admin"; // Replace with desired username
  const password = "Kacha"; // Replace with desired password

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ username, password: hashedPassword });
    await newAdmin.save();
    console.log("Admin created successfully!");
  } catch (err) {
    console.error("Error creating admin:", err);
  }
};
// Uncomment the following line to create an admin when server starts (use only once, then comment it back)
//createAdmin();

// Start server
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
