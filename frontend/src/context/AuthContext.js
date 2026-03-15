import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { login as apiLogin, signup as apiSignup, getMe } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const fetchUser = useCallback(async (tokenOverride) => {
    try {
      const tokenToUse = tokenOverride || token;
      const userData = await getMe(tokenToUse);
      if (userData.error) {
        logout();
      } else {
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout, token]);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser, token]);

  const login = async (email, password) => {
    try {
      const data = await apiLogin(email, password);
      if (data.error) {
        throw new Error(data.error);
      }
      const tokenValue = data.token;
      localStorage.setItem('token', tokenValue);
      setToken(tokenValue);
      // Pass the token directly to fetchUser since state update is async
      await fetchUser(tokenValue);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const signup = async (email, password, name) => {
    try {
      const data = await apiSignup(email, password, name);
      if (data.error) {
        throw new Error(data.error);
      }
      // After signup, auto-login
      return await login(email, password);
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
