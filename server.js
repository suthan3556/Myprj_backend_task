
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(express.json());

// Task Schema
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["Pending", "Ongoing", "Completed"],
      default: "Pending"
    }
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);

// Home Route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Task Management API is Running!",
    server: "Connected",
    database: mongoose.connection.readyState === 1
      ? "MongoDB Atlas Connected"
      : "MongoDB Not Connected",
    databaseName: mongoose.connection.name || null
  });
});

// Database Status Route
app.get("/db-status", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    database: connected ? "Connected" : "Disconnected",
    databaseName: mongoose.connection.name || null,
    host: mongoose.connection.host || null
  });
});

// Get All Tasks
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({
      message: "Could not fetch tasks",
      error: err.message
    });
  }
});

// Add New Task
app.post("/tasks", async (req, res) => {
  try {
    const { title } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required"
      });
    }

    const newTask = await Task.create({
      title: title.trim()
    });

    res.status(201).json({
      message: "Task created successfully",
      task: newTask
    });
  } catch (err) {
    res.status(400).json({
      message: "Could not create task",
      error: err.message
    });
  }
});

// Update Task Status
app.patch("/tasks/:id", async (req, res) => {
  try {
    const { status } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid task ID"
      });
    }

    if (!["Pending", "Ongoing", "Completed"].includes(status)) {
      return res.status(400).json({
        message: "Invalid task status"
      });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        returnDocument: "after",
        runValidators: true
      }
    );

    if (!updatedTask) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    res.status(200).json({
      message: "Task updated successfully",
      task: updatedTask
    });
  } catch (err) {
    res.status(400).json({
      message: "Could not update task",
      error: err.message
    });
  }
});

// Delete Task
app.delete("/tasks/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid task ID"
      });
    }

    const deletedTask = await Task.findByIdAndDelete(
      req.params.id
    );

    if (!deletedTask) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    res.status(200).json({
      message: "Task deleted successfully"
    });
  } catch (err) {
    res.status(400).json({
      message: "Could not delete task",
      error: err.message
    });
  }
});

// MongoDB Atlas Connection
async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGODB_URI is missing in .env file");
    }

    await mongoose.connect(MONGO_URI);

    console.log("================================");
    console.log("MongoDB Atlas Connected Successfully");
    console.log("Database:", mongoose.connection.name);
    console.log("================================");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Database Status: http://localhost:${PORT}/db-status`);
      console.log(`Tasks API: http://localhost:${PORT}/tasks`);
    });

  } catch (err) {
    console.error("MongoDB Atlas Connection Error:", err.message);
    process.exit(1);
  }
}

startServer();
