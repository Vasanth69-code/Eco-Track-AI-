import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Route,
  MapPin,
  Activity,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { login, register } from "../services/authService";
import toast from "react-hot-toast";
import { API_BASE } from "../config/constants";

const features = [
  {
    icon: Route,
    label: "Smart Route Planning",
    desc: "Find EV-friendly routes with optimized charging stops.",
  },
  {
    icon: MapPin,
    label: "Charging Stations",
    desc: "Discover relevant charging stations along your journey.",
  },
  {
    icon: Activity,
    label: "Energy Simulation",
    desc: "Estimate usage with weather, battery, and trip conditions.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

const LandingPage = () => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (mode === "login") {
        res = await login({ email: form.email, password: form.password });
      } else {
        res = await register({
          name: form.name,
          email: form.email,
          password: form.password,
        });
      }
      const { token, user } = res.data.data;
      loginWithToken(token, user);
      toast.success(mode === "login" ? "Welcome back!" : "Account created!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden dark:bg-dark-bg bg-light-bg">
      {/* soft background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.08),transparent_35%)]" />
      </div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        {/* Left Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20"
        >
          <div className="w-full max-w-2xl">
            {/* Logo */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-3 mb-10"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-volt flex items-center justify-center shadow-lg shadow-primary/20">
                <Zap className="w-5 h-5 text-dark-bg" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold dark:text-dark-text text-light-text">
                  EcoTrack AI
                </h2>
                <p className="text-xs tracking-[0.18em] uppercase dark:text-dark-muted text-light-muted">
                  Intelligent EV Route & Energy Management
                </p>
              </div>
            </motion.div>

            {/* Hero */}
            <motion.div variants={itemVariants} className="mb-10">
              <p className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase bg-primary/10 text-primary mb-5">
                The Future of Sustainable EV Travel
              </p>

              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black leading-tight tracking-tight dark:text-dark-text text-light-text">
                Plan smarter
                <br />
                <span className="text-gradient-volt">electric journeys</span>
              </h1>

              <p className="mt-5 max-w-xl text-base sm:text-lg leading-7 dark:text-dark-muted text-light-muted">
                EcoTrack AI helps EV drivers plan energy-optimized routes, discover
                charging stations with OpenStreetMap & Overpass, and analyze battery consumption with zero friction.
              </p>
            </motion.div>

            {/* Features */}
            <motion.div
              variants={containerVariants}
              className="grid gap-4 sm:grid-cols-1"
            >
              {features.map((feature) => (
                <motion.div
                  key={feature.label}
                  variants={itemVariants}
                  className="group flex items-start gap-4 rounded-2xl border dark:border-dark-border/70 border-light-border bg-white/70 dark:bg-dark-surface/60 backdrop-blur-sm p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-semibold dark:text-dark-text text-light-text">
                      {feature.label}
                    </h3>
                    <p className="mt-1 text-sm leading-6 dark:text-dark-muted text-light-muted">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.p
              variants={itemVariants}
              className="mt-10 text-xs dark:text-dark-muted text-light-muted"
            >
              © 2026 EcoTrack AI. Built for modern electric mobility.
            </motion.p>
          </div>
        </motion.section>

        {/* Right Section */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14"
        >
          <div className="w-full max-w-md">
            <div className="rounded-3xl border dark:border-dark-border border-light-border dark:bg-dark-surface/85 bg-white/90 backdrop-blur-xl shadow-2xl p-6 sm:p-8">
              {/* Mobile logo */}
              <div className="flex items-center gap-3 mb-8 lg:hidden">
                <div className="w-10 h-10 rounded-xl bg-gradient-volt flex items-center justify-center">
                  <Zap className="w-5 h-5 text-dark-bg" />
                </div>
                <span className="font-display text-xl font-bold dark:text-dark-text text-light-text">
                  EcoTrack AI
                </span>
              </div>

              <div className="mb-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h2 className="text-2xl sm:text-3xl font-bold dark:text-dark-text text-light-text">
                      {mode === "login" ? "Welcome back" : "Create account"}
                    </h2>
                    <p className="text-sm dark:text-dark-muted text-light-muted mt-2">
                      {mode === "login"
                        ? "Sign in to continue your EV planning journey."
                        : "Create your account and start planning smarter trips."}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl border dark:border-dark-border border-light-border dark:bg-dark-highlight/50 bg-light-highlight/60 dark:hover:bg-dark-highlight hover:bg-light-highlight transition-all duration-200 mb-5"
                data-testid="google-login-btn"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-sm font-medium dark:text-dark-text text-light-text">
                  Continue with Google
                </span>
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px dark:bg-dark-border bg-light-border" />
                <span className="text-xs dark:text-dark-muted text-light-muted">
                  or
                </span>
                <div className="flex-1 h-px dark:bg-dark-border bg-light-border" />
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
                data-testid="auth-form"
              >
                <AnimatePresence initial={false}>
                  {mode === "register" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <label className="block text-sm font-medium dark:text-dark-muted text-light-muted mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required={mode === "register"}
                        placeholder="John Doe"
                        className="w-full px-4 py-3.5 rounded-2xl border dark:border-dark-border border-light-border dark:bg-dark-highlight/60 bg-light-highlight/60 dark:text-dark-text text-light-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        data-testid="register-name-input"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="block text-sm font-medium dark:text-dark-muted text-light-muted mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="you@example.com"
                    className="w-full px-4 py-3.5 rounded-2xl border dark:border-dark-border border-light-border dark:bg-dark-highlight/60 bg-light-highlight/60 dark:text-dark-text text-light-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    data-testid="email-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium dark:text-dark-muted text-light-muted mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      placeholder="••••••••"
                      className="w-full px-4 py-3.5 pr-12 rounded-2xl border dark:border-dark-border border-light-border dark:bg-dark-highlight/60 bg-light-highlight/60 dark:text-dark-text text-light-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      data-testid="password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-dark-muted text-light-muted hover:text-primary transition-colors"
                    >
                      {showPw ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                  className="w-full py-3.5 rounded-2xl volt-btn flex items-center justify-center gap-2 font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="auth-submit-btn"
                >
                  {loading ? (
                    <motion.div className="w-5 h-5 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin" />
                  ) : (
                    <>
                      {mode === "login" ? "Sign In" : "Create Account"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>

              <p className="text-center text-sm dark:text-dark-muted text-light-muted mt-6">
                {mode === "login"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  onClick={() =>
                    setMode(mode === "login" ? "register" : "login")
                  }
                  className="text-primary hover:underline font-medium"
                  data-testid="auth-mode-toggle"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default LandingPage;
