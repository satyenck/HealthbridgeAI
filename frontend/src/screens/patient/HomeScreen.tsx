import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {EncounterType} from '../../types';
import messagingService from '../../services/messagingService';
import {useFocusEffect} from '@react-navigation/native';

const healthTips = [
  {
    icon: 'local-drink',
    title: 'Stay Hydrated',
    tip: 'Drink at least 8 glasses of water daily to keep your body functioning optimally.',
    color: '#2196F3',
  },
  {
    icon: 'nights-stay',
    title: 'Quality Sleep',
    tip: 'Aim for 7-9 hours of sleep each night to support your immune system and mental health.',
    color: '#9C27B0',
  },
  {
    icon: 'directions-walk',
    title: 'Stay Active',
    tip: 'Try to get at least 30 minutes of moderate exercise most days of the week.',
    color: '#00ACC1',
  },
  {
    icon: 'restaurant',
    title: 'Balanced Diet',
    tip: 'Eat a variety of fruits, vegetables, whole grains, and lean proteins for optimal nutrition.',
    color: '#FF9800',
  },
  {
    icon: 'self-improvement',
    title: 'Mental Wellness',
    tip: 'Practice mindfulness or meditation for a few minutes daily to reduce stress and anxiety.',
    color: '#00BCD4',
  },
  {
    icon: 'favorite',
    title: 'Regular Checkups',
    tip: "Don't skip your annual health screenings and preventive care appointments.",
    color: '#E91E63',
  },
];

export const HomeScreen = ({navigation}: any) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    // Rotate tips every 10 seconds
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % healthTips.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadUnreadMessages();
      const interval = setInterval(loadUnreadMessages, 15000); // Poll every 15 seconds
      return () => clearInterval(interval);
    }, []),
  );

  const loadUnreadMessages = async () => {
    try {
      const unreadCount = await messagingService.getUnreadCount();
      setUnreadMessages(unreadCount.total_unread);
    } catch (error) {
      // Silently fail if messaging service is not available
      console.log('[HomeScreen] Messaging service not available, skipping unread count');
      setUnreadMessages(0);
    }
  };

  const handleNewEncounter = (type: EncounterType) => {
    navigation.navigate('NewEncounter', {encounterType: type});
  };

  const handleHealthAssistant = () => {
    navigation.navigate('HealthAssistant');
  };

  const handleVitalsReport = () => {
    navigation.navigate('VitalsReport');
  };

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      // Web uses window.confirm
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        await AsyncStorage.multiRemove(['access_token', 'user_id', 'user_role']);
        navigation.replace('Login');
      }
    } else {
      // Mobile uses Alert.alert
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.multiRemove(['access_token', 'user_id', 'user_role']);
              navigation.replace('Login');
            },
          },
        ],
      );
    }
  };

  const currentTip = healthTips[currentTipIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Icon name="favorite" size={24} color="#fff" />
          </View>
          <Text style={styles.pageTitle}>HealthbridgeAI</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Messages')}>
              <Icon name="chat-bubble" size={24} color="#00ACC1" />
              {unreadMessages > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleProfile}>
              <Icon name="person" size={24} color="#5B7C99" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
              <Icon name="logout" size={24} color="#6C757D" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* PREVIOUS COLOR SCHEME (for reference/revert):
            Health Assistant: backgroundColor: '#E1BEE7', icon: '#7B1FA2', title: '#6A1B9A', desc: '#7B1FA2'
            Vitals Report: backgroundColor: '#C8E6C9', icon: '#00ACC1', title: '#00ACC1', desc: '#00ACC1'
            Appointments: backgroundColor: '#E1F5FE', icon: '#0277BD', title: '#01579B', desc: '#0277BD'
        */}
        <TouchableOpacity
          style={[styles.actionCard, {backgroundColor: '#FFFFFF'}]}
          onPress={handleHealthAssistant}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#F8F9FA'}]}>
            <Icon name="record-voice-over" size={32} color="#5B7C99" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, {color: '#2C3E50'}]}>Talk to Health Assistant</Text>
            <Text style={[styles.cardDescription, {color: '#6C757D'}]}>Get instant AI-powered health guidance</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#ADB5BD" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, {backgroundColor: '#FFFFFF'}]}
          onPress={handleVitalsReport}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#F8F9FA'}]}>
            <Icon name="favorite" size={32} color="#5B7C99" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, {color: '#2C3E50'}]}>Report Vitals with AI</Text>
            <Text style={[styles.cardDescription, {color: '#6C757D'}]}>Record your blood pressure, weight, and more using voice</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#ADB5BD" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, {backgroundColor: '#FFFFFF'}]}
          onPress={() => navigation.navigate('MyVideoConsultations')}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#F8F9FA'}]}>
            <Icon name="event" size={32} color="#5B7C99" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, {color: '#2C3E50'}]}>My Appointments</Text>
            <Text style={[styles.cardDescription, {color: '#6C757D'}]}>View scheduled video calls and in-person visits</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#ADB5BD" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, {backgroundColor: '#FFFFFF'}]}
          onPress={() => navigation.navigate('MyReferrals')}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#F8F9FA'}]}>
            <Icon name="sync-alt" size={32} color="#5B7C99" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, {color: '#2C3E50'}]}>My Referrals</Text>
            <Text style={[styles.cardDescription, {color: '#6C757D'}]}>View doctor referrals and specialist appointments</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#ADB5BD" />
        </TouchableOpacity>

        {/* Health Tip Card */}
        <View style={styles.tipSection}>
          <Text style={styles.sectionTitle}>Daily Health Tip</Text>

          <View style={[styles.tipCard, {borderLeftColor: currentTip.color}]}>
            <View style={[styles.tipIconContainer, {backgroundColor: currentTip.color + '20'}]}>
              <Icon name={currentTip.icon} size={32} color={currentTip.color} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{currentTip.title}</Text>
              <Text style={styles.tipText}>{currentTip.tip}</Text>
            </View>
          </View>

          {/* Tip indicators */}
          <View style={styles.tipIndicators}>
            {healthTips.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentTipIndex && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00ACC1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    opacity: 0.9,
  },
  tipSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  tipIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  indicatorActive: {
    backgroundColor: '#2196F3',
    width: 24,
  },
});
