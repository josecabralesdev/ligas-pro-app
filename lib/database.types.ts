export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      leagues: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          location: string | null
          logo_url: string | null
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          location?: string | null
          logo_url?: string | null
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          location?: string | null
          logo_url?: string | null
          is_public?: boolean
          created_at?: string
        }
      }
      tournaments: {
        Row: {
          id: string
          league_id: string
          name: string
          start_date: string | null
          end_date: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          league_id: string
          name: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          name?: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          short_name: string | null
          badge_url: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          short_name?: string | null
          badge_url?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          short_name?: string | null
          badge_url?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
        }
      }
      players: {
        Row: {
          id: string
          team_id: string | null
          name: string
          dorsal: number | null
          position: string | null
          photo_url: string | null
          is_captain: boolean
          created_at: string
        }
        Insert: {
          id?: string
          team_id?: string | null
          name: string
          dorsal?: number | null
          position?: string | null
          photo_url?: string | null
          is_captain?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string | null
          name?: string
          dorsal?: number | null
          position?: string | null
          photo_url?: string | null
          is_captain?: boolean
          created_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          tournament_id: string
          home_team_id: string
          away_team_id: string
          start_time: string | null
          location: string | null
          status: 'programado' | 'en_curso' | 'finalizado' | 'cancelado'
          home_score: number
          away_score: number
          round_number: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          home_team_id: string
          away_team_id: string
          start_time?: string | null
          location?: string | null
          status?: 'programado' | 'en_curso' | 'finalizado' | 'cancelado'
          home_score?: number
          away_score?: number
          round_number?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          home_team_id?: string
          away_team_id?: string
          start_time?: string | null
          location?: string | null
          status?: 'programado' | 'en_curso' | 'finalizado' | 'cancelado'
          home_score?: number
          away_score?: number
          round_number?: number | null
          created_at?: string
        }
      }
    }
    Views: {
      standings: {
        Row: {
          team_id: string
          team_name: string
          tournament_id: string
          played: number
          points: number
          won: number
          drawn: number
          lost: number
          goals_for: number
          goals_against: number
          goal_diff: number
        }
      }
    }
  }
}