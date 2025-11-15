// ------------------------------
// ✅ HACK.MCE 5.0 Backend (ESM)
// ------------------------------

import express from "express";
// import path from "path"; // removed duplicate
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
import checkinRoutes from "./routes/checkin.js";
import adminRoutes from "./routes/admin.js";

// Fix __dirname and __filename (not available in ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file (only if not on Vercel)
// On Vercel, environment variables are set directly, no .env file needed
if (!process.env.VERCEL) {
  // Explicitly specify the path to .env file in the backend directory
  dotenv.config({ path: path.join(__dirname, ".env") });
  console.log("✅ Loaded environment variables from .env file");
} else {
  console.log("✅ Using environment variables from Vercel");
}

const app = express();
// Serve static frontend files from project root
app.use(express.static(path.join(__dirname, "../")));

// Default route to index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});

// ------------------------------
// Middleware
// ------------------------------
// CORS configuration - allow all origins for Vercel deployment
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------------
// MongoDB Connection (MongoDB Atlas Only)
// ------------------------------
// Require MONGODB_URI to be set - no localhost fallback
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is required!");
  console.error("⚠ Please set MONGODB_URI in your .env file or Vercel environment variables");
  // Don't exit in serverless (Vercel) - let it fail gracefully on first request
  if (!process.env.VERCEL) {
    process.exit(1);
  }
} else {
  // Log MongoDB URI (hide password for security)
  const uriDisplay = MONGODB_URI.replace(/:([^:@]+)@/, ":@");
  console.log("📊 MongoDB Atlas URI configured:", uriDisplay);
  
  // Check if it's an Atlas connection string
  if (MONGODB_URI.includes("mongodb+srv://")) {
    console.log("✅ Using MongoDB Atlas (cloud)");
  } else if (MONGODB_URI.includes("mongodb://")) {
    console.log("⚠ Using standard MongoDB connection (not Atlas)");
  }
}

// Connect to MongoDB (async, non-blocking for serverless)
let isConnected = false;
let connectionPromise = null;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      // Check if already connected
      if (mongoose.connection.readyState === 1) {
        isConnected = true;
        return;
      }

      // MongoDB Atlas optimized connection settings
      const connectionOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // 10 seconds for Atlas
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        maxPoolSize: 10, // Maintain up to 10 socket connections
        minPoolSize: 2, // Maintain at least 2 socket connections
        retryWrites: true, // Retry writes if they fail due to transient errors
      };

      // If no MONGODB_URI, throw error
      if (!MONGODB_URI) {
        throw new Error("MONGODB_URI environment variable is not set");
      }

      await mongoose.connect(MONGODB_URI, connectionOptions);
      isConnected = true;
      console.log("✅ Connected to MongoDB");
      console.log("📊 Database: hackmce5");
    } catch (err) {
      console.error("❌ MongoDB connection error:", err);
      isConnected = false;
      connectionPromise = null; // Reset to allow retry
      throw err;
    }
  })();

  return connectionPromise;
};

// Connect on first request (serverless-friendly)
app.use(async (req, res, next) => {
  try {
    // Skip MongoDB connection for health check endpoint
    if (req.path === "/api/health") {
      return next();
    }

    // Check if MONGODB_URI is set
    if (!MONGODB_URI) {
      console.error("❌ MONGODB_URI not configured");
      return res.status(500).json({
        success: false,
        message: "Database connection not configured",
        error: "MONGODB_URI environment variable is required",
      });
    }

    // Connect if not already connected
    if (!isConnected && mongoose.connection.readyState !== 1) {
      await connectDB();
    }
  } catch (err) {
    // Log error and return proper error response
    console.error("❌ MongoDB connection failed:", err.message);
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: err.message,
    });
  }
  next();
});

// ------------------------------
// Routes
// ------------------------------

// Default /api route
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the HACK.MCE 5.0 API",
    availableEndpoints: [
      "/api/checkin",
      "/api/admin",
      "/api/health"
    ]
  });
});

app.use("/api/checkin", checkinRoutes);
app.use("/api/admin", adminRoutes);

// Health check endpoint (works without MongoDB connection)
app.get("/api/health", (req, res) => {
  const dbStatus = MONGODB_URI 
    ? (mongoose.connection.readyState === 1 ? "connected" : "disconnected")
    : "not configured";
  
  res.json({
    status: "ok",
    message: "HACK.MCE 5.0 Backend is running",
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      configured: !!MONGODB_URI,
      connectionState: mongoose.connection.readyState, // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
      isAtlas: MONGODB_URI ? MONGODB_URI.includes("mongodb+srv://") : false,
    },
  });
});

// ------------------------------
// Error Handling
// ------------------------------
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

// 404 handler - must be last, after all routes
// This catches any unmatched routes
app.use((req, res) => {
  // Only return JSON for API routes
  if (req.path.startsWith("/api")) {
    res.status(404).json({
      success: false,
      message: "Endpoint not found",
      path: req.path,
    });
  } else {
    res.status(404).json({
      success: false,
      message: "Not found",
    });
  }
});

// ------------------------------
// Server Start (Local Development Only)
// ------------------------------
// For Vercel, we export the app as a serverless function
// For local development, we start a server
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  
  // Connect to MongoDB Atlas for local development
  if (MONGODB_URI) {
    connectDB()
      .then(() => {
        app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
          console.log(`📡 API available at http://localhost:${PORT}/api`);
          console.log(`🔥 HACK.MCE 5.0 - Registration System`);
          console.log(`💾 Using MongoDB Atlas (cloud database)`);
        });
      })
      .catch((err) => {
        console.error("❌ Failed to connect to MongoDB Atlas:", err.message);
        console.error("⚠️ Server will start but database operations will fail");
        console.error("💡 Make sure MONGODB_URI is set correctly in backend/.env");
        // Start server anyway - connection will be attempted on first request
        app.listen(PORT, () => {
          console.log(`🚀 Server running on http://localhost:${PORT} (without DB connection)`);
          console.log(`📡 API available at http://localhost:${PORT}/api`);
        });
      });
  } else {
    console.error("❌ MONGODB_URI not set in .env file");
    console.error("⚠️ Please set MONGODB_URI in backend/.env");
    process.exit(1);
  }
}

// ------------------------------
// Export for Vercel Serverless Functions
// ------------------------------
export default app;