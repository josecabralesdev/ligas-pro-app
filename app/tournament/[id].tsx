import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { League, Match, Standing, supabase, Team, Tournament } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Href, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface TournamentWithLeague extends Tournament {
  leagues: League;
}

interface MatchWithTeams extends Match {
  home_team: Team;
  away_team: Team;
}

interface GroupedMatches {
  round: number;
  matches: MatchWithTeams[];
}

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tournament, setTournament] = useState<TournamentWithLeague | null>(null);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posiciones' | 'partidos'>('partidos');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isOwner } = useAuth();

  const fetchData = async () => {
    try {
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('*, leagues(*)')
        .eq('id', id)
        .single();

      setTournament(tournamentData);

      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*)
        `)
        .eq('tournament_id', id)
        .order('round_number', { ascending: true, nullsFirst: false })
        .order('start_time', { ascending: true, nullsFirst: false });

      setMatches(matchesData || []);

      const { data: standingsData } = await supabase
        .from('standings')
        .select('*')
        .eq('tournament_id', id)
        .order('points', { ascending: false })
        .order('goal_diff', { ascending: false });

      setStandings(standingsData || []);

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [id]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Agrupar partidos por jornada
  const groupMatchesByRound = (): GroupedMatches[] => {
    const grouped: { [key: number]: MatchWithTeams[] } = {};

    matches.forEach(match => {
      const round = match.round_number || 0;
      if (!grouped[round]) {
        grouped[round] = [];
      }
      grouped[round].push(match);
    });

    return Object.entries(grouped)
      .map(([round, matches]) => ({
        round: parseInt(round),
        matches,
      }))
      .sort((a, b) => a.round - b.round);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'finalizado':
        return {
          label: 'Finalizado',
          color: colors.success,
          bgColor: colors.success + '15',
          icon: 'checkmark-circle' as const
        };
      case 'en_curso':
        return {
          label: 'En juego',
          color: colors.warning,
          bgColor: colors.warning + '15',
          icon: 'play-circle' as const
        };
      case 'programado':
        return {
          label: 'Programado',
          color: colors.tint,
          bgColor: colors.tint + '15',
          icon: 'time' as const
        };
      case 'cancelado':
        return {
          label: 'Cancelado',
          color: colors.error,
          bgColor: colors.error + '15',
          icon: 'close-circle' as const
        };
      default:
        return {
          label: status,
          color: colors.icon,
          bgColor: colors.icon + '15',
          icon: 'help-circle' as const
        };
    }
  };

  const getTeamInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase();
  };

  const getRandomColor = (id: string) => {
    const teamColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F8B500', '#6C5CE7', '#A8E6CF'];
    const index = id.charCodeAt(0) % teamColors.length;
    return teamColors[index];
  };

  const formatMatchDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const navigateToCreateMatch = () => {
    if (tournament) {
      const url = `/match/create?tournamentId=${id}&leagueId=${tournament.league_id}` as Href;
      router.push(url);
    }
  };

  const canEdit = tournament?.leagues && isOwner(tournament.leagues.owner_id);
  const groupedMatches = groupMatchesByRound();

  // Estadísticas rápidas
  const stats = {
    total: matches.length,
    played: matches.filter(m => m.status === 'finalizado').length,
    pending: matches.filter(m => m.status === 'programado').length,
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Torneo' }} />
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </>
    );
  }

  if (!tournament) {
    return (
      <>
        <Stack.Screen options={{ title: 'Torneo' }} />
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.icon} />
          <Text style={[styles.errorText, { color: colors.text }]}>Torneo no encontrado</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: tournament.name }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.tint }]}>
          <View style={styles.headerContent}>
            <Text style={styles.tournamentName}>{tournament.name}</Text>
            <Text style={styles.leagueName}>{tournament.leagues?.name}</Text>

            {tournament.start_date && (
              <View style={styles.dateRow}>
                <Ionicons name="calendar" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.dateText}>
                  {new Date(tournament.start_date).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
              </View>
            )}
          </View>

          {/* Stats */}
          {matches.length > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Partidos</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.played}</Text>
                <Text style={styles.statLabel}>Jugados</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pendientes</Text>
              </View>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'partidos' && { backgroundColor: colors.tint + '15' }
            ]}
            onPress={() => setActiveTab('partidos')}
          >
            <Ionicons
              name="football"
              size={20}
              color={activeTab === 'partidos' ? colors.tint : colors.icon}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'partidos' ? colors.tint : colors.icon }
            ]}>
              Partidos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'posiciones' && { backgroundColor: colors.tint + '15' }
            ]}
            onPress={() => setActiveTab('posiciones')}
          >
            <Ionicons
              name="podium"
              size={20}
              color={activeTab === 'posiciones' ? colors.tint : colors.icon}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'posiciones' ? colors.tint : colors.icon }
            ]}>
              Tabla
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'partidos' ? (
            <>
              {/* Botón añadir partido */}
              {canEdit && (
                <TouchableOpacity
                  style={[styles.addMatchButton, { backgroundColor: colors.tint }]}
                  onPress={navigateToCreateMatch}
                >
                  <Ionicons name="add-circle" size={22} color="white" />
                  <Text style={styles.addMatchText}>Programar Partido</Text>
                </TouchableOpacity>
              )}

              {matches.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.emptyIcon, { backgroundColor: colors.tint + '15' }]}>
                    <Ionicons name="football-outline" size={40} color={colors.tint} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    Sin partidos
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.icon }]}>
                    {canEdit
                      ? 'Programa el primer partido del torneo'
                      : 'Aún no hay partidos programados'
                    }
                  </Text>
                </View>
              ) : (
                // Partidos agrupados por jornada
                groupedMatches.map((group) => (
                  <View key={group.round} style={styles.roundGroup}>
                    {/* Header de la jornada */}
                    <View style={styles.roundHeader}>
                      <View style={[styles.roundBadge, { backgroundColor: colors.tint }]}>
                        <Text style={styles.roundBadgeText}>{group.round}</Text>
                      </View>
                      <Text style={[styles.roundTitle, { color: colors.text }]}>
                        Jornada {group.round}
                      </Text>
                      <View style={[styles.roundLine, { backgroundColor: colors.border }]} />
                      <Text style={[styles.roundCount, { color: colors.icon }]}>
                        {group.matches.length} {group.matches.length === 1 ? 'partido' : 'partidos'}
                      </Text>
                    </View>

                    {/* Partidos de la jornada */}
                    {group.matches.map((match) => {
                      const status = getStatusConfig(match.status);
                      const isPlayed = match.status === 'finalizado';
                      const isLive = match.status === 'en_curso';
                      const dateInfo = match.start_time ? formatMatchDate(match.start_time) : null;

                      return (
                        <View
                          key={match.id}
                          style={[
                            styles.matchCard,
                            { backgroundColor: colors.card },
                            isPlayed && styles.matchCardPlayed,
                            isLive && { borderLeftWidth: 4, borderLeftColor: colors.warning }
                          ]}
                        >
                          {/* Status badge */}
                          <View style={[styles.matchStatus, { backgroundColor: status.bgColor }]}>
                            <Ionicons name={status.icon} size={14} color={status.color} />
                            <Text style={[styles.matchStatusText, { color: status.color }]}>
                              {status.label}
                            </Text>
                          </View>

                          {/* Teams and score */}
                          <View style={styles.matchBody}>
                            {/* Home team */}
                            <View style={styles.matchTeam}>
                              <View style={[
                                styles.teamBadgeSmall,
                                { backgroundColor: getRandomColor(match.home_team?.id || 'x') }
                              ]}>
                                <Text style={styles.teamBadgeSmallText}>
                                  {getTeamInitials(match.home_team?.name || 'LOC')}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.matchTeamName,
                                  { color: colors.text },
                                  isPlayed && match.home_score > match.away_score && styles.winnerText
                                ]}
                                numberOfLines={2}
                              >
                                {match.home_team?.name || 'Local'}
                              </Text>
                            </View>

                            {/* Score / VS */}
                            <View style={styles.matchScoreContainer}>
                              {isPlayed || isLive ? (
                                <View style={[
                                  styles.scoreBox,
                                  isPlayed && { backgroundColor: colors.success + '10' },
                                  isLive && { backgroundColor: colors.warning + '10' }
                                ]}>
                                  <Text style={[
                                    styles.scoreText,
                                    { color: isLive ? colors.warning : colors.text }
                                  ]}>
                                    {match.home_score}
                                  </Text>
                                  <Text style={[styles.scoreSeparator, { color: colors.icon }]}>:</Text>
                                  <Text style={[
                                    styles.scoreText,
                                    { color: isLive ? colors.warning : colors.text }
                                  ]}>
                                    {match.away_score}
                                  </Text>
                                </View>
                              ) : (
                                <View style={[styles.vsBox, { backgroundColor: colors.border }]}>
                                  <Text style={[styles.vsText, { color: colors.icon }]}>VS</Text>
                                </View>
                              )}
                            </View>

                            {/* Away team */}
                            <View style={[styles.matchTeam, styles.matchTeamAway]}>
                              <Text
                                style={[
                                  styles.matchTeamName,
                                  styles.matchTeamNameAway,
                                  { color: colors.text },
                                  isPlayed && match.away_score > match.home_score && styles.winnerText
                                ]}
                                numberOfLines={2}
                              >
                                {match.away_team?.name || 'Visitante'}
                              </Text>
                              <View style={[
                                styles.teamBadgeSmall,
                                { backgroundColor: getRandomColor(match.away_team?.id || 'y') }
                              ]}>
                                <Text style={styles.teamBadgeSmallText}>
                                  {getTeamInitials(match.away_team?.name || 'VIS')}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Footer with date/location */}
                          {(dateInfo || match.location) && (
                            <View style={[styles.matchFooter, { borderTopColor: colors.border }]}>
                              {dateInfo && (
                                <View style={styles.matchDetail}>
                                  <Ionicons name="calendar-outline" size={13} color={colors.icon} />
                                  <Text style={[styles.matchDetailText, { color: colors.icon }]}>
                                    {dateInfo.date}
                                  </Text>
                                  <Text style={[styles.matchDetailDot, { color: colors.icon }]}>•</Text>
                                  <Ionicons name="time-outline" size={13} color={colors.icon} />
                                  <Text style={[styles.matchDetailText, { color: colors.icon }]}>
                                    {dateInfo.time}
                                  </Text>
                                </View>
                              )}
                              {match.location && (
                                <View style={styles.matchDetail}>
                                  <Ionicons name="location-outline" size={13} color={colors.icon} />
                                  <Text style={[styles.matchDetailText, { color: colors.icon }]}>
                                    {match.location}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))
              )}
            </>
          ) : (
            // Tabla de posiciones
            standings.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.warning + '15' }]}>
                  <Ionicons name="podium-outline" size={40} color={colors.warning} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Sin posiciones
                </Text>
                <Text style={[styles.emptyText, { color: colors.icon }]}>
                  La tabla se calculará cuando haya partidos finalizados
                </Text>
              </View>
            ) : (
              <View style={[styles.standingsCard, { backgroundColor: colors.card }]}>
                {/* Table Header */}
                <View style={[styles.tableHeader, { backgroundColor: colors.tint }]}>
                  <Text style={[styles.th, styles.thPos]}>#</Text>
                  <Text style={[styles.th, styles.thTeam]}>Equipo</Text>
                  <Text style={[styles.th, styles.thStat]}>PJ</Text>
                  <Text style={[styles.th, styles.thStat]}>G</Text>
                  <Text style={[styles.th, styles.thStat]}>E</Text>
                  <Text style={[styles.th, styles.thStat]}>P</Text>
                  <Text style={[styles.th, styles.thStat]}>DG</Text>
                  <Text style={[styles.th, styles.thPts]}>Pts</Text>
                </View>

                {/* Table Rows */}
                {standings.map((s, i) => (
                  <View
                    key={s.team_id}
                    style={[
                      styles.tableRow,
                      { borderBottomColor: colors.border },
                      i === 0 && { backgroundColor: colors.success + '08' },
                      i === 1 && { backgroundColor: colors.success + '05' },
                      i === 2 && { backgroundColor: colors.success + '03' },
                    ]}
                  >
                    <View style={[
                      styles.posBadge,
                      {
                        backgroundColor: i < 3 ? colors.success : colors.border,
                      }
                    ]}>
                      <Text style={[
                        styles.posText,
                        { color: i < 3 ? 'white' : colors.text }
                      ]}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text
                      style={[styles.td, styles.tdTeam, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {s.team_name}
                    </Text>
                    <Text style={[styles.td, styles.thStat, { color: colors.icon }]}>
                      {s.played || 0}
                    </Text>
                    <Text style={[styles.td, styles.thStat, { color: colors.success }]}>
                      {s.won || 0}
                    </Text>
                    <Text style={[styles.td, styles.thStat, { color: colors.warning }]}>
                      {s.drawn || 0}
                    </Text>
                    <Text style={[styles.td, styles.thStat, { color: colors.error }]}>
                      {s.lost || 0}
                    </Text>
                    <Text style={[styles.td, styles.thStat, { color: colors.icon }]}>
                      {s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff || 0}
                    </Text>
                    <Text style={[styles.td, styles.thPts, { color: colors.text }]}>
                      {s.points || 0}
                    </Text>
                  </View>
                ))}

                {/* Legend */}
                <View style={[styles.legend, { borderTopColor: colors.border }]}>
                  <Text style={[styles.legendText, { color: colors.icon }]}>
                    PJ: Partidos Jugados • G: Ganados • E: Empatados • P: Perdidos • DG: Diferencia de Goles
                  </Text>
                </View>
              </View>
            )
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, marginTop: 12 },

  // Header
  header: {
    padding: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: { marginBottom: 16 },
  tournamentName: { fontSize: 28, fontWeight: '700', color: 'white' },
  leagueName: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  dateText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 14,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '700', color: 'white' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statDivider: { width: 1, marginVertical: 4 },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -18,
    borderRadius: 14,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  tabText: { fontSize: 15, fontWeight: '600' },

  // Content
  content: { padding: 16, paddingBottom: 32 },

  // Add button
  addMatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 20,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  addMatchText: { color: 'white', fontSize: 16, fontWeight: '600' },

  // Empty state
  emptyCard: {
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Round groups
  roundGroup: { marginBottom: 24 },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  roundBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundBadgeText: { color: 'white', fontSize: 14, fontWeight: '700' },
  roundTitle: { fontSize: 16, fontWeight: '700' },
  roundLine: { flex: 1, height: 1 },
  roundCount: { fontSize: 13 },

  // Match card
  matchCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  matchCardPlayed: {
    opacity: 0.85,
  },
  matchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomRightRadius: 12,
    gap: 6,
  },
  matchStatusText: { fontSize: 12, fontWeight: '600' },
  matchBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  matchTeam: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  matchTeamAway: {
    justifyContent: 'flex-end',
  },
  teamBadgeSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamBadgeSmallText: { color: 'white', fontSize: 12, fontWeight: '700' },
  matchTeamName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  matchTeamNameAway: {
    textAlign: 'right',
  },
  winnerText: {
    fontWeight: '700',
  },
  matchScoreContainer: {
    paddingHorizontal: 12,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  scoreText: { fontSize: 22, fontWeight: '700' },
  scoreSeparator: { fontSize: 18 },
  vsBox: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  vsText: { fontSize: 13, fontWeight: '700' },
  matchFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  matchDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchDetailText: { fontSize: 12 },
  matchDetailDot: { marginHorizontal: 2 },

  // Standings
  standingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  th: { color: 'white', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  thPos: { width: 32 },
  thTeam: { flex: 1, textAlign: 'left', paddingLeft: 10 },
  thStat: { width: 32 },
  thPts: { width: 36, fontWeight: '800' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  td: { fontSize: 13, textAlign: 'center' },
  tdTeam: { flex: 1, textAlign: 'left', paddingLeft: 10, fontWeight: '500' },
  posBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posText: { fontSize: 13, fontWeight: '700' },
  legend: {
    padding: 12,
    borderTopWidth: 1,
  },
  legendText: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
});