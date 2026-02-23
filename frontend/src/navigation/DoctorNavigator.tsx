import React from 'react';
import {View, Text, Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import actual doctor screens
import {DashboardScreen} from '../screens/doctor/DashboardScreen';
import {ReportsScreen} from '../screens/doctor/ReportsScreen';
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
import {BulkVitalsRecordScreen} from '../screens/doctor/BulkVitalsRecordScreen';
import DoctorVideoConsultationsScreen from '../screens/doctor/DoctorVideoConsultationsScreen';
import VideoCallScreen from '../screens/VideoCallScreen';
import {PatientMessagesScreen} from '../screens/doctor/PatientMessagesScreen';
import {MessagesListScreen} from '../screens/doctor/MessagesListScreen';
import {DoctorWebLayout} from '../components/DoctorWebLayout';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Dashboard stack
const DashboardStack = ({navigation}: any) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerLeft: Platform.OS === 'web' ? () => (
          <Icon
            name="home"
            size={28}
            color="#00ACC1"
            style={{marginLeft: 15, cursor: 'pointer'}}
            onPress={() => navigation.navigate('DashboardMain')}
          />
        ) : undefined,
      }}
    >
      <Stack.Screen
        name="DashboardMain"
        component={DashboardScreen}
        options={{
          headerShown: Platform.OS !== 'web',
          headerLeft: () => null, // No home button on dashboard itself
          headerTitle: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#00ACC1',
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
      <Stack.Screen
        name="BulkVitalsRecord"
        component={BulkVitalsRecordScreen}
        options={{
          headerTitle: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#00ACC1',
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
        name="VideoConsultations"
        component={DoctorVideoConsultationsScreen}
        options={{
          headerTitle: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#00ACC1',
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
        name="VideoCallScreen"
        component={VideoCallScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Messages"
        component={MessagesListScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="PatientMessages"
        component={PatientMessagesScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

// Reports stack
const ReportsStack = ({navigation}: any) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerLeft: Platform.OS === 'web' ? () => (
          <Icon
            name="home"
            size={28}
            color="#00ACC1"
            style={{marginLeft: 15, cursor: 'pointer'}}
            onPress={() => navigation.navigate('Dashboard', {screen: 'DashboardMain'})}
          />
        ) : undefined,
      }}
    >
      <Stack.Screen
        name="ReportsMain"
        component={ReportsScreen}
        options={{
          headerTitle: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#00ACC1',
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
const SearchStack = ({navigation}: any) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerLeft: Platform.OS === 'web' ? () => (
          <Icon
            name="home"
            size={28}
            color="#00ACC1"
            style={{marginLeft: 15, cursor: 'pointer'}}
            onPress={() => navigation.navigate('Dashboard', {screen: 'DashboardMain'})}
          />
        ) : undefined,
      }}
    >
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
                backgroundColor: '#00ACC1',
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
        name="PatientMessages"
        component={PatientMessagesScreen}
        options={{headerShown: false}}
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
const PatientsStack = ({navigation}: any) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerLeft: Platform.OS === 'web' ? () => (
          <Icon
            name="home"
            size={28}
            color="#00ACC1"
            style={{marginLeft: 15, cursor: 'pointer'}}
            onPress={() => navigation.navigate('Dashboard', {screen: 'DashboardMain'})}
          />
        ) : undefined,
      }}
    >
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
                backgroundColor: '#00ACC1',
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
        name="PatientMessages"
        component={PatientMessagesScreen}
        options={{headerShown: false}}
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
const ProfileStack = ({navigation}: any) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerLeft: Platform.OS === 'web' ? () => (
          <Icon
            name="home"
            size={28}
            color="#00ACC1"
            style={{marginLeft: 15, cursor: 'pointer'}}
            onPress={() => navigation.navigate('Dashboard', {screen: 'DashboardMain'})}
          />
        ) : undefined,
      }}
    >
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
                backgroundColor: '#00ACC1',
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

// Web Stack for nested navigation
const WebStack = createNativeStackNavigator();

const WebNavigator = () => {
  return (
    <WebStack.Navigator screenOptions={{headerShown: false}}>
      <WebStack.Screen name="WebLayout" component={DoctorWebLayout} />
      <WebStack.Screen name="PatientTimeline" component={PatientTimelineScreen} />
      <WebStack.Screen name="ReviewReport" component={ReviewReportScreen} />
      <WebStack.Screen name="VoiceCall" component={VoiceCallScreen} />
      <WebStack.Screen name="CallReview" component={CallReviewScreen} />
      <WebStack.Screen name="DoctorConsultationReview" component={DoctorConsultationReviewScreen} />
      <WebStack.Screen name="VideoCallScreen" component={VideoCallScreen} />
      <WebStack.Screen name="PatientMessages" component={PatientMessagesScreen} />
    </WebStack.Navigator>
  );
};

export const DoctorNavigator = () => {
  // Use web layout for desktop/browser
  if (Platform.OS === 'web') {
    return <WebNavigator />;
  }

  // Use tab navigation for mobile
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
