import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { League, supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LigasScreen() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const fetchLeagues = async () => {
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select(`
          *,
          owner:profiles(*)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeagues(data || []);
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLeagues();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeagues();
  };

  const renderLeague = ({ item }: { item: League }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/league/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: colors.tint }]}>
          <Ionicons name="football" size={28} color="white" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.leagueName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={colors.icon} />
              <Text style={[styles.locationText, { color: colors.icon }]} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}
        </View>
      </View>

      {item.description && (
        <Text
          style={[styles.description, { color: colors.icon }]}
          numberOfLines={2}
        >
          {item.description}
        </Text>
      )}

      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <View style={styles.ownerInfo}>
          <Ionicons name="person-circle-outline" size={16} color={colors.icon} />
          <Text style={[styles.ownerText, { color: colors.icon }]}>
            {item.owner?.username || 'Organizador'}
          </Text>
        </View>
        <View style={styles.viewMore}>
          <Text style={[styles.viewMoreText, { color: colors.tint }]}>Ver liga</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.tint} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Cargando ligas...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* FAB para crear liga - Solo usuarios logueados */}
      {user && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/league/create')}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      )}

      {leagues.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="football-outline" size={64} color={colors.icon} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No hay ligas disponibles
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
            {user
              ? 'Sé el primero en crear una liga para tu barrio'
              : 'Inicia sesión para crear tu propia liga'
            }
          </Text>
          {user && (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/league/create')}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.createButtonText}>Crear Liga</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={leagues}
          renderItem={renderLeague}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  leagueName: {
    fontSize: 18,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    flex: 1,
  },
  description: {
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerText: {
    fontSize: 13,
  },
  viewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});