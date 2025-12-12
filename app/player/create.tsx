import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function CreatePlayerScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const [name, setName] = useState('');
  const [dorsal, setDorsal] = useState('');
  const [position, setPosition] = useState('');
  const [isCaptain, setIsCaptain] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const positions = ['POR', 'DEF', 'MED', 'DEL'];

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    if (!teamId) {
      Alert.alert('Error', 'No se especificó el equipo');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('players').insert({
        team_id: teamId,
        name: name.trim(),
        dorsal: dorsal ? parseInt(dorsal) : null,
        position: position || null,
        is_captain: isCaptain,
      });

      if (error) throw error;

      Alert.alert('¡Éxito!', 'Jugador añadido', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Añadir Jugador', presentation: 'modal' }} />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.formCard, { backgroundColor: colors.card }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Nombre *</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={20} color={colors.icon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Nombre completo"
                  placeholderTextColor={colors.icon}
                  value={name}
                  onChangeText={setName}
                  maxLength={50}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Dorsal</Text>
                <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text, textAlign: 'center' }]}
                    placeholder="10"
                    placeholderTextColor={colors.icon}
                    value={dorsal}
                    onChangeText={setDorsal}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 2, marginLeft: 12 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Posición</Text>
                <View style={styles.positionRow}>
                  {positions.map(pos => (
                    <TouchableOpacity
                      key={pos}
                      style={[
                        styles.positionButton,
                        { borderColor: colors.border },
                        position === pos && { backgroundColor: colors.tint, borderColor: colors.tint }
                      ]}
                      onPress={() => setPosition(pos)}
                    >
                      <Text style={[
                        styles.positionText,
                        { color: position === pos ? 'white' : colors.text }
                      ]}>
                        {pos}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={[styles.switchRow, { borderColor: colors.border }]}>
              <View style={styles.switchInfo}>
                <Ionicons name="star" size={20} color={colors.warning} />
                <Text style={[styles.switchLabel, { color: colors.text }]}>
                  Capitán del equipo
                </Text>
              </View>
              <Switch
                value={isCaptain}
                onValueChange={setIsCaptain}
                trackColor={{ false: colors.border, true: colors.warning + '50' }}
                thumbColor={isCaptain ? colors.warning : colors.icon}
              />
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => router.back()}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton, { backgroundColor: colors.tint }]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Añadir</Text>
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
  formCard: { borderRadius: 16, padding: 20 },
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
  positionRow: { flexDirection: 'row', gap: 8 },
  positionButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: { fontSize: 13, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  switchInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { fontSize: 15, fontWeight: '500' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: { borderWidth: 1 },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  submitButton: {},
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});