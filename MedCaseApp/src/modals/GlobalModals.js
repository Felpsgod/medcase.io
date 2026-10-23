// =====================================================
// Modais globais abertos pelo Topbar / Dashboard / Perfil
// (Editar Perfil e Preferências) — controlados pelo UIContext.
// =====================================================
import React from 'react';
import PerfilModal from './PerfilModal';
import PreferenciasModal from './PreferenciasModal';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';

export default function GlobalModals() {
  const { activeModal, closeModal } = useUI();
  const { isAuth } = useAuth();
  if (!isAuth) return null;
  return (
    <>
      <PerfilModal visible={activeModal === 'perfil'} onClose={closeModal} />
      <PreferenciasModal visible={activeModal === 'pref'} onClose={closeModal} />
    </>
  );
}
