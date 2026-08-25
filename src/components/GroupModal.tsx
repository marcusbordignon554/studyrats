// src/components/GroupModal.tsx
import { useState, useEffect, useCallback } from 'react';
import type { StudyGroup, GroupMember } from '../types/domain';
import { groupService } from '../services/groupService';
import { Avatar } from './Avatar';
import {
  X,
  Users,
  Plus,
  KeyRound,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  ShieldAlert,
  UserMinus,
  ArrowLeft,
  Trash2,
  LogOut,
  Crown
} from 'lucide-react';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onGroupsChanged?: () => void;
}

type TabMode = 'MY_GROUPS' | 'CREATE' | 'JOIN';

export function GroupModal({ isOpen, onClose, userId, onGroupsChanged }: GroupModalProps) {
  const [tab, setTab] = useState<TabMode>('MY_GROUPS');
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [newGroupName, setNewGroupName] = useState('');
  const [createdGroupCode, setCreatedGroupCode] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    const data = await groupService.getUserGroups(userId);
    setGroups(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      void loadGroups();
      setErrorMessage(null);
      setSuccessMessage(null);
      setSelectedGroup(null);
      setCreatedGroupCode(null);
      setNewGroupName('');
      setInviteCode('');
      setTab('MY_GROUPS');
    }
  }, [isOpen, loadGroups]);

  const loadMembers = useCallback(async (group: StudyGroup) => {
    setMembersLoading(true);
    const data = await groupService.getGroupMembers(group.id, group.createdBy);
    setMembers(data);
    setMembersLoading(false);
  }, []);

  const handleOpenGroupDetails = (group: StudyGroup) => {
    setSelectedGroup(group);
    setErrorMessage(null);
    setSuccessMessage(null);
    void loadMembers(group);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { data, error } = await groupService.createGroup(newGroupName.trim(), userId);
    if (error || !data) {
      setErrorMessage('Erro ao criar o grupo. Tente novamente.');
      setActionLoading(false);
      return;
    }

    setCreatedGroupCode(data.inviteCode);
    setSuccessMessage('Grupo criado com sucesso! O código de convite é permanente.');
    await loadGroups();
    onGroupsChanged?.();
    setActionLoading(false);
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await groupService.joinGroupByCode(inviteCode.trim(), userId);
    if (!result.success) {
      setErrorMessage(result.message);
      setActionLoading(false);
      return;
    }

    setSuccessMessage(result.message);
    setInviteCode('');
    await loadGroups();
    onGroupsChanged?.();
    setActionLoading(false);
    setTimeout(() => setTab('MY_GROUPS'), 1500);
  };

  const handleToggleAdmin = async (member: GroupMember) => {
    if (!selectedGroup) return;
    const newRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    const ok = await groupService.updateMemberRole(selectedGroup.id, member.userId, newRole);

    if (ok) {
      setSuccessMessage(`${member.username} agora é ${newRole === 'ADMIN' ? 'Admin 🛡️' : 'Membro'}.`);
      void loadMembers(selectedGroup);
      await loadGroups();
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage('Não foi possível alterar o cargo.');
    }
  };

  const handleRemoveMember = async (member: GroupMember) => {
    if (!selectedGroup) return;
    const isSelf = member.userId === userId;
    const confirmMsg = isSelf
      ? 'Tem certeza de que deseja sair deste grupo?'
      : `Tem certeza de que deseja remover "${member.username}" do grupo?`;

    if (!window.confirm(confirmMsg)) return;

    const ok = await groupService.removeMember(selectedGroup.id, member.userId);
    if (ok) {
      if (isSelf) {
        setSelectedGroup(null);
        await loadGroups();
        onGroupsChanged?.();
      } else {
        setSuccessMessage(`${member.username} foi removido do grupo.`);
        void loadMembers(selectedGroup);
        await loadGroups();
        onGroupsChanged?.();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } else {
      setErrorMessage('Erro ao remover membro.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    if (!window.confirm(`Tem certeza de que deseja EXCLUIR o grupo "${selectedGroup.name}"? Essa ação não pode ser desfeita.`)) {
      return;
    }

    const ok = await groupService.deleteGroup(selectedGroup.id);
    if (ok) {
      setSelectedGroup(null);
      await loadGroups();
      onGroupsChanged?.();
      setSuccessMessage('Grupo excluído com sucesso.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage('Erro ao excluir o grupo.');
    }
  };

  if (!isOpen) return null;

  const isCurrentUserAdmin = selectedGroup?.userRole === 'ADMIN' || selectedGroup?.createdBy === userId;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {selectedGroup ? (
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer mr-1"
                title="Voltar aos grupos"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <Users size={20} />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-white truncate max-w-[260px]">
                {selectedGroup ? selectedGroup.name : 'Gerenciar Grupos'}
              </h3>
              <p className="text-xs text-slate-400">
                {selectedGroup ? 'Membros & Permissões' : 'Estude junto com seus amigos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Abas */}
        {!selectedGroup && (
          <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1.5">
            <button
              onClick={() => {
                setTab('MY_GROUPS');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                tab === 'MY_GROUPS'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Meus Grupos ({groups.length})
            </button>
            <button
              onClick={() => {
                setTab('CREATE');
                setErrorMessage(null);
                setSuccessMessage(null);
                setCreatedGroupCode(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                tab === 'CREATE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus size={14} />
              Criar Grupo
            </button>
            <button
              onClick={() => {
                setTab('JOIN');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                tab === 'JOIN'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound size={14} />
              Entrar com Código
            </button>
          </div>
        )}

        {/* Feedback Messages */}
        {(errorMessage || successMessage) && (
          <div className="px-5 pt-4">
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs animate-in fade-in">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-xs animate-in fade-in">
                <CheckCircle2 size={16} className="flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo */}
        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar space-y-4">
          {selectedGroup ? (
            <div className="space-y-5">
              {/* Card Código */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-medium">Código de Convite do Grupo</p>
                  <span className="font-mono text-xl font-bold text-indigo-400 tracking-wider">
                    {selectedGroup.inviteCode || 'SEM CÓDIGO'}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyCode(selectedGroup.inviteCode, 'detail')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedId === 'detail' ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedId === 'detail' ? 'Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              {/* Lista Membros */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Membros ({members.length})
                  </h4>
                  {isCurrentUserAdmin && (
                    <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                      <Shield size={12} /> Você é Administrador
                    </span>
                  )}
                </div>

                {membersLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
                    <Loader2 className="animate-spin text-indigo-400" size={24} />
                    <p className="text-xs">Carregando membros...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => {
                      const isSelf = member.userId === userId;
                      const isCreator = member.isCreator;
                      const isAdmin = member.role === 'ADMIN' || isCreator;

                      return (
                        <div
                          key={member.id}
                          className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Avatar username={member.username} avatarUrl={member.avatarUrl} size="md" />
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-white text-sm truncate">{member.username}</p>
                                {isSelf && (
                                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded">
                                    você
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                {isCreator ? (
                                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Crown size={10} /> Criador
                                  </span>
                                ) : isAdmin ? (
                                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Shield size={10} /> Admin
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full">
                                    Membro
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isCurrentUserAdmin && !isCreator && !isSelf && (
                              <>
                                <button
                                  onClick={() => handleToggleAdmin(member)}
                                  className={`p-2 rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                                    member.role === 'ADMIN'
                                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                                  }`}
                                  title={member.role === 'ADMIN' ? 'Remover Admin' : 'Tornar Admin'}
                                >
                                  {member.role === 'ADMIN' ? <ShieldAlert size={15} /> : <Shield size={15} />}
                                </button>

                                <button
                                  onClick={() => handleRemoveMember(member)}
                                  className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-colors cursor-pointer"
                                  title="Remover do Grupo"
                                >
                                  <UserMinus size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ações Rodapé */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  onClick={() => handleRemoveMember({ userId, username: 'Você' } as GroupMember)}
                  className="bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut size={15} />
                  Sair do Grupo
                </button>

                {selectedGroup.createdBy === userId && (
                  <button
                    onClick={handleDeleteGroup}
                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} />
                    Excluir Grupo
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {tab === 'MY_GROUPS' && (
                <div className="space-y-3">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
                      <Loader2 className="animate-spin text-indigo-400" size={24} />
                      <p className="text-xs">Carregando grupos...</p>
                    </div>
                  ) : groups.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 space-y-2">
                      <Users size={36} className="mx-auto text-slate-700" />
                      <p className="text-sm">Você ainda não está em nenhum grupo.</p>
                      <p className="text-xs text-slate-600">
                        Crie um grupo ou entre com o código de 6 dígitos.
                      </p>
                    </div>
                  ) : (
                    groups.map((group) => {
                      const isAdmin = group.userRole === 'ADMIN' || group.createdBy === userId;

                      return (
                        <div
                          key={group.id}
                          className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                        >
                          <div className="overflow-hidden flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white text-sm truncate">{group.name}</p>
                              {isAdmin && (
                                <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                                  <Shield size={10} /> Admin
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 font-mono">
                              Código: <span className="text-indigo-400 font-bold tracking-wider">{group.inviteCode}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {group.inviteCode && (
                              <button
                                onClick={() => handleCopyCode(group.inviteCode, group.id)}
                                className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 p-2.5 rounded-xl transition-colors cursor-pointer"
                                title="Copiar código de convite"
                              >
                                {copiedId === group.id ? (
                                  <Check className="text-emerald-400" size={16} />
                                ) : (
                                  <Copy size={16} />
                                )}
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenGroupDetails(group)}
                              className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Membros
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {tab === 'CREATE' && (
                <div>
                  {createdGroupCode ? (
                    <div className="space-y-4 py-2 text-center">
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                        <p className="text-xs text-emerald-400 font-semibold mb-1">🎉 Grupo Criado com Sucesso!</p>
                        <p className="text-xs text-slate-300">
                          Você é o Administrador. Compartilhe o código abaixo com seus colegas:
                        </p>
                      </div>

                      <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                        <span className="font-mono text-2xl font-bold text-indigo-400 tracking-widest mx-auto">
                          {createdGroupCode}
                        </span>
                        <button
                          onClick={() => handleCopyCode(createdGroupCode, 'new')}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-colors cursor-pointer"
                          title="Copiar código"
                        >
                          {copiedId === 'new' ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setCreatedGroupCode(null);
                          setNewGroupName('');
                          setTab('MY_GROUPS');
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer text-sm"
                      >
                        Ir para Meus Grupos
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateGroup} className="space-y-4 py-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Nome do Grupo
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Turma de Cálculo 1, Concurso TI"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          maxLength={35}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={actionLoading || !newGroupName.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 text-sm"
                      >
                        {actionLoading ? <Loader2 className="animate-spin" size={18} /> : 'Criar Grupo'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {tab === 'JOIN' && (
                <form onSubmit={handleJoinGroup} className="space-y-4 py-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 text-center">
                      Digite o código de 6 dígitos fornecido pelo administrador:
                    </label>
                    <input
                      type="text"
                      placeholder="EXEMPL"
                      maxLength={6}
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-center tracking-widest uppercase rounded-xl px-4 py-3.5 text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading || inviteCode.trim().length < 4}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 text-sm"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" size={18} /> : 'Entrar no Grupo'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}