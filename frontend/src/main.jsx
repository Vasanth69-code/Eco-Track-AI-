import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#151921',
          color: '#F8FAFC',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '12px',
          fontFamily: 'Manrope, sans-serif',
          fontSize: '14px',
        },
        success: { iconTheme: { primary: '#00F0FF', secondary: '#0B0E14' } },
        error: { iconTheme: { primary: '#FF3B30', secondary: '#F8FAFC' } },
      }}
    />
  </React.StrictMode>
);
