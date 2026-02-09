import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {OrdersListScreen} from '../screens/lab/OrdersListScreen';
import {OrderDetailScreen} from '../screens/lab/OrderDetailScreen';
import {UploadResultsScreen} from '../screens/lab/UploadResultsScreen';
import {StatsScreen} from '../screens/lab/StatsScreen';
import {SettingsScreen} from '../components/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Orders stack
const OrdersStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="OrdersListMain"
        component={OrdersListScreen}
        options={{title: 'Lab Orders'}}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{title: 'Order Details'}}
      />
      <Stack.Screen
        name="UploadResults"
        component={UploadResultsScreen}
        options={{title: 'Upload Results'}}
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

export const LabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00ACC1',
        tabBarInactiveTintColor: '#666',
      }}>
      <Tab.Screen
        name="Orders"
        component={OrdersStack}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({color, size}) => (
            <Icon name="science" size={size} color={color} />
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
