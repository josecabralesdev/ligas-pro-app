import { ResultModal } from '@/components/ResultModal';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
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

type ResultType = { show: boolean; type: 'success' | 'error'; title: string; message: string; teamId?: string };

export default function CreateTeamScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultType>({ show: false, type: 'success', title: '', message: '' });
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const handleCreate = async () => {
    if (!name.trim()) {
      setResult({ show: true, type: 'error', title: 'Error', message: 'El nombre del equipo es obligatorio' });
      return;
    }

    if (!user) {
      setResult({ show: true, type: 'error', title: 'Error', message: 'Debes iniciar sesión' });
      return;
    }

    if (!leagueId) {
      setResult({ show: true, type: 'error', title: 'Error', message: 'No se especificó la liga' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from('teams').insert({
        league_id: leagueId,
        created_by: user.id,
        name: name.trim(),
        short_name: shortName.trim().toUpperCase() || null,
        contact_name: contactName.trim() || null,
        contact_phone: contactPhone.trim() || null,
      }).select().single();

      if (error) throw error;

      setResult({
        show: true,
        type: 'success',
        title: '¡Equipo Creado!',
        message: `El equipo "${data.name}" ha sido registrado exitosamente.`,
        teamId: data.id,
      });
    } catch (error: any) {
      setResult({
        show: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo crear el equipo',
      });
    } finally {
      setLoading(false);
    }
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
      <Stack.Screen options={{ title: 'Crear Equipo', presentation: 'modal' }} />

      <ResultModal
        visible={result.show}
        type={result.type}
        title={result.title}
        message={result.message}
        buttonText={result.type === 'success' ? 'Volver a la Liga' : 'Entendido'}
        onDismiss={handleResultDismiss}
      />

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
              <View style={[styles.iconCircle, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="shield" size={32} color={colors.success} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Nuevo Equipo
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Nombre del equipo <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Ionicons name="shield-outline" size={20} color={colors.icon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ej: Atlético San Miguel"
                  placeholderTextColor={colors.icon}
                  value={name}
                  onChangeText={setName}
                  maxLength={50}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Abreviatura</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Ionicons name="text-outline" size={20} color={colors.icon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ej: ASM (máx 5)"
                  placeholderTextColor={colors.icon}
                  value={shortName}
                  onChangeText={setShortName}
                  maxLength={5}
                  autoCapitalize="characters"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Contacto (opcional)
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Delegado / Capitán</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={20} color={colors.icon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Nombre del responsable"
                  placeholderTextColor={colors.icon}
                  value={contactName}
                  onChangeText={setContactName}
                  maxLength={50}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Teléfono</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Ionicons name="call-outline" size={20} color={colors.icon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ej: +54 11 1234-5678"
                  placeholderTextColor={colors.icon}
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  keyboardType="phone-pad"
                  maxLength={20}
                  editable={!loading}
                />
              </View>
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
                  <Text style={styles.submitButtonText}>Crear Equipo</Text>
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
  separator: { height: 1, marginVertical: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
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