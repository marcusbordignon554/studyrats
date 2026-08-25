// src/services/syncEngine.ts
import { supabase } from '../services/supabase';
import { storageService } from '../services/storageService';

/**
 * Motor de sincronização offline-first para sessões de estudo.
 */
export const syncEngine = {
  /**
   * Busca sessões locais pendentes e tenta sincronizá-las com o Supabase.
   */
  async syncPendingSessions(userId: string): Promise<{ syncedCount: number; failedCount: number }> {
    const pendingSessions = await storageService.getPendingSessions();
    
    if (!pendingSessions || pendingSessions.length === 0) {
      return { syncedCount: 0, failedCount: 0 };
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const session of pendingSessions) {
      try {
        // Mapeia o domínio da aplicação para o schema relacional snake_case
        const payload = {
          id: session.id,
          user_id: userId,
          subject: session.subject,
          category: session.category,
          started_at: session.startTime,
          ended_at: session.endTime,
          duration_seconds: session.durationSeconds,
          status: session.status,
          notes: session.notes,
          created_at: session.createdAt,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('study_sessions')
          .upsert(payload, { onConflict: 'id' });

        if (error) {
          console.error(`Falha ao sincronizar sessão ${session.id}:`, error);
          await storageService.updateSessionStatus(session.id, 'FAILED');
          failedCount++;
        } else {
          await storageService.updateSessionStatus(session.id, 'SYNCED');
          syncedCount++;
        }
      } catch (err) {
        console.error(`Exceção ao sincronizar sessão ${session.id}:`, err);
        await storageService.updateSessionStatus(session.id, 'FAILED');
        failedCount++;
      }
    }

    return { syncedCount, failedCount };
  },

  /**
   * Configura o listener de rede para iniciar o sync automaticamente.
   */
  setupAutoSync(userId: string): () => void {
    const handleOnline = () => {
      console.log('Conexão restabelecida. Sincronizando sessões pendentes...');
      void this.syncPendingSessions(userId);
    };

    window.addEventListener('online', handleOnline);

    // Retorna a função de cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }
};