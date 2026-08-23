import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage on initial load and fetch fresh profile from backend
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (error) {
            console.error('Failed to parse user from localStorage', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }

        // Synchronize latest profile data from backend database
        try {
          const freshUser = await authAPI.getMe();
          if (freshUser && freshUser.id) {
            const normalizedUser = {
              id: freshUser.id,
              name: freshUser.name,
              email: freshUser.email,
              phone: freshUser.phone || '',
              role: freshUser.role,
              status: freshUser.status,
              is_email_verified: freshUser.is_email_verified
            };
            localStorage.setItem('user', JSON.stringify(normalizedUser));
            setUser(normalizedUser);
          }
        } catch (error) {
          console.warn('Auth context sync notice:', error?.response?.data?.message || error?.message);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken, userData) => {
    const normalizedUser = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      role: userData.role,
      status: userData.status,
      is_email_verified: userData.is_email_verified || userData.isEmailVerified
    };
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setToken(newToken);
    setUser(normalizedUser);
  };

  const logout = async () => {
    try {
      if (localStorage.getItem('token')) {
        await authAPI.logout();
      }
    } catch (error) {
      console.warn('Server logout notice:', error?.response?.data?.message || error?.message);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isMechanic = user?.role === 'mechanic';
  const isClient = user?.role === 'client';

  const updateUserContext = (updatedUserData) => {
    const newUserData = { 
      ...user, 
      ...updatedUserData,
      phone: updatedUserData.phone !== undefined ? updatedUserData.phone : user?.phone
    };
    localStorage.setItem('user', JSON.stringify(newUserData));
    setUser(newUserData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        isSuperAdmin,
        isAdmin,
        isMechanic,
        isClient,
        login,
        logout,
        updateUserContext
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
