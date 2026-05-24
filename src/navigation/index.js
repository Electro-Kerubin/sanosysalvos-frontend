import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IndexScreen from '../screens/IndexScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import PublishReportScreen from '../screens/PublishReportScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LogoutScreen from '../screens/LogoutScreen';

const Stack = createStackNavigator();

// Lee el token síncronamente en web (localStorage es síncrono).
// Evita el parpadeo de pantalla en blanco que ocurre con AsyncStorage async.
function getInitialRouteSynchronous() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('token') ? 'Dashboard' : 'Index';
    }
  } catch (_) { /* Safari privado puede lanzar error */ }
  return null; // null = necesita check asíncrono (nativo)
}

export default function AppNavigation() {
  const [initialRoute, setInitialRoute] = useState(() => getInitialRouteSynchronous());

  useEffect(() => {
    if (initialRoute !== null) return; // ya resuelto síncronamente en web
    AsyncStorage.getItem('token')
      .then(token => setInitialRoute(token ? 'Dashboard' : 'Index'))
      .catch(() => setInitialRoute('Index'));
  }, []);

  if (!initialRoute) return null; // nativo: espera un tick, no hay flash en web

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Index" component={IndexScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="PublishReport" component={PublishReportScreen} />
        <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
        <Stack.Screen name="Notifications" component={NotificationScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Logout" component={LogoutScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
