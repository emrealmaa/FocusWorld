import 'react-native-reanimated';
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { CoopSessionProvider } from './src/context/CoopSessionContext';
import AppNavigator from './src/navigation/AppNavigator';
import { configureAudio } from './src/services/soundService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  useEffect(() => { configureAudio(); }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <CoopSessionProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </CoopSessionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
