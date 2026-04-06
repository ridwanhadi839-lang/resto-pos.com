import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
} from 'react-native';
import { COLORS } from '../constants/theme';

interface PinKeypadProps {
  onSuccess: () => void;
  onLogin: (pin: string) => boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export const PinKeypad: React.FC<PinKeypadProps> = ({ onSuccess, onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    setError(true);
    Vibration.vibrate(200);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start(() => {
      setPin('');
      setError(false);
    });
  };

  const handleKey = (key: string) => {
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (key === '') return;
    const newPin = pin + key;
    if (newPin.length <= 4) {
      setPin(newPin);
      if (newPin.length === 4) {
        const ok = onLogin(newPin);
        if (ok) {
          onSuccess();
        } else {
          shake();
        }
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* PIN Dots */}
      <Animated.View
        style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
      >
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length && styles.dotFilled,
              error && styles.dotError,
            ]}
          />
        ))}
      </Animated.View>
      {error && <Text style={styles.errorText}>Wrong PIN. Try again.</Text>}

      {/* Keypad Grid */}
      <View style={styles.keypad}>
        {KEYS.map((key, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.key, key === '' && styles.keyEmpty]}
            onPress={() => handleKey(key)}
            activeOpacity={0.7}
            disabled={key === ''}
          >
            <Text style={styles.keyText}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.primaryPurple,
  },
  dotError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '500',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 240,
    gap: 12,
    justifyContent: 'center',
  },
  key: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  keyEmpty: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  keyText: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textDark,
  },
});
