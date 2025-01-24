const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bodyParser = require("body-parser");

// Initialize app
const app = express();
app.use(
  cors({
    origin: "http://localhost:5173", // Your frontend origin
  })
);
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
    seat: { type: Number, required: true },
    Bags: { type: Number, required: true },
    details: { type: String, required: true },
    imgSrc: { type: String, required: true }, // Main image
    additionalImages: {
      type: [String], // Array of image strings
      validate: {
        validator: function (value) {
          return value.length <= 3; // Limit to 3 additional images
        },
        message: "You can add up to 3 additional images.",
      },
    },
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
  driveType: { type: String, required: true },
  twentyFourHoursPrice: { type: Number, required: true },
  imgSrc: {
    type: [String], // Array of image strings
    validate: {
      validator: function (value) {
        return value.length <= 4; // Limit to 3 additional images
      },
      message: "You can add up to 3 additional images.",
    },
    required: true,
  },
});

const CarRent = mongoose.model("CarRent", carRentSchema);

const bookingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    carDetails: {
      type: Object, // You can define a more specific schema for carDetails if necessary
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    pickupLocation: {
      type: String,
      required: true,
    },
    dropoffLocation: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    rentalDuration: {
      type: Number, // in hours
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "canceled"], // Possible status values
      default: "pending",
    },
    paymentProof: {
      type: String, // This should be a string
      required: true, // Adjust if this is required
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

// Create the Booking model
const Booking = mongoose.model("Booking", bookingSchema);

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
  const { name, price, people, driveType, twentyFourHoursPrice, imgSrc } =
    req.body;

  try {
    const newCarRent = new CarRent({
      name,
      price,
      people,
      driveType,
      twentyFourHoursPrice,
      imgSrc,
    });

    await newCarRent.save();
    res.status(201).json({
      message: "Car for rent added successfully!",
      carRent: newCarRent,
    });
  } catch (err) {
    console.error(err); // Log error to get more details
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

app.post("/api/rentals/price", async (req, res) => {
  const { carId, hours, mopol } = req.body;

  try {
    const car = await CarRent.findById(carId);
    if (!car) return res.status(404).json({ msg: "Car not found" });

    let totalPrice = (car.price * hours) / 12; // Adjust price based on hours (base price is per 12 hours)

    if (mopol === "With Mopol") {
      totalPrice += 35000; // Add 35k if Mopol is selected
    }

    // Return car details along with the calculated total price
    res.json({
      totalPrice,
      carDetails: {
        name: car.name,
        imgSrc: car.imgSrc,
        people: car.people,
        driveType: car.driveType,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: "Error calculating price" });
  }
});

app.put("/api/rentals/:id", async (req, res) => {
  try {
    const { name, price, twentyFourHoursPrice } = req.body; // Get the updated car data from the request body

    // Find the car by ID and update the details
    const car = await CarRent.findByIdAndUpdate(
      req.params.id, // Car ID passed as parameter
      { name, price, twentyFourHoursPrice }, // New values for the fields
      { new: true } // Return the updated document
    );

    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    return res.status(200).json(car); // Return the updated car
  } catch (error) {
    console.error("Error updating car:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE: Delete a car
app.delete("/api/rentals/:id", async (req, res) => {
  try {
    const car = await CarRent.findByIdAndDelete(req.params.id); // Delete car by ID

    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    return res.status(200).json({ message: "Car deleted successfully" });
  } catch (error) {
    console.error("Error deleting car:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
// Add car endpoint (only accessible by admin)
app.post("/api/cars", auth, async (req, res) => {
  const {
    name,
    type,
    price,
    seat,
    Bags,
    details,
    imgSrc,
    additionalImages,
    status,
  } = req.body;

  if (!name || !type || !price || !seat || !Bags || !details || !imgSrc) {
    return res.status(400).json({ msg: "All fields are required." });
  }

  if (additionalImages && !Array.isArray(additionalImages)) {
    return res.status(400).json({ msg: "Additional images must be an array." });
  }

  try {
    const newCar = new Car({
      name,
      type,
      price,
      seat,
      Bags,
      details,
      imgSrc,
      additionalImages: additionalImages || [],
      status,
    });

    await newCar.save();
    res.json(newCar);
  } catch (err) {
    console.error(err);
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

app.patch("/api/cars/:id", async (req, res) => {
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

app.put("/api/carss/:id", async (req, res) => {
  try {
    const { name, price, details } = req.body; // Get the updated car data from the request body

    // Find the car by ID and update the details
    const car = await Car.findByIdAndUpdate(
      req.params.id, // Car ID passed as parameter
      { name, price, details }, // New values for the fields
      { new: true } // Return the updated document
    );

    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    return res.status(200).json(car); // Return the updated car
  } catch (error) {
    console.error("Error updating car:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE: Delete a car
app.delete("/api/cars/:id", async (req, res) => {
  try {
    const car = await Car.findByIdAndDelete(req.params.id); // Delete car by ID

    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }

    return res.status(200).json({ message: "Car deleted successfully" });
  } catch (error) {
    console.error("Error deleting car:", error);
    return res.status(500).json({ message: "Internal server error" });
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

app.post("/api/bookings", async (req, res) => {
  try {
    const {
      name,
      phone,
      carDetails,
      quantity,
      totalPrice,
      pickupLocation,
      destination,
      rentalDate,
      rentalDuration,
      status,
      paymentProof,
    } = req.body;

    const newBooking = new Booking({
      name,
      phone,
      carDetails,
      quantity,
      totalPrice,
      pickupLocation,
      destination,
      rentalDate,
      rentalDuration,
      status: status || "pending", // Default to 'pending' if not provided
      paymentProof, // Store the Base64 string for payment proof
    });

    await newBooking.save();

    res.status(201).json({
      message: "Booking created successfully",
      booking: newBooking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({
      message: "An error occurred while creating the booking",
      error: error.message,
    });
  }
});

// Route to get all bookings (for demonstration)
app.get("/api/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find();
    console.log("Bookings fetched:", bookings); // Add this line to log the bookings
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({
      message: "An error occurred while fetching the bookings",
      error: error.message,
    });
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
