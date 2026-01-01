import React from 'react';
import {View, Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

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
        options={{
          headerTitle: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#2196F3',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}>
                <Icon name="favorite" size={20} color="#fff" />
              </View>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#333'}}>
                HealthbridgeAI
              </Text>
            </View>
          ),
        }}
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
        options={{title: 'Consultation'}}
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
        options={{
          headerTitle: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#2196F3',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}>
                <Icon name="favorite" size={20} color="#fff" />
              </View>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#333'}}>
                HealthbridgeAI
              </Text>
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="EncounterDetail"
        component={EncounterDetailScreen}
        options={{title: 'Consultation'}}
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
        options={{
          headerTitle: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#2196F3',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}>
                <Icon name="favorite" size={20} color="#fff" />
              </View>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#333'}}>
                HealthbridgeAI
              </Text>
            </View>
          ),
        }}
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
        options={{
          headerTitle: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#2196F3',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
              }}>
                <Icon name="favorite" size={20} color="#fff" />
              </View>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#333'}}>
                HealthbridgeAI
              </Text>
            </View>
          ),
        }}
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
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Consult',
          tabBarIcon: ({color}) => (
            <FontAwesome5 name="user-md" size={28} color={color} solid />
          ),
        }}
      />
      <Tab.Screen
        name="Timeline"
        component={TimelineStack}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({color}) => (
            <Icon name="event-note" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsStack}
        options={{
          tabBarLabel: 'Insights',
          tabBarIcon: ({color}) => (
            <Icon name="analytics" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({color}) => (
            <Icon name="account-circle" size={28} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
