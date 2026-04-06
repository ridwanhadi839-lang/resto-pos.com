import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { View, Text, StyleSheet } from 'react-native';
import { useOrderStore } from '../store/orderStore';
import { COLORS } from '../constants/theme';

export const AppNavigator: React.FC = () => {
  const currentUser = useAuthStore((s) => s.currentUser);
  const initAuth = useAuthStore((s) => s.initAuth);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const initializeOrders = useOrderStore((s) => s.initializeOrders);

  React.useEffect(() => {
    initAuth();
  }, [initAuth]);

  React.useEffect(() => {
    if (currentUser) {
      initializeOrders();
    }
  }, [currentUser, initializeOrders]);

  if (isBootstrapping) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading RestoPOS...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {currentUser ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryPurple,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
});
