import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ResultStatus = 'idle' | 'loading' | 'success' | 'error';

interface Result {
  status: ResultStatus;
  message: string;
  leagueId?: string;
}

export default function CreateLeagueScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [result, setResult] = useState<Result>({ status: 'idle', message: '' });
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, profile, refreshProfile } = useAuth();

  const ensureProfile = async (): Promise<boolean> => {
    if (!user) return false;
    if (profile) return true;

    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        await refreshProfile();
        return true;
      }

      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: user.email?.split('@')[0] || 'usuario',
          full_name: null,
          avatar_url: null,
        });

      if (createError && createError.code !== '23505') {
        return false;
      }

      await refreshProfile();
      return true;
    } catch (error) {
      console.error('Error ensuring profile:', error);
      return false;
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setResult({ status: 'error', message: 'El nombre de la liga es obligatorio' });
      return;
    }

    if (!user) {
      setResult({ status: 'error', message: 'Debes iniciar sesión para crear una liga' });
      return;
    }

    setResult({ status: 'loading', message: 'Creando liga...' });

    try {
      const profileOk = await ensureProfile();
      if (!profileOk) {
        setResult({
          status: 'error',
          message: 'No se pudo verificar tu perfil. Intenta cerrar sesión y volver a entrar.'
        });
        return;
      }

      const { data, error } = await supabase
        .from('leagues')
        .insert({
          owner_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          is_public: isPublic,
        })
        .select()
        .single();

      if (error) {
        let errorMessage = 'No se pudo crear la liga';

        if (error.code === '23505') {
          errorMessage = 'Ya existe una liga con ese nombre';
        } else if (error.code === '23503') {
          errorMessage = 'Error de referencia. Por favor, cierra sesión y vuelve a entrar.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        setResult({ status: 'error', message: errorMessage });
        return;
      }

      setResult({
        status: 'success',
        message: `¡Liga "${data.name}" creada exitosamente!`,
        leagueId: data.id
      });

    } catch (error: any) {
      setResult({ status: 'error', message: 'Ocurrió un error inesperado' });
    }
  };

  const handleResultDismiss = () => {
    if (result.status === 'success') {
      if (result.leagueId) {
        router.replace(`/league/${result.leagueId}`);
      } else {
        router.back();
      }
    } else {
      setResult({ status: 'idle', message: '' });
    }
  };

  const isLoading = result.status === 'loading';

  return (
    <>
      <Stack.Screen options={{ title: 'Crear Liga', presentation: 'modal' }} />

      {/* Modal de resultado */}
      <Modal
        visible={result.status === 'success' || result.status === 'error'}
        transparent
        animationType="fade"
        onRequestClose={handleResultDismiss}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[
              styles.modalIcon,
              { backgroundColor: result.status === 'success' ? colors.success + '20' : colors.error + '20' }
            ]}>
              <Ionicons
                name={result.status === 'success' ? 'checkmark-circle' : 'close-circle'}
                size={48}
                color={result.status === 'success' ? colors.success : colors.error}
              />
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {result.status === 'success' ? '¡Éxito!' : 'Error'}
            </Text>

            <Text style={[styles.modalMessage, { color: colors.icon }]}>
              {result.message}
            </Text>

            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: result.status === 'success' ? colors.success : colors.tint }
              ]}
              onPress={handleResultDismiss}
            >
              <Text style={styles.modalButtonText}>
                {result.status === 'success' ? 'Ver Liga' : 'Entendido'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                <Ionicons name="football" size={32} color={colors.tint} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Nueva Liga
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
                Crea tu liga de fútbol amateur
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Nombre de la liga <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Ionicons name="trophy-outline" size={20} color={colors.icon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ej: Liga Los Amigos"
                  placeholderTextColor={colors.icon}
                  value={name}
                  onChangeText={setName}
                  maxLength={50}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Descripción
              </Text>
              <View style={[styles.textAreaWrapper, { borderColor: colors.border }]}>
                <TextInput
                  style={[styles.textArea, { color: colors.text }]}
                  placeholder="Describe tu liga (horarios, reglas, etc.)"
                  placeholderTextColor={colors.icon}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={200}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isLoading}
                />
              </View>
              <Text style={[styles.charCount, { color: colors.icon }]}>
                {description.length}/200
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Ubicación
              </Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Ionicons name="location-outline" size={20} color={colors.icon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ej: Barrio San Miguel"
                  placeholderTextColor={colors.icon}
                  value={location}
                  onChangeText={setLocation}
                  maxLength={100}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={[styles.switchRow, { borderColor: colors.border }]}>
              <View style={styles.switchInfo}>
                <Ionicons
                  name={isPublic ? "globe-outline" : "lock-closed-outline"}
                  size={22}
                  color={colors.tint}
                />
                <View style={styles.switchText}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>
                    Liga pública
                  </Text>
                  <Text style={[styles.switchHint, { color: colors.icon }]}>
                    {isPublic ? 'Visible para todos' : 'Solo visible para ti'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                disabled={isLoading}
                trackColor={{ false: colors.border, true: colors.tint + '50' }}
                thumbColor={isPublic ? colors.tint : colors.icon}
              />
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                { backgroundColor: isLoading ? colors.icon : colors.tint }
              ]}
              onPress={handleCreate}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.submitButtonText}>Creando...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text style={styles.submitButtonText}>Crear Liga</Text>
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
  formCard: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
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
  textAreaWrapper: { borderWidth: 1, borderRadius: 12, padding: 14 },
  textArea: { fontSize: 16, minHeight: 80 },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 4 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  switchInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  switchText: { flex: 1 },
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});