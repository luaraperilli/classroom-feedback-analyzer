import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import API_BASE_URL from '../../config';
import { encerrarSessao, getProfile, registerAuthHandlers } from '../../services/api';

const AuthContext = createContext(null);

const tokenExpirado = (token) => {
  try {
    const { exp } = jwtDecode(token);
    return !exp || exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

const dadosDoToken = (token) => {
  try {
    const { sub, username, role } = jwtDecode(token);
    return { id: sub, username, role };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const tokenRef = useRef(accessToken);
  const refreshEmAndamento = useRef(null);

  const guardarToken = useCallback((token) => {
    tokenRef.current = token;
    setAccessToken(token);
    if (token) localStorage.setItem('accessToken', token);
    else localStorage.removeItem('accessToken');
  }, []);

  // A revogação no servidor é "melhor esforço": se a rede falhar, a sessão
  // local é encerrada de qualquer forma.
  const logout = useCallback(() => {
    const token = tokenRef.current;
    const refreshToken = localStorage.getItem('refreshToken');

    if (token) {
      encerrarSessao(token, refreshToken).catch(() => {});
    }

    localStorage.removeItem('refreshToken');
    guardarToken(null);
    setUser(null);
  }, [guardarToken]);

  // Mescla em vez de substituir: o token só carrega id, username e role, e
  // sobrescrever o usuário apagava must_change_password e display_name.
  const mesclarUsuario = useCallback((parcial) => {
    if (!parcial) return;
    setUser((anterior) => (anterior ? { ...anterior, ...parcial } : parcial));
  }, []);

  // Devolve o token novo, não um booleano — quem chamou precisa dele para
  // refazer a requisição. E é single-flight: várias telas pedindo renovação ao
  // mesmo tempo compartilham a mesma promessa, em vez de disparar vários POSTs.
  const refreshAccessToken = useCallback(async () => {
    if (refreshEmAndamento.current) return refreshEmAndamento.current;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      logout();
      return null;
    }

    refreshEmAndamento.current = (async () => {
      try {
        const resposta = await fetch(`${API_BASE_URL}/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${refreshToken}`,
          },
        });

        if (!resposta.ok) {
          logout();
          return null;
        }

        const { access_token: novoToken } = await resposta.json();
        guardarToken(novoToken);
        mesclarUsuario(dadosDoToken(novoToken));
        return novoToken;
      } catch {
        logout();
        return null;
      } finally {
        refreshEmAndamento.current = null;
      }
    })();

    return refreshEmAndamento.current;
  }, [guardarToken, logout, mesclarUsuario]);

  useEffect(() => {
    registerAuthHandlers({
      getToken: () => tokenRef.current,
      refresh: refreshAccessToken,
      onAuthFailure: logout,
    });
  }, [refreshAccessToken, logout]);

  useEffect(() => {
    const tokenSalvo = localStorage.getItem('accessToken');

    if (!tokenSalvo) {
      setIsLoading(false);
      return;
    }

    const iniciar = async () => {
      let token = tokenSalvo;

      if (tokenExpirado(token)) {
        token = await refreshAccessToken();
        if (!token) {
          setIsLoading(false);
          return;
        }
      } else {
        guardarToken(token);
      }

      mesclarUsuario(dadosDoToken(token));

      try {
        mesclarUsuario(await getProfile(token));
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    iniciar();
  }, [guardarToken, logout, mesclarUsuario, refreshAccessToken]);

  const login = useCallback((novoAccessToken, novoRefreshToken, dadosUsuario) => {
    localStorage.setItem('refreshToken', novoRefreshToken);
    guardarToken(novoAccessToken);
    setUser(dadosUsuario || dadosDoToken(novoAccessToken));
  }, [guardarToken]);

  const value = {
    isAuthenticated: !!accessToken,
    accessToken,
    user,
    login,
    logout,
    updateUser: mesclarUsuario,
    refreshAccessToken,
    isLoading,
  };

  // Os filhos são sempre renderizados: quem decide o que mostrar durante o
  // carregamento é o App, com um loader. Antes a tela ficava em branco enquanto
  // o backend acordava, o que no cold start pode levar quase um minuto.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
