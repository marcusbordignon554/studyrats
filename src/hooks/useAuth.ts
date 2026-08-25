// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../types/domain';
import { supabase } from '../services/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao buscar o perfil:', error);
        setProfile(null);
        return;
      }

      if (data) {
        // Mapeia as chaves retornadas pelo banco (geralmente snake_case) para a interface UserProfile
        const mappedProfile: UserProfile = {
          id: data.id,
          username: data.username,
          email: data.email,
          avatarUrl: data.avatar_url || data.avatarUrl || null,
          currentStreak: data.current_streak || data.currentStreak || 0,
          longestStreak: data.longest_streak || data.longestStreak || 0,
          totalStudyTimeSeconds: data.total_study_time_seconds || data.totalStudyTimeSeconds || 0,
          lastStudyDate: data.last_study_date || data.lastStudyDate || null,
          createdAt: data.created_at || data.createdAt,
          updatedAt: data.updated_at || data.updatedAt,
        };
        setProfile(mappedProfile);
      }
    } catch (err) {
      console.error('Exceção ao buscar o perfil:', err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (mounted) {
        if (error) {
          console.error('Erro ao obter sessão:', error);
          setUser(null);
          setProfile(null);
        } else if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
        setLoading(false);
      }
    };

    void initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (mounted) {
          setLoading(true);
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id);
          } else {
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, username: string): Promise<{ error: any }> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          }
        }
      });
      return { error };
    } catch (err) {
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: any }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (err) {
      return { error: err };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut
  };
}