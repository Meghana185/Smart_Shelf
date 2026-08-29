import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingBag,
  LogOut,
  User,
  Menu,
  X,
  ChefHat
} from 'lucide-react';

export const CustomerNavbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login/customer');
  };

  const isCustomerAuthenticated = isAuthenticated && user && user.role === 'customer';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Platform Identity */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-md shadow-emerald-600/20 group-hover:scale-105 transition">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1">
                <span className="font-black tracking-tight text-slate-900 text-lg">SMART</span>
                <span className="font-black tracking-tight text-emerald-600 text-lg">SHELF</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Food Expiry & AI Platform</span>
            </div>
          </Link>

          {/* Right Action Links & Profile Controls */}
          <div className="flex items-center gap-3">
            {/* AI Chef Chatbot Quick Button */}
            <Link
              to="/dashboard?openAi=true"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl border border-emerald-200 text-xs transition"
            >
              <ChefHat className="w-4 h-4 text-emerald-600" />
              <span>AI Recipe Chef</span>
            </Link>

            {/* Customer Authentication State */}
            {isCustomerAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl text-slate-800 font-bold border border-slate-200 transition"
                >
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">{user.name || user.phone_number || user.username}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition text-xs"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login/customer"
                className="px-4 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shadow-md shadow-emerald-600/20"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Drawer Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Customer Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg"
            >
              🏠 Home Overview
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg flex items-center justify-between"
            >
              <span>👨‍🍳 Chef Smarty AI Recipes</span>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Groq AI</span>
            </Link>
            <Link
              to="/login/customer"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg"
            >
              👤 Customer Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
