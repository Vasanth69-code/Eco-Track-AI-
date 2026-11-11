# ⚡ EcoTrack AI
### Intelligent Electric Vehicle Route Planning, Charging Infrastructure Discovery & Energy Management Platform

<p align="center">
  <img src="frontend/public/logo.png" alt="EcoTrack AI Logo" width="160" />
</p>

<p align="center">
  <a href="#-features"><img src="https://img.shields.io/badge/Status-Production--Ready-00F0FF?style=for-the-badge&logo=shield" alt="Status"></a>
  <img src="https://img.shields.io/badge/Stack-MERN-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MERN Stack">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18">
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-4.18-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js">
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
</p>

---

## 📌 Executive Summary

**EcoTrack AI** is an intelligent, full-stack Electric Vehicle (EV) routing and telemetry platform created and developed by **Hemavasanth**. Standard navigation applications (e.g. Google Maps) calculate paths using simple distance and vehicle speed limits, completely disregarding the thermodynamic and electrical realities of EVs: non-linear discharge rates, aerodynamic drag penalties, ambient temperature extremes, terrain slope gradients, and downhill regenerative braking.

EcoTrack AI bridges this gap with an end-to-end physics and simulation engine powered by **TomTom Routing**, **Open Charge Map**, **OpenStreetMap Overpass API**, **OpenWeatherMap**, **Open-Elevation**, and direct in-car **ELM327 OBD-II Bluetooth Telemetry**. It schedules optimal high-power charging stops, protects long-term battery State of Health (SoH), and eliminates range anxiety for EV drivers.

---

## 📋 Table of Contents

