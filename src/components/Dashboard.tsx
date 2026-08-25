// src/components/Dashboard.tsx
import { useState, useEffect, useCallback, useRef, type FormEvent, type ChangeEvent } from 'react';
import type { StudySession, SubjectCategory } from '../types/domain';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { AuthModal } from './AuthModal';
import { Leaderboard } from './Leaderboard';
import { GroupModal } from './GroupModal';
import { ProfileModal } from './ProfileModal';
import { Avatar } from './Avatar';
import {
  PlusCircle,
  Clock,
  BookOpen,
  Activity,
  User as UserIcon,
  LogOut,
  Trophy,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  Calendar,
  X,
  Save,
  Camera,
  RefreshCw
} from 'lucide-react';

interface GroupOption {
  id: string;
  name: string;
}

const CATEGORY_OPTIONS: { value: SubjectCategory; label: string }[] = [
  { value: 'PROGRAMMING', label: 'Programação & TI' },
  { value: 'MATHEMATICS', label: 'Matemática' },
  { value: 'SCIENCE', label: 'Ciências / Natureza' },
  { value: 'HUMANITIES', label: 'Humanas & História' },
  { value: 'LANGUAGES', label: 'Idiomas' },
  { value: 'LITERATURE', label: 'Literatura & Redação' },
  { value: 'OTHER', label: 'Outro (Personalizado)' }
];

const CATEGORY_LABELS: Record<SubjectCategory, string> = {
  PROGRAMMING: 'Programação & TI',
  MATHEMATICS: 'Matemática',
  SCIENCE: 'Ciências',
  HUMANITIES: 'Humanas',
  LANGUAGES: 'Idiomas',
  LITERATURE: 'Literatura',
  OTHER: 'Outro'
};

const getTodayDateString = () => new Date().toISOString().split('T')[0];

