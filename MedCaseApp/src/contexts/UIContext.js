// =====================================================
// UIContext — estado de interface global:
//  - sidebar colapsada (tablet/desktop) -> .sidebar.collapsed
//  - modais globais abertos pelo Topbar (Perfil / Preferências)
// =====================================================
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'perfil' | 'pref' | null

  const toggleCollapsed = useCallback(() => setSidebarCollapsed((v) => !v), []);
  const openModal = useCallback((name) => setActiveModal(name), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  const value = useMemo(
    () => ({ sidebarCollapsed, toggleCollapsed, activeModal, openModal, closeModal }),
    [sidebarCollapsed, toggleCollapsed, activeModal, openModal, closeModal]
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI deve ser usado dentro de <UIProvider>');
  return ctx;
}
