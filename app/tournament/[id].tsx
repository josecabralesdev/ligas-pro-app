import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Match, Standing, supabase, Team, Tournament } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface MatchWithTeams extends Match {
  home_team: Team;
  away_team: Team;
}

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'partidos' | 'posiciones'>('posiciones');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    fetchTournamentData();
  }, [id]);

  const fetchTournamentData = async () => {
    try {
      // Fetch tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*, leagues(*)')
        .eq('id', id)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*)
        `)
        .eq('tournament_id', id)
        .order('round_number', { ascending: true });

      if (matchesError) throw matchesError;
      setMatches(matchesData || []);

      // Fetch standings
      const { data: standingsData, error: standingsError } = await supabase
        .from('standings')
        .select('*')
        .eq('tournament_id', id)
        .order('points', { ascending: false });

      if (standingsError) throw standingsError;
      setStandings(standingsData || []);

    } catch (error) {
      console.error('Error fetching tournament data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finalizado': return '#4CAF50';
      case 'en_curso': return '#FF9800';
      case 'programado': return '#2196F3';
      case 'cancelado': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'finalizado': return 'Finalizado';
      case 'en_curso': return 'En curso';
      case 'programado': return 'Programado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Torneo no encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <Text style={styles.tournamentName}>{tournament.name}</Text>
        {tournament.leagues && (
          <Text style={styles.leagueName}>{tournament.leagues.name}</Text>
        )}
        <View style={styles.headerDetails}>
          {tournament.start_date && (
            <View style={styles.headerDetail}>
              <Ionicons name="calendar" size={16} color="white" />
              <Text style={styles.headerDetailText}>
                {new Date(tournament.start_date).toLocaleDateString('es-ES')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'posiciones' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('posiciones')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'posiciones' ? colors.tint : colors.icon }
          ]}>
            Posiciones
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'partidos' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('partidos')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'partidos' ? colors.tint : colors.icon }
          ]}>
            Partidos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'posiciones' ? (
        <View style={styles.content}>
          {standings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="podium-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                No hay posiciones disponibles
              </Text>
            </View>
          ) : (
            <View style={[styles.standingsTable, { backgroundColor: colors.background }]}>
              {/* Table Header */}
              <View style={[styles.tableHeader, { backgroundColor: colors.tint }]}>
                <Text style={[styles.tableHeaderCell, styles.posCell]}>#</Text>
                <Text style={[styles.tableHeaderCell, styles.teamCell]}>Equipo</Text>
                <Text style={[styles.tableHeaderCell, styles.statCell]}>PJ</Text>
                <Text style={[styles.tableHeaderCell, styles.statCell]}>G</Text>
                <Text style={[styles.tableHeaderCell, styles.statCell]}>E</Text>
                <Text style={[styles.tableHeaderCell, styles.statCell]}>P</Text>
                <Text style={[styles.tableHeaderCell, styles.statCell]}>DG</Text>
                <Text style={[styles.tableHeaderCell, styles.statCell, styles.ptsCell]}>Pts</Text>
              </View>

              {standings.map((standing, index) => (
                <TouchableOpacity
                  key={standing.team_id}
                  style={[
                    styles.tableRow,
                    { borderBottomColor: colors.icon + '20' },
                    index < 3 && styles.topPosition
                  ]}
                  onPress={() => router.push(`/team/${standing.team_id}`)}
                >
                  <Text style={[styles.tableCell, styles.posCell, { color: colors.text }]}>
                    {index + 1}
                  </Text>
                  <Text
                    style={[styles.tableCell, styles.teamCell, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {standing.team_name}
                  </Text>
                  <Text style={[styles.tableCell, styles.statCell, { color: colors.icon }]}>
                    {standing.played || 0}
                  </Text>
                  <Text style={[styles.tableCell, styles.statCell, { color: colors.icon }]}>
                    {standing.won || 0}
                  </Text>
                  <Text style={[styles.tableCell, styles.statCell, { color: colors.icon }]}>
                    {standing.drawn || 0}
                  </Text>
                  <Text style={[styles.tableCell, styles.statCell, { color: colors.icon }]}>
                    {standing.lost || 0}
                  </Text>
                  <Text style={[styles.tableCell, styles.statCell, { color: colors.icon }]}>
                    {standing.goal_diff || 0}
                  </Text>
                  <Text style={[styles.tableCell, styles.statCell, styles.ptsCell, { color: colors.text, fontWeight: '700' }]}>
                    {standing.points || 0}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.content}>
          {matches.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="football-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                No hay partidos programados
              </Text>
            </View>
          ) : (
            matches.map((match) => (
              <View
                key={match.id}
                style={[styles.matchCard, { backgroundColor: colors.background }]}
              >
                {match.round_number && (
                  <Text style={[styles.roundNumber, { color: colors.icon }]}>
                    Fecha {match.round_number}
                  </Text>
                )}

                <View style={styles.matchContent}>
                  <View style={styles.teamContainer}>
                    <Text
                      style={[styles.matchTeamName, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {match.home_team?.name || 'Local'}
                    </Text>
                  </View>

                  <View style={styles.scoreContainer}>
                    {match.status === 'finalizado' || match.status === 'en_curso' ? (
                      <View style={styles.score}>
                        <Text style={[styles.scoreText, { color: colors.text }]}>
                          {match.home_score}
                        </Text>
                        <Text style={[styles.scoreSeparator, { color: colors.icon }]}>-</Text>
                        <Text style={[styles.scoreText, { color: colors.text }]}>
                          {match.away_score}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.matchTime, { color: colors.icon }]}>
                        VS
                      </Text>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(match.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(match.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.teamContainer}>
                    <Text
                      style={[styles.matchTeamName, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {match.away_team?.name || 'Visitante'}
                    </Text>
                  </View>
                </View>

                {match.location && (
                  <View style={styles.matchFooter}>
                    <Ionicons name="location-outline" size={14} color={colors.icon} />
                    <Text style={[styles.matchLocation, { color: colors.icon }]}>
                      {match.location}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    paddingTop: 16,
  },
  tournamentName: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
  },
  leagueName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  headerDetails: {
    flexDirection: 'row',
    marginTop: 16,
  },
  headerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerDetailText: {
    color: 'white',
    marginLeft: 6,
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  standingsTable: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  topPosition: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  tableCell: {
    fontSize: 13,
    textAlign: 'center',
  },
  posCell: {
    width: 28,
  },
  teamCell: {
    flex: 1,
    textAlign: 'left',
    paddingLeft: 8,
  },
  statCell: {
    width: 32,
  },
  ptsCell: {
    width: 36,
  },
  matchCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roundNumber: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
  },
  matchTeamName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '700',
  },
  scoreSeparator: {
    fontSize: 20,
    marginHorizontal: 8,
  },
  matchTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  matchFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  matchLocation: {
    fontSize: 12,
    marginLeft: 4,
  },
});