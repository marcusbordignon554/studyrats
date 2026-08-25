// src/services/groupService.ts
import { supabase } from './supabase';
import type { StudyGroup, GroupMember, LeaderboardEntry } from '../types/domain';

function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const groupService = {
  // Criar grupo gerando código único de 6 dígitos e definindo o criador como ADMIN
  async createGroup(name: string, userId: string): Promise<{ data: StudyGroup | null; error: any }> {
    try {
      const inviteCode = generateRandomCode();

      const { data: groupData, error: groupError } = await supabase
        .from('study_groups')
        .insert({
          name,
          invite_code: inviteCode,
          created_by: userId
        })
        .select()
        .single();

      if (groupError || !groupData) throw groupError;

      // Adiciona o criador como ADMIN
      await supabase.from('group_members').insert({
        group_id: groupData.id,
        user_id: userId,
        role: 'ADMIN'
      });

      return {
        data: {
          id: groupData.id,
          name: groupData.name,
          inviteCode: groupData.invite_code,
          createdBy: groupData.created_by,
          createdAt: groupData.created_at,
          userRole: 'ADMIN'
        },
        error: null
      };
    } catch (err) {
      console.error('Erro ao criar grupo:', err);
      return { data: null, error: err };
    }
  },

  // Listar grupos do usuário com seu respectivo cargo
  async getUserGroups(userId: string): Promise<StudyGroup[]> {
    try {
      // 1) Busca os registros em group_members para obter group_ids e roles
      const { data: memberRows, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', userId);

      if (memberErr || !memberRows || memberRows.length === 0) return [];

      const groupIds = Array.from(new Set(memberRows.map((r: any) => r.group_id).filter(Boolean)));

      if (groupIds.length === 0) return [];

      // 2) Busca as informações dos grupos
      const { data: groupsData, error: groupsErr } = await supabase
        .from('study_groups')
        .select('id, name, invite_code, created_by, created_at')
        .in('id', groupIds);

      if (groupsErr || !groupsData) return [];

      // 3) Mapear role por grupo_id
      const roleMap = new Map<string, string>();
      memberRows.forEach((r: any) => {
        if (r && r.group_id) roleMap.set(r.group_id, r.role);
      });

      // 4) Buscar membros para todos os grupos em uma única query para performance
      const { data: allMemberRows, error: allMembersErr } = await supabase
        .from('group_members')
        .select('group_id, user_id, role, joined_at')
        .in('group_id', groupIds)
        .order('joined_at', { ascending: true });

      if (allMembersErr) {
        console.error('Erro ao buscar membros para grupos:', allMembersErr);
      }

      const userIds = Array.from(new Set((allMemberRows || []).map((r: any) => r.user_id).filter(Boolean)));

      // 5) Buscar perfis dos usuários encontrados
      const { data: profilesRows, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesErr) {
        console.error('Erro ao buscar perfis:', profilesErr);
      }

      const profileMap = new Map<string, any>((profilesRows || []).map((p: any) => [p.id, p]));

      // 6) Montar um map group_id -> members[]
      const membersByGroup = new Map<string, any[]>();
      (allMemberRows || []).forEach((mr: any) => {
        const prof = profileMap.get(mr.user_id);
        const memberObj = {
          // Alguns schemas não possuem coluna 'id' em group_members — gerar um id sintético
          id: `${mr.user_id}-${mr.group_id}`,
          groupId: mr.group_id,
          userId: mr.user_id,
          username: prof?.username || 'Estudante',
          avatarUrl: prof?.avatar_url || null,
          role: (mr.role as 'ADMIN' | 'MEMBER') || 'MEMBER',
          isCreator: mr.user_id === undefined ? false : false,
          joinedAt: mr.joined_at || mr.created_at || mr.updated_at || null
        };
        if (!membersByGroup.has(mr.group_id)) membersByGroup.set(mr.group_id, []);
        const groupArr = membersByGroup.get(mr.group_id) as any[] | undefined;
        if (groupArr) {
          groupArr.push(memberObj);
        } else {
          // fallback (shouldn't happen because we just set it), but keep robust
          membersByGroup.set(mr.group_id, [memberObj]);
        }
      });

      // 7) Montar objetos finais
      const groupsWithMembers = groupsData.map((g: any) => ({
        id: g.id,
        name: g.name,
        inviteCode: g.invite_code,
        createdBy: g.created_by,
        createdAt: g.created_at,
        userRole: (roleMap.get(g.id) as 'ADMIN' | 'MEMBER') || 'MEMBER',
        members: membersByGroup.get(g.id) || []
      }));

      return groupsWithMembers;
    } catch (err) {
      console.error('Erro ao buscar grupos:', err);
      return [];
    }
  },

  // Entrar em um grupo pelo código de convite (com mensagens amigáveis)
  async joinGroupByCode(code: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const cleanCode = code.trim().toUpperCase();

      // 1. Procura o grupo pelo código
      const { data: group, error: groupError } = await supabase
        .from('study_groups')
        .select('id, name, created_by')
        .eq('invite_code', cleanCode)
        .single();

      if (groupError || !group) {
        return { success: false, message: 'Código inválido ou grupo não encontrado.' };
      }

      // 2. Se for o próprio criador
      if (group.created_by === userId) {
        return { success: false, message: 'Você já é o criador e administrador deste grupo!' };
      }

      // 3. Verifica se já é membro
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        return { success: false, message: 'Você já faz parte deste grupo!' };
      }

      // 4. Tenta inserir o membro
      const { error: joinError } = await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: userId,
        role: 'MEMBER'
      });

      if (joinError) {
        // Tratamento para duplicidade no banco
        if (joinError.code === '23505' || joinError.message?.includes('duplicate key') || joinError.message?.includes('unique constraint')) {
          return { success: false, message: 'Você já faz parte deste grupo!' };
        }
        throw joinError;
      }

      return { success: true, message: `Você entrou no grupo "${group.name}"!` };
    } catch (err: any) {
      console.error('Erro ao entrar no grupo:', err);

      if (err?.code === '23505' || err?.message?.includes('duplicate key') || err?.message?.includes('unique constraint')) {
        return { success: false, message: 'Você já faz parte deste grupo!' };
      }

      return { success: false, message: 'Não foi possível entrar no grupo. Tente novamente.' };
    }
  },

  // Obter todos os membros de um grupo com foto e cargo
  async getGroupMembers(groupId: string, createdBy?: string): Promise<GroupMember[]> {
    try {
      console.log('Buscando membros para o grupo ID:', groupId);

      const { data: memberRows, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id, user_id, role, joined_at')
        .eq('group_id', groupId);

      if (memberErr) {
        console.error('Erro do Supabase ao buscar membros:', memberErr);
        return [];
      }

      if (!memberRows || memberRows.length === 0) return [];

      const userIds = memberRows.map((m: any) => m.user_id).filter(Boolean);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map<string, { username?: string; avatar_url?: string | null }>();
      (profiles || []).forEach((p: any) => {
        profileMap.set(p.id, p);
      });

      return memberRows.map((item: any) => {
        const prof = profileMap.get(item.user_id);
        return {
        // gerar id sintético quando não houver
        id: `${item.user_id}-${item.group_id}`,
        groupId: item.group_id,
        userId: item.user_id,
        username: prof?.username || 'Estudante',
        avatarUrl: prof?.avatar_url || null,
        role: (item.role as 'ADMIN' | 'MEMBER') || 'MEMBER',
        isCreator: item.user_id === createdBy,
        // joined_at pode ter nomes diferentes dependendo do schema (joined_at, created_at). Usar fallback
        joinedAt: item.joined_at || item.created_at || item.updated_at || null
      };
      });
    } catch (err) {
      console.error('Erro ao buscar membros:', err);
      return [];
    }
  },

  // Alterar cargo do membro (Promover para ADMIN ou rebaixar para MEMBER)
  async updateMemberRole(groupId: string, targetUserId: string, newRole: 'ADMIN' | 'MEMBER'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('group_id', groupId)
        .eq('user_id', targetUserId);

      return !error;
    } catch (err) {
      console.error('Erro ao atualizar cargo:', err);
      return false;
    }
  },

  // Remover membro do grupo (ou sair)
  async removeMember(groupId: string, targetUserId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', targetUserId);

      return !error;
    } catch (err) {
      console.error('Erro ao remover membro:', err);
      return false;
    }
  },

  // Excluir grupo permanentemente
  async deleteGroup(groupId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('study_groups').delete().eq('id', groupId);
      return !error;
    } catch (err) {
      console.error('Erro ao excluir grupo:', err);
      return false;
    }
  },

  // Buscar ranking dos últimos 7 dias
  async getGroupLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
    try {
      const { data: members, error: memError } = await supabase
        .from('group_members')
        .select(`
          user_id,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq('group_id', groupId);

      if (memError || !members) return [];

      const memberUserIds = members.map((m) => m.user_id);
      if (memberUserIds.length === 0) return [];

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: sessions, error: sessError } = await supabase
        .from('study_sessions')
        .select('user_id, duration_seconds')
        .in('user_id', memberUserIds)
        .gte('started_at', sevenDaysAgo.toISOString());

      if (sessError) throw sessError;

      const timeMap = new Map<string, number>();
      memberUserIds.forEach((id) => timeMap.set(id, 0));

      (sessions || []).forEach((s) => {
        const current = timeMap.get(s.user_id) || 0;
        timeMap.set(s.user_id, current + (s.duration_seconds || 0));
      });

      const leaderboard: LeaderboardEntry[] = members.map((m: any) => ({
        id: crypto.randomUUID(),
        userId: m.user_id,
        username: m.profiles?.username || 'Estudante',
        avatarUrl: m.profiles?.avatar_url || null,
        totalStudyTimeSeconds: timeMap.get(m.user_id) || 0
      }));

      leaderboard.sort((a, b) => b.totalStudyTimeSeconds - a.totalStudyTimeSeconds);
      return leaderboard;
    } catch (err) {
      console.error('Erro ao buscar ranking:', err);
      return [];
    }
  }
};