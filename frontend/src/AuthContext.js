import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const decodeAndSetUser = useCallback((token) => {
    try {
      const decodedToken = jwtDecode(token);
    setUser({
        id: decodedToken.sub,
        username: decodedToken.username,
        role: decodedToken.role,
    });
    return decodedToken;
    } catch (e) {
      console.error("Erro ao decodificar token:", e);
      setUser(null);
      return null;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      logout();
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storedRefreshToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.access_token);
        setAccessToken(data.access_token);
        decodeAndSetUser(data.access_token);
        return true;
      } else {
        console.error('Falha ao renovar token:', response.statusText);
        logout();
        return false;
      }
    } catch (error) {
      console.error('Erro de rede ao renovar token:', error);
      logout();
      return false;
    }
  }, [decodeAndSetUser, logout]);

  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedAccessToken && storedRefreshToken) {
      const decodedAccess = decodeAndSetUser(storedAccessToken);
      if (decodedAccess && decodedAccess.exp * 1000 > Date.now()) {
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
      } else {
        refreshAccessToken();
      }
    } else {
      logout();
    }
    setIsLoading(false);
  }, [decodeAndSetUser, logout, refreshAccessToken]);

  const login = useCallback((newAccessToken, newRefreshToken) => {
    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    decodeAndSetUser(newAccessToken);
  }, [decodeAndSetUser]);

  const isAuthenticated = !!accessToken;

  if (isLoading) {
    return <div>Verificando autenticação...</div>;
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      accessToken,
      refreshToken,
      user,
      login,
      logout,
      refreshAccessToken,
      API_BASE_URL
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

