import React, {useState, useEffect} from 'react';
import {View, Text, Platform} from 'react-native';
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
import {VitalsReportScreen} from '../screens/patient/VitalsReportScreen';
import {HealthAssistantScreen} from '../screens/patient/HealthAssistantScreen';
import {VitalsChartScreen} from '../screens/patient/VitalsChartScreen';
import ScheduleVideoConsultationScreen from '../screens/patient/ScheduleVideoConsultationScreen';
import MyVideoConsultationsScreen from '../screens/patient/MyVideoConsultationsScreen';
import VideoCallScreen from '../screens/VideoCallScreen';
import {PatientConversationsScreen} from '../screens/patient/PatientConversationsScreen';
import {DoctorMessagesScreen} from '../screens/patient/DoctorMessagesScreen';
import messagingService from '../services/messagingService';
import PatientReferralsScreen from '../screens/patient/PatientReferralsScreen';
import referralService from '../services/referralService';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Home stack with encounter-related screens
const HomeStack = ({navigation}: any) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerLeft: Platform.OS === 'web' ? () => (
          <Icon
            name="home"
            size={28}
            color="#00ACC1"
            style={{marginLeft: 15, cursor: 'pointer'}}
            onPress={() => navigation.navigate('HomeMain')}
          />
        ) : undefined,
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          headerShown: Platform.OS !== 'web',
          headerLeft: () => null, // No home button on home screen itself
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
      <Stack.Screen
        name="VitalsReport"
        component={VitalsReportScreen}
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
        name="MyVideoConsultations"
        component={MyVideoConsultationsScreen}
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
        name="ScheduleVideoConsultation"
        component={ScheduleVideoConsultationScreen}
        options={{title: 'Schedule Video Call'}}
      />
      <Stack.Screen
        name="VideoCall"
        component={VideoCallScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="MyReferrals"
        component={PatientReferralsScreen}
        options={{
          title: 'My Referrals',
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
                My Referrals
              </Text>
            </View>
          ),
        }}
      />
    </Stack.Navigator>
  );
};

// Timeline stack
const TimelineStack = ({navigation}: any) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerLeft: Platform.OS === 'web' ? () => (
          <Icon
            name="home"
            size={28}
            color="#00ACC1"
            style={{marginLeft: 15, cursor: 'pointer'}}
            onPress={() => navigation.navigate('Home', {screen: 'HomeMain'})}
          />
        ) : undefined,
      }}
    >
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
        name="EncounterDetail"
        component={EncounterDetailScreen}
        options={{title: 'Consultation'}}
      />
    </Stack.Navigator>
  );
};

// Insights stack
const InsightsStack = ({navigation}: any) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerLeft: Platform.OS === 'web' ? () => (
          <Icon
            name="home"
            size={28}
            color="#00ACC1"
            style={{marginLeft: 15, cursor: 'pointer'}}
            onPress={() => navigation.navigate('Home', {screen: 'HomeMain'})}
          />
        ) : undefined,
      }}
    >
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
        name="VitalsChart"
        component={VitalsChartScreen}
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
            onPress={() => navigation.navigate('Home', {screen: 'HomeMain'})}
          />
        ) : undefined,
      }}
    >
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

// Messages stack
const MessagesStack = ({navigation}: any) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerLeft: Platform.OS === 'web' ? () => (
          <Icon
            name="home"
            size={28}
            color="#00ACC1"
            style={{marginLeft: 15, cursor: 'pointer'}}
            onPress={() => navigation.navigate('Home', {screen: 'HomeMain'})}
          />
        ) : undefined,
      }}
    >
      <Stack.Screen
        name="ConversationsList"
        component={PatientConversationsScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="DoctorMessages"
        component={DoctorMessagesScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
};

export const PatientNavigator = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const count = await messagingService.getUnreadCount();
        setUnreadCount(count.total_unread);
      } catch (error) {
        // Silently fail if messaging service is not available
        console.log('[PatientNavigator] Messaging service not available, skipping unread count');
        setUnreadCount(0);
      }
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00ACC1',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: Platform.OS === 'web' ? {display: 'none'} : {
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
            <Icon name="local-hospital" size={28} color={color} />
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
        name="Messages"
        component={MessagesStack}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({color}) => (
            <Icon name="chat-bubble" size={28} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
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
