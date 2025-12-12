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

export default function MisLigasScreen() {
  const [myLeagues, setMyLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const fetchMyLeagues = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyLeagues(data || []);
    } catch (error) {
      console.error('Error fetching my leagues:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyLeagues();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyLeagues();
  };

  // Si no está logueado
  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={64} color={colors.icon} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Inicia sesión
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
          Para ver y gestionar tus ligas
        </Text>
        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/perfil')}
        >
          <Ionicons name="log-in-outline" size={20} color="white" />
          <Text style={styles.loginButtonText}>Ir a Perfil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const renderLeague = ({ item }: { item: League }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/league/${item.id}`)}
    >
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
          <Ionicons name="football" size={24} color={colors.tint} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.leagueName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.location && (
            <Text style={[styles.location, { color: colors.icon }]} numberOfLines={1}>
              📍 {item.location}
            </Text>
          )}
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.is_public ? colors.success + '20' : colors.warning + '20' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.is_public ? colors.success : colors.warning }
          ]}>
            {item.is_public ? 'Pública' : 'Privada'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => router.push('/league/create')}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {myLeagues.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={64} color={colors.icon} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No tienes ligas
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.icon }]}>
            Crea tu primera liga de fútbol amateur
          </Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/league/create')}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.createButtonText}>Crear Liga</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={myLeagues}
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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  listContainer: { padding: 16, paddingBottom: 100 },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1, marginLeft: 14 },
  leagueName: { fontSize: 16, fontWeight: '600' },
  location: { fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
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
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', marginTop: 8 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  createButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  loginButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});