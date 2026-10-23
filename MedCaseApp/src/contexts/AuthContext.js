// =====================================================
// AuthContext — sessão do usuário (token do backend + dados do perfil)
// Substitui o par localStorage medcase_auth / medcase_user e o
// redirecionamento login.html <-> painel.html.
// =====================================================
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/auth';
import { setToken, setUnauthorizedHandler } from '../services/api';
import { loginOneSignal, logoutOneSignal } from '../services/notifications';
import { notificarBoasVindas, pedirPermissao } from '../services/localNotifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const aplicarSessao = useCallback((sessao) => {
    setToken(sessao?.token);
    setUser(sessao?.usuario || null);
    if (sessao?.usuario) loginOneSignal(sessao.usuario.id);
  }, []);

  /** Sai só localmente (usado quando o servidor responde 401). */
  const sairLocal = useCallback(async () => {
    await authService.limparSessao();
    setToken(null);
    setUser(null);
    logoutOneSignal();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      sairLocal();
    });
    return () => setUnauthorizedHandler(null);
  }, [sairLocal]);

  // Ao abrir o app: usa a sessão salva na hora (funciona offline) e, em
  // segundo plano, atualiza o perfil pelo servidor (GET /api/auth/me).
  useEffect(() => {
    (async () => {
      const sessao = await authService.lerSessao();
      if (sessao) aplicarSessao(sessao);
      setLoading(false);
      if (sessao) {
        try {
          const atualizado = await authService.buscarUsuarioAtual();
          await authService.atualizarUsuarioLocal(atualizado);
          setUser(atualizado);
        } catch (e) {
          // sem rede: segue com o cache; 401: o handler acima já fez logout
        }
      }
    })();
  }, [aplicarSessao]);

  const login = useCallback(async (email, senha) => aplicarSessao(await authService.handleLogin(email, senha)), [aplicarSessao]);

  const register = useCallback(
    async (dados) => {
      const sessao = await authService.handleRegister(dados);
      aplicarSessao(sessao);
      // Notificação de boas-vindas no celular (pede a permissão na hora)
      try {
        if (await pedirPermissao()) await notificarBoasVindas(sessao.usuario?.nome);
      } catch (e) {
        // notificação é secundária: a conta já foi criada
      }
    },
    [aplicarSessao]
  );

  const logout = useCallback(async () => {
    await authService.logoutServidor();
    await sairLocal();
  }, [sairLocal]);

  const updateUser = useCallback(async (novo) => {
    await authService.atualizarUsuarioLocal(novo);
    setUser(novo);
  }, []);

  const value = useMemo(
    () => ({ user, userId: user?.id ?? null, loading, isAuth: !!user, login, register, logout, updateUser }),
    [user, loading, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
