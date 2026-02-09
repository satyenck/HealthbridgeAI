import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Admin screens (to be created)
const DashboardScreen = () => null;
const CreateProfessionalScreen = () => null;
const ManageUsersScreen = () => null;
const ProfessionalsListScreen = () => null;
const SettingsScreen = () => null;

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Dashboard stack
const DashboardStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DashboardMain"
        component={DashboardScreen}
        options={{title: 'System Dashboard'}}
      />
    </Stack.Navigator>
  );
};

// Create professional stack
const CreateStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CreateProfessionalMain"
        component={CreateProfessionalScreen}
        options={{title: 'Create Professional'}}
      />
    </Stack.Navigator>
  );
};

// Manage users stack
const UsersStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ManageUsersMain"
        component={ManageUsersScreen}
        options={{title: 'Manage Users'}}
      />
    </Stack.Navigator>
  );
};

// View professionals stack
const ProfessionalsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfessionalsListMain"
        component={ProfessionalsListScreen}
        options={{title: 'Professionals'}}
      />
    </Stack.Navigator>
  );
};

export const AdminNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00ACC1',
        tabBarInactiveTintColor: '#666',
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({color, size}) => (
            <Icon name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Create"
        component={CreateStack}
        options={{
          tabBarLabel: 'Create',
          tabBarIcon: ({color, size}) => (
            <Icon name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Users"
        component={UsersStack}
        options={{
          tabBarLabel: 'Users',
          tabBarIcon: ({color, size}) => (
            <Icon name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Professionals"
        component={ProfessionalsStack}
        options={{
          tabBarLabel: 'Professionals',
          tabBarIcon: ({color, size}) => (
            <Icon name="business" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
