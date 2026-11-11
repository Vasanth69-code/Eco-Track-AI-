const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");

// Load passport configuration
require("./config/passportConfig");

const authRoutes = require("./routes/authRoutes");
const routeRoutes = require("./routes/routeRoutes");
const tripRoutes = require("./routes/tripRoutes");
const stationRoutes = require("./routes/stationRoutes");
const simulationRoutes = require("./routes/simulationRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const shareRoutes = require("./routes/shareRoutes");
const telemetryRoutes = require("./routes/telemetryRoutes");


const { FRONTEND_URL } = require("./config/envConfig");

const app = express();
// IMPORTANT: trust proxy (Render / reverse proxy) so secure cookies work correctly
app.set("trust proxy", 1);

// Initialize passport
app.use(passport.initialize());

// CORS configuration
const allowedOrigin = (FRONTEND_URL || "").replace(/\/$/, "");

app.use(cors({
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Session-ID'],
}));

// Preflight (optional but helpful)
app.options("*", cors({ origin: FRONTEND_URL, credentials: true }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(
  session({
    name: "voltpath.sid",
    secret: process.env.SESSION_SECRET || "voltpath_session_secret",
    resave: false,
    saveUninitialized: false,
    proxy: true, // IMPORTANT for secure cookies behind proxy
    cookie: {
      secure: process.env.NODE_ENV === "production", // true on Render (https)
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// If you are using passport sessions (login persists)
app.use(passport.session());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/simulations", simulationRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/telemetry", telemetryRoutes);


app.get("/api/health", (req, res) => {
  res.json({ status: "OK", service: "EcoTrack AI API", timestamp: new Date() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ success: false, message: "Internal server error", error: err.message });
});

module.exports = app;