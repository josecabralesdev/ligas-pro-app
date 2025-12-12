import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Player, supabase, Team } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    fetchTeamData();
  }, [id]);

  const fetchTeamData = async () => {
    try {
      // Fetch team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Fetch players
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
        <Text style={{ color: colors.text }}>Equipo no encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        {team.badge_url ? (
          <Image source={{ uri: team.badge_url }} style={styles.badge} />
        ) : (
          <View style={styles.badgePlaceholder}>
            <Text style={styles.badgeText}>{getTeamInitials(team.name)}</Text>
          </View>
        )}
        <Text style={styles.teamName}>{team.name}</Text>
        {team.short_name && (
          <Text style={styles.shortName}>({team.short_name})</Text>
        )}
      </View>

      {/* Info */}
      {(team.contact_name || team.contact_phone) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Información de Contacto
          </Text>
          <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
            {team.contact_name && (
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color={colors.icon} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {team.contact_name}
                </Text>
              </View>
            )}
            {team.contact_phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color={colors.icon} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {team.contact_phone}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Players */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Plantilla ({players.length} jugadores)
        </Text>

        {players.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No hay jugadores registrados
            </Text>
          </View>
        ) : (
          players.map((player) => (
            <View
              key={player.id}
              style={[styles.playerCard, { backgroundColor: colors.background }]}
            >
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
                  <View style={styles.positionRow}>
                    <View style={[styles.positionBadge, { backgroundColor: getPositionColor(player.position) }]}>
                      <Text style={styles.positionText}>{player.position}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ))
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
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  badge: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  badgePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 36,
    fontWeight: '700',
  },
  teamName: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginTop: 16,
    textAlign: 'center',
  },
  shortName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dorsalContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dorsalText: {
    fontSize: 18,
    fontWeight: '700',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  captainBadge: {
    backgroundColor: '#FFD700',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  captainText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  positionRow: {
    marginTop: 4,
  },
  positionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  positionText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
});