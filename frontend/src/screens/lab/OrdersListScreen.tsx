import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator} from 'react-native';
import {labService} from '../../services/labService';
import {LabOrder, OrderStatus} from '../../types';
import {formatDateTime} from '../../utils/dateHelpers';
import {StatusBadge} from '../../components/StatusBadge';

export const OrdersListScreen = ({navigation}: any) => {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await labService.getOrders();
      setOrders(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderOrderCard = ({item}: {item: LabOrder}) => (
    <TouchableOpacity style={styles.orderCard} onPress={() => navigation.navigate('OrderDetail', {orderId: item.order_id})}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{item.order_id.substring(0, 8)}</Text>
          <Text style={styles.orderDate}>{formatDateTime(item.created_at)}</Text>
        </View>
        <StatusBadge status={item.status} type="order" />
      </View>
      <Text style={styles.orderInstructions} numberOfLines={2}>{item.instructions}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#9C27B0" /></View>;
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No lab orders yet</Text>
      <Text style={styles.emptySubtext}>Orders from patients and doctors will appear here</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.order_id}
        renderItem={renderOrderCard}
        contentContainerStyle={orders.length === 0 ? styles.emptyListContent : styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); loadOrders();}} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  listContent: {padding: 16},
  emptyListContent: {flex: 1, padding: 16},
  emptyContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60},
  emptyText: {fontSize: 18, fontWeight: '600', color: '#666', marginBottom: 8},
  emptySubtext: {fontSize: 14, color: '#999', textAlign: 'center'},
  orderCard: {backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3},
  orderHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12},
  orderId: {fontSize: 12, color: '#999', marginBottom: 4},
  orderDate: {fontSize: 14, fontWeight: '500', color: '#333'},
  orderInstructions: {fontSize: 14, color: '#666', lineHeight: 20},
});
