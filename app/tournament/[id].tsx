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
  const [activeTab, setActiveTab] = useState<'posiciones' | 'partidos'>('posiciones');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    fetchTournamentData();
  }, [id]);

  const fetchTournamentData = async () => {
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*, leagues(*)')
        .eq('id', id)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

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
      case 'finalizado': return colors.success;
      case 'en_curso': return colors.warning;
      case 'programado': return colors.tint;
      case 'cancelado': return colors.error;
      default: return colors.icon;
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
        <Ionicons name="alert-circle-outline" size={48} color={colors.icon} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          Torneo no encontrado
        </Text>
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
          {tournament.leagues?.location && (
            <View style={styles.headerDetail}>
              <Ionicons name="location" size={16} color="white" />
              <Text style={styles.headerDetailText}>
                {tournament.leagues.location}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'posiciones' && { backgroundColor: colors.tint + '15' }
          ]}
          onPress={() => setActiveTab('posiciones')}
        >
          <Ionicons
            name="podium"
            size={18}
            color={activeTab === 'posiciones' ? colors.tint : colors.icon}
          />
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
            activeTab === 'partidos' && { backgroundColor: colors.tint + '15' }
          ]}
          onPress={() => setActiveTab('partidos')}
        >
          <Ionicons
            name="football"
            size={18}
            color={activeTab === 'partidos' ? colors.tint : colors.icon}
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'partidos' ? colors.tint : colors.icon }
          ]}>
            Partidos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'posiciones' ? (
          standings.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="podium-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                No hay posiciones disponibles
              </Text>
            </View>
          ) : (
            <View style={[styles.standingsTable, { backgroundColor: colors.card }]}>
              {/* Table Header */}
              <View style={[styles.tableHeader, { backgroundColor: colors.tint }]}>
                <Text style={[styles.tableHeaderCell, styles.posCell]}>#</Text>
                <Text style={[styles.tableHeaderCell, styles.teamCell]}>Equipo</Text>
                <Text style={[styles.tableHeaderCell, styles.statCell]}>PJ</Text>
                <Text style={[styles.tableHeaderCell, styles.statCell]}>G</Text>
                <Text style={[styles.tableHeaderCell, styles.statCell]}>E</Text>
                <Text style={[styles.tableHeaderCell, styles.statCell]}>P</Text>
                <Text style={[styles.tableHeaderCell, styles.statCell]}>DG</Text>
                <Text style={[styles.tableHeaderCell, styles.ptsCell]}>Pts</Text>
              </View>

              {standings.map((standing, index) => (
                <TouchableOpacity
                  key={standing.team_id}
                  style={[
                    styles.tableRow,
                    { borderBottomColor: colors.border },
                    index < 3 && { backgroundColor: colors.success + '10' }
                  ]}
                  onPress={() => router.push(`/team/${standing.team_id}`)}
                >
                  <View style={[
                    styles.positionBadge,
                    { backgroundColor: index < 3 ? colors.success : colors.icon + '30' }
                  ]}>
                    <Text style={[
                      styles.positionNumber,
                      { color: index < 3 ? 'white' : colors.text }
                    ]}>
                      {index + 1}
                    </Text>
                  </View>
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
                  <Text style={[styles.tableCell, styles.ptsCell, { color: colors.text, fontWeight: '700' }]}>
                    {standing.points || 0}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )
        ) : (
          matches.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="football-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                No hay partidos programados
              </Text>
            </View>
          ) : (
            matches.map((match) => (
              <View
                key={match.id}
                style={[styles.matchCard, { backgroundColor: colors.card }]}
              >
                {match.round_number && (
                  <View style={[styles.roundBadge, { backgroundColor: colors.tint + '15' }]}>
                    <Text style={[styles.roundText, { color: colors.tint }]}>
                      Fecha {match.round_number}
                    </Text>
                  </View>
                )}

                <View style={styles.matchContent}>
                  <TouchableOpacity
                    style={styles.teamContainer}
                    onPress={() => router.push(`/team/${match.home_team_id}`)}
                  >
                    <Text
                      style={[styles.matchTeamName, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {match.home_team?.name || 'Local'}
                    </Text>
                  </TouchableOpacity>

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
                      <Text style={[styles.vsText, { color: colors.icon }]}>VS</Text>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(match.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(match.status)}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.teamContainer}
                    onPress={() => router.push(`/team/${match.away_team_id}`)}
                  >
                    <Text
                      style={[styles.matchTeamName, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {match.away_team?.name || 'Visitante'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {(match.location || match.start_time) && (
                  <View style={[styles.matchFooter, { borderTopColor: colors.border }]}>
                    {match.location && (
                      <View style={styles.matchDetail}>
                        <Ionicons name="location-outline" size={14} color={colors.icon} />
                        <Text style={[styles.matchDetailText, { color: colors.icon }]}>
                          {match.location}
                        </Text>
                      </View>
                    )}
                    {match.start_time && (
                      <View style={styles.matchDetail}>
                        <Ionicons name="time-outline" size={14} color={colors.icon} />
                        <Text style={[styles.matchDetailText, { color: colors.icon }]}>
                          {new Date(match.start_time).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))
          )
        )}
      </View>
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
  errorText: {
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    padding: 24,
    paddingTop: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  tournamentName: {
    fontSize: 26,
    fontWeight: '700',
    color: 'white',
  },
  leagueName: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  headerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 16,
  },
  headerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerDetailText: {
    color: 'white',
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  standingsTable: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  tableCell: {
    fontSize: 13,
    textAlign: 'center',
  },
  posCell: {
    width: 28,
  },
  positionBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  teamCell: {
    flex: 1,
    textAlign: 'left',
    paddingLeft: 10,
  },
  statCell: {
    width: 28,
  },
  ptsCell: {
    width: 32,
  },
  matchCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  roundBadge: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 14,
  },
  roundText: {
    fontSize: 12,
    fontWeight: '600',
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  matchTeamName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
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
  vsText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  matchFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 16,
  },
  matchDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchDetailText: {
    fontSize: 12,
  },
});