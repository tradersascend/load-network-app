import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import LoadBoard from './pages/LoadBoard';
import Onboarding from './pages/Onboarding';
import AccountIdLogin from './pages/AccountIdLogin';
import ForgotAccountId from './pages/ForgotAccountId';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Faq from './pages/Faq';
import Contact from './pages/Contact';
import LoadNotifier from './pages/LoadNotifier';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<AccountIdLogin />} />
          <Route path="/login/user" element={<Login />} />
          <Route path="/welcome/:token" element={<Onboarding />} /> {/* Add the new onboarding route */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/forgot-account-id" element={<ForgotAccountId />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<LoadBoard />} />
              <Route path="load-board" element={<LoadBoard />} />
              <Route path="account" element={<Account />} />
              <Route path="faq" element={<Faq />} />
              <Route path="contact" element={<Contact />} />
              <Route path="load-notifier" element={<LoadNotifier />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;