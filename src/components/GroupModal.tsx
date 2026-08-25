// src/components/GroupModal.tsx
import { useState, useEffect, useCallback } from 'react';
import { groupService } from '../services/groupService';
import { Avatar } from './Avatar';
import type { StudyGroup, GroupMember } from '../types/domain';
import {
  Users, Plus, UserPlus, Copy, Check, X, Loader2, Crown, 
  LogOut, Trash2, AlertCircle, CheckCircle2, ChevronRight, 
  ArrowLeft, ShieldAlert
} from 'lucide-react';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface GroupWithDetails extends StudyGroup {
  members: GroupMember[];
}

export function GroupModal({ isOpen, onClose, userId }: GroupModalProps) {
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE' | 'JOIN'>('LIST');
  const [selectedGroup, setSelectedGroup] = useState<GroupWithDetails | null>(null);

  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const [newGroupName, setNewGroupName] = useState<string>('');
  const [inviteCodeInput, setInviteCodeInput] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  const loadGroupsAndMembers = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const userGroups = await groupService.getUserGroups(userId);

      const groupsWithMembersPromises = userGroups.map(async (group) => {
        const members = await groupService.getGroupMembers(group.id, group.createdBy);
        return {
          ...group,
          members
        };
      });

      const fullGroupsList = await Promise.all(groupsWithMembersPromises);

      setGroups(fullGroupsList);

      if (selectedGroup) {
        const updated = fullGroupsList.find((g) => g.id === selectedGroup.id);
        setSelectedGroup(updated || null);
      }
    } catch (err) {
      console.error('Erro ao carregar grupos no modal:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedGroup?.id]);

  useEffect(() => {
    if (isOpen) {
      void loadGroupsAndMembers();
    }
  }, [isOpen, loadGroupsAndMembers]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };


  const handleOpenCreateTab = () => {
    setNewGroupName('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveTab('CREATE');
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const name = newGroupName.trim();
    if (!name) {
      setErrorMessage('Informe um nome válido para o grupo.');
      return;
    }

    try {
      setActionLoading(true);

      const { data, error } = await groupService.createGroup(name, userId);

      if (error || !data) {
        throw error || new Error('Erro ao criar grupo.');
      }

      await loadGroupsAndMembers();
      
      setNewGroupName('');
      setActiveTab('LIST');
      setSuccessMessage(`Grupo "${data.name}" criado com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao criar grupo:', err);
      setErrorMessage(err.message || 'Erro ao criar grupo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const code = inviteCodeInput.trim().toUpperCase();
    if (!code) {
      setErrorMessage('Informe o código de convite.');
      return;
    }

    try {
      setActionLoading(true);

      const result = await groupService.joinGroupByCode(code, userId);

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      await loadGroupsAndMembers();
      
      setInviteCodeInput('');
      setActiveTab('LIST');
      setSuccessMessage(result.message);
    } catch (err: any) {
      console.error('Erro ao entrar:', err);
      setErrorMessage('Erro ao entrar no grupo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!window.confirm('Tem certeza de que deseja sair deste grupo?')) return;
    try {
      setActionLoading(true);
      await groupService.removeMember(groupId, userId);
      setSelectedGroup(null);
      await loadGroupsAndMembers();
      setSuccessMessage('Você saiu do grupo.');
    } catch (err) {
      console.error('Erro ao sair:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!window.confirm(`Deseja excluir "${groupName}" DEFINITIVAMENTE para todos?`)) return;
    try {
      setActionLoading(true);
      await groupService.deleteGroup(groupId);
      setSelectedGroup(null);
      await loadGroupsAndMembers();
      setSuccessMessage(`Grupo excluído.`);
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      setErrorMessage('Erro ao excluir o grupo.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string, memberName: string, groupId: string) => {
    if (!window.confirm(`Deseja remover ${memberName} do grupo?`)) return;
    try {
      setActionLoading(true);
      await groupService.removeMember(groupId, targetUserId);
      await loadGroupsAndMembers();
      setSuccessMessage(`${memberName} removido.`);
    } catch (err) {
      console.error('Erro ao remover:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedGroup ? (
              <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer">
                <ArrowLeft size={20} />
              </button>
            ) : (
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <Users size={22} />
              </div>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {selectedGroup ? selectedGroup.name : 'Meus Grupos de Estudo'}
              </h2>
              <p className="text-xs text-slate-400">
                {selectedGroup
                  ? `${selectedGroup.members.length} ${selectedGroup.members.length === 1 ? 'membro' : 'membros'}`
                  : 'Participe de salas e dispute com seus amigos'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {!selectedGroup && (
          <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/50 p-1.5 gap-1.5">
            <button
              onClick={() => setActiveTab('LIST')}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'LIST' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Meus Grupos ({groups.length})
            </button>
            <button
              onClick={() => setActiveTab('JOIN')}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'JOIN' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus size={15} /> Entrar
            </button>
            <button
              onClick={handleOpenCreateTab}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'CREATE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-400 hover:text-indigo-300'
              }`}
            >
              <Plus size={15} /> Criar
            </button>
          </div>
        )}

        {successMessage && (
          <div className="m-4 mb-0 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-xs sm:text-sm">
            <CheckCircle2 size={16} /> <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="m-4 mb-0 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs sm:text-sm">
            <AlertCircle size={16} /> <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <Loader2 className="animate-spin text-indigo-400" size={28} />
              <p className="text-xs sm:text-sm">Buscando informações...</p>
            </div>
          ) : selectedGroup ? (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">CÓDIGO DE CONVITE</p>
                  <p className="text-base sm:text-lg font-mono font-extrabold text-indigo-400">{selectedGroup.inviteCode}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyCode(selectedGroup.inviteCode)}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode === selectedGroup.inviteCode ? (
                      <><Check size={14} className="text-emerald-400" /> <span className="text-emerald-400">Copiado!</span></>
                    ) : (
                      <><Copy size={14} /> <span>Copiar</span></>
                    )}
                  </button>
                </div>
              </div>



              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 px-1">Membros no Grupo ({selectedGroup.members.length})</p>
                {selectedGroup.members.map((member) => {
                  const isMe = member.userId === userId;
                  const amICreator = selectedGroup.createdBy === userId;

                  return (
                    <div key={member.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar username={member.username} avatarUrl={member.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-white truncate flex items-center gap-1.5">
                            {member.username} {isMe && <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">Você</span>}
                          </p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            {member.isCreator ? <span className="text-amber-400 flex items-center gap-0.5"><Crown size={11} /> Criador</span> : 'Membro'}
                          </p>
                        </div>
                      </div>
                      {amICreator && !isMe && (
                        <button onClick={() => handleRemoveMember(member.userId, member.username, selectedGroup.id)} className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800">
                {selectedGroup.createdBy === userId ? (
                  <button onClick={() => handleDeleteGroup(selectedGroup.id, selectedGroup.name)} disabled={actionLoading} className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-600 hover:text-white border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                    <ShieldAlert size={15} /> <span>Excluir Grupo Definitivamente</span>
                  </button>
                ) : (
                  <button onClick={() => handleLeaveGroup(selectedGroup.id)} disabled={actionLoading} className="w-full py-2.5 bg-slate-800 hover:bg-rose-500/20 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
                    <LogOut size={14} /> <span>Sair do Grupo</span>
                  </button>
                )}
              </div>
            </div>
          ) : activeTab === 'LIST' ? (
            groups.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-3">
                <Users size={40} className="mx-auto text-slate-700" />
                <p className="text-sm">Você ainda não entrou em nenhum grupo.</p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button onClick={() => setActiveTab('JOIN')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer">Entrar com Código</button>
                  <button onClick={handleOpenCreateTab} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer">Criar Grupo</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => {
                  const isCreator = group.createdBy === userId;
                  return (
                    <div key={group.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3">
                      <div className="overflow-hidden min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm sm:text-base text-white truncate">{group.name}</p>
                          {isCreator && <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded flex items-center gap-0.5"><Crown size={10} /> Dono</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-indigo-400 font-medium flex items-center gap-1"><Users size={13} /> {group.members.length} {group.members.length === 1 ? 'membro' : 'membros'}</span>
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Código: {group.inviteCode}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => handleCopyCode(group.inviteCode)} className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl cursor-pointer">
                          {copiedCode === group.inviteCode ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        </button>
                        <button onClick={() => setSelectedGroup(group)} className="p-2 text-indigo-400 hover:text-white bg-indigo-500/10 border border-indigo-500/20 rounded-xl cursor-pointer flex items-center gap-1 text-xs font-semibold">
                          <span>Membros</span> <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === 'CREATE' ? (
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5">Nome do Grupo</label>
                <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Ex: Foco Concurso..." className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
              </div>
              <button type="submit" disabled={actionLoading || !newGroupName.trim()} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40">
                {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} <span>Criar Sala de Estudo</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5">Código de Convite do Grupo</label>
                <input type="text" value={inviteCodeInput} onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())} placeholder="Ex: X9K2LM" maxLength={10} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-base font-mono tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
              </div>
              <button type="submit" disabled={actionLoading || !inviteCodeInput.trim()} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40">
                {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />} <span>Entrar no Grupo</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}