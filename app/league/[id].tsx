import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { League, supabase, Team, Tournament } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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

export default function LeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [league, setLeague] = useState<League | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, isOwner } = useAuth();

  const fetchData = async () => {
    try {
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('*, owner:profiles(*)')
        .eq('id', id)
        .single();

      if (leagueError) throw leagueError;
      setLeague(leagueData);

      const { data: tournamentsData } = await supabase
        .from('tournaments')
        .select('*')
        .eq('league_id', id)
        .order('created_at', { ascending: false });

      setTournaments(tournamentsData || []);

      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('league_id', id)
        .order('name', { ascending: true });

      setTeams(teamsData || []);

    } catch (error) {
      console.error('Error:', error);
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

  const handleDeleteLeague = () => {
    Alert.alert(
      'Eliminar Liga',
      '¿Estás seguro? Se eliminarán todos los torneos, equipos y partidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('leagues').delete().eq('id', id);
              if (error) throw error;
              router.replace('/');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const canEdit = league && isOwner(league.owner_id);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!league) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.icon} />
        <Text style={[styles.errorText, { color: colors.text }]}>Liga no encontrada</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: league.name }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.tint }]}>
          <View style={styles.headerContent}>
            <Text style={styles.leagueName}>{league.name}</Text>
            {league.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.locationText}>{league.location}</Text>
              </View>
            )}
          </View>

          {canEdit && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push(`/league/edit/${id}`)}
              >
                <Ionicons name="pencil" size={18} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerButton, styles.deleteBtn]}
                onPress={handleDeleteLeague}
              >
                <Ionicons name="trash" size={18} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Descripción */}
        {league.description && (
          <View style={[styles.descriptionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.description, { color: colors.text }]}>
              {league.description}
            </Text>
          </View>
        )}

        {/* Torneos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Torneos ({tournaments.length})
            </Text>
            {canEdit && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.tint }]}
                onPress={() => router.push(`/tournament/create?leagueId=${id}`)}
              >
                <Ionicons name="add" size={18} color="white" />
                <Text style={styles.addButtonText}>Nuevo</Text>
              </TouchableOpacity>
            )}
          </View>

          {tournaments.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="trophy-outline" size={40} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                No hay torneos
              </Text>
            </View>
          ) : (
            tournaments.map(tournament => (
              <TouchableOpacity
                key={tournament.id}
                style={[styles.itemCard, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/tournament/${tournament.id}`)}
              >
                <View style={[styles.itemIcon, { backgroundColor: colors.warning + '20' }]}>
                  <Ionicons name="trophy" size={20} color={colors.warning} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text }]}>
                    {tournament.name}
                  </Text>
                  <Text style={[styles.itemMeta, { color: colors.icon }]}>
                    {tournament.is_active ? '🟢 Activo' : '⚪ Finalizado'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.icon} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Equipos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Equipos ({teams.length})
            </Text>
            {canEdit && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.tint }]}
                onPress={() => router.push(`/team/create?leagueId=${id}`)}
              >
                <Ionicons name="add" size={18} color="white" />
                <Text style={styles.addButtonText}>Nuevo</Text>
              </TouchableOpacity>
            )}
          </View>

          {teams.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="people-outline" size={40} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                No hay equipos
              </Text>
            </View>
          ) : (
            teams.map(team => (
              <TouchableOpacity
                key={team.id}
                style={[styles.itemCard, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/team/${team.id}`)}
              >
                <View style={[styles.itemIcon, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="shield" size={20} color={colors.success} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text }]}>
                    {team.name}
                  </Text>
                  {team.contact_name && (
                    <Text style={[styles.itemMeta, { color: colors.icon }]}>
                      {team.contact_name}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.icon} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Organizador */}
        <View style={[styles.ownerCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.ownerLabel, { color: colors.icon }]}>Organizado por</Text>
          <Text style={[styles.ownerName, { color: colors.text }]}>
            {league.owner?.full_name || league.owner?.username || 'Usuario'}
          </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: { flex: 1 },
  leagueName: { fontSize: 26, fontWeight: '700', color: 'white' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  locationText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: { backgroundColor: 'rgba(220,38,38,0.8)' },
  descriptionCard: { margin: 16, marginBottom: 0, borderRadius: 12, padding: 16 },
  description: { fontSize: 15, lineHeight: 22 },
  section: { padding: 16, paddingBottom: 0 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: { color: 'white', fontSize: 13, fontWeight: '600' },
  emptyCard: { borderRadius: 12, padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, marginTop: 8 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemMeta: { fontSize: 13, marginTop: 2 },
  ownerCard: { margin: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  ownerLabel: { fontSize: 12 },
  ownerName: { fontSize: 16, fontWeight: '600', marginTop: 4 },
});