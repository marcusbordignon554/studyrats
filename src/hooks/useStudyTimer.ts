// src/hooks/useStudyTimer.ts
import { useState, useEffect, useCallback } from 'react';
import type { TimerStatus, SubjectCategory, StudySession } from '../types/domain';

export function useStudyTimer() {
  const [status, setStatus] = useState<TimerStatus>('IDLE');
  const [activeSession, setActiveSession] = useState<Partial<StudySession> | null>(null);
  
  // Usamos states separados para manter precisão de drift
  const [accumulatedTimeMs, setAccumulatedTimeMs] = useState<number>(0);
  const [lastResumeTime, setLastResumeTime] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Loop de renderização (apenas visual, não usado para cálculo matemático de tempo)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'RUNNING' || status === 'BREAK') {
      interval = setInterval(() => {
        setNow(Date.now());
      }, 500); // 500ms garante que o UI não pule segundos devido a pequenos atrasos de thread
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  const startStudy = useCallback((subject: string, category: SubjectCategory, notes?: string) => {
    const startTimeStr = new Date().toISOString();
    const currentTime = Date.now();
    
    setActiveSession({
      id: crypto.randomUUID(),
      subject,
      category,
      startTime: startTimeStr,
      status: 'RUNNING',
      notes: notes || null,
      syncStatus: 'PENDING',
      createdAt: startTimeStr,
      updatedAt: startTimeStr
    });
    
    setStatus('RUNNING');
    setAccumulatedTimeMs(0);
    setLastResumeTime(currentTime);
    setNow(currentTime);
  }, []);

  const pauseTimer = useCallback(() => {
    if (status !== 'RUNNING' || !lastResumeTime) return;
    
    const currentTime = Date.now();
    // Salva o tempo decorrido até agora no acumulador
    setAccumulatedTimeMs((prev) => prev + (currentTime - lastResumeTime));
    setLastResumeTime(null);
    setStatus('PAUSED');
    
    setActiveSession((prev) => prev ? { 
      ...prev, 
      status: 'PAUSED',
      updatedAt: new Date().toISOString()
    } : null);
  }, [status, lastResumeTime]);

  const resumeTimer = useCallback(() => {
    if (status !== 'PAUSED') return;
    
    const currentTime = Date.now();
    setLastResumeTime(currentTime);
    setStatus('RUNNING');
    setNow(currentTime);

    setActiveSession((prev) => prev ? { 
      ...prev, 
      status: 'RUNNING',
      updatedAt: new Date().toISOString()
    } : null);
  }, [status]);

  const cancelTimer = useCallback(() => {
    setStatus('IDLE');
    setActiveSession(null);
    setAccumulatedTimeMs(0);
    setLastResumeTime(null);
  }, []);

  // Calcula a duração exata para a renderização atual
  let totalMs = accumulatedTimeMs;
  if ((status === 'RUNNING' || status === 'BREAK') && lastResumeTime !== null) {
    totalMs += (now - lastResumeTime);
  }
  const durationSeconds = Math.floor(totalMs / 1000);

  const completeSession = useCallback((): StudySession | null => {
    if (!activeSession || !activeSession.id || !activeSession.startTime || !activeSession.subject || !activeSession.category) {
      cancelTimer();
      return null;
    }

    // Calcula duração final exata no momento de completar
    let finalMs = accumulatedTimeMs;
    if (status === 'RUNNING' && lastResumeTime !== null) {
      finalMs += (Date.now() - lastResumeTime);
    }
    const finalDurationSeconds = Math.floor(finalMs / 1000);

    // Rejeita a sessão se for menor que 60 segundos
    if (finalDurationSeconds < 60) {
      cancelTimer();
      return null;
    }

    const endTimeStr = new Date().toISOString();
    const completedSession: StudySession = {
      id: activeSession.id,
      userId: activeSession.userId || 'local-user', // Será substituído pelo usuário real autenticado na persistência
      subject: activeSession.subject,
      category: activeSession.category,
      startTime: activeSession.startTime,
      endTime: endTimeStr,
      durationSeconds: finalDurationSeconds,
      status: 'IDLE', // Sessão concluída
      syncStatus: 'PENDING',
      notes: activeSession.notes || null,
      createdAt: activeSession.createdAt || endTimeStr,
      updatedAt: endTimeStr,
    };

    cancelTimer();
    return completedSession;
  }, [activeSession, accumulatedTimeMs, status, lastResumeTime, cancelTimer]);

  const formatTime = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    return [h, m, s]
      .map((val) => val.toString().padStart(2, '0'))
      .join(':');
  };

  return {
    status,
    durationSeconds,
    formattedTime: formatTime(durationSeconds),
    currentSubject: activeSession?.subject || '',
    currentCategory: activeSession?.category || null,
    activeSession,
    startStudy,
    pauseTimer,
    resumeTimer,
    completeSession,
    cancelTimer
  };
}