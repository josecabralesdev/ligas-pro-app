import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PerfilScreen() {
  const { user, profile, loading, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getErrorMessage = (error: any): string => {
    const message = error?.message || 'Error desconocido';

    if (message.includes('Invalid login credentials')) {
      return 'Email o contraseña incorrectos';
    }
    if (message.includes('Email not confirmed')) {
      return 'Debes confirmar tu email antes de iniciar sesión';
    }
    if (message.includes('User already registered')) {
      return 'Este email ya está registrado';
    }

    return message;
  };

  const validateForm = (): boolean => {
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Por favor ingresa tu email');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Por favor ingresa un email válido');
      return false;
    }

    if (!password || password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isLogin) {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setErrorMessage(getErrorMessage(error));
        }
      } else {
        const { error, needsConfirmation } = await signUp(email.trim(), password);
        if (error) {
          setErrorMessage(getErrorMessage(error));
        } else if (needsConfirmation) {
          Alert.alert('¡Cuenta creada!', 'Revisa tu email para confirmar.');
          setIsLogin(true);
          setPassword('');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // En web, ejecutar directamente sin confirmación para evitar problemas
      executeLogout();
    } else {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sí, cerrar sesión', style: 'destructive', onPress: executeLogout },
        ]
      );
    }
  };

  const executeLogout = async () => {
    console.log('Executing logout...');
    await signOut();
    console.log('Logout complete, user state should be null now');
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Cargando...</Text>
      </View>
    );
  }

  // Usuario NO logueado
  if (!user) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.authContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.authHeader}>
            <View style={[styles.logoContainer, { backgroundColor: colors.tint }]}>
              <Ionicons name="football" size={48} color="white" />
            </View>
            <Text style={[styles.authTitle, { color: colors.text }]}>Ligas Pro</Text>
            <Text style={[styles.authSubtitle, { color: colors.icon }]}>
              {isLogin ? 'Inicia sesión para continuar' : 'Crea tu cuenta gratis'}
            </Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.card }]}>
            {errorMessage && (
              <View style={[styles.errorContainer, { backgroundColor: colors.error + '15' }]}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={20} color={colors.icon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="tu@email.com"
                  placeholderTextColor={colors.icon}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isSubmitting}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Contraseña</Text>
              <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.icon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.icon}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isSubmitting}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.icon}
                  />
                </Pressable>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.authButton, { backgroundColor: colors.tint }]}
              onPress={handleAuth}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons
                    name={isLogin ? "log-in-outline" : "person-add-outline"}
                    size={20}
                    color="white"
                  />
                  <Text style={styles.authButtonText}>
                    {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.switchButton, { borderColor: colors.border }]}
              onPress={() => {
                setIsLogin(!isLogin);
                setErrorMessage(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.switchButtonText, { color: colors.tint }]}>
                {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Usuario LOGUEADO
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.profileContent}
    >
      <View style={[styles.profileHeader, { backgroundColor: colors.tint }]}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={colors.tint} />
        </View>
        <Text style={styles.profileName}>
          {profile?.full_name || profile?.username || 'Usuario'}
        </Text>
        <Text style={styles.profileEmail}>{user.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Información de la cuenta
        </Text>

        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color={colors.tint} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.icon }]}>Email</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user.email}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color={colors.tint} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.icon }]}>Miembro desde</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {new Date(user.created_at).toLocaleDateString('es-ES')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Botón de cerrar sesión */}
      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: colors.error }]}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={24} color="white" />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <Text style={[styles.versionText, { color: colors.icon }]}>
        Ligas Pro v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },

  authContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  authHeader: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  authTitle: { fontSize: 28, fontWeight: '700' },
  authSubtitle: { fontSize: 16, marginTop: 8 },
  formCard: { borderRadius: 16, padding: 24 },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  errorText: { flex: 1, fontSize: 14, fontWeight: '500' },
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
  authButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  authButtonText: { color: 'white', fontSize: 17, fontWeight: '600' },
  switchButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  switchButtonText: { fontSize: 15, fontWeight: '600' },

  profileContent: { paddingBottom: 40 },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: { fontSize: 24, fontWeight: '700', color: 'white' },
  profileEmail: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  infoCard: { borderRadius: 16, padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  infoContent: { flex: 1, marginLeft: 16 },
  infoLabel: { fontSize: 12, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '500' },
  divider: { height: 1, marginLeft: 36 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
  },
  versionText: { textAlign: 'center', fontSize: 13, marginTop: 24 },
});