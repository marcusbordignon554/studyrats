// src/components/ProfileModal.tsx
import { useState, useRef, type ChangeEvent } from 'react';
import { supabase } from '../services/supabase';
import { Avatar } from './Avatar';
import { X, User, Check, AlertCircle, Loader2, Camera, Trash2 } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentUsername: string;
  avatarUrl: string | null;
  email?: string;
  onUsernameUpdated: (newUsername: string) => void;
  onAvatarUpdated: (newUrl: string | null) => void;
}

export function ProfileModal({
  isOpen,
  onClose,
  userId,
  currentUsername,
  avatarUrl,
  email,
  onUsernameUpdated,
  onAvatarUpdated
}: ProfileModalProps) {
  const [username, setUsername] = useState(currentUsername);
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleUploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      setAvatarLoading(true);
      setError(null);
      setSuccess(null);

      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 2MB.');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (profileError) throw profileError;

      onAvatarUpdated(data.publicUrl);
      setSuccess('Foto atualizada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao enviar imagem.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setAvatarLoading(true);
      setError(null);
      setSuccess(null);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (profileError) throw profileError;

      onAvatarUpdated(null);
      setSuccess('Foto removida! O avatar voltou ao padrão.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao remover a foto.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('O nome de usuário não pode ficar vazio.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: username.trim(), updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      setError('Erro ao salvar nome. Tente outro nome.');
    } else {
      onUsernameUpdated(username.trim());
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 p-6 sm:p-7 rounded-3xl max-w-sm w-full space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="text-indigo-400" size={20} />
            Editar Perfil
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Gerenciamento de Foto */}
        <div className="flex flex-col items-center gap-3 py-2 border-b border-slate-800">
          <div className="relative">
            <Avatar username={username || currentUsername} avatarUrl={avatarUrl} size="xl" />
            {avatarLoading && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={22} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Camera size={14} />
              Trocar Foto
            </button>

            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={avatarLoading}
                className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={14} />
                Remover Foto
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadPhoto}
            accept="image/*"
            className="hidden"
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
            <Check size={16} className="flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Nome de Usuário
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Seu novo nome"
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              maxLength={25}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              E-mail (Não editável)
            </label>
            <input
              type="text"
              value={email || 'Não informado'}
              disabled
              className="w-full bg-slate-950/50 border border-slate-900 text-slate-500 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <Check size={16} />
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}