import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Patient screens
import {HomeScreen} from '../screens/patient/HomeScreen';
import {TimelineScreen} from '../screens/patient/TimelineScreen';
import {ProfileScreen} from '../screens/patient/ProfileScreen';
import {InsightsScreen} from '../screens/patient/InsightsScreen';
import {NewEncounterScreen} from '../screens/patient/NewEncounterScreen';
import {EncounterDetailScreen} from '../screens/patient/EncounterDetailScreen';
import {VoiceRecordScreen} from '../screens/patient/VoiceRecordScreen';
import {MediaUploadScreen} from '../screens/patient/MediaUploadScreen';
import {VitalsEntryScreen} from '../screens/patient/VitalsEntryScreen';
import {HealthAssistantScreen} from '../screens/patient/HealthAssistantScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Home stack with encounter-related screens
const HomeStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{title: 'My Dashboard'}}
      />
      <Stack.Screen
        name="HealthAssistant"
        component={HealthAssistantScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="NewEncounter"
        component={NewEncounterScreen}
        options={{title: 'New Consultation'}}
      />
      <Stack.Screen
        name="EncounterDetail"
        component={EncounterDetailScreen}
        options={{title: 'Consultation Details'}}
      />
      <Stack.Screen
        name="VoiceRecord"
        component={VoiceRecordScreen}
        options={{title: 'Voice Recording'}}
      />
      <Stack.Screen
        name="MediaUpload"
        component={MediaUploadScreen}
        options={{title: 'Upload Files'}}
      />
      <Stack.Screen
        name="VitalsEntry"
        component={VitalsEntryScreen}
        options={{title: 'Enter Vitals'}}
      />
    </Stack.Navigator>
  );
};

// Timeline stack
const TimelineStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="TimelineMain"
        component={TimelineScreen}
        options={{title: 'Health Timeline'}}
      />
      <Stack.Screen
        name="EncounterDetail"
        component={EncounterDetailScreen}
        options={{title: 'Consultation Details'}}
      />
    </Stack.Navigator>
  );
};

// Insights stack
const InsightsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="InsightsMain"
        component={InsightsScreen}
        options={{title: 'My Health Insights'}}
      />
    </Stack.Navigator>
  );
};

// Profile stack
const ProfileStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{title: 'My Profile'}}
      />
    </Stack.Navigator>
  );
};

export const PatientNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#666',
      }}>
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Consultations',
          tabBarIcon: ({color, size}) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Timeline"
        component={TimelineStack}
        options={{
          tabBarLabel: 'Timeline',
          tabBarIcon: ({color, size}) => (
            <Icon name="timeline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsStack}
        options={{
          tabBarLabel: 'Insights',
          tabBarIcon: ({color, size}) => (
            <Icon name="insights" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({color, size}) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
