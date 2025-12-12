import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Player, supabase, Team } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  useEffect(() => {
    fetchTeamData();
  }, [id]);

  const fetchTeamData = async () => {
    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', id)
        .order('dorsal', { ascending: true });

      if (playersError) throw playersError;
      setPlayers(playersData || []);

    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Equipo',
      `¿Estás seguro que quieres eliminar a "${team?.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('teams')
                .delete()
                .eq('id', id);

              if (error) throw error;

              Alert.alert('Éxito', 'Equipo eliminado correctamente');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar el equipo');
            }
          },
        },
      ]
    );
  };

  const getTeamInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getPositionColor = (position: string | null) => {
    switch (position?.toUpperCase()) {
      case 'POR': return '#FF9800';
      case 'DEF': return '#2196F3';
      case 'MED': return '#4CAF50';
      case 'DEL': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getPositionName = (position: string | null) => {
    switch (position?.toUpperCase()) {
      case 'POR': return 'Portero';
      case 'DEF': return 'Defensa';
      case 'MED': return 'Mediocampista';
      case 'DEL': return 'Delantero';
      default: return position || 'Sin posición';
    }
  };

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
        <Text style={[styles.errorText, { color: colors.text }]}>
          Equipo no encontrado
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <View style={styles.badgePlaceholder}>
          <Text style={styles.badgeText}>{getTeamInitials(team.name)}</Text>
        </View>
        <Text style={styles.teamName}>{team.name}</Text>
        {team.short_name && (
          <Text style={styles.shortName}>({team.short_name})</Text>
        )}

        {/* Botones de admin */}
        {user && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push(`/team/edit/${id}`)}
            >
              <Ionicons name="pencil" size={18} color="white" />
              <Text style={styles.headerButtonText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              <Ionicons name="trash" size={18} color="white" />
              <Text style={styles.headerButtonText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Información de contacto */}
      {(team.contact_name || team.contact_phone) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Información de Contacto
          </Text>
          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            {team.contact_name && (
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: colors.tint + '20' }]}>
                  <Ionicons name="person" size={18} color={colors.tint} />
                </View>
                <View>
                  <Text style={[styles.infoLabel, { color: colors.icon }]}>Delegado</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {team.contact_name}
                  </Text>
                </View>
              </View>
            )}
            {team.contact_phone && (
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="call" size={18} color={colors.success} />
                </View>
                <View>
                  <Text style={[styles.infoLabel, { color: colors.icon }]}>Teléfono</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {team.contact_phone}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Jugadores */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Plantilla
          </Text>
          <View style={[styles.playerCount, { backgroundColor: colors.tint + '20' }]}>
            <Text style={[styles.playerCountText, { color: colors.tint }]}>
              {players.length} jugadores
            </Text>
          </View>
        </View>

        {players.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons name="people-outline" size={40} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No hay jugadores registrados
            </Text>
          </View>
        ) : (
          <View style={[styles.playersCard, { backgroundColor: colors.card }]}>
            {players.map((player, index) => (
              <View key={player.id}>
                <View style={styles.playerRow}>
                  <View style={[styles.dorsalContainer, { borderColor: colors.tint }]}>
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
                        <View style={styles.captainBadge}>
                          <Text style={styles.captainText}>C</Text>
                        </View>
                      )}
                    </View>
                    {player.position && (
                      <View style={[styles.positionBadge, { backgroundColor: getPositionColor(player.position) + '20' }]}>
                        <Text style={[styles.positionText, { color: getPositionColor(player.position) }]}>
                          {getPositionName(player.position)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {index < players.length - 1 && (
                  <View style={[styles.playerSeparator, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
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
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  badgePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '700',
  },
  teamName: {
    fontSize: 26,
    fontWeight: '700',
    color: 'white',
    marginTop: 16,
    textAlign: 'center',
  },
  shortName: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  deleteButton: {
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
  },
  headerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  playerCount: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playerCountText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyCard: {
    borderRadius: 16,
    padding: 40,
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
  playersCard: {
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  dorsalContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dorsalText: {
    fontSize: 16,
    fontWeight: '700',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  captainBadge: {
    backgroundColor: '#FFD700',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captainText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },
  positionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  positionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  playerSeparator: {
    height: 1,
    marginLeft: 70,
  },
})