import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { MyPatientsScreen } from '../screens/doctor/MyPatientsScreen';
import { PendingReportsScreen } from '../screens/doctor/PendingReportsScreen';
import { ReviewedReportsScreen } from '../screens/doctor/ReviewedReportsScreen';
import { SearchPatientsScreen } from '../screens/doctor/SearchPatientsScreen';
import { BulkVitalsRecordScreen } from '../screens/doctor/BulkVitalsRecordScreen';
import DoctorVideoConsultationsScreen from '../screens/doctor/DoctorVideoConsultationsScreen';
import { MessagesListScreen } from '../screens/doctor/MessagesListScreen';
import { DoctorProfileScreen } from '../screens/doctor/DoctorProfileScreen';
import DoctorReferralsReceivedScreen from '../screens/doctor/DoctorReferralsReceivedScreen';
import messagingService from '../services/messagingService';
import { authService } from '../services/authService';

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  iconColor: string;
  component: any;
  showBadge?: boolean;
}

interface DoctorWebLayoutProps {
  navigation?: any;
}

export const DoctorWebLayout: React.FC<DoctorWebLayoutProps> = () => {
  const navigation = useNavigation();
  const [selectedMenu, setSelectedMenu] = useState('patients');
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Load unread messages
  React.useEffect(() => {
    loadUnreadMessages();
    const interval = setInterval(loadUnreadMessages, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadMessages = async () => {
    try {
      const unreadCount = await messagingService.getUnreadCount();
      setUnreadMessages(unreadCount.total_unread);
    } catch (error) {
      // Silently fail if messaging service is not available
      console.log('[DoctorWebLayout] Messaging service not available, skipping unread count');
      setUnreadMessages(0);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (!confirmed) return;
    }

    try {
      await authService.logout();
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: 'patients',
      title: 'My Patients',
      icon: 'people',
      iconColor: '#00ACC1',
      component: MyPatientsScreen,
    },
    {
      id: 'reports',
      title: 'Pending Reports',
      icon: 'assignment',
      iconColor: '#FF9800',
      component: PendingReportsScreen,
    },
    {
      id: 'reviewed',
      title: 'Reviewed Reports',
      icon: 'fact-check',
      iconColor: '#4CAF50',
      component: ReviewedReportsScreen,
    },
    {
      id: 'appointments',
      title: 'Appointments',
      icon: 'event',
      iconColor: '#2196F3',
      component: DoctorVideoConsultationsScreen,
    },
    {
      id: 'search',
      title: 'Search Patients',
      icon: 'search',
      iconColor: '#9C27B0',
      component: SearchPatientsScreen,
    },
    {
      id: 'vitals',
      title: 'Record Patient Vitals',
      icon: 'mic',
      iconColor: '#E91E63',
      component: BulkVitalsRecordScreen,
    },
    {
      id: 'referrals',
      title: 'Referrals',
      icon: 'sync-alt',
      iconColor: '#00695C',
      component: DoctorReferralsReceivedScreen,
    },
    {
      id: 'messages',
      title: 'Messages',
      icon: 'chat-bubble',
      iconColor: '#00ACC1',
      component: MessagesListScreen,
      showBadge: unreadMessages > 0,
    },
  ];

  const selectedMenuItem = menuItems.find(item => item.id === selectedMenu);
  const ContentComponent = selectedMenuItem?.component;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Icon name="favorite" size={24} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>HealthbridgeAI</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setSelectedMenu('profile')}>
            <Icon name="account-circle" size={32} color="#00ACC1" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}>
            <Icon name="logout" size={28} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Left Sidebar */}
        <View style={styles.sidebar}>
          <ScrollView style={styles.sidebarScroll}>
            {menuItems.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  selectedMenu === item.id && styles.menuItemActive,
                ]}
                onPress={() => setSelectedMenu(item.id)}>
                <View style={[styles.menuIconContainer, { backgroundColor: `${item.iconColor}15` }]}>
                  <Icon name={item.icon} size={24} color={item.iconColor} />
                </View>
                <Text
                  style={[
                    styles.menuItemText,
                    selectedMenu === item.id && styles.menuItemTextActive,
                  ]}>
                  {item.title}
                </Text>
                {item.showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Profile */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                selectedMenu === 'profile' && styles.menuItemActive,
              ]}
              onPress={() => setSelectedMenu('profile')}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#75757515' }]}>
                <Icon name="person" size={24} color="#757575" />
              </View>
              <Text
                style={[
                  styles.menuItemText,
                  selectedMenu === 'profile' && styles.menuItemTextActive,
                ]}>
                Profile
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Right Content Area */}
        <View style={styles.contentArea}>
          {selectedMenu === 'patients' && <MyPatientsScreen navigation={navigation} />}
          {selectedMenu === 'reports' && <PendingReportsScreen navigation={navigation} />}
          {selectedMenu === 'reviewed' && <ReviewedReportsScreen navigation={navigation} />}
          {selectedMenu === 'appointments' && <DoctorVideoConsultationsScreen navigation={navigation} />}
          {selectedMenu === 'search' && <SearchPatientsScreen navigation={navigation} />}
          {selectedMenu === 'vitals' && <BulkVitalsRecordScreen navigation={navigation} />}
          {selectedMenu === 'messages' && <MessagesListScreen navigation={navigation} />}
          {selectedMenu === 'profile' && <DoctorProfileScreen navigation={navigation} />}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    height: '100vh',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    height: 70,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00ACC1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileButton: {
    padding: 4,
  },
  logoutButton: {
    padding: 4,
    cursor: 'pointer',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    height: 'calc(100vh - 70px)',
  },
  sidebar: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sidebarScroll: {
    flex: 1,
    padding: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  menuItemActive: {
    backgroundColor: '#E3F2FD',
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#5B7C99',
  },
  menuItemTextActive: {
    color: '#00ACC1',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    overflow: 'auto',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
  },
});