- [Key Highlights & Differentiators](#-key-highlights--differentiators)
- [Comprehensive Feature Suite](#-comprehensive-feature-suite)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Deterministic EV Energy & Physics Model](#-deterministic-ev-energy--physics-model)
- [Tech Stack](#-tech-stack)
- [Directory & File Organization](#-directory--file-organization)
- [Installation & Quick Start](#-installation--quick-start)
- [Configuration & Environment Variables](#-configuration--environment-variables)
- [API Reference & Route Catalog](#-api-reference--route-catalog)
- [Preloaded EV Vehicle Database](#-preloaded-ev-vehicle-database)
- [Hardware & Telemetry Integration (OBD-II / BLE)](#-hardware--telemetry-integration-obd-ii--ble)
- [PDF Reports & Trip Sharing](#-pdf-reports--trip-sharing)
- [Deployment Guide](#-deployment-guide)
- [Author & Developer](#-author--developer)
- [License](#-license)

---

## 🌟 Key Highlights & Differentiators

| Capability | EcoTrack AI | Traditional GPS / Map Apps |
| :--- | :--- | :--- |
| **Route Energy Estimation** | Multi-variable physics engine: drag, elevation, HVAC, weather & speed | Distance / simple average speed only |
| **Topography & Elevation** | Elevation profile via Open-Elevation, gradient slope penalty & regenerative downhill recovery | Completely ignores elevation impact on battery |
| **Weather Drag & HVAC** | OpenWeatherMap API: cold/heat efficiency loss curves, wind vector, precipitation drag | No temperature or HVAC compensation |
| **Charging Station Corridor** | Open Charge Map + Overpass OSM fallback with automated arrival/departure SoC scheduling | Generic search pins without SoC matching |
| **OBD-II Bluetooth Telemetry** | Web Bluetooth API + ELM327 frame decoder for live State of Charge, speed, & battery temp | None |
| **Battery Health Protection** | Depth of Discharge (DoD) tracking and fast-charging degradation analysis | None |
| **Trip Reports & Sharing** | One-click branded PDF itinerary export + QR code for instant mobile handoff | Limited link sharing |

---

## ✨ Comprehensive Feature Suite

### 1. 🗺️ Smart EV Route Planning & Corridor Discovery
- **Precision Route Generation**: Leverages TomTom Routing API for high-fidelity turn-by-turn navigation across Indian national highways, state expressways, and global roads.
- **Corridor Charging Stop Scheduling**: Automatically scans charging infrastructure along a configurable corridor (buffer distance) around the route polyline.
- **Dynamic Arrival/Departure SoC Calculation**: Computes exact arrival State of Charge (SoC %) at each charger and calculates recommended dwell time to recharge up to target capacity (e.g., 80% to avoid slow saturation curves).
- **Interactive Multi-Waypoint Support**: Seamlessly add intermediate waypoints, adjust start/end locations, and review elevation profiles in real-time.

### 2. ⚡ Topography, Elevation & Regenerative Braking
- **Digital Elevation Model (DEM)**: Samples route coordinates and queries Open-Elevation API for elevation profiles.
- **Gravitational Potential Calculation**: Models the potential energy expended when climbing steep gradients ($E = m \cdot g \cdot \Delta h$).
- **Regenerative Descent Recovery**: Accurately credits harvested kinetic and potential energy back to the battery during downhill descents with powertrain efficiency coefficients.

### 3. 🌤️ Dynamic Environmental & Weather Adaptation
- **Real-Time Weather Query**: Fetches live atmospheric data via OpenWeatherMap API for origin, intermediate stops, and destination.
- **Temperature Efficiency Factor**: Compensates for battery internal resistance and cabin climate control (HVAC) load under extreme cold ($< 0^\circ\text{C}$ to $15^\circ\text{C}$) and extreme heat ($> 35^\circ\text{C}$).
- **Precipitation & Aerodynamic Drag**: Factorizes road surface rolling resistance during rain, snow, or storm conditions, alongside wind velocity resistance.

### 4. 🔌 Dual-Source Charging Infrastructure Engine
- **Primary Source - Open Charge Map**: Queries global network data including plug types (CCS2, Type 2, GB/T, CHAdeMO), power rating (kW), status, and pricing.
- **Secondary Source - OpenStreetMap (Overpass API)**: Automatic fallback or supplement that queries OpenStreetMap Overpass servers for community-mapped EV charging nodes (`amenity=charging_station`).
- **Connector Matching**: Filters chargers tailored to your vehicle's specific inlet standard (e.g., CCS2 for Tata Nexon EV / MG ZS EV).

### 5. 📡 Live Telemetry & Web Bluetooth (OBD-II)
- **ELM327 BLE Adapter Connection**: Connects to Bluetooth OBD-II dongles directly from modern browsers using the Web Bluetooth API (`navigator.bluetooth`).
- **Standard OBD-II PID Parser**: Decodes Mode 01 standard PIDs:
  - `012F`: Fuel / Battery State of Charge (%)
  - `010D`: Instantaneous Vehicle Speed (km/h)
  - `0105`: Coolant / Battery Pack Temperature (°C)
  - `0142`: Control Module / Pack Voltage (V)
  - `015B`: Hybrid/EV Battery Remaining Life / State of Health (%)
- **Telemetry Simulation Mode**: Provides simulated SSE (Server-Sent Events) telemetry streams for testing without hardware plugged in.

### 6. 🔬 Advanced Trip Simulations & Battery SoH
- **Weather Scenario Simulator**: Test how a route performs in scorching summer ($42^\circ\text{C}$) vs. freezing winter ($2^\circ\text{C}$) before embarking.
- **Traffic Congestion Simulator**: Analyze battery drain during bumper-to-bumper city congestion vs. high-speed highway cruising.
- **Battery Health Degradation Estimator**: Evaluates high-power DC fast-charging stress penalties and Depth of Discharge (DoD) to recommend battery-preserving charging habits.

### 7. 🚘 Curated Vehicle Library & EV Comparison Tool
- Preloaded catalog of popular Indian and International EVs:
  - **Tata Nexon EV Max & Prime**, **Tata Tiago EV**, **Tata Tigor EV**
  - **Mahindra XUV400**
  - **MG ZS EV**
  - **Hyundai Ioniq 5**, **Kia EV6**
  - **BYD Atto 3**
  - **Tesla Model 3 & Model Y**
- Side-by-side comparison matrix: battery capacity (kWh), real-world range (km), DC charge rate (kW), 0-100 acceleration, ex-showroom pricing, and cost-per-km efficiency.

### 8. 📄 Itinerary Export & Secure Social Sharing
- **jsPDF Automated Export**: Generates professional, publication-ready PDF trip reports with turn-by-turn charging itineraries, energy breakdowns, and emergency contacts.
- **Dynamic QR Code Generator**: Encodes trips into secure share tokens (`/shared/:token`) with instant QR code scanning for in-car passenger mobile handoff.

---

## 🏛️ System Architecture & Data Flow

### Architecture Overview

```
                                      ┌─────────────────────────────────────────────────┐
                                      │             EcoTrack AI Frontend (React)        │
                                      │   Vite + Tailwind CSS + Framer Motion + Leaflet │
                                      └────────────────────────┬────────────────────────┘
                                                               │
                                         REST APIs / JSON / HTTP Cookies
                                                               │
                                                               ▼
                                      ┌─────────────────────────────────────────────────┐
                                      │             Express.js Backend API              │
                                      │   Port 5500 | JWT & OAuth | Modular Controllers │
                                      └───────┬──────────────┬──────────────┬───────────┘
                                              │              │              │
                     ┌────────────────────────┘              │              └────────────────────────┐
                     ▼                                       ▼                                       ▼
        ┌─────────────────────────┐             ┌─────────────────────────┐             ┌─────────────────────────┐
        │     MongoDB Database    │             │   External Geo & APIs   │             │   In-Vehicle Telemetry  │
        ├─────────────────────────┤             ├─────────────────────────┤             ├─────────────────────────┤
        │ • User Profiles & Auth  │             │ • TomTom Routing API    │             │ • ELM327 Bluetooth PIDs │
        │ • Saved Trips & Waypts  │             │ • Open Charge Map       │             │ • Web Bluetooth API     │
        │ • Custom EV Specs       │             │ • Overpass OSM API      │             │ • Live State of Charge  │
        │ • Shareable Trip Tokens │             │ • OpenWeatherMap API    │             │ • Pack Temperature     │
        └─────────────────────────┘             │ • Open-Elevation API    │             │ • Dynamic Simulation    │
                                                └─────────────────────────┘             └─────────────────────────┘
```

### Architectural Diagrams

The repository includes high-resolution architectural and data-flow diagrams in [`docs/`](docs/):

1. **System Architecture Overview**  
   ![System Architecture](docs/VoltPath-%20system%20architecture%20overview.png)

2. **DFD Context Diagram (Level 0)**  
   ![DFD Context Diagram](docs/VoltPath-DFD%20context%20diagram%20for%20VoltPath.png)

3. **DFD Functional Decomposition Diagram (Level 1)**  
   ![DFD Level 1 Decomposition](docs/VoltPath-DFD%20Level%201%20functional%20decomposition%20diagram.png)

4. **Entity-Relationship (ER) Diagram**  
   ![ER Diagram](docs/VoltPath-ER%20diagram%20for%20vehicle%20route%20planning.png)

---

## 📐 Deterministic EV Energy & Physics Model

EcoTrack AI’s backend simulation engine (`backend/src/utils/energyCalculator.js`) calculates segment energy requirements using a deterministic physics model:

$$\text{Energy}_{\text{segment}} = \left(\frac{D}{100}\right) \times \eta_{\text{base}} \times f_{\text{speed}} \times f_{\text{weather}} \times f_{\text{traffic}} \pm \Delta E_{\text{elevation}}$$

Where:
- $D$: Segment distance in kilometers
- $\eta_{\text{base}}$: Vehicle factory efficiency in $\text{kWh}/100\text{km}$
- $f_{\text{speed}}$: Aerodynamic quadratic penalty factor at highway cruising speeds
- $f_{\text{weather}} = f_{\text{temp}} \times f_{\text{precip}} \times f_{\text{wind}}$:
  - $f_{\text{temp}} = 1.35$ for $T < 0^\circ\text{C}$ (extreme cold + resistance + heating)
  - $f_{\text{temp}} = 1.00$ for $20^\circ\text{C} \le T \le 25^\circ\text{C}$ (optimal thermal envelope)
  - $f_{\text{temp}} = 1.12$ for $T > 35^\circ\text{C}$ (high cabin A/C compression)
- $\Delta E_{\text{elevation}}$: Gravitational uphill energy demand or regenerative braking credit:

$$\Delta E_{\text{elevation}} = \frac{m \cdot g \cdot \Delta h \cdot \kappa}{3.6 \times 10^6} \quad [\text{kWh}]$$

*(with $\kappa = 1.15$ for motor uphill draw, and $\kappa = 0.65$ downhill regenerative conversion efficiency)*.

---

## 🛠️ Tech Stack

### Frontend Architecture
- **Core Framework**: [React 18](https://react.dev/) (Functional Components, Hooks, Context API)
- **Build Tool**: [Vite 6](https://vitejs.dev/) with Hot Module Replacement (HMR)
- **Styling & Design System**: [Tailwind CSS 3.4](https://tailwindcss.com/) with PostCSS & Autoprefixer
- **Motion & Micro-interactions**: [Framer Motion 11](https://www.framer.com/motion/)
- **Mapping & Geospatial**: [Leaflet 1.9](https://leafletjs.com/) and [React-Leaflet 4](https://react-leaflet.js.org/)
- **Data Visualization**: [Recharts 2.15](https://recharts.org/) (Elevation profiles & battery discharge curves)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Document Generation**: [jsPDF 4.2](https://github.com/parallax/jsPDF) & [jspdf-autotable 5.0](https://github.com/simonbengtsson/jsPDF-AutoTable)
- **QR Codes**: [qrcode.react 4.2](https://github.com/zpao/qrcode.react)
- **User Notifications**: [react-hot-toast 2.4](https://react-hot-toast.com/)

### Backend Architecture
- **Runtime**: [Node.js 18+](https://nodejs.org/)
- **Framework**: [Express.js 4.18](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose 8 ODM](https://mongoosejs.com/)
- **Authentication**: [Passport.js](https://www.passportjs.org/) (Google OAuth 2.0 Strategy) & [JSON Web Tokens (JWT)](https://jwt.io/)
- **Security & Utilities**: `bcryptjs`, `cookie-parser`, `cors`, `express-validator`, `uuid`
- **HTTP Client**: [Axios 1.6](https://axios-http.com/)

### Geospatial & Telematics Services
- **TomTom Maps API**: Routing, Turn-by-Turn directions, Reverse Geocoding, and Place Autocomplete
- **Open Charge Map API**: Global EV charging station data, connectors, power kW
- **Overpass API (OSM)**: OpenStreetMap direct infrastructure fallback queries
- **OpenWeatherMap API**: Live temperature, weather condition, and wind speed
- **Open-Elevation API**: Topographic elevation profile queries
- **Web Bluetooth API**: In-browser ELM327 OBD-II wireless communication

---

## 📂 Directory & File Organization

```
EcoTrack-AI/
├── backend/                       # Express.js REST API Server
│   ├── src/
│   │   ├── app.js                 # Express middleware configuration & route mounting
│   │   ├── server.js              # Server bootstrapper & DB connection listener
│   │   ├── config/
│   │   │   ├── databaseConfig.js  # Mongoose MongoDB Atlas connection handler
│   │   │   ├── envConfig.js       # Centralized process.env validation
│   │   │   └── passportConfig.js  # Google OAuth 2.0 Passport strategy
│   │   ├── controllers/
│   │   │   ├── authController.js       # Register, login, Google session, me, logout
│   │   │   ├── routeController.js      # Calculate route, geocode, place autocomplete
│   │   │   ├── stationController.js    # Bounding box & route corridor station search
│   │   │   ├── simulationController.js # Weather, traffic, and battery degradation simulations
│   │   │   ├── telemetryController.js  # OBD PID normalization & SSE stream
│   │   │   ├── tripController.js       # CRUD operations for user trips & stats
│   │   │   ├── vehicleController.js    # Preloaded EV specs & query endpoints
│   │   │   └── shareController.js      # Tokenized public trip sharing
│   │   ├── data/
│   │   │   └── evVehicles.js      # Complete catalog of Indian & global EV specifications
│   │   ├── middlewares/
│   │   │   └── authMiddleware.js  # JWT cookie & Authorization header validation
│   │   ├── models/
│   │   │   ├── userModel.js       # User schema (local + Google OAuth identity)
│   │   │   ├── tripModel.js       # Persisted trip schema with coordinates & stops
│   │   │   ├── vehicleModel.js    # Vehicle specification schema
│   │   │   └── shareModel.js      # Shared trip token schema with expiration
│   │   ├── routes/                # Express router endpoints
│   │   │   ├── authRoutes.js
│   │   │   ├── routeRoutes.js
│   │   │   ├── stationRoutes.js
│   │   │   ├── simulationRoutes.js
│   │   │   ├── telemetryRoutes.js
│   │   │   ├── tripRoutes.js
│   │   │   ├── vehicleRoutes.js
│   │   │   └── shareRoutes.js
│   │   ├── services/              # Business logic & 3rd-party API integrations
│   │   │   ├── routeService.js    # TomTom route integration & corridor calculation
│   │   │   ├── stationService.js  # Open Charge Map aggregator
│   │   │   ├── overpassService.js # OpenStreetMap Overpass API fallback
│   │   │   ├── elevationService.js# Open-Elevation lookup & topography profile
│   │   │   ├── weatherService.js  # OpenWeatherMap API consumer
│   │   │   ├── trafficService.js  # Traffic delay & stop-and-go energy calculator
│   │   │   ├── telemetryService.js# OBD-II PID decoder (ELM327 hex parser)
│   │   │   ├── tripService.js     # User trip persistence logic
│   │   │   └── authService.js     # Password hashing & JWT generation
│   │   └── utils/
│   │       ├── energyCalculator.js# Deterministic physics engine & SoC scheduler
│   │       └── responseHelper.js  # Standardized API response formatters
│   ├── test/                      # Service test suites
│   ├── package.json
│   ├── .env.example               # Template environment configuration
│   └── .env                       # Backend environment variables
│
├── frontend/                      # Vite + React 18 Application
│   ├── public/
│   │   ├── logo.png               # EcoTrack AI branding logo
│   │   ├── manifest.json          # Progressive Web App manifest
│   │   └── sw.js                  # PWA service worker
│   ├── src/
│   │   ├── animations/
│   │   │   └── variants.js        # Framer Motion transition definitions
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── LoadingSpinner.jsx
│   │   │   │   ├── PlaceAutocompleteInput.jsx # TomTom live search input
│   │   │   │   ├── ProtectedRoute.jsx
│   │   │   │   ├── ShareModal.jsx             # Share link + dynamic QR generator
│   │   │   │   ├── StatCard.jsx               # Dashboard metric card
│   │   │   │   └── StationDetailDrawer.jsx    # Side drawer for station details
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   └── Sidebar.jsx
│   │   │   ├── navigation/
│   │   │   │   └── LiveNavigationOverlay.jsx  # In-car turn-by-turn HUD overlay
│   │   │   └── telemetry/
│   │   │       └── OBDConnectionModal.jsx     # Web Bluetooth device pairing modal
│   │   ├── config/
│   │   │   └── constants.js       # Routes, API endpoints, default Indian vehicle specs
│   │   ├── context/
│   │   │   ├── AuthContext.jsx    # User session, login, Google callback state
│   │   │   ├── TelemetryContext.jsx # Live OBD-II Bluetooth streaming state
│   │   │   └── ThemeContext.jsx   # UI theme provider
│   │   ├── layouts/
│   │   │   └── AppLayout.jsx      # Persistent sidebar & navbar shell
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx          # Futuristic hero, features, CTA
│   │   │   ├── DashboardPage.jsx        # Energy metrics, recent trips, quick actions
│   │   │   ├── RoutePlannerPage.jsx     # Route planner, map, waypoint controls
│   │   │   ├── TripResultsPage.jsx      # Route analysis, elevation, charger schedule
│   │   │   ├── TripDetailPage.jsx       # Deep dive into individual saved trip
│   │   │   ├── TripHistoryPage.jsx      # Paginated user trip archives
│   │   │   ├── ChargingStationsPage.jsx # Map explorer with station filtering
│   │   │   ├── SimulationsPage.jsx      # Weather, traffic & battery degradation simulator
│   │   │   ├── VehicleLibraryPage.jsx   # EV showroom with specifications
│   │   │   ├── EVComparisonPage.jsx     # Side-by-side EV comparison table
│   │   │   ├── SharedTripPage.jsx       # Public read-only trip viewer
│   │   │   ├── ProfilePage.jsx          # User vehicle defaults & preferences
│   │   │   └── AuthCallbackPage.jsx     # Google OAuth redirect handler
│   │   ├── services/
│   │   │   ├── apiService.js      # Axios client with interceptors
│   │   │   └── authService.js     # Auth API requests
│   │   ├── utils/
│   │   │   ├── helpers.js         # Formatting (INR currency ₹, distances, duration)
│   │   │   └── pdfExport.js       # jsPDF itinerary builder
│   │   ├── App.jsx                # React Router root
│   │   ├── index.css              # Tailwind CSS directives & cyber glow effects
│   │   └── main.jsx               # React DOM entrypoint
│   ├── tailwind.config.js         # Cyberpunk/Modern EV color palette
│   ├── vite.config.js             # Vite development server settings
│   ├── vercel.json                # Single Page App routing rewrites
│   ├── package.json
│   ├── .env.example               # Template environment configuration
│   └── .env                       # Frontend environment variables
│
├── docs/                          # System Architecture & DFD Diagrams
│   ├── VoltPath- system architecture overview.png
│   ├── VoltPath-DFD context diagram for VoltPath.png
│   ├── VoltPath-DFD Level 1 functional decomposition diagram.png
│   └── VoltPath-ER diagram for vehicle route planning.png
│
├── package.json                   # Root orchestrator scripts
├── run-all.js                     # Concurrent runner script (Frontend + Backend)
├── LICENSE                        # ISC License
└── README.md                      # Complete documentation
```

---

## 🚀 Installation & Quick Start

### Prerequisites
- **Node.js**: `v18.0.0` or higher installed ([Download Node.js](https://nodejs.org/))
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/voltpath`) or a free [MongoDB Atlas Cluster](https://www.mongodb.com/cloud/atlas)
- **API Keys**:
  - TomTom Developer Key ([Get free TomTom key](https://developer.tomtom.com/))
  - OpenWeatherMap API Key ([Get free OpenWeather key](https://openweathermap.org/api))
  - Open Charge Map API Key ([Get free Open Charge Map key](https://openchargemap.org/site/develop/api)) *(Optional, fallback to OpenStreetMap is built-in)*

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/hemavasanth/VoltPath.git
cd VoltPath
```

---

### Step 2: Install Dependencies

You can install dependencies for root, backend, and frontend:

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Install frontend dependencies
cd ../frontend
npm install

# Return to root directory
cd ..
```

---

### Step 3: Configure Environment Variables

Create `.env` in `backend/` and `frontend/` (sample files provided as `.env.example` in both folders):

```bash
# Backend environment configuration
cp backend/.env.example backend/.env

# Frontend environment configuration
cp frontend/.env.example frontend/.env
```

Fill in your respective credentials as described in the [Environment Variables](#-configuration--environment-variables) section below.

---

### Step 4: Run the Application (One-Command Startup)

From the **root directory**, launch both backend and frontend concurrently:

```bash
npm run dev
```

> **What happens behind the scenes:** `node run-all.js` boots the Express API on `http://localhost:5500` and the Vite React server on `http://localhost:5173`.

#### Running Services Separately (Optional):

```bash
# In Terminal 1 (Backend API):
cd backend
npm start
# Server runs on http://localhost:5500

# In Terminal 2 (Frontend Client):
cd frontend
npm run dev
# Vite runs on http://localhost:5173
```

Open your browser at **`http://localhost:5173`** to access EcoTrack AI!

---

## 🔑 Configuration & Environment Variables

### Backend Environment Configuration (`backend/.env`)

Create a `.env` file inside the `backend` folder:

```env
# Server Port & Environment
PORT=5500
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# MongoDB Connection String (Atlas URI or Local)
MONGO_URL=mongodb+srv://<username>:<password>@cluster0.mongodb.net/voltpath?retryWrites=true&w=majority
DB_NAME=voltpath

# JWT Signing Secret
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production

# Google OAuth 2.0 Credentials (Optional, for Google Sign-In)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5500/api/auth/google/callback

# 3rd-Party Geo & Weather APIs
TOMTOM_API_KEY=your_tomtom_api_key_here
OPENWEATHER_API_KEY=your_openweather_api_key_here
OPEN_CHARGE_MAP_API_KEY=your_open_charge_map_api_key_here
```

### Frontend Environment Configuration (`frontend/.env`)

Create a `.env` file inside the `frontend` folder:

```env
# Backend Base URL
VITE_BACKEND_URL=http://localhost:5500
VITE_API_BASE_URL=http://localhost:5500/api
```

---

## 📡 API Reference & Route Catalog

### Authentication Endpoints (`/api/auth`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register user with email, name, and password |
| `POST` | `/api/auth/login` | Public | Login with email/password, issues JWT HTTP cookie |
| `GET` | `/api/auth/google` | Public | Initiates Google OAuth 2.0 authentication flow |
| `GET` | `/api/auth/google/callback` | Public | Google OAuth redirect handler |
| `POST` | `/api/auth/google/session` | Public | Exchanges Google profile for JWT session |
| `GET` | `/api/auth/me` | User | Get current logged-in user details and saved EV settings |
| `PUT` | `/api/auth/vehicle` | User | Update user's active default vehicle configuration |
| `POST` | `/api/auth/logout` | User | Clear session and authentication cookies |

### Routing & Geocoding Endpoints (`/api/routes`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/routes/calculate` | User | Computes EV-optimized route, elevation, weather impact & charging stops |
| `GET` | `/api/routes/geocode` | Public | Converts location address string to latitude/longitude |
| `GET` | `/api/routes/autocomplete` | Public | Real-time place autocomplete query for location inputs |

### Charging Stations Endpoints (`/api/stations`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/stations` | Public | Query charging stations with optional proximity filters |
| `GET` | `/api/stations/bbox` | Public | Returns charging stations within map viewport bounding box |
| `POST` | `/api/stations/corridor` | Public | Finds charging stations along a route corridor (with OSM fallback) |

### Trip Management Endpoints (`/api/trips`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/trips` | User | Save a planned route and charging itinerary |
| `GET` | `/api/trips` | User | List all saved trips for the authenticated user |
| `GET` | `/api/trips/stats` | User | Aggregate analytics: total distance, energy consumed, carbon saved |
| `GET` | `/api/trips/:id` | User | Retrieve specific trip details |
| `DELETE`| `/api/trips/:id` | User | Delete a trip from history |

### Simulation Endpoints (`/api/simulations`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/simulations/weather` | User | Simulates temperature, wind, and precipitation drain on battery range |
| `POST` | `/api/simulations/traffic` | User | Simulates traffic congestion impact on velocity and energy consumption |
| `POST` | `/api/simulations/battery-degradation` | User | Computes estimated State of Health (SoH) loss & DoD analysis |

### Telemetry Endpoints (`/api/telemetry`)
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/telemetry/normalize` | Public | Decodes raw ELM327 hex frames to structured telemetry objects |
| `GET` | `/api/telemetry/simulate` | Public | Streams simulated vehicle telemetry (SoC, speed, temp, voltage) |
| `GET` | `/api/telemetry/capabilities/:id` | Public | Lists supported OBD-II PIDs for a specific EV model |

### Vehicle Library & Public Sharing Endpoints
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/vehicles` | Public | Returns complete preloaded vehicle library |
| `GET` | `/api/vehicles/:id` | Public | Returns specific vehicle specs, battery capacity, and charging curves |
| `POST` | `/api/share` | User | Generates a shareable token for a trip |
| `GET` | `/api/share/:token` | Public | Returns public trip data for the given token |

---

## 🚗 Preloaded EV Vehicle Database

EcoTrack AI comes equipped with factory specifications for India's leading EV fleet as well as popular global models:

```javascript
[
  {
    name: "Tata Nexon EV Max",
    batteryCapacityKwh: 40.5,
    usableBatteryPct: 90,
    rangeKm: 437,
    efficiencyKwhPer100km: 15.0,
    chargingPowerKw: 50,
    connector: "CCS2"
  },
  {
    name: "Tata Tiago EV",
    batteryCapacityKwh: 24.0,
    usableBatteryPct: 90,
    rangeKm: 315,
    efficiencyKwhPer100km: 12.0,
    chargingPowerKw: 25,
    connector: "CCS2"
  },
  {
    name: "Mahindra XUV400",
    batteryCapacityKwh: 39.4,
    usableBatteryPct: 92,
    rangeKm: 456,
    efficiencyKwhPer100km: 14.5,
    chargingPowerKw: 50,
    connector: "CCS2"
  },
  {
    name: "MG ZS EV",
    batteryCapacityKwh: 50.3,
    usableBatteryPct: 92,
    rangeKm: 461,
    efficiencyKwhPer100km: 15.8,
    chargingPowerKw: 50,
    connector: "CCS2"
  },
  {
    name: "Hyundai Ioniq 5",
    batteryCapacityKwh: 72.6,
    usableBatteryPct: 95,
    rangeKm: 631,
    efficiencyKwhPer100km: 16.0,
    chargingPowerKw: 350,
    connector: "CCS2"
  },
  {
    name: "Tesla Model 3 Long Range",
    batteryCapacityKwh: 82.0,
    usableBatteryPct: 95,
    rangeKm: 602,
    efficiencyKwhPer100km: 14.8,
    chargingPowerKw: 250,
    connector: "Tesla / CCS2"
  }
]
```

Users can also define **custom vehicle profiles** with their own battery capacity, reserve limits, charging rates, and electricity tariffs in their Profile dashboard.

---

## 📡 Hardware & Telemetry Integration (OBD-II / BLE)

EcoTrack AI includes native support for real-time vehicular data extraction:

```
┌────────────────────────┐      Bluetooth Low Energy      ┌─────────────────────────┐
│  ELM327 OBD-II Adapter │ ─────────────────────────────▶ │   Web Bluetooth Client  │
│  (Plugged into EV port)│        (GATT Service)          │   (Browser Telemetry)   │
└────────────────────────┘                                └────────────┬────────────┘
                                                                       │
                                                            Raw HEX Frames (e.g. "41 2F 9E")
                                                                       │
                                                                       ▼
                                                          ┌─────────────────────────┐
                                                          │ EcoTrack AI Engine      │
                                                          │ • Decodes SoC: 62.0%    │
                                                          │ • Speed: 84 km/h        │
                                                          │ • Pack Temp: 32°C       │
                                                          │ • Pack Voltage: 382.4V  │
                                                          └─────────────────────────┘
```

1. Click **Connect OBD-II** in the navigation header.
2. Select your paired ELM327 Bluetooth device in the browser prompt.
3. EcoTrack AI automatically subscribes to standard notify characteristics, parses raw hex frames, and dynamically updates your Live Navigation Overlay with real-time battery SoC and distance-to-empty metrics!

---

## 📄 PDF Reports & Trip Sharing

- **Download Itinerary**: Inside `TripResultsPage`, click **Export PDF** to generate an offline travel dossier including:
  - Total driving distance and expected total duration.
  - Required charging stops with charging duration (minutes) and estimated cost in INR (₹).
  - High-resolution altitude and battery discharge graphs.
  - Emergency contact details and roadside assistance information.
- **Instant QR Code Sharing**: Click **Share Trip** to create an encrypted read-only link (`/shared/:token`). Display the modal to let passengers scan the QR code and follow the live route from their smartphone.

---

## 📦 Deployment Guide

### Deploying Frontend to Vercel

The frontend is already configured with `vercel.json` rewrites for single-page routing:

1. Push your repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com/).
3. Set **Root Directory** to `frontend`.
4. Configure Build Command: `npm run build` and Output Directory: `dist`.
5. Set environment variable `VITE_BACKEND_URL` to your production backend URL.
6. Deploy!

### Deploying Backend to Render / Railway

1. Create a new Web Service on [Render](https://render.com/) or [Railway](https://railway.app/).
2. Set **Root Directory** to `backend`.
3. Set Build Command: `npm install`.
4. Set Start Command: `npm start`.
5. Configure your production environment variables (`MONGO_URL`, `JWT_SECRET`, `TOMTOM_API_KEY`, `OPENWEATHER_API_KEY`, `FRONTEND_URL`).
6. Deploy!

---

## 👤 Author & Developer

<p align="center">
  <img src="https://img.shields.io/badge/Developer-Hemavasanth-00F0FF?style=for-the-badge" alt="Developer">
</p>

<p align="center">
  <strong>Hemavasanth</strong><br>
  Full-Stack & Intelligent Systems Developer
</p>

<p align="center">
  <a href="https://github.com/Vasanth69-code/">
    <img src="https://img.shields.io/badge/GitHub-hemavasanth-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="mailto:hemavasanth69@gmail.com">
    <img src="https://img.shields.io/badge/Email-hemavasanth69%40gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email">
  </a>
</p>

---

## 📄 License

This project is licensed under the [ISC License](LICENSE) — free for educational, development, and personal use.
