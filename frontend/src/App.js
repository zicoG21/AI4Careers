import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import EulaPage from './pages/EulaPage';
import Dashboard from './pages/Dashboard';
import ChatWithAI from './pages/ChatWithAI';
import Profile from './pages/Profile';
import Companies from './pages/Companies';
import Landing from './pages/Landing';
import ResumeLab from './pages/ResumeLab';
import Experiences from './pages/Experiences';
import BQPrep from './pages/BQPrep';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/eula" element={<EulaPage />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/resume-upload" element={<Navigate to="/resume-lab" replace />} />
          <Route path="/resume-lab" element={<PrivateRoute><ResumeLab /></PrivateRoute>} />
          <Route path="/resume-lab/:id" element={<PrivateRoute><ResumeLab /></PrivateRoute>} />
          <Route path="/experiences" element={<PrivateRoute><Experiences /></PrivateRoute>} />
          <Route path="/bq" element={<PrivateRoute><BQPrep /></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><ChatWithAI /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/companies" element={<PrivateRoute><Companies /></PrivateRoute>} />
          <Route path="/" element={<Landing />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