export function Dashboard() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userGroups, setUserGroups] = useState<GroupOption[]>([]);
  const [history, setHistory] = useState<StudySession[]>([]);
  const [totalToday, setTotalToday] = useState<number>(0);

  // Estados do formulário
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [subjectInput, setSubjectInput] = useState<string>('');
  const [categoryInput, setCategoryInput] = useState<SubjectCategory>('PROGRAMMING');
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>(getTodayDateString());
  const [hoursInput, setHoursInput] = useState<string>('1');
  const [minutesInput, setMinutesInput] = useState<string>('0');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.username) setCurrentUsername(profile.username);
    if (profile?.avatarUrl) setCurrentAvatarUrl(profile.avatarUrl);
  }, [profile]);

  // Carregar grupos do usuário
  const loadUserGroups = useCallback(async (currentUserId: string) => {
    try {
      // 1. Busca os IDs dos grupos onde o usuário é membro
      const { data: memberRows, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', currentUserId);

      if (memberErr) throw memberErr;

      const groupIds = (memberRows || []).map((m: any) => m.group_id).filter(Boolean);

      if (groupIds.length === 0) {
        setUserGroups([]);
        return;
      }

      // 2. Busca os nomes e dados dos grupos correspondentes
      const { data: groupsData, error: groupsErr } = await supabase
        .from('study_groups')
        .select('id, name')
        .in('id', groupIds);

      if (groupsErr) throw groupsErr;

      const formatted: GroupOption[] = (groupsData || []).map((g: any) => ({
        id: g.id,
        name: g.name
      }));

      setUserGroups(formatted);
      if (formatted.length > 0 && !selectedGroupId) {
        setSelectedGroupId(formatted[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar grupos no dashboard:', err);
    }
  }, [selectedGroupId]);

  // Carregar histórico
  const loadHistory = useCallback(async (currentUserId?: string) => {
    if (!currentUserId) {
      setHistory([]);
      setTotalToday(0);
      return;
    }

    try {
      setIsSyncing(true);
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', currentUserId)
        .order('started_at', { ascending: false });

      if (error) throw error;

      const userSessions: StudySession[] = (data || []).map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        subject: s.subject,
        category: s.category,
        startTime: s.started_at,
        endTime: s.ended_at,
        durationSeconds: s.duration_seconds,
        status: s.status,
        notes: s.notes,
        syncStatus: 'SYNCED',
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }));

      setHistory(userSessions);

      const todayStr = new Date().toDateString();
      const todaySeconds = userSessions
        .filter((s) => new Date(s.startTime).toDateString() === todayStr)
        .reduce((acc, curr) => acc + curr.durationSeconds, 0);

      setTotalToday(todaySeconds);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      void loadHistory(user.id);
      void loadUserGroups(user.id);
    } else {
      setHistory([]);
      setUserGroups([]);
      setTotalToday(0);
    }
  }, [user, loadHistory, loadUserGroups]);

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      if (!event.target.files || event.target.files.length === 0 || !user) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      setCurrentAvatarUrl(data.publicUrl);
      setSuccessMessage('Foto de perfil atualizada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Erro ao enviar avatar:', err);
      setErrorMessage('Erro ao enviar imagem.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const resetForm = () => {
    setEditingSessionId(null);
    setSubjectInput('');
    setCustomCategoryInput('');
    setDateInput(getTodayDateString());
    setHoursInput('1');
    setMinutesInput('0');
  };

  const handleEdit = (session: StudySession) => {
    setEditingSessionId(session.id);
    setSubjectInput(session.subject);
    setCategoryInput(session.category);

    const hours = Math.floor(session.durationSeconds / 3600);
    const minutes = Math.floor((session.durationSeconds % 3600) / 60);
    setHoursInput(String(hours));
    setMinutesInput(String(minutes));

    if (session.startTime) {
      setDateInput(session.startTime.split('T')[0]);
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm('Deseja excluir este registro de estudo?')) return;

    if (user) {
      await supabase.from('study_sessions').delete().eq('id', sessionId);
    }

    if (editingSessionId === sessionId) resetForm();
    if (user?.id) await loadHistory(user.id);

    setSuccessMessage('Registro excluído.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!user) {
      setErrorMessage('Faça login para salvar seus estudos.');
      setIsAuthModalOpen(true);
      return;
    }

    const hours = parseInt(hoursInput, 10) || 0;
    const minutes = parseInt(minutesInput, 10) || 0;
    const totalDurationSeconds = hours * 3600 + minutes * 60;

    if (!subjectInput.trim()) {
      setErrorMessage('Informe o assunto estudado.');
      return;
    }

    if (hours === 0 && minutes === 0) {
      setErrorMessage('O tempo de estudo não pode ser 0 horas e 0 minutos.');
      return;
    }

    const finalSubject =
      categoryInput === 'OTHER' && customCategoryInput.trim()
        ? `${subjectInput.trim()} (${customCategoryInput.trim()})`
        : subjectInput.trim();

    const chosenDate = new Date(`${dateInput}T12:00:00`);
    const startTime = chosenDate.toISOString();
    const endTime = new Date(chosenDate.getTime() + totalDurationSeconds * 1000).toISOString();

    const supabasePayload = {
      id: editingSessionId || crypto.randomUUID(),
      user_id: user.id,
      group_id: selectedGroupId || null,
      subject: finalSubject,
      category: categoryInput,
      started_at: startTime,
      ended_at: endTime,
      duration_seconds: totalDurationSeconds,
      status: 'IDLE',
      notes: null,
      updated_at: new Date().toISOString()
    };

    const { error: upsertError } = await supabase
      .from('study_sessions')
      .upsert(supabasePayload, { onConflict: 'id' });

    if (upsertError) {
      console.error('Erro ao salvar no Supabase:', upsertError);
      setErrorMessage('Erro ao salvar sessão de estudo.');
      return;
    }

    await loadHistory(user.id);

    const wasEditing = Boolean(editingSessionId);
    resetForm();
    setSuccessMessage(
      wasEditing
        ? 'Estudo atualizado com sucesso!'
        : `Sessão de ${hours > 0 ? `${hours}h ` : ''}${minutes}m registrada!`
    );

    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const formatTotalTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatSessionDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  const formatDateDisplay = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-3 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 sm:p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl flex-shrink-0">
                <BookOpen size={22} className="sm:w-6 sm:h-6" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-1.5">
                  StudyRats <span className="text-base sm:text-xl">🐀</span>
                </h1>
                <p className="text-[11px] sm:text-xs font-medium text-slate-400 truncate hidden xs:block">
                  Acompanhe seu Progresso, Dispute com Seus Amigos!
                </p>
              </div>
            </div>

            {authLoading ? (
              <div className="h-9 w-9 flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-500" size={18} />
              </div>
            ) : user ? (
              <div className="flex items-center gap-1.5 sm:gap-2.5 bg-slate-950 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-800 flex-shrink-0">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer flex-shrink-0"
                  title="Trocar foto de perfil"
                >
                  <Avatar
                    username={currentUsername || profile?.username || 'Usuário'}
                    avatarUrl={currentAvatarUrl}
                    size="sm"
                  />
                  <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    {uploadingAvatar ? (
                      <Loader2 className="animate-spin text-white" size={12} />
                    ) : (
                      <Camera className="text-white" size={12} />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="text-xs sm:text-sm font-medium text-slate-200 hover:text-indigo-400 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Alterar nome"
                >
                  <span className="max-w-[70px] sm:max-w-[100px] truncate font-semibold">
                    {currentUsername || profile?.username || 'Usuário'}
                  </span>
                  <Pencil size={11} className="text-slate-500 hover:text-indigo-400 flex-shrink-0" />
                </button>

                <span className="text-[10px] sm:text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 flex-shrink-0">
                  🔥 {profile?.currentStreak ?? 0}
                </span>

                <button
                  onClick={() => signOut()}
                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer flex-shrink-0"
                  title="Sair"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
              >
                <UserIcon size={15} />
                Entrar
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-800 flex-1">
              <Activity className="text-indigo-400 flex-shrink-0" size={16} />
              <div>
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  ESTUDADO HOJE
                </p>
                <p className="text-xs sm:text-sm font-bold text-white">{formatTotalTime(totalToday)}</p>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-end">
                <button
                  onClick={() => setIsGroupModalOpen(true)}
                  className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  <Users size={15} />
                  <span>Grupos</span>
                </button>

                <button
                  onClick={() => setIsLeaderboardOpen(true)}
                  className="flex-1 sm:flex-initial bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  <Trophy size={15} />
                  <span>Ranking</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Formulário e Histórico */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <main className="lg:col-span-2">
            <div className="bg-slate-900 p-5 sm:p-7 md:p-8 rounded-3xl border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    {editingSessionId ? (
                      <>
                        <Pencil className="text-amber-400" size={20} />
                        Editar Registro de Estudo
                      </>
                    ) : (
                      <>
                        <PlusCircle className="text-indigo-400" size={20} />
                        Registrar Estudo Manual
                      </>
                    )}
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                    {editingSessionId
                      ? 'Altere os dados da sessão selecionada.'
                      : 'Adicione a data, conteúdo, grupo e duração dos seus estudos.'}
                  </p>
                </div>

                {editingSessionId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={14} />
                    Cancelar
                  </button>
                )}
              </div>

              {successMessage && (
                <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-emerald-400 text-xs sm:text-sm animate-in fade-in">
                  <CheckCircle2 size={16} className="flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2.5 text-rose-400 text-xs sm:text-sm animate-in fade-in">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Seletor de Grupo de Estudo */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Users size={14} className="text-indigo-400" />
                    Grupo de Estudo
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="">Geral (Todos os meus grupos)</option>
                    {userGroups.map((grp) => (
                      <option key={grp.id} value={grp.id}>
                        {grp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5">
                    O que você estudou?
                  </label>
                  <input
                    type="text"
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    placeholder="Ex: Estruturas de Dados, Cálculo 1, React..."
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5">
                      Categoria
                    </label>
                    <select
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value as SubjectCategory)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5">
                      Data do Estudo
                    </label>
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                    />
                  </div>
                </div>

                {categoryInput === 'OTHER' && (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5">
                      Especifique o assunto / tema:
                    </label>
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="Ex: Concurso Público, Gestão..."
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5">
                    Tempo Dedicado
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={hoursInput}
                        onChange={(e) => setHoursInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-base sm:text-lg"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-semibold pointer-events-none">
                        horas
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        step="5"
                        value={minutesInput}
                        onChange={(e) => setMinutesInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-base sm:text-lg"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-semibold pointer-events-none">
                        min
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!subjectInput.trim() || (Number(hoursInput) === 0 && Number(minutesInput) === 0)}
                  className={`w-full mt-3 text-white font-semibold py-3.5 sm:py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-sm sm:text-base ${
                    editingSessionId
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  {editingSessionId ? (
                    <>
                      <Save size={18} />
                      Salvar Alterações
                    </>
                  ) : (
                    <>
                      <PlusCircle size={18} />
                      Salvar Registro de Estudo
                    </>
                  )}
                </button>
              </form>
            </div>
          </main>

          {/* Histórico Recente */}
          <aside className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm p-5 sm:p-6 flex flex-col max-h-[500px] lg:max-h-[600px]">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <Clock className="text-slate-400" size={18} />
                <h3 className="text-base sm:text-lg font-semibold text-white">Histórico Recente</h3>
              </div>
              <div className="flex items-center gap-2">
                {isSyncing && <RefreshCw size={12} className="animate-spin text-indigo-400" />}
                <span className="text-xs text-slate-500 font-medium">
                  {history.length} {history.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
              {history.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <p className="text-sm">
                    {user ? 'Nenhum estudo registrado ainda.' : 'Faça login para ver seu histórico.'}
                  </p>
                </div>
              ) : (
                history.map((session) => (
                  <div
                    key={session.id}
                    className={`bg-slate-950 p-3.5 rounded-xl border transition-all ${
                      editingSessionId === session.id
                        ? 'border-amber-500/50 bg-amber-500/5'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="overflow-hidden flex-1">
                        <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate">{session.subject}</p>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {CATEGORY_LABELS[session.category] || session.category}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Calendar size={11} />
                            {formatDateDisplay(session.startTime)}
                          </span>
                          <span className="text-[10px] text-indigo-400 font-mono font-medium">
                            {formatSessionDuration(session.durationSeconds)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        <button
                          onClick={() => handleEdit(session)}
                          className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Modais */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {isLeaderboardOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <Leaderboard
            userId={user.id}
            onClose={() => setIsLeaderboardOpen(false)}
            onOpenGroups={() => {
              setIsLeaderboardOpen(false);
              setIsGroupModalOpen(true);
            }}
          />
        </div>
      )}

      {isGroupModalOpen && user && (
        <GroupModal
          isOpen={isGroupModalOpen}
          onClose={() => {
            setIsGroupModalOpen(false);
            void loadUserGroups(user.id); // <--- ATUALIZA OS GRUPOS AO FECHAR O MODAL
          }}
          userId={user.id}
        />
      )}

      {user && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          userId={user.id}
          currentUsername={currentUsername || profile?.username || ''}
          avatarUrl={currentAvatarUrl}
          email={user.email}
          onUsernameUpdated={(newName) => setCurrentUsername(newName)}
          onAvatarUpdated={(newUrl) => setCurrentAvatarUrl(newUrl)}
        />
      )}
    </div>
  );
}