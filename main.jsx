import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Polyfill window.storage for standalone deployment (uses localStorage)
if (!window.storage) {
  window.storage = {
    async get(key) {
      try {
        const val = localStorage.getItem(`sh_${key}`);
        return val ? { key, value: val } : null;
      } catch { return null; }
    },
    async set(key, value) {
      try {
        localStorage.setItem(`sh_${key}`, value);
        return { key, value };
      } catch { return null; }
    },
    async delete(key) {
      try {
        localStorage.removeItem(`sh_${key}`);
        return { key, deleted: true };
      } catch { return null; }
    },
    async list(prefix) {
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k.startsWith(`sh_${prefix || ''}`)) keys.push(k.replace('sh_', ''));
        }
        return { keys };
      } catch { return { keys: [] }; }
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
