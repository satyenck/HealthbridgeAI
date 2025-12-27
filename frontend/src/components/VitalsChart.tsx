import React from 'react';
import {View, Text, StyleSheet, Dimensions} from 'react-native';
import {LineChart} from 'react-native-chart-kit';
import {formatDate} from '../utils/dateHelpers';

interface VitalsChartProps {
  title: string;
  data: (number | null)[];
  timestamps: string[];
  color?: string;
  unit?: string;
}

export const VitalsChart: React.FC<VitalsChartProps> = ({
  title,
  data,
  timestamps,
  color = '#2196F3',
  unit = '',
}) => {
  // Filter out null values and their corresponding timestamps
  const validData: number[] = [];
  const validLabels: string[] = [];

  data.forEach((value, index) => {
    if (value !== null) {
      validData.push(value);
      validLabels.push(formatDate(timestamps[index], 'MMM dd'));
    }
  });

  // If no valid data, show empty state
  if (validData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  const chartData = {
    labels: validLabels.slice(-7), // Show last 7 data points
    datasets: [
      {
        data: validData.slice(-7),
        color: (opacity = 1) => color,
        strokeWidth: 2,
      },
    ],
  };

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <LineChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 1,
          color: (opacity = 1) => color,
          labelColor: (opacity = 1) => '#666',
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: color,
          },
        }}
        bezier
        style={styles.chart}
        suffix={unit ? ` ${unit}` : ''}
      />
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyState: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});
