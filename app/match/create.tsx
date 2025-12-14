import { ResultModal } from '@/components/ResultModal';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase, Team } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ResultType = { show: boolean; type: 'success' | 'error'; title: string; message: string };

export default function CreateMatchScreen() {
  const { tournamentId, leagueId } = useLocalSearchParams<{ tournamentId: string; leagueId: string }>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [location, setLocation] = useState('');
  const [roundNumber, setRoundNumber] = useState('1');
  const [showTeamPicker, setShowTeamPicker] = useState<'home' | 'away' | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [result, setResult] = useState<ResultType>({ show: false, type: 'success', title: '', message: '' });
  const [nextRound, setNextRound] = useState(1);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    fetchTeams();
    fetchNextRound();
  }, [leagueId, tournamentId]);

  const fetchTeams = async () => {
    if (!leagueId) {
      setLoadingTeams(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('league_id', leagueId)
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchNextRound = async () => {
    if (!tournamentId) return;

    try {
      const { data } = await supabase
        .from('matches')
        .select('round_number')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].round_number) {
        const lastRound = data[0].round_number;
        setNextRound(lastRound);
        setRoundNumber(lastRound.toString());
      }
    } catch (error) {
      console.error('Error fetching next round:', error);
    }
  };

  const validateDate = (dateStr: string): boolean => {
    if (!dateStr) return true; // Fecha opcional
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };

  const validateTime = (timeStr: string): boolean => {
    if (!timeStr) return true; // Hora opcional
    const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return regex.test(timeStr);
  };

  const handleCreate = async () => {
    // Validaciones
    if (!homeTeam) {
      setResult({ show: true, type: 'error', title: 'Error', message: 'Selecciona el equipo local' });
      return;
    }

    if (!awayTeam) {
      setResult({ show: true, type: 'error', title: 'Error', message: 'Selecciona el equipo visitante' });
      return;
    }

    if (homeTeam.id === awayTeam.id) {
      setResult({ show: true, type: 'error', title: 'Error', message: 'Los equipos deben ser diferentes' });
      return;
    }

    if (!tournamentId) {
      setResult({ show: true, type: 'error', title: 'Error', message: 'No se especificó el torneo' });
      return;
    }

    if (matchDate && !validateDate(matchDate)) {
      setResult({ show: true, type: 'error', title: 'Error', message: 'Formato de fecha inválido. Usa YYYY-MM-DD (ej: 2024-03-15)' });
      return;
    }

    if (matchTime && !validateTime(matchTime)) {
      setResult({ show: true, type: 'error', title: 'Error', message: 'Formato de hora inválido. Usa HH:MM (ej: 15:30)' });
      return;
    }

    // Construir fecha y hora
    let startTime: string | null = null;
    if (matchDate) {
      try {
        const timeStr = matchTime || '00:00';
        startTime = new Date(`${matchDate}T${timeStr}:00`).toISOString();
      } catch {
        setResult({ show: true, type: 'error', title: 'Error', message: 'Error al procesar la fecha' });
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('matches').insert({
        tournament_id: tournamentId,
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        start_time: startTime,
        location: location.trim() || null,
        round_number: roundNumber ? parseInt(roundNumber) : 1,
        status: 'programado', // Estado inicial: programado
        home_score: 0,
        away_score: 0,
      });

      if (error) throw error;

      setResult({
        show: true,
        type: 'success',
        title: '¡Partido Programado!',
        message: `${homeTeam.name} vs ${awayTeam.name}\nJornada ${roundNumber || 1}`,
      });
    } catch (error: any) {
      console.error('Error creating match:', error);
      setResult({
        show: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo crear el partido',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnother = () => {
    setResult({ show: false, type: 'success', title: '', message: '' });
    setHomeTeam(null);
    setAwayTeam(null);
    setMatchDate('');
    setMatchTime('');
    setLocation('');
    // Mantener la jornada para añadir más partidos de la misma
  };

  const handleResultDismiss = () => {
    if (result.type === 'success') {
      router.back();
    } else {
      setResult({ ...result, show: false });
    }
  };

  const getTeamInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  const getRandomColor = (id: string) => {
    const teamColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F8B500', '#6C5CE7', '#A8E6CF'];
    const index = id.charCodeAt(0) % teamColors.length;
    return teamColors[index];
  };

  const TeamPickerModal = () => (
    <Modal
      visible={showTeamPicker !== null}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTeamPicker(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Equipo {showTeamPicker === 'home' ? 'Local' : 'Visitante'}
            </Text>
            <TouchableOpacity
              onPress={() => setShowTeamPicker(null)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          {teams.length === 0 ? (
            <View style={styles.emptyTeams}>
              <Ionicons name="people-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No hay equipos
              </Text>
              <Text style={[styles.emptyHint, { color: colors.icon }]}>
                Primero debes crear equipos en la liga
              </Text>
            </View>
          ) : (
            <FlatList
              data={teams}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = (showTeamPicker === 'home' && homeTeam?.id === item.id) ||
                  (showTeamPicker === 'away' && awayTeam?.id === item.id);
                const isDisabled = (showTeamPicker === 'home' && awayTeam?.id === item.id) ||
                  (showTeamPicker === 'away' && homeTeam?.id === item.id);

                return (
                  <TouchableOpacity
                    style={[
                      styles.teamOption,
                      { backgroundColor: colors.background },
                      isSelected && { backgroundColor: colors.tint + '15', borderColor: colors.tint, borderWidth: 2 },
                      isDisabled && { opacity: 0.4 }
                    ]}
                    onPress={() => {
                      if (!isDisabled) {
                        if (showTeamPicker === 'home') {
                          setHomeTeam(item);
                        } else {
                          setAwayTeam(item);
                        }
                        setShowTeamPicker(null);
                      }
                    }}
                    disabled={isDisabled}
                  >
                    <View style={[styles.teamBadge, { backgroundColor: getRandomColor(item.id) }]}>
                      <Text style={styles.teamBadgeText}>{getTeamInitials(item.name)}</Text>
                    </View>
                    <View style={styles.teamOptionInfo}>
                      <Text style={[styles.teamOptionName, { color: colors.text }]}>
                        {item.name}
                      </Text>
                      {item.short_name && (
                        <Text style={[styles.teamOptionShort, { color: colors.icon }]}>
                          {item.short_name}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
                    )}
                    {isDisabled && (
                      <View style={[styles.disabledBadge, { backgroundColor: colors.warning + '20' }]}>
                        <Text style={[styles.disabledText, { color: colors.warning }]}>
                          Ya seleccionado
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.teamsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  // Modal de éxito con opción de añadir otro
  const SuccessModal = () => (
    <Modal
      visible={result.show && result.type === 'success'}
      transparent
      animationType="fade"
    >
      <View style={styles.successOverlay}>
        <View style={[styles.successModal, { backgroundColor: colors.card }]}>
          <View style={[styles.successIcon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>{result.title}</Text>
          <Text style={[styles.successMessage, { color: colors.icon }]}>{result.message}</Text>

          <View style={styles.successButtons}>
            <TouchableOpacity
              style={[styles.successButton, { borderColor: colors.border, borderWidth: 1 }]}
              onPress={handleAddAnother}
            >
              <Ionicons name="add" size={20} color={colors.tint} />
              <Text style={[styles.successButtonText, { color: colors.tint }]}>Añadir otro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.successButton, { backgroundColor: colors.success }]}
              onPress={handleResultDismiss}
            >
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={[styles.successButtonText, { color: 'white' }]}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loadingTeams) {
    return (
      <>
        <Stack.Screen options={{ title: 'Crear Partido', presentation: 'modal' }} />
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Cargando equipos...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Crear Partido', presentation: 'modal' }} />

      <ResultModal
        visible={result.show && result.type === 'error'}
        type="error"
        title={result.title}
        message={result.message}
        onDismiss={() => setResult({ ...result, show: false })}
      />

      <SuccessModal />
      <TeamPickerModal />

      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.formCard, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.headerIcon}>
              <View style={[styles.iconCircle, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="football" size={32} color={colors.success} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Nuevo Partido</Text>
              <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
                Programa un partido del torneo
              </Text>
            </View>

            {/* Jornada */}
            <View style={styles.roundSection}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Jornada</Text>
              <View style={styles.roundButtons}>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.roundButton,
                      { borderColor: colors.border },
                      roundNumber === num.toString() && {
                        backgroundColor: colors.tint,
                        borderColor: colors.tint
                      }
                    ]}
                    onPress={() => setRoundNumber(num.toString())}
                    disabled={loading}
                  >
                    <Text style={[
                      styles.roundButtonText,
                      { color: roundNumber === num.toString() ? 'white' : colors.text }
                    ]}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={[styles.roundInputWrapper, { borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.roundInput, { color: colors.text }]}
                    placeholder="+"
                    placeholderTextColor={colors.icon}
                    value={parseInt(roundNumber) > 6 ? roundNumber : ''}
                    onChangeText={(text) => {
                      const num = text.replace(/[^0-9]/g, '');
                      if (num) setRoundNumber(num);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    editable={!loading}
                  />
                </View>
              </View>
            </View>

            {/* Equipos */}
            <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 20 }]}>
              Equipos <Text style={{ color: colors.error }}>*</Text>
            </Text>

            <View style={styles.teamsContainer}>
              {/* Equipo Local */}
              <TouchableOpacity
                style={[
                  styles.teamSelector,
                  {
                    borderColor: homeTeam ? colors.success : colors.border,
                    backgroundColor: homeTeam ? colors.success + '08' : 'transparent'
                  }
                ]}
                onPress={() => setShowTeamPicker('home')}
                disabled={loading}
              >
                {homeTeam ? (
                  <>
                    <View style={[styles.teamBadgeLarge, { backgroundColor: getRandomColor(homeTeam.id) }]}>
                      <Text style={styles.teamBadgeLargeText}>{getTeamInitials(homeTeam.name)}</Text>
                    </View>
                    <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={2}>
                      {homeTeam.name}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={[styles.teamBadgeLarge, { backgroundColor: colors.border }]}>
                      <Ionicons name="add" size={28} color={colors.icon} />
                    </View>
                    <Text style={[styles.teamPlaceholder, { color: colors.icon }]}>Seleccionar</Text>
                  </>
                )}
                <View style={[styles.teamLabelBadge, { backgroundColor: colors.tint }]}>
                  <Text style={styles.teamLabelText}>LOCAL</Text>
                </View>
              </TouchableOpacity>

              {/* VS */}
              <View style={styles.vsContainer}>
                <View style={[styles.vsBadge, { backgroundColor: colors.border }]}>
                  <Text style={[styles.vsText, { color: colors.text }]}>VS</Text>
                </View>
              </View>

              {/* Equipo Visitante */}
              <TouchableOpacity
                style={[
                  styles.teamSelector,
                  {
                    borderColor: awayTeam ? colors.success : colors.border,
                    backgroundColor: awayTeam ? colors.success + '08' : 'transparent'
                  }
                ]}
                onPress={() => setShowTeamPicker('away')}
                disabled={loading}
              >
                {awayTeam ? (
                  <>
                    <View style={[styles.teamBadgeLarge, { backgroundColor: getRandomColor(awayTeam.id) }]}>
                      <Text style={styles.teamBadgeLargeText}>{getTeamInitials(awayTeam.name)}</Text>
                    </View>
                    <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={2}>
                      {awayTeam.name}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={[styles.teamBadgeLarge, { backgroundColor: colors.border }]}>
                      <Ionicons name="add" size={28} color={colors.icon} />
                    </View>
                    <Text style={[styles.teamPlaceholder, { color: colors.icon }]}>Seleccionar</Text>
                  </>
                )}
                <View style={[styles.teamLabelBadge, { backgroundColor: colors.icon }]}>
                  <Text style={styles.teamLabelText}>VISITANTE</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Fecha y Hora */}
            <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 24 }]}>
              Fecha y Hora <Text style={[styles.optionalText, { color: colors.icon }]}>(opcional)</Text>
            </Text>

            <View style={styles.dateTimeRow}>
              <View style={[styles.inputGroup, { flex: 1.2 }]}>
                <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                  <Ionicons name="calendar-outline" size={18} color={colors.tint} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="2024-03-15"
                    placeholderTextColor={colors.icon}
                    value={matchDate}
                    onChangeText={setMatchDate}
                    maxLength={10}
                    editable={!loading}
                  />
                </View>
                <Text style={[styles.inputHint, { color: colors.icon }]}>YYYY-MM-DD</Text>
              </View>

              <View style={[styles.inputGroup, { flex: 0.8, marginLeft: 12 }]}>
                <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                  <Ionicons name="time-outline" size={18} color={colors.tint} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="15:30"
                    placeholderTextColor={colors.icon}
                    value={matchTime}
                    onChangeText={setMatchTime}
                    maxLength={5}
                    editable={!loading}
                  />
                </View>
                <Text style={[styles.inputHint, { color: colors.icon }]}>HH:MM</Text>
              </View>
            </View>

            {/* Lugar */}
            <View style={[styles.inputGroup, { marginTop: 16 }]}>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Ionicons name="location-outline" size={18} color={colors.tint} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Cancha Principal, Cancha 2..."
                  placeholderTextColor={colors.icon}
                  value={location}
                  onChangeText={setLocation}
                  maxLength={50}
                  editable={!loading}
                />
              </View>
            </View>
          </View>

          {/* Botones */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                { backgroundColor: loading ? colors.icon : colors.tint }
              ]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.submitButtonText}>Creando...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="calendar-outline" size={20} color="white" />
                  <Text style={styles.submitButtonText}>Programar Partido</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  formCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerIcon: { alignItems: 'center', marginBottom: 24 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  optionalText: { fontSize: 13, fontWeight: '400' },

  // Round selection
  roundSection: { marginBottom: 8 },
  roundButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundButtonText: { fontSize: 16, fontWeight: '600' },
  roundInputWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundInput: { fontSize: 16, fontWeight: '600', textAlign: 'center', width: '100%' },

  // Teams
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamSelector: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    minHeight: 150,
    justifyContent: 'center',
  },
  teamBadgeLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  teamBadgeLargeText: { color: 'white', fontSize: 22, fontWeight: '700' },
  teamName: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  teamPlaceholder: { fontSize: 14, marginBottom: 8 },
  teamLabelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  teamLabelText: { color: 'white', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  vsContainer: { paddingHorizontal: 8 },
  vsBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: { fontSize: 14, fontWeight: '700' },

  // Inputs
  dateTimeRow: { flexDirection: 'row' },
  inputGroup: {},
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15 },
  inputHint: { fontSize: 11, marginTop: 4, marginLeft: 4 },

  // Buttons
  buttons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  button: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cancelButton: { borderWidth: 1 },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  submitButton: {},
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalCloseButton: { padding: 4 },
  teamsList: { padding: 16 },
  teamOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  teamBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamBadgeText: { color: 'white', fontSize: 18, fontWeight: '700' },
  teamOptionInfo: { flex: 1, marginLeft: 14 },
  teamOptionName: { fontSize: 16, fontWeight: '600' },
  teamOptionShort: { fontSize: 13, marginTop: 2 },
  disabledBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  disabledText: { fontSize: 11, fontWeight: '600' },
  emptyTeams: { alignItems: 'center', padding: 48 },
  emptyText: { marginTop: 16, fontSize: 17, fontWeight: '600' },
  emptyHint: { marginTop: 6, fontSize: 14, textAlign: 'center' },

  // Success modal
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  successMessage: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  successButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  successButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  successButtonText: { fontSize: 15, fontWeight: '600' },
});