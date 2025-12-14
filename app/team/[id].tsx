import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { League, Player, supabase, Team } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Href, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface TeamWithLeague extends Team {
  leagues?: League;
}

const POSITION_CONFIG: Record<string, { name: string; color: string }> = {
  POR: { name: 'Portero', color: '#FF9800' },
  DEF: { name: 'Defensa', color: '#2196F3' },
  MED: { name: 'Mediocampista', color: '#4CAF50' },
  DEL: { name: 'Delantero', color: '#F44336' },
};

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [team, setTeam] = useState<TeamWithLeague | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, isOwner } = useAuth();

  const fetchData = async () => {
    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*, leagues(*)')
        .eq('id', id)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', id)
        .order('dorsal', { ascending: true, nullsFirst: false });

      if (playersError) throw playersError;
      setPlayers(playersData || []);

    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDeletePlayer = (player: Player) => {
    Alert.alert(
      'Eliminar Jugador',
      `¿Eliminar a ${player.name} del equipo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('players').delete().eq('id', player.id);
              setPlayers(players.filter(p => p.id !== player.id));
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el jugador');
            }
          },
        },
      ]
    );
  };

  const navigateToAddPlayer = () => {
    const url = `/player/create?teamId=${id}&teamName=${encodeURIComponent(team?.name || '')}` as Href;
    router.push(url);
  };

  const getTeamInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  const canEdit = team?.leagues && isOwner(team.leagues.owner_id);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.icon} />
        <Text style={[styles.errorText, { color: colors.text }]}>Equipo no encontrado</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: team.name }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.tint }]}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{getTeamInitials(team.name)}</Text>
          </View>
          <Text style={styles.teamName}>{team.name}</Text>
          {team.short_name && (
            <Text style={styles.shortName}>({team.short_name})</Text>
          )}

          {canEdit && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push(`/team/edit/${id}`)}
              >
                <Ionicons name="pencil" size={18} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Contacto */}
        {(team.contact_name || team.contact_phone) && (
          <View style={[styles.contactCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contacto</Text>
            {team.contact_name && (
              <View style={styles.contactRow}>
                <Ionicons name="person-outline" size={18} color={colors.icon} />
                <Text style={[styles.contactText, { color: colors.text }]}>{team.contact_name}</Text>
              </View>
            )}
            {team.contact_phone && (
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={18} color={colors.icon} />
                <Text style={[styles.contactText, { color: colors.text }]}>{team.contact_phone}</Text>
              </View>
            )}
          </View>
        )}

        {/* Jugadores */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Plantilla ({players.length})
            </Text>
            {canEdit && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.tint }]}
                onPress={() => navigateToAddPlayer()}
              >
                <Ionicons name="person-add" size={16} color="white" />
                <Text style={styles.addButtonText}>Añadir</Text>
              </TouchableOpacity>
            )}
          </View>

          {players.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="people-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                No hay jugadores registrados
              </Text>
              {canEdit && (
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: colors.tint }]}
                  onPress={() => navigateToAddPlayer()}
                >
                  <Ionicons name="person-add" size={18} color="white" />
                  <Text style={styles.emptyButtonText}>Añadir jugador</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={[styles.playersCard, { backgroundColor: colors.card }]}>
              {players.map((player, index) => {
                const posConfig = player.position ? POSITION_CONFIG[player.position] : null;

                return (
                  <View key={player.id}>
                    <View style={styles.playerRow}>
                      <View style={[styles.dorsalBadge, { borderColor: colors.tint }]}>
                        <Text style={[styles.dorsalText, { color: colors.tint }]}>
                          {player.dorsal || '-'}
                        </Text>
                      </View>

                      <View style={styles.playerInfo}>
                        <View style={styles.playerNameRow}>
                          <Text style={[styles.playerName, { color: colors.text }]}>
                            {player.name}
                          </Text>
                          {player.is_captain && (
                            <View style={[styles.captainBadge, { backgroundColor: colors.warning }]}>
                              <Text style={styles.captainText}>C</Text>
                            </View>
                          )}
                        </View>
                        {posConfig && (
                          <View style={[styles.positionBadge, { backgroundColor: posConfig.color + '20' }]}>
                            <View style={[styles.positionDot, { backgroundColor: posConfig.color }]} />
                            <Text style={[styles.positionText, { color: posConfig.color }]}>
                              {posConfig.name}
                            </Text>
                          </View>
                        )}
                      </View>

                      {canEdit && (
                        <TouchableOpacity
                          style={styles.deletePlayerButton}
                          onPress={() => handleDeletePlayer(player)}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                    {index < players.length - 1 && (
                      <View style={[styles.playerDivider, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                );
              })}
            </View>
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
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeText: { color: 'white', fontSize: 28, fontWeight: '700' },
  teamName: { fontSize: 24, fontWeight: '700', color: 'white', textAlign: 'center' },
  shortName: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  headerActions: { flexDirection: 'row', marginTop: 16, gap: 12 },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactCard: { margin: 16, borderRadius: 16, padding: 16 },
  section: { padding: 16, paddingTop: 0 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
  contactText: { fontSize: 15 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: { color: 'white', fontSize: 13, fontWeight: '600' },
  emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, marginTop: 12, marginBottom: 20 },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  emptyButtonText: { color: 'white', fontSize: 15, fontWeight: '600' },
  playersCard: { borderRadius: 16, padding: 8 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  dorsalBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dorsalText: { fontSize: 16, fontWeight: '700' },
  playerInfo: { flex: 1, marginLeft: 14 },
  playerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playerName: { fontSize: 15, fontWeight: '600' },
  captainBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captainText: { color: 'white', fontSize: 11, fontWeight: '700' },
  positionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    gap: 6,
  },
  positionDot: { width: 6, height: 6, borderRadius: 3 },
  positionText: { fontSize: 12, fontWeight: '600' },
  deletePlayerButton: { padding: 8 },
  playerDivider: { height: 1, marginLeft: 70 },
});