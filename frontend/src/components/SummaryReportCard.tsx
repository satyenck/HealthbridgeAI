import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {SummaryReport, ReportStatus, Priority} from '../types';
import {PriorityBadge} from './PriorityBadge';
import {StatusBadge} from './StatusBadge';
import {formatDateTime} from '../utils/dateHelpers';

interface SummaryReportCardProps {
  report: SummaryReport;
  showHeader?: boolean;
  patientView?: boolean;
}

export const SummaryReportCard: React.FC<SummaryReportCardProps> = ({
  report,
  showHeader = true,
  patientView = false,
}) => {
  const renderSection = (title: string, content?: string) => {
    if (!content) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionContent}>{content}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.reportTitle}>Summary Report</Text>
            <Text style={styles.reportDate}>
              {formatDateTime(report.created_at)}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <StatusBadge status={report.status} type="report" />
            {report.priority && <PriorityBadge priority={report.priority} />}
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderSection('Symptoms', report.content.symptoms)}
        {!patientView && (
          <>
            {renderSection('Diagnosis', report.content.diagnosis)}
            {renderSection('Treatment', report.content.treatment)}
            {renderSection('Tests', report.content.tests)}
            {renderSection('Prescription', report.content.prescription)}
            {renderSection('Next Steps', report.content.next_steps)}
          </>
        )}
        {patientView && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📋 Your doctor will review your symptoms and provide diagnosis, treatment plan, and next steps.
            </Text>
          </View>
        )}
      </ScrollView>

      {report.updated_at && report.updated_at !== report.created_at && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: {formatDateTime(report.updated_at)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    maxHeight: 500,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2196F3',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
});
