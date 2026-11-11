import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { googleSession } from '../services/authService';
import toast from 'react-hot-toast';

const AuthCallbackPage = () => {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    // Check for new Google OAuth callback (token in query params)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        loginWithToken(token, user);
        window.history.replaceState(null, '', '/dashboard');
        toast.success(`Welcome, ${user.name}!`);
        navigate('/dashboard', { replace: true, state: { user } });
        return;
      } catch (err) {
        console.error('Failed to parse user data:', err);
        toast.error('Authentication failed. Please try again.');
        navigate('/');
        return;
        
      }
    }

    // Fallback: Check for Emergent AI callback (session_id in hash)
    const hash = window.location.hash;
    const sessionIdMatch = hash.match(/session_id=([^&]+)/);

    if (!sessionIdMatch) {
      toast.error('Invalid authentication callback');
      navigate('/');
      return;
    }

    const sessionId = sessionIdMatch[1];

    googleSession(sessionId)
      .then((res) => {
        const { token, user } = res.data.data;
        loginWithToken(token, user);
        window.history.replaceState(null, '', '/dashboard');
        toast.success(`Welcome, ${user.name}!`);
        navigate('/dashboard', { replace: true, state: { user } });
      })
      .catch((err) => {
        toast.error('Google sign-in failed. Please try again.');
        navigate('/');
      });
  }, []);

  return (
    <div className="min-h-screen dark:bg-dark-bg bg-light-bg flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-2xl bg-gradient-volt flex items-center justify-center"
        >
          <Zap className="w-8 h-8 text-dark-bg" />
        </motion.div>
        <div className="text-center">
          <p className="text-lg font-semibold dark:text-dark-text text-light-text">Authenticating with Google...</p>
          <p className="text-sm dark:text-dark-muted text-light-muted mt-1">Setting up your VoltPath account</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthCallbackPage;
