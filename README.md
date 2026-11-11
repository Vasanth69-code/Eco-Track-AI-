

<p align="center">
  <img src="https://img.shields.io/badge/MERN-Stack-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MERN Stack">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js">
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
</p>

VoltPath is a comprehensive full-stack web application designed for Electric Vehicle (EV) owners and enthusiasts. It provides intelligent route planning with real-time charging station integration, weather insights, and advanced trip simulations to ensure a seamless travel experience.

---

## 📋 Table of Contents

- [Problem Statement](#problem-statement)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture--folder-structure)
- [Installation & Setup Guide](#installation--setup-guide)
- [Environment Variables](#environment-variables)
- [How the System Works](#how-the-system-works)
- [UI/UX Description](#uiux-description)
- [Screenshots](#screenshots)
- [Future Improvements](#future-improvements)
- [Deployment Guide](#deployment-guide)
- [Author](#author)

---

## 🎯 Problem Statement

### Part 1: The Challenge
Electric Vehicle owners face significant anxiety when planning long-distance trips. Unlike traditional fuel-powered vehicles, EVs require strategic planning around charging infrastructure. The key challenges include:

- **Range Anxiety**: Drivers constantly worry about running out of battery before reaching their destination or the next charging station.
- **Limited Charging Infrastructure**: Finding reliable, working charging stations along a planned route is difficult and time-consuming.
- **Weather Impact**: Weather conditions significantly affect EV battery efficiency, yet most navigation tools don't account for these factors.
- **Route Optimization**: Traditional GPS systems don't consider EV-specific parameters like battery capacity, charging speed, and optimal charging stops.

### Part 2: The Solution
VoltPath addresses these challenges by providing:

1. **Smart Route Planning**: Enter your starting point and destination, and VoltPath calculates the optimal route considering your EV's specifications.
2. **Charging Station Integration**: Displays available EV charging stations along your route with real-time availability information.
3. **Weather-Aware Planning**: Integrates weather data to provide accurate range estimates and travel time predictions.
4. **Trip Simulations**: Simulate different scenarios to understand energy consumption and plan charging stops effectively.
5. **Vehicle Library**: Access a comprehensive database of EVs with their specifications to make informed decisions.
6. **Trip History & Sharing**: Save your trips and share them with others for collaborative planning.

---

## ✨ Features

### Core Features

- 🔐 **Authentication System**
  - Google OAuth 2.0 integration
  - JWT-based session management
  - Protected routes for authenticated users

- 🗺️ **Route Planning**
  - Interactive map interface using Leaflet
  - TomTom Routing API integration
  - Multiple route options with turn-by-turn directions
  - Custom waypoints support

- ⚡ **EV Charging Stations**
  - Open Charge Map API integration
  - Real-time station availability
  - Station details (connector types, power output, pricing)
  - Filter stations by compatibility and speed

- 🌤️ **Weather Integration**
  - OpenWeatherMap API integration
  - Current weather conditions along route
  - Weather-based range adjustment
  - 5-day forecast for trip planning

- 🚗 **Trip Management**
  - Create, save, and manage trips
  - Trip history with detailed analytics
  - Share trips via unique links
  - PDF export for offline reference

- 📊 **Simulations**
  - Energy consumption modeling
  - Multiple vehicle comparisons
  - Scenario planning (different weather, driving styles)
  - Cost estimation

- 🚙 **Vehicle Library**
  - Comprehensive EV database
  - Technical specifications (battery, range, charging)
  - Side-by-side EV comparison tool

### Additional Features

- 📱 **Responsive Design**
  - Works on desktop and laptop screens
  - Mobile-friendly responsive layout

- 🎨 **Modern UI/UX**
  - Smooth animations using Framer Motion
  - Premium dashboard aesthetic
  - Dark/Light theme support

- 📈 **Analytics Dashboard**
  - Trip statistics and charts
  - Cost analysis
  - Environmental impact tracking

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| Vite | Build Tool & Development Server |
| JavaScript | Programming Language |
| Tailwind CSS | Styling Framework |
| Framer Motion | Animations |
| React Router DOM | Client-side Routing |
| Axios | HTTP Client |
| Leaflet + React-Leaflet | Interactive Maps |
| Recharts | Data Visualization |
| Lucide React | Icon Library |
| React Hot Toast | Notifications |
| jsPDF | PDF Generation |

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime Environment |
| Express.js | Web Framework |
| MongoDB | Database |
| Mongoose | ODM Library |
| Passport.js | Authentication (OAuth) |
| JWT | Token-based Auth |
| bcryptjs | Password Hashing |
| Cookie Parser | Cookie Handling |
| Express Session | Session Management |
| UUID | Unique ID Generation |

### External APIs

| API | Purpose |
|-----|---------|
| TomTom API | Route generation, geocoding |
| OpenWeatherMap API | Weather data |
| Open Charge Map API | EV charging station data |

---

## 📂 Project Architecture / Folder Structure

```
voltpath/
│
├── frontend/                      # React Frontend Application
│   ├── public/                   # Static assets
│   │   ├── manifest.json         # PWA manifest
│   │   └── sw.js                 # Service worker
│   ├── src/
│   │   ├── animations/          # Animation variants (Framer Motion)
│   │   │   └── variants.js
│   │   ├── components/          # React Components
│   │   │   ├── common/          # Reusable components
│   │   │   │   ├── LoadingSpinner.jsx
│   │   │   │   ├── ProtectedRoute.jsx
│   │   │   │   ├── ShareModal.jsx
│   │   │   │   └── StatCard.jsx
│   │   │   └── layout/          # Layout components
│   │   │       ├── Navbar.jsx
│   │   │       └── Sidebar.jsx
│   │   ├── config/              # Configuration files
│   │   │   └── constants.js
│   │   ├── context/             # React Context providers
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── layouts/             # Page layouts
│   │   │   └── AppLayout.jsx
│   │   ├── pages/               # Page components
│   │   │   ├── AuthCallbackPage.jsx
│   │   │   ├── ChargingStationsPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── EVComparisonPage.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── RoutePlannerPage.jsx
│   │   │   ├── SharedTripPage.jsx
│   │   │   ├── SimulationsPage.jsx
│   │   │   ├── TripDetailPage.jsx
│   │   │   ├── TripHistoryPage.jsx
│   │   │   ├── TripResultsPage.jsx
│   │   │   └── VehicleLibraryPage.jsx
│   │   ├── services/            # API service modules
│   │   │   ├── apiService.js
│   │   │   └── authService.js
│   │   ├── utils/               # Utility functions
│   │   │   ├── helpers.js
│   │   │   └── pdfExport.js
│   │   ├── App.jsx              # Main App component
│   │   ├── index.css            # Global styles
│   │   └── main.jsx             # Entry point
│   ├── index.html               # HTML template
│   ├── package.json             # Frontend dependencies
│   ├── tailwind.config.js      # Tailwind configuration
│   ├── postcss.config.js       # PostCSS configuration
│   └── vite.config.js          # Vite configuration
│
├── backend/                      # Node.js Backend API
│   ├── src/
│   │   ├── config/              # Configuration files
│   │   │   ├── databaseConfig.js
│   │   │   ├── envConfig.js
│   │   │   └── passportConfig.js
│   │   ├── controllers/         # Route controllers
│   │   │   ├── authController.js
│   │   │   ├── routeController.js
│   │   │   ├── shareController.js
│   │   │   ├── simulationController.js
│   │   │   ├── stationController.js
│   │   │   ├── tripController.js
│   │   │   └── vehicleController.js
│   │   ├── data/                # Static data files
│   │   │   └── evVehicles.js
│   │   ├── middlewares/        # Express middlewares
│   │   │   └── authMiddleware.js
│   │   ├── models/              # Mongoose models
│   │   │   ├── shareModel.js
│   │   │   ├── tripModel.js
│   │   │   ├── userModel.js
│   │   │   └── vehicleModel.js
│   │   ├── routes/              # Express routes
│   │   │   ├── authRoutes.js
│   │   │   ├── routeRoutes.js
│   │   │   ├── shareRoutes.js
│   │   │   ├── simulationRoutes.js
│   │   │   ├── stationRoutes.js
│   │   │   ├── tripRoutes.js
│   │   │   └── vehicleRoutes.js
│   │   ├── services/            # Business logic services
│   │   │   ├── authService.js
│   │   │   ├── routeService.js
│   │   │   ├── stationService.js
│   │   │   ├── trafficService.js
│   │   │   ├── tripService.js
│   │   │   └── weatherService.js
│   │   ├── utils/               # Utility functions
│   │   │   ├── energyCalculator.js
│   │   │   └── responseHelper.js
│   │   ├── app.js               # Express app configuration
│   │   └── server.js            # Server entry point
│   ├── package.json             # Backend dependencies
│   └── .gitignore               # Git ignore file
│
├── .env                          # Environment variables (root)
├── package.json                  # Root package.json (optional)
└── README.md                     # Project documentation
```

---

## 🚀 Installation & Setup Guide

### Prerequisites

Before installing VoltPath, ensure you have the following:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** (npm comes with Node.js)
- **MongoDB** (local or Atlas cloud database)
- **Git** for version control

### Step 1: Clone the Repository

```
bash
git clone <repository-url>
cd VoltPath
```

### Step 2: Backend Setup

Navigate to the backend directory and install dependencies:

```
bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory (see Environment Variables section below).

Start the backend server:

```
bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The backend server will start on `http://localhost:5500`

### Step 3: Frontend Setup

Open a new terminal, navigate to the frontend directory, and install dependencies:

```
bash
cd frontend
npm install
```

Create environment variables (if not already created):

```
bash
# Create .env file in frontend directory
VITE_BACKEND_URL=http://localhost:5500
```

Start the frontend development server:

```
bash
npm run dev
```

The frontend application will be available at `http://localhost:5173`

### Step 4: Access the Application

1. Open your browser and navigate to `http://localhost:5173`
2. Sign in with your Google account to access the dashboard
3. Start planning your EV routes!

---

## 🔑 Environment Variables

### Root Directory (.env)

Create a `.env` file in the root project directory:

```
env
# Backend Configuration
MONGO_URL=mongodb://localhost:27017/voltpath
PORT=5500

# Frontend Configuration
VITE_BACKEND_URL=http://localhost:5500
VITE_API_BASE_URL=http://localhost:5500/api
```

### Backend (.env)

Create a `.env` file in the `backend` directory:

```
env
# Server Configuration
PORT=5500
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017/voltpath
DB_NAME=voltpath

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5500/api/auth/google/callback

# External APIs
TOMTOM_API_KEY=your-tomtom-api-key
OPENWEATHER_API_KEY=your-openweather-api-key
OPEN_CHARGE_MAP_API_KEY=your-opencharge-map-api-key
```

### Frontend (.env)

Create a `.env` file in the `frontend` directory:

```
env
VITE_BACKEND_URL=http://localhost:5500
```

### Getting API Keys

1. **TomTom API**: Sign up at [TomTom Developer Portal](https://developer.tomtom.com/)
2. **OpenWeatherMap API**: Get your API key at [OpenWeatherMap](https://openweathermap.org/api)
3. **Open Charge Map API**: Register at [Open Charge Map](https://openchargemap.org/site/develop/api)
4. **Google OAuth**: Set up in [Google Cloud Console](https://console.cloud.google.com/)

---

## ⚙️ How the System Works

### Overall Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User Input    │────▶│   Backend API   │────▶│   External APIs │
│  (Frontend)     │     │   (Express)     │     │ (TomTom, Weather│
└─────────────────┘     └─────────────────┘     │  OpenChargeMap) │
        │                      │                 └─────────────────┘
        │                      ▼
        │              ┌─────────────────┐
        │              │   MongoDB       │
        │              │   Database      │
        │              └─────────────────┘
        │                      │
        ▼                      ▼
┌─────────────────┐     ┌─────────────────┐
│  Display Map &  │◀────│   Response      │
│  Results        │     │   (JSON)        │
└─────────────────┘     └─────────────────┘
```

### Detailed Workflow

1. **User Authentication**
   - User clicks "Sign in with Google"
   - Backend initiates OAuth 2.0 flow
   - Google redirects back with authorization code
   - Backend exchanges code for user profile
   - JWT token created and stored in cookies
   - User session established

2. **Route Planning**
   - User enters starting point and destination
   - Frontend sends coordinates to backend
   - Backend calls TomTom Routing API
   - Route polyline and metadata returned
   - Frontend renders route on Leaflet map

3. **Charging Station Discovery**
   - Backend receives route coordinates
   - Calls Open Charge Map API along the route corridor
   - Filters stations by EV compatibility
   - Returns sorted list of stations with details

4. **Weather Integration**
   - Backend fetches weather for start, waypoints, and destination
   - Calculates weather impact on energy consumption
   - Returns adjusted range estimates

5. **Trip Management**
   - User saves trip to MongoDB
   - Trip includes all route, station, and weather data
   - User can view history, share trips, or export as PDF

---

## 🎨 UI/UX Description

VoltPath features a modern, premium dashboard design with the following characteristics:

### Design Philosophy

- **Clean & Minimal**: Uncluttered interface with ample white space
- **Data-First**: Prioritizes information clarity and readability
- **Accessible**: High contrast, readable fonts, intuitive navigation

### Visual Style

- **Color Scheme**: Professional blue accent colors with neutral backgrounds
- **Typography**: Clean sans-serif fonts for optimal readability
- **Icons**: Consistent Lucide React icon set throughout
- **Cards**: Elevated card components with subtle shadows
- **Maps**: Full-width interactive maps with custom markers

### Animations

- **Framer Motion**: Smooth page transitions and component animations
- **Micro-interactions**: Button hover effects, loading states
- **Map Animations**: Route drawing, marker popups
- **Dashboard**: Animated charts and statistics cards

### Responsive Behavior

- **Desktop Optimized**: Full dashboard layout (1200px+)
- **Laptop Compatible**: Adjusted layouts (1024px - 1199px)
- **Fluid Grid**: Tailwind CSS responsive classes

### Key UI Components

1. **Navigation**
   - Fixed top navbar with user profile
   - Collapsible sidebar with menu items
   - Breadcrumb navigation for nested pages

2. **Dashboard**
   - Stat cards with icons and trends
   - Interactive charts (Recharts)
   - Quick action buttons
   - Recent trip history

3. **Map Interface**
   - Full-screen map option
   - Custom EV charging markers
   - Route overlay with color coding
   - Info popups on click

4. **Forms & Inputs**
   - Floating labels
   - Real-time validation
   - Auto-complete location search

5. **Feedback**
   - Toast notifications (React Hot Toast)
   - Loading spinners
   - Error states with retry options

---

## 📸 Screenshots

### Dashboard
![Dashboard](docs/images/dashboard.png)

*The main dashboard displays trip statistics, recent activity, and quick access to route planning.*

### Route Planner
![Route Planner](docs/images/route-planner.png)

*Enter your starting point and destination to generate optimal EV-friendly routes.*

### Map View
![Map View](docs/images/map-view.png)

*Interactive map showing the planned route with charging stations along the way.*

### Charging Stations
![Charging Stations](docs/images/charging-stations.png)

*Browse and filter EV charging stations with detailed information.*

### Trip Results
![Trip Results](docs/images/trip-results.png)

*View comprehensive trip details including weather impact and charging stops.*

### EV Comparison
![EV Comparison](docs/images/ev-comparison.png)

*Compare different EV models side-by-side.*

---

## 🔮 Future Improvements

### Planned Features

- [ ] **Real-time Traffic Updates**: Integrate live traffic data for dynamic route recalculation
- [ ] **Mobile Application**: React Native mobile app for iOS and Android
- [ ] **Charging Station Reservations**: Book charging spots in advance
- [ ] **Multi-stop Routes**: Support for complex itineraries with multiple waypoints
- [ ] **Offline Mode**: PWA enhancements for offline map viewing
- [ ] **Social Features**: Community trips, reviews, and ratings
- [ ] **Cost Calculator**: Detailed cost analysis with variable electricity rates
- [ ] **Climate Impact**: CO2 savings tracking and environmental metrics
- [ ] **Integration with Vehicle Telematics**: Connect with vehicle APIs for real-time battery status
- [ ] **Push Notifications**: Alerts for charging station availability changes

### Technical Improvements

- [ ] TypeScript migration for better type safety
- [ ] GraphQL API for more efficient data fetching
- [ ] WebSocket for real-time updates
- [ ] Enhanced caching strategy
- [ ] Unit and integration tests

---

## 📦 Deployment Guide

### Production Build

#### Backend

```
bash
cd backend
npm run build  # If using TypeScript
NODE_ENV=production npm start
```

#### Frontend

```bash
cd frontend
npm run build
```

The build output will be in `frontend/dist/`

### Deployment Platforms

#### Backend Options
- **Render**: `npm install` → `npm start` (port 5500)
- **Railway**: Node.js template
- **Heroku**: Node.js buildpack
- **AWS EC2**: Manual server setup
- **DigitalOcean**: App Platform or Droplets

#### Frontend Options
- **Vercel**: Connect GitHub repository
- **Netlify**: Drag and drop dist folder
- **Cloudflare Pages**: Static site hosting
- **AWS S3 + CloudFront**: Static website hosting

### Docker Deployment

```
dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5500
CMD ["npm", "start"]
```

---

## 👤 Author

<p align="center">
  <img src="https://img.shields.io/badge/Author-Gaurav%20Athode-blue?style=for-the-badge" alt="Author">
</p>

<p align="center">
  <strong>Gaurav Athode</strong><br>
  Full-Stack Developer | MERN Stack Enthusiast
</p>

<p align="center">
  <a href="https://github.com/GauravAthode">
    <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://www.linkedin.com/in/gaurav-athode-6b435a289/">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
  </a>
  <a href="mailto:gauravathode123@gmail.com">
    <img src="https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email">
  </a>
</p>

---

## 📄 License

This project is licensed under the MIT License.

---

<p align="center">
  Made with ❤️ by <strong>Gaurav Athode</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Thank%20You-4CAF50?style=for-the-badge" alt="Thank You">
</p>
#   E c o - T r a c k - A I - 
 
 
