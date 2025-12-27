import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {adminService} from '../../services/adminService';
import {User} from '../../types';
import {RoleBadge} from '../../components/RoleBadge';

export const ManageUsersScreen = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      if (user.is_active) {
        await adminService.deactivateUser(user.user_id);
      } else {
        await adminService.activateUser(user.user_id);
      }
      loadUsers();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update user status');
    }
  };

  const renderUserCard = ({item}: {item: User}) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userId}>{item.user_id.substring(0, 8)}</Text>
        <Text style={styles.userEmail}>{item.email || item.phone_number}</Text>
        <View style={styles.badges}>
          <RoleBadge role={item.role} size="small" />
          <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
            <Text style={styles.statusText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleToggleStatus(item)}>
        <Icon name={item.is_active ? 'toggle-on' : 'toggle-off'} size={32} color={item.is_active ? '#4CAF50' : '#999'} />
      </TouchableOpacity>
    </View>
  );

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#F44336" /></View>;

  return (
    <View style={styles.container}>
      <FlatList data={users} keyExtractor={(item) => item.user_id} renderItem={renderUserCard} contentContainerStyle={styles.listContent} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  listContent: {padding: 16},
  userCard: {backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  userInfo: {flex: 1},
  userId: {fontSize: 12, color: '#999', marginBottom: 4},
  userEmail: {fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8},
  badges: {flexDirection: 'row', gap: 8},
  statusBadge: {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12},
  statusActive: {backgroundColor: '#E8F5E9'},
  statusInactive: {backgroundColor: '#FFEBEE'},
  statusText: {fontSize: 10, fontWeight: '600'},
});
