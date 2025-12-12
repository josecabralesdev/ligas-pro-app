import { ResultModal } from '@/components/ResultModal';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ResultType = { show: boolean; type: 'success' | 'error'; title: string; message: string; tournamentId?: string };

export default function CreateTournamentScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultType>({ show: false, type: 'success', title: '', message: '' });
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleCreate = async () => {
    if (!name.trim()) {
      setResult({ show: true, type: 'error', title: 'Error', message: 'El nombre del torneo es obligatorio' });
      return;
    }

    if (!leagueId) {
      setResult({ show: true, type: 'error', title: 'Error', message: 'No se especificó la liga' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from('tournaments').insert({
        league_id: leagueId,
        name: name.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
        is_active: true,
      }).select().single();

      if (error) throw error;

      setResult({
        show: true,
        type: 'success',
        title: '¡Torneo Creado!',
        message: `El torneo "${data.name}" está listo para comenzar.`,
        tournamentId: data.id,
      });
    } catch (error: any) {
      setResult({
        show: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo crear el torneo',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResultDismiss = () => {
    if (result.type === 'success' && result.tournamentId) {
      router.replace(`/tournament/${result.tournamentId}`);
    } else if (result.type === 'success') {
      router.back();
    } else {
      setResult({ ...result, show: false });
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Crear Torneo', presentation: 'modal' }} />

      <ResultModal
        visible={result.show}
        type={result.type}
        title={result.title}
        message={result.message}
        buttonText={result.type === 'success' ? 'Ver Torneo' : 'Entendido'}
        onDismiss={handleResultDismiss}
      />

      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.formCard, { backgroundColor: colors.card }]}>
            <View style={styles.headerIcon}>
              <View style={[styles.iconCircle, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="trophy" size={32} color={colors.warning} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Nuevo Torneo</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Nombre <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Ionicons name="trophy-outline" size={20} color={colors.icon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ej: Apertura 2024"
                  placeholderTextColor={colors.icon}
                  value={name}
                  onChangeText={setName}
                  maxLength={50}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Fecha inicio</Text>
                <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                  <Ionicons name="calendar-outline" size={20} color={colors.icon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.icon}
                    value={startDate}
                    onChangeText={setStartDate}
                    maxLength={10}
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Fecha fin</Text>
                <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                  <Ionicons name="calendar-outline" size={20} color={colors.icon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.icon}
                    value={endDate}
                    onChangeText={setEndDate}
                    maxLength={10}
                    editable={!loading}
                  />
                </View>
              </View>
            </View>

            <View style={[styles.infoBox, { backgroundColor: colors.tint + '10' }]}>
              <Ionicons name="information-circle" size={20} color={colors.tint} />
              <Text style={[styles.infoText, { color: colors.tint }]}>
                Podrás agregar equipos y partidos después de crear el torneo.
              </Text>
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton, { backgroundColor: loading ? colors.icon : colors.tint }]}
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
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text style={styles.submitButtonText}>Crear Torneo</Text>
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
  scrollContent: { padding: 20 },
  formCard: { borderRadius: 16, padding: 24 },
  headerIcon: { alignItems: 'center', marginBottom: 24 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  input: { flex: 1, fontSize: 16 },
  row: { flexDirection: 'row' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cancelButton: { borderWidth: 1 },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  submitButton: {},
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});