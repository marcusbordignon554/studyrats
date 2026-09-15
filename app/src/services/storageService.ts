// src/services/storageService.ts
import type { StudySession, SyncStatus } from '../types/domain';

const STORAGE_KEY = '@app:study_sessions';

/**
 * Helper interno para leitura segura do LocalStorage.
 */
const safeGet = (): StudySession[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Falha ao ler do localStorage:', error);
    return [];
  }
};

/**
 * Helper interno para escrita segura no LocalStorage.
 */
const safeSet = (sessions: StudySession[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Falha ao escrever no localStorage:', error);
  }
};

export const storageService = {
  /**
   * Salva ou atualiza uma sessão de estudo no armazenamento local (Upsert).
   */
  async saveSession(session: StudySession): Promise<void> {
    return new Promise((resolve) => {
      try {
        const sessions = safeGet();
        const index = sessions.findIndex((s) => s.id === session.id);

        if (index !== -1) {
          sessions[index] = session;
        } else {
          sessions.push(session);
        }

        safeSet(sessions);
        resolve();
      } catch (error) {
        console.error('Erro em saveSession:', error);
        resolve();
      }
    });
  },

  /**
   * Exclui uma sessão de estudo do armazenamento local.
   */
  async deleteSession(sessionId: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        const sessions = safeGet();
        const filtered = sessions.filter((s) => s.id !== sessionId);
        safeSet(filtered);
        resolve();
      } catch (error) {
        console.error('Erro em deleteSession:', error);
        resolve();
      }
    });
  },

  /**
   * Retorna todo o histórico local ordenado por startTime (mais recente primeiro).
   */
  async getSessions(): Promise<StudySession[]> {
    return new Promise((resolve) => {
      try {
        const sessions = safeGet();
        sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        resolve(sessions);
      } catch (error) {
        console.error('Erro em getSessions:', error);
        resolve([]);
      }
    });
  },

  /**
   * Retorna apenas as sessões com syncStatus === 'PENDING'.
   */
  async getPendingSessions(): Promise<StudySession[]> {
    return new Promise((resolve) => {
      try {
        const sessions = safeGet();
        const pendingSessions = sessions.filter((session) => session.syncStatus === 'PENDING');
        resolve(pendingSessions);
      } catch (error) {
        console.error('Erro em getPendingSessions:', error);
        resolve([]);
      }
    });
  },

  /**
   * Atualiza o status de sincronização de uma sessão.
   */
  async updateSessionStatus(sessionId: string, status: SyncStatus): Promise<void> {
    return new Promise((resolve) => {
      try {
        const sessions = safeGet();
        const index = sessions.findIndex((s) => s.id === sessionId);

        if (index !== -1) {
          sessions[index].syncStatus = status;
          sessions[index].updatedAt = new Date().toISOString();
          safeSet(sessions);
        }
        resolve();
      } catch (error) {
        console.error('Erro em updateSessionStatus:', error);
        resolve();
      }
    });
  },

  /**
   * Limpa todas as sessões locais.
   */
  async clearLocalSessions(): Promise<void> {
    return new Promise((resolve) => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        resolve();
      } catch (error) {
        console.error('Erro em clearLocalSessions:', error);
        resolve();
      }
    });
  }
};