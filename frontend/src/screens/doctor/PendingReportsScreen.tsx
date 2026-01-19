import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {doctorService} from '../../services/doctorService';
import {SummaryReport} from '../../types';
import {formatDateTime} from '../../utils/dateHelpers';
import {PriorityBadge} from '../../components/PriorityBadge';
import {StatusBadge} from '../../components/StatusBadge';

export const PendingReportsScreen = ({navigation}: any) => {
  const [reports, setReports] = useState<SummaryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, []),
  );

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getPendingReports();
      setReports(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load pending reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const handleReportPress = (report: SummaryReport) => {
    navigation.navigate('ReviewReport', {
      reportId: report.report_id,
      encounterId: report.encounter_id,
    });
  };

  const renderReportCard = ({item}: {item: SummaryReport}) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => handleReportPress(item)}>
      <View style={styles.reportHeader}>
        <View>
          <Text style={styles.reportId}>
            Encounter: {item.encounter_id.substring(0, 8)}...
          </Text>
          <Text style={styles.reportDate}>{formatDateTime(item.created_at)}</Text>
        </View>
        <View style={styles.badges}>
          <StatusBadge status={item.status} type="report" size="small" />
          {item.priority && <PriorityBadge priority={item.priority} size="small" />}
        </View>
      </View>

      {item.content?.diagnosis && (
        <Text style={styles.reportPreview} numberOfLines={3}>
          {item.content.diagnosis}
        </Text>
      )}
      {item.content?.symptoms && !item.content?.diagnosis && (
        <Text style={styles.reportPreview} numberOfLines={3}>
          {item.content.symptoms}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No pending reports</Text>
      <Text style={styles.emptySubtext}>
        All reports have been reviewed
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.report_id}
        renderItem={renderReportCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reportId: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  badges: {
    gap: 4,
  },
  reportPreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
});
