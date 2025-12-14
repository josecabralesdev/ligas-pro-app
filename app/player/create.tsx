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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ResultType = { show: boolean; type: 'success' | 'error'; title: string; message: string };

const POSITIONS = [
  { id: 'POR', name: 'Portero', color: '#FF9800' },
  { id: 'DEF', name: 'Defensa', color: '#2196F3' },
  { id: 'MED', name: 'Mediocampista', color: '#4CAF50' },
  { id: 'DEL', name: 'Delantero', color: '#F44336' },
];

export default function CreatePlayerScreen() {
  const { teamId, teamName } = useLocalSearchParams<{ teamId: string; teamName?: string }>();
  const [name, setName] = useState('');
  const [dorsal, setDorsal] = useState('');
  const [position, setPosition] = useState('');
  const [isCaptain, setIsCaptain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultType>({ show: false, type: 'success', title: '', message: '' });
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleCreate = async () => {
    if (!name.trim()) {
      setResult({ show: true, type: 'error', title: 'Error', message: 'El nombre del jugador es obligatorio' });
      return;
    }

    if (!teamId) {
      setResult({ show: true, type: 'error', title: 'Error', message: 'No se especificó el equipo' });
      return;
    }

    // Validar dorsal
    const dorsalNum = dorsal ? parseInt(dorsal) : null;
    if (dorsal && (isNaN(dorsalNum!) || dorsalNum! < 1 || dorsalNum! > 99)) {
      setResult({ show: true, type: 'error', title: 'Error', message: 'El dorsal debe ser un número entre 1 y 99' });
      return;
    }

    setLoading(true);
    try {
      // Si es capitán, quitar capitanía de otros jugadores del equipo
      if (isCaptain) {
        await supabase
          .from('players')
          .update({ is_captain: false })
          .eq('team_id', teamId)
          .eq('is_captain', true);
      }

      const { data, error } = await supabase.from('players').insert({
        team_id: teamId,
        name: name.trim(),
        dorsal: dorsalNum,
        position: position || null,
        is_captain: isCaptain,
      }).select().single();

      if (error) throw error;

      setResult({
        show: true,
        type: 'success',
        title: '¡Jugador Añadido!',
        message: `${data.name} ha sido registrado en el equipo.`,
      });
    } catch (error: any) {
      let errorMessage = 'No se pudo añadir el jugador';
      if (error.code === '23505') {
        errorMessage = 'Ya existe un jugador con ese dorsal en el equipo';
      }
      setResult({ show: true, type: 'error', title: 'Error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnother = () => {
    setResult({ show: false, type: 'success', title: '', message: '' });
    setName('');
    setDorsal('');
    setPosition('');
    setIsCaptain(false);
  };

  const handleResultDismiss = () => {
    if (result.type === 'success') {
      router.back();
    } else {
      setResult({ ...result, show: false });
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Añadir Jugador',
          presentation: 'modal',
          headerRight: () => teamName ? (
            <Text style={{ color: colors.icon, fontSize: 14 }}>{teamName}</Text>
          ) : null,
        }}
      />

      <ResultModal
        visible={result.show && result.type === 'error'}
        type="error"
        title={result.title}
        message={result.message}
        onDismiss={() => setResult({ ...result, show: false })}
      />

      {/* Modal de éxito con opción de añadir otro */}
      {result.show && result.type === 'success' && (
        <View style={styles.successOverlay}>
          <View style={[styles.successModal, { backgroundColor: colors.card }]}>
            <View style={[styles.successIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>{result.title}</Text>
            <Text style={[styles.successMessage, { color: colors.icon }]}>{result.message}</Text>

            <View style={styles.successButtons}>
              <TouchableOpacity
                style={[styles.successButton, { borderColor: colors.border }]}
                onPress={handleAddAnother}
              >
                <Ionicons name="add" size={20} color={colors.tint} />
                <Text style={[styles.successButtonText, { color: colors.tint }]}>Añadir otro</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.successButton, styles.successButtonPrimary, { backgroundColor: colors.success }]}
                onPress={handleResultDismiss}
              >
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={[styles.successButtonText, { color: 'white' }]}>Listo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.formCard, { backgroundColor: colors.card }]}>
            <View style={styles.headerIcon}>
              <View style={[styles.iconCircle, { backgroundColor: colors.tint + '20' }]}>
                <Ionicons name="person-add" size={32} color={colors.tint} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Nuevo Jugador</Text>
              {teamName && (
                <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
                  Para: {teamName}
                </Text>
              )}
            </View>

            {/* Nombre */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Nombre completo <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={20} color={colors.icon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ej: Juan Pérez"
                  placeholderTextColor={colors.icon}
                  value={name}
                  onChangeText={setName}
                  maxLength={50}
                  editable={!loading}
                  autoFocus
                />
              </View>
            </View>

            {/* Dorsal */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Número de camiseta</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border, width: 120 }]}>
                <Ionicons name="shirt-outline" size={20} color={colors.icon} />
                <TextInput
                  style={[styles.input, { color: colors.text, textAlign: 'center' }]}
                  placeholder="10"
                  placeholderTextColor={colors.icon}
                  value={dorsal}
                  onChangeText={(text) => setDorsal(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Posición */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Posición</Text>
              <View style={styles.positionsGrid}>
                {POSITIONS.map((pos) => (
                  <TouchableOpacity
                    key={pos.id}
                    style={[
                      styles.positionButton,
                      { borderColor: position === pos.id ? pos.color : colors.border },
                      position === pos.id && { backgroundColor: pos.color + '20' }
                    ]}
                    onPress={() => setPosition(position === pos.id ? '' : pos.id)}
                    disabled={loading}
                  >
                    <View style={[styles.positionDot, { backgroundColor: pos.color }]} />
                    <Text style={[
                      styles.positionText,
                      { color: position === pos.id ? pos.color : colors.text }
                    ]}>
                      {pos.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Capitán */}
            <View style={[styles.switchRow, { borderColor: colors.border }]}>
              <View style={styles.switchInfo}>
                <View style={[styles.captainBadge, { backgroundColor: colors.warning }]}>
                  <Text style={styles.captainBadgeText}>C</Text>
                </View>
                <View>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Capitán del equipo</Text>
                  <Text style={[styles.switchHint, { color: colors.icon }]}>
                    Solo puede haber un capitán
                  </Text>
                </View>
              </View>
              <Switch
                value={isCaptain}
                onValueChange={setIsCaptain}
                disabled={loading}
                trackColor={{ false: colors.border, true: colors.warning + '50' }}
                thumbColor={isCaptain ? colors.warning : colors.icon}
              />
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
              style={[styles.button, styles.submitButton, { backgroundColor: loading ? colors.icon : colors.tint }]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.submitButtonText}>Añadiendo...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="person-add" size={20} color="white" />
                  <Text style={styles.submitButtonText}>Añadir Jugador</Text>
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
  headerSubtitle: { fontSize: 14, marginTop: 4 },
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
  positionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  positionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 8,
  },
  positionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  positionText: { fontSize: 14, fontWeight: '500' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  switchInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  captainBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captainBadgeText: { color: 'white', fontSize: 14, fontWeight: '700' },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  switchHint: { fontSize: 12, marginTop: 2 },
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

  // Success modal
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  successModal: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  successMessage: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  successButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  successButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  successButtonPrimary: { borderWidth: 0 },
  successButtonText: { fontSize: 15, fontWeight: '600' },
});