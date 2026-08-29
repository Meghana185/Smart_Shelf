import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, LogOut, User, ShieldAlert } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login/staff');
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Store Admin</span>;
      case 'staff':
        return <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Staff POS</span>;
      default:
        return null;
    }
  };

  return (
    <nav className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
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
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Supermarket System</span>
            </div>
          </Link>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                {user.role === 'admin' && location.pathname !== '/admin' && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 transition"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}

                {user.role === 'staff' && location.pathname !== '/billing' && (
                  <Link
                    to="/billing"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 transition"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>POS Terminal</span>
                  </Link>
                )}

                <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                  {getRoleBadge(user.role)}
                  <div className="flex items-center gap-1.5 text-xs bg-slate-100 px-3 py-1.5 rounded-xl text-slate-700 border border-slate-200 font-bold">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{user.username}</span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition text-xs flex items-center gap-1 font-semibold"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login/staff"
                  className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition"
                >
                  Staff POS
                </Link>
                <Link
                  to="/login/admin"
                  className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition"
                >
                  Admin
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
