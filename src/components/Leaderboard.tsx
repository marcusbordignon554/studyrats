// src/components/Leaderboard.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Avatar } from './Avatar';
import {
  Trophy,
  Users,
  X,
  Medal,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Calendar
} from 'lucide-react';

interface LeaderboardProps {
  userId: string;
  onClose?: () => void;
  onOpenGroups?: () => void;
}

interface GroupOption {
  id: string;
  name: string;
  invite_code?: string;
}

interface MemberSessionDetail {
  id: string;
  subject: string;
  category: string;
  startedAt: string;
  durationSeconds: number;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalStudyTimeSeconds: number;
  sessions: MemberSessionDetail[];
}

const CATEGORY_LABELS: Record<string, string> = {
  PROGRAMMING: 'Programação & TI',
  MATHEMATICS: 'Matemática',
  SCIENCE: 'Ciências',
  HUMANITIES: 'Humanas',
  LANGUAGES: 'Idiomas',
  LITERATURE: 'Literatura',
  OTHER: 'Outro'
};

export function Leaderboard({ userId, onClose, onOpenGroups }: LeaderboardProps) {
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);

  // 1. Carregar grupos do usuário logado
  const loadGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          study_groups (
            id,
            name,
            invite_code
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const formattedGroups: GroupOption[] = (data || [])
        .map((item: any) => item.study_groups)
        .filter(Boolean);

      setGroups(formattedGroups);
      if (formattedGroups.length > 0) {
        setSelectedGroupId((prev) => prev || formattedGroups[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar grupos no ranking:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  // 2. Carregar membros e sessões detalhadas dos últimos 7 dias
  const loadLeaderboard = useCallback(async (groupId: string) => {
    try {
      setLoadingBoard(true);

      // Buscar os membros do grupo selecionado
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select(`
          user_id,
          profiles (
            id,
            username,
            avatar_url
          )
        `)
        .eq('group_id', groupId);

      if (memberError) throw memberError;

      const members = (memberData || []).map((m: any) => ({
        id: m.user_id,
        username: m.profiles?.username || 'Usuário',
        avatarUrl: m.profiles?.avatar_url || null
      }));

      if (members.length === 0) {
        setLeaderboard([]);
        return;
      }

      const memberIds = members.map((m) => m.id);

      // Data de corte: 7 dias atrás
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      // Buscar todas as sessões registradas pelos membros no período
      const { data: sessions, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('id, user_id, subject, category, started_at, duration_seconds')
        .in('user_id', memberIds)
        .gte('started_at', sevenDaysAgo.toISOString())
        .order('started_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Mapear sessões e acumular tempo por participante
      const sessionMap: Record<string, MemberSessionDetail[]> = {};
      const durationMap: Record<string, number> = {};

      (sessions || []).forEach((s: any) => {
        const uid = s.user_id;
        const dur = Number(s.duration_seconds) || 0;

        if (!sessionMap[uid]) {
          sessionMap[uid] = [];
          durationMap[uid] = 0;
        }

        durationMap[uid] += dur;
        sessionMap[uid].push({
          id: s.id,
          subject: s.subject,
          category: s.category,
          startedAt: s.started_at,
          durationSeconds: dur
        });
      });

      // Montar ranking final
      const entries: LeaderboardEntry[] = members.map((m) => ({
        userId: m.id,
        username: m.username,
        avatarUrl: m.avatarUrl,
        totalStudyTimeSeconds: durationMap[m.id] || 0,
        sessions: sessionMap[m.id] || []
      }));

      // Ordenar decrescente pelo tempo total
      entries.sort((a, b) => b.totalStudyTimeSeconds - a.totalStudyTimeSeconds);
      setLeaderboard(entries);
    } catch (err) {
      console.error('Erro ao calcular ranking semanal:', err);
    } finally {
      setLoadingBoard(false);
    }
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      void loadLeaderboard(selectedGroupId);
    }
  }, [selectedGroupId, loadLeaderboard]);

  const toggleExpandUser = (targetUserId: string) => {
    setExpandedUserId((prev) => (prev === targetUserId ? null : targetUserId));
  };

  const formatStudyTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDateDisplay = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
      {/* Cabeçalho */}
      <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Trophy size={22} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Ranking Semanal</h2>
            <p className="text-xs text-slate-400">Competição dos últimos 7 dias • Toque em um participante para ver o que ele estudou</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Seletor de Grupos */}
      <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Users className="text-slate-400 flex-shrink-0" size={18} />
          {groups.length > 0 ? (
            <select
              value={selectedGroupId || ''}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm rounded-xl px-3 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs sm:text-sm text-slate-400">Você não faz parte de nenhum grupo</span>
          )}
        </div>

        {onOpenGroups && (
          <button
            onClick={onOpenGroups}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors cursor-pointer whitespace-nowrap"
          >
            Gerenciar Grupos
          </button>
        )}
      </div>

      {/* Tabela do Ranking com Accordion */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        {loadingGroups || loadingBoard ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
            <Loader2 className="animate-spin text-indigo-400" size={28} />
            <p className="text-xs sm:text-sm">Carregando posições e estudos...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-3">
            <Users size={40} className="mx-auto text-slate-700" />
            <p className="text-sm">Você ainda não faz parte de nenhum grupo.</p>
            {onOpenGroups && (
              <button
                onClick={onOpenGroups}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Users size={15} />
                Criar ou Entrar em um Grupo
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => {
              const isCurrentUser = entry.userId === userId;
              const isExpanded = expandedUserId === entry.userId;
              const isTop1 = index === 0;
              const isTop2 = index === 1;
              const isTop3 = index === 2;

              return (
                <div
                  key={entry.userId}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isCurrentUser
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : isTop1
                      ? 'bg-slate-950/90 border-amber-500/20'
                      : 'bg-slate-950 border-slate-800/80'
                  }`}
                >
                  {/* Linha do Membro (clicável para expandir) */}
                  <div
                    onClick={() => toggleExpandUser(entry.userId)}
                    className="flex items-center justify-between p-3.5 sm:p-4 cursor-pointer hover:bg-slate-800/40 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                      {/* Posição / Medalha */}
                      <div className="w-6 text-center font-bold text-sm flex-shrink-0">
                        {isTop1 ? (
                          <Medal className="text-amber-400 mx-auto" size={20} />
                        ) : isTop2 ? (
                          <Medal className="text-slate-300 mx-auto" size={20} />
                        ) : isTop3 ? (
                          <Medal className="text-amber-700 mx-auto" size={20} />
                        ) : (
                          <span className="text-slate-500 font-mono text-xs">#{index + 1}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <Avatar username={entry.username} avatarUrl={entry.avatarUrl} size="md" />

                      <div className="min-w-0 overflow-hidden">
                        <p className="font-semibold text-xs sm:text-sm text-white truncate flex items-center gap-1.5">
                          {entry.username}
                          {isCurrentUser && (
                            <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-medium">
                              Você
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {entry.sessions.length} {entry.sessions.length === 1 ? 'estudo registrado' : 'estudos registrados'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 pl-2 flex-shrink-0">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-xs sm:text-sm text-amber-400">
                        <Clock size={15} className="text-slate-500" />
                        <span>{formatStudyTime(entry.totalStudyTimeSeconds)}</span>
                      </div>
                      <div className="text-slate-500 hover:text-slate-300 p-1">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Sessões Expandidas ("O que você estudou?") */}
                  {isExpanded && (
                    <div className="p-3.5 sm:p-4 bg-slate-900/80 border-t border-slate-800/80 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
                        <BookOpen size={14} className="text-indigo-400" />
                        <span>Estudos dos últimos 7 dias:</span>
                      </div>

                      {entry.sessions.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-1">
                          Nenhum estudo registrado nos últimos 7 dias.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                          {entry.sessions.map((sess) => (
                            <div
                              key={sess.id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/60 text-xs"
                            >
                              <div className="overflow-hidden pr-2">
                                <p className="font-semibold text-slate-200 truncate">{sess.subject}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                    {CATEGORY_LABELS[sess.category] || sess.category}
                                  </span>
                                  <span className="text-[10px] text-slate-500 flex items-center gap-0.5 font-mono">
                                    <Calendar size={10} />
                                    {formatDateDisplay(sess.startedAt)}
                                  </span>
                                </div>
                              </div>

                              <span className="font-mono font-semibold text-indigo-400 whitespace-nowrap pl-2 text-right">
                                {formatStudyTime(sess.durationSeconds)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}