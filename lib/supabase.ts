import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Ignore errors
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Tipos
export type MatchStatus = 'programado' | 'en_curso' | 'finalizado' | 'cancelado';
export type EventType = 'gol' | 'tarjeta_amarilla' | 'tarjeta_roja' | 'autogol';

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface League {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  location: string | null;
  logo_url: string | null;
  is_public: boolean;
  created_at: string;
  owner?: Profile;
}

export interface Tournament {
  id: string;
  league_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  leagues?: League;
}

export interface Team {
  id: string;
  league_id: string | null;
  created_by: string | null;
  name: string;
  short_name: string | null;
  badge_url: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: string;
  leagues?: League;
}

export interface Player {
  id: string;
  team_id: string | null;
  name: string;
  dorsal: number | null;
  position: string | null;
  photo_url: string | null;
  is_captain: boolean;
  created_at: string;
  teams?: Team;
}

export interface Match {
  id: string;
  tournament_id: string;
  home_team_id: string;
  away_team_id: string;
  start_time: string | null;
  location: string | null;
  status: MatchStatus;
  home_score: number;
  away_score: number;
  round_number: number | null;
  created_at: string;
  home_team?: Team;
  away_team?: Team;
  tournaments?: Tournament;
}

export interface Standing {
  team_id: string;
  team_name: string;
  league_id: string;
  tournament_id: string;
  played: number;
  points: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
}