import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {PrescriptionsListScreen} from '../screens/pharmacy/PrescriptionsListScreen';
import {PrescriptionDetailScreen} from '../screens/pharmacy/PrescriptionDetailScreen';
import {FulfillmentScreen} from '../screens/pharmacy/FulfillmentScreen';
import {StatsScreen} from '../screens/pharmacy/StatsScreen';
import {SettingsScreen} from '../components/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Prescriptions stack
const PrescriptionsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PrescriptionsListMain"
        component={PrescriptionsListScreen}
        options={{title: 'Prescriptions'}}
      />
      <Stack.Screen
        name="PrescriptionDetail"
        component={PrescriptionDetailScreen}
        options={{title: 'Prescription Details'}}
      />
      <Stack.Screen
        name="Fulfillment"
        component={FulfillmentScreen}
        options={{title: 'Fulfill Prescription'}}
      />
    </Stack.Navigator>
  );
};

// Stats stack
const StatsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="StatsMain"
        component={StatsScreen}
        options={{title: 'Statistics'}}
      />
    </Stack.Navigator>
  );
};

// Settings stack
const SettingsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{title: 'Settings'}}
      />
    </Stack.Navigator>
  );
};

export const PharmacyNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF9800',
        tabBarInactiveTintColor: '#666',
      }}>
      <Tab.Screen
        name="Prescriptions"
        component={PrescriptionsStack}
        options={{
          tabBarLabel: 'Prescriptions',
          tabBarIcon: ({color, size}) => (
            <Icon name="local-pharmacy" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsStack}
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({color, size}) => (
            <Icon name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({color, size}) => (
            <Icon name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
