import { useCallback, useEffect, useState } from 'react';
import { SessionDraftDTO } from '../../domain/user.repository.interface';

const DRAFT_STORAGE_PREFIX = 'odontoleal_session_drafts_user_';

export interface UseSessionDraftReturn {
  drafts: SessionDraftDTO[];
  hasPendingDrafts: boolean;
  saveDraftForUser: (
    idUsuario: number,
    formularioId: string,
    datosBorrador: Record<string, unknown>
  ) => SessionDraftDTO;
  getDraftByFormId: (formularioId: string) => SessionDraftDTO | null;
  discardDraft: (formularioId: string) => void;
  clearAllUserDrafts: () => void;
}

export function useSessionDraft(idUsuario?: number | null): UseSessionDraftReturn {
  const [drafts, setDrafts] = useState<SessionDraftDTO[]>([]);

  const getStorageKey = useCallback((userId: number) => {
    return `${DRAFT_STORAGE_PREFIX}${userId}`;
  }, []);

  const loadUserDrafts = useCallback(
    (userId: number): SessionDraftDTO[] => {
      if (typeof window === 'undefined') return [];
      try {
        const raw = window.localStorage.getItem(getStorageKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw) as SessionDraftDTO[];
        return Array.isArray(parsed)
          ? parsed.map((d) => ({
              ...d,
              fechaGuardado: new Date(d.fechaGuardado),
            }))
          : [];
      } catch {
        return [];
      }
    },
    [getStorageKey]
  );

  useEffect(() => {
    if (!idUsuario) {
      setDrafts([]);
      return;
    }
    setDrafts(loadUserDrafts(idUsuario));
  }, [idUsuario, loadUserDrafts]);

  const saveDraftForUser = useCallback(
    (
      targetUserId: number,
      formularioId: string,
      datosBorrador: Record<string, unknown>
    ): SessionDraftDTO => {
      const existing = loadUserDrafts(targetUserId).filter(
        (d) => d.formularioId !== formularioId
      );

      const newDraft: SessionDraftDTO = {
        idUsuario: targetUserId,
        formularioId,
        datosBorrador,
        fechaGuardado: new Date(),
      };

      const updated = [newDraft, ...existing];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          getStorageKey(targetUserId),
          JSON.stringify(updated)
        );
      }
      if (idUsuario === targetUserId) {
        setDrafts(updated);
      }
      return newDraft;
    },
    [getStorageKey, idUsuario, loadUserDrafts]
  );

  const getDraftByFormId = useCallback(
    (formularioId: string): SessionDraftDTO | null => {
      return drafts.find((d) => d.formularioId === formularioId) ?? null;
    },
    [drafts]
  );

  const discardDraft = useCallback(
    (formularioId: string) => {
      if (!idUsuario) return;
      const updated = drafts.filter((d) => d.formularioId !== formularioId);
      setDrafts(updated);
      if (typeof window !== 'undefined') {
        if (updated.length === 0) {
          window.localStorage.removeItem(getStorageKey(idUsuario));
        } else {
          window.localStorage.setItem(
            getStorageKey(idUsuario),
            JSON.stringify(updated)
          );
        }
      }
    },
    [drafts, getStorageKey, idUsuario]
  );

  const clearAllUserDrafts = useCallback(() => {
    if (!idUsuario) return;
    setDrafts([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(getStorageKey(idUsuario));
    }
  }, [getStorageKey, idUsuario]);

  return {
    drafts,
    hasPendingDrafts: drafts.length > 0,
    saveDraftForUser,
    getDraftByFormId,
    discardDraft,
    clearAllUserDrafts,
  };
}