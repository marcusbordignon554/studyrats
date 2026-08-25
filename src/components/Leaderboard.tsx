// src/components/Leaderboard.tsx
import { useState, useEffect, useCallback } from 'react';
import type { StudyGroup, LeaderboardEntry } from '../types/domain';
import { groupService } from '../services/groupService';
import { Avatar } from './Avatar';
import { Trophy, Users, X, Medal, Clock, Loader2 } from 'lucide-react';

interface LeaderboardProps {
  userId: string;
  onClose?: () => void;
  onOpenGroups?: () => void;
}

export function Leaderboard({ userId, onClose, onOpenGroups }: LeaderboardProps) {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    const userGroups = await groupService.getUserGroups(userId);
    setGroups(userGroups);
    if (userGroups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(userGroups[0].id);
    }
    setLoading(false);
  }, [userId, selectedGroupId]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const loadLeaderboard = useCallback(async (groupId: string) => {
    setLoadingBoard(true);
    const data = await groupService.getGroupLeaderboard(groupId);
    setLeaderboard(data);
    setLoadingBoard(false);
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      void loadLeaderboard(selectedGroupId);
    }
  }, [selectedGroupId, loadLeaderboard]);

  const formatStudyTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
            <Trophy size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Ranking Semanal</h2>
            <p className="text-xs text-slate-400">Competição dos últimos 7 dias</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Seletor de Grupos */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Users className="text-slate-400 flex-shrink-0" size={18} />
          {groups.length > 0 ? (
            <select
              value={selectedGroupId || ''}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white text-sm rounded-xl px-3 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-slate-400">Você não faz parte de nenhum grupo</span>
          )}
        </div>

        {onOpenGroups && (
          <button
            onClick={onOpenGroups}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors cursor-pointer"
          >
            Gerenciar Grupos
          </button>
        )}
      </div>

      {/* Corpo da Tabela / Ranking */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {loading || loadingBoard ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
            <Loader2 className="animate-spin text-indigo-400" size={28} />
            <p className="text-sm">Carregando posições...</p>
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
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">Nenhum estudo registrado neste grupo nos últimos 7 dias.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => {
              const isTop1 = index === 0;
              const isTop2 = index === 1;
              const isTop3 = index === 2;

              return (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    isTop1
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : isTop2
                      ? 'bg-slate-400/10 border-slate-400/30 text-slate-200'
                      : isTop3
                      ? 'bg-orange-600/10 border-orange-600/30 text-orange-200'
                      : 'bg-slate-950 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Badge de Posição */}
                    <div className="w-7 text-center font-bold text-sm">
                      {isTop1 ? (
                        <Medal className="text-amber-400 mx-auto" size={20} />
                      ) : isTop2 ? (
                        <Medal className="text-slate-300 mx-auto" size={20} />
                      ) : isTop3 ? (
                        <Medal className="text-amber-700 mx-auto" size={20} />
                      ) : (
                        <span className="text-slate-500 font-mono">#{index + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar username={entry.username} avatarUrl={entry.avatarUrl} size="md" />

                    <div>
                      <p className="font-semibold text-sm text-white">{entry.username}</p>
                      {entry.userId === userId && (
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-medium">
                          Você
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono font-bold text-sm">
                    <Clock size={16} className="text-slate-400" />
                    <span>{formatStudyTime(entry.totalStudyTimeSeconds)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}