import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Pages
import Dashboard from './pages/Dashboard';
import MemoryCapture from './pages/MemoryCapture';
import Memories from './pages/Memories';
import People from './pages/People';
import Nudges from './pages/Nudges';
import Profile from './pages/Profile';

// Components
import Layout from './components/Layout';
import { AuthProvider } from './contexts/AuthContext';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <Routes>
              <Route
                path="/"
                element={<Layout />}
              >
                <Route index element={<div className="flex items-center justify-center h-64 text-2xl text-gray-500">Welcome to MemoryNest! Select a page from the sidebar.</div>} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="capture" element={<MemoryCapture />} />
                <Route path="memories" element={<Memories />} />
                <Route path="people" element={<People />} />
                <Route path="nudges" element={<Nudges />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App; 