import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { LOGIN_PIN } from '../services/authService';
import { isApiConfigured } from '../lib/api';
import { COLORS, RADIUS } from '../constants/theme';

const sanitizePin = (value: string) => value.replace(/[^0-9]/g, '').slice(0, 6);

export const LoginScreen: React.FC = () => {
  const login = useAuthStore((s) => s.login);
  const isLoggingIn = useAuthStore((s) => s.isLoggingIn);
  const authError = useAuthStore((s) => s.authError);

  const [restaurantCode, setRestaurantCode] = React.useState('');
  const [pin, setPin] = React.useState('');

  const handleLogin = async () => {
    if (!restaurantCode.trim()) {
      Alert.alert('Kode restoran belum valid', 'Masukkan kode restoran terlebih dahulu.');
      return;
    }

    if (pin.length !== 6) {
      Alert.alert('PIN belum valid', 'PIN harus terdiri dari 6 digit angka.');
      return;
    }

    const result = await login(restaurantCode, pin);
    if (!result.ok) {
      Alert.alert('Login gagal', result.error ?? 'Cek PIN lalu coba lagi.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryPurple} />

      <View style={styles.topDecor} />

      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>RP</Text>
          </View>
          <Text style={styles.brandName}>RestoPos</Text>
          <Text style={styles.brandTagline}>PIN Login</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Kode Restoran</Text>
          <TextInput
            style={styles.input}
            value={restaurantCode}
            onChangeText={setRestaurantCode}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="resto-a"
            placeholderTextColor={COLORS.textLight}
          />
          <Text style={styles.label}>PIN (6 digit)</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={(value) => setPin(sanitizePin(value))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder={isApiConfigured ? '******' : LOGIN_PIN}
            placeholderTextColor={COLORS.textLight}
          />
          <Text style={styles.pinHint}>
            {isApiConfigured
              ? 'Login memakai format kode restoran + PIN lewat backend Express.'
              : `Mode lokal aktif. Gunakan kode restoran bebas dan PIN ${LOGIN_PIN}`}
          </Text>
        </View>

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <TouchableOpacity
          style={[styles.loginButton, isLoggingIn && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoggingIn}
          activeOpacity={0.8}
        >
          {isLoggingIn ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.loginButtonText}>Login via PIN</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hintText}>
          {isApiConfigured
            ? 'Contoh kode restoran dari seed: resto-a atau resto-b.'
            : 'Login lokal dipakai hanya sebagai fallback saat backend tidak aktif.'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryPurple,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  topDecor: {
    position: 'absolute',
    top: -70,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    padding: 28,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.lightPurple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primaryPurple,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primaryPurple,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textGray,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textGray,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    color: COLORS.textDark,
    fontSize: 14,
    backgroundColor: COLORS.background,
  },
  pinHint: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  loginButton: {
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryPurple,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '600',
  },
});
