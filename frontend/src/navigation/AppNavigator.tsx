import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {authService} from '../services/authService';
import {UserRole} from '../types';

// Auth screens (existing)
import {LoginScreen} from '../screens/LoginScreen';
import {ProfileCreateScreen} from '../screens/ProfileCreateScreen';

// Role-based navigators
import {PatientNavigator} from './PatientNavigator';
import {DoctorNavigator} from './DoctorNavigator';
import {DoctorAssistantNavigator} from './DoctorAssistantNavigator';
import {LabNavigator} from './LabNavigator';
import {PharmacyNavigator} from './PharmacyNavigator';
import {AdminNavigator} from './AdminNavigator';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await authService.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        const role = await authService.getUserRole();
        console.log('[AppNavigator] User role from storage:', role);
        setUserRole(role);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // Route based on authentication and role
  const getInitialRoute = () => {
    if (!isAuthenticated) {
      console.log('[AppNavigator] Not authenticated, routing to Login');
      return 'Login';
    }

    // Route based on user role
    console.log('[AppNavigator] Routing for role:', userRole);
    switch (userRole) {
      case UserRole.PATIENT:
        console.log('[AppNavigator] → PatientApp');
        return 'PatientApp';
      case UserRole.DOCTOR:
        console.log('[AppNavigator] → DoctorApp');
        return 'DoctorApp';
      case UserRole.DOCTOR_ASSISTANT:
        console.log('[AppNavigator] → DoctorAssistantApp');
        return 'DoctorAssistantApp';
      case UserRole.LAB:
        console.log('[AppNavigator] → LabApp');
        return 'LabApp';
      case UserRole.PHARMACY:
        console.log('[AppNavigator] → PharmacyApp');
        return 'PharmacyApp';
      case UserRole.ADMIN:
        console.log('[AppNavigator] → AdminApp');
        return 'AdminApp';
      default:
        console.log('[AppNavigator] → Login (unknown role)');
        return 'Login';
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{
          headerShown: false,
        }}>
        {/* Auth screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen
          name="ProfileCreate"
          component={ProfileCreateScreen}
          options={{title: 'Create Profile'}}
        />

        {/* Role-based app navigators */}
        <Stack.Screen name="PatientApp" component={PatientNavigator} />
        <Stack.Screen name="DoctorApp" component={DoctorNavigator} />
        <Stack.Screen name="DoctorAssistantApp" component={DoctorAssistantNavigator} />
        <Stack.Screen name="LabApp" component={LabNavigator} />
        <Stack.Screen name="PharmacyApp" component={PharmacyNavigator} />
        <Stack.Screen name="AdminApp" component={AdminNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
