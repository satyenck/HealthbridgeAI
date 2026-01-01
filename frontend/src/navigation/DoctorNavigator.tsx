import React from 'react';
import {View, Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import actual doctor screens
import {DashboardScreen} from '../screens/doctor/DashboardScreen';
import {PendingReportsScreen} from '../screens/doctor/PendingReportsScreen';
import {ReviewedReportsScreen} from '../screens/doctor/ReviewedReportsScreen';
import {SearchPatientsScreen} from '../screens/doctor/SearchPatientsScreen';
import {MyPatientsScreen} from '../screens/doctor/MyPatientsScreen';
import {PatientTimelineScreen} from '../screens/doctor/PatientTimelineScreen';
import {ReviewReportScreen} from '../screens/doctor/ReviewReportScreen';
import {DoctorProfileScreen} from '../screens/doctor/DoctorProfileScreen';
import {VoiceCallScreen} from '../screens/VoiceCallScreen';
import {CallReviewScreen} from '../screens/doctor/CallReviewScreen';
import {DoctorConsultationReviewScreen} from '../screens/doctor/DoctorConsultationReviewScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Dashboard stack
const DashboardStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DashboardMain"
        component={DashboardScreen}
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
        name="VoiceCall"
        component={VoiceCallScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="CallReview"
        component={CallReviewScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

// Pending reports stack
const ReportsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PendingReportsMain"
        component={PendingReportsScreen}
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
        name="ReviewedReports"
        component={ReviewedReportsScreen}
        options={{title: 'Reviewed Reports'}}
      />
      <Stack.Screen
        name="ReviewReport"
        component={ReviewReportScreen}
        options={{title: 'Review Report'}}
      />
      <Stack.Screen
        name="VoiceCall"
        component={VoiceCallScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="CallReview"
        component={CallReviewScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

// Search patients stack
const SearchStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SearchPatientsMain"
        component={SearchPatientsScreen}
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
        name="PatientTimeline"
        component={PatientTimelineScreen}
        options={{title: 'Patient Timeline'}}
      />
      <Stack.Screen
        name="ReviewReport"
        component={ReviewReportScreen}
        options={{title: 'Review Report'}}
      />
      <Stack.Screen
        name="VoiceCall"
        component={VoiceCallScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="CallReview"
        component={CallReviewScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="DoctorConsultationReview"
        component={DoctorConsultationReviewScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

// My patients stack
const PatientsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MyPatientsMain"
        component={MyPatientsScreen}
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
        name="PatientTimeline"
        component={PatientTimelineScreen}
        options={{title: 'Patient Timeline'}}
      />
      <Stack.Screen
        name="ReviewReport"
        component={ReviewReportScreen}
        options={{title: 'Review Report'}}
      />
      <Stack.Screen
        name="VoiceCall"
        component={VoiceCallScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="CallReview"
        component={CallReviewScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="DoctorConsultationReview"
        component={DoctorConsultationReviewScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

// Profile stack
const ProfileStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DoctorProfileMain"
        component={DoctorProfileScreen}
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

export const DoctorNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4CAF50',
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
        name="Reports"
        component={ReportsStack}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({color, size}) => (
            <Icon name="assignment" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({color, size}) => (
            <Icon name="search" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Patients"
        component={PatientsStack}
        options={{
          tabBarLabel: 'Patients',
          tabBarIcon: ({color, size}) => (
            <Icon name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({color, size}) => (
            <Icon name="account-circle" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
