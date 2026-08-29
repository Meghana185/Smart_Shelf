import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthToken } from '../api/client';

export interface UserProfile {
  id?: number;
  username: string;
  name?: string;
  email?: string;
  role: 'admin' | 'staff' | 'customer';
  phone_number?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('smartshelf_token');
    if (saved) setAuthToken(saved);
    return saved;
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('smartshelf_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  const login = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    setAuthToken(newToken);
    localStorage.setItem('smartshelf_token', newToken);
    localStorage.setItem('smartshelf_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('smartshelf_token');
    localStorage.removeItem('smartshelf_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
