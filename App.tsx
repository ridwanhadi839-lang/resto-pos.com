import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initializeOfflineQueueStorage } from './src/services/offlineQueue';

export default function App() {
  React.useEffect(() => {
    void initializeOfflineQueueStorage();
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
