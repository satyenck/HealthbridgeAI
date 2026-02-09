import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {LineChart} from 'react-native-chart-kit';
import apiService from '../../services/apiService';
import {API_ENDPOINTS} from '../../config/api';

const screenWidth = Dimensions.get('window').width;

interface VitalsData {
  dates: string[];
  // Vitals
  blood_pressure_sys: (number | null)[];
  blood_pressure_dia: (number | null)[];
  heart_rate: (number | null)[];
  temperature: (number | null)[];
  weight: (number | null)[];
  oxygen_level: (number | null)[];
  glucose_level: (number | null)[];
  // Lab Results - CBC
  hemoglobin: (number | null)[];
  wbc: (number | null)[];
  rbc: (number | null)[];
  platelets: (number | null)[];
  hematocrit: (number | null)[];
  // Lab Results - Lipid Panel
  total_cholesterol: (number | null)[];
  ldl: (number | null)[];
  hdl: (number | null)[];
  triglycerides: (number | null)[];
  // Lab Results - Metabolic Panel
  creatinine: (number | null)[];
  bun: (number | null)[];
  sodium: (number | null)[];
  potassium: (number | null)[];
  // Lab Results - Liver Function
  alt: (number | null)[];
  ast: (number | null)[];
  bilirubin: (number | null)[];
  // Lab Results - Thyroid
  tsh: (number | null)[];
  t3: (number | null)[];
  t4: (number | null)[];
  // Lab Results - Gender Specific
  testosterone: (number | null)[];
  psa: (number | null)[];
  estrogen: (number | null)[];
  progesterone: (number | null)[];
  fsh: (number | null)[];
}

interface VitalsChartScreenProps {
  navigation: any;
}

export const VitalsChartScreen: React.FC<VitalsChartScreenProps> = ({
  navigation,
}) => {
  const [loading, setLoading] = useState(true);
  const [vitalsData, setVitalsData] = useState<VitalsData | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('blood_pressure');

  useEffect(() => {
    loadVitalsData();
  }, []);

  const loadVitalsData = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(API_ENDPOINTS.PATIENT_TIMELINE);

      // Extract vitals and lab results from timeline
      const allData: any[] = [];

      response.encounters.forEach((encounter: any) => {
        // Add vitals
        if (encounter.vitals && encounter.vitals.length > 0) {
          encounter.vitals.forEach((vital: any) => {
            allData.push({
              type: 'vital',
              ...vital,
              recorded_at: vital.recorded_at,
            });
          });
        }

        // Add lab results
        if (encounter.lab_results && encounter.lab_results.length > 0) {
          encounter.lab_results.forEach((lab: any) => {
            allData.push({
              type: 'lab',
              ...lab.metrics,
              recorded_at: lab.recorded_at,
            });
          });
        }
      });

      // Sort by date
      allData.sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
      );

      // Transform data for charts
      const dates = allData.map(v =>
        new Date(v.recorded_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      );

      const transformedData: VitalsData = {
        dates,
        // Vitals
        blood_pressure_sys: allData.map(v => v.blood_pressure_sys || null),
        blood_pressure_dia: allData.map(v => v.blood_pressure_dia || null),
        heart_rate: allData.map(v => v.heart_rate || null),
        temperature: allData.map(v => v.temperature || null),
        weight: allData.map(v => v.weight || null),
        oxygen_level: allData.map(v => v.oxygen_level || null),
        glucose_level: allData.map(v => v.glucose_level || null),
        // Lab Results - CBC
        hemoglobin: allData.map(v => v.hemoglobin || v.Hemoglobin || null),
        wbc: allData.map(v => v.wbc || v.WBC || null),
        rbc: allData.map(v => v.rbc || v.RBC || null),
        platelets: allData.map(v => v.platelets || v.Platelets || null),
        hematocrit: allData.map(v => v.hematocrit || v.Hematocrit || null),
        // Lab Results - Lipid Panel
        total_cholesterol: allData.map(v => v.total_cholesterol || v['Total Cholesterol'] || null),
        ldl: allData.map(v => v.ldl || v.LDL || null),
        hdl: allData.map(v => v.hdl || v.HDL || null),
        triglycerides: allData.map(v => v.triglycerides || v.Triglycerides || null),
        // Lab Results - Metabolic Panel
        creatinine: allData.map(v => v.creatinine || v.Creatinine || null),
        bun: allData.map(v => v.bun || v.BUN || null),
        sodium: allData.map(v => v.sodium || v.Sodium || null),
        potassium: allData.map(v => v.potassium || v.Potassium || null),
        // Lab Results - Liver Function
        alt: allData.map(v => v.alt || v.ALT || null),
        ast: allData.map(v => v.ast || v.AST || null),
        bilirubin: allData.map(v => v.bilirubin || v.Bilirubin || null),
        // Lab Results - Thyroid
        tsh: allData.map(v => v.tsh || v.TSH || null),
        t3: allData.map(v => v.t3 || v.T3 || null),
        t4: allData.map(v => v.t4 || v.T4 || null),
        // Lab Results - Gender Specific
        testosterone: allData.map(v => v.testosterone || v.Testosterone || null),
        psa: allData.map(v => v.psa || v.PSA || null),
        estrogen: allData.map(v => v.estrogen || v.Estrogen || null),
        progesterone: allData.map(v => v.progesterone || v.Progesterone || null),
        fsh: allData.map(v => v.fsh || v.FSH || null),
      };

      setVitalsData(transformedData);
    } catch (error: any) {
      console.error('Failed to load vitals data:', error);
      Alert.alert('Error', error.message || 'Failed to load vitals data');
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!vitalsData) return null;

    let data: (number | null)[];
    let label: string;

    switch (selectedMetric) {
      case 'blood_pressure':
        return {
          labels: vitalsData.dates,
          datasets: [
            {
              data: vitalsData.blood_pressure_sys.filter(
                v => v !== null,
              ) as number[],
              color: () => '#F44336',
              strokeWidth: 2,
            },
            {
              data: vitalsData.blood_pressure_dia.filter(
                v => v !== null,
              ) as number[],
              color: () => '#2196F3',
              strokeWidth: 2,
            },
          ],
          legend: ['Systolic', 'Diastolic'],
        };
      // Vitals
      case 'heart_rate':
        data = vitalsData.heart_rate;
        label = 'Heart Rate (bpm)';
        break;
      case 'temperature':
        data = vitalsData.temperature;
        label = 'Temperature (°F)';
        break;
      case 'weight':
        data = vitalsData.weight;
        label = 'Weight (kg)';
        break;
      case 'oxygen_level':
        data = vitalsData.oxygen_level;
        label = 'Oxygen Level (%)';
        break;
      case 'glucose_level':
        data = vitalsData.glucose_level;
        label = 'Glucose (mg/dL)';
        break;
      // CBC
      case 'hemoglobin':
        data = vitalsData.hemoglobin;
        label = 'Hemoglobin (g/dL)';
        break;
      case 'wbc':
        data = vitalsData.wbc;
        label = 'WBC (cells/mcL)';
        break;
      case 'rbc':
        data = vitalsData.rbc;
        label = 'RBC (million cells/mcL)';
        break;
      case 'platelets':
        data = vitalsData.platelets;
        label = 'Platelets (cells/mcL)';
        break;
      case 'hematocrit':
        data = vitalsData.hematocrit;
        label = 'Hematocrit (%)';
        break;
      // Lipid Panel
      case 'total_cholesterol':
        data = vitalsData.total_cholesterol;
        label = 'Total Cholesterol (mg/dL)';
        break;
      case 'ldl':
        data = vitalsData.ldl;
        label = 'LDL (mg/dL)';
        break;
      case 'hdl':
        data = vitalsData.hdl;
        label = 'HDL (mg/dL)';
        break;
      case 'triglycerides':
        data = vitalsData.triglycerides;
        label = 'Triglycerides (mg/dL)';
        break;
      // Metabolic Panel
      case 'creatinine':
        data = vitalsData.creatinine;
        label = 'Creatinine (mg/dL)';
        break;
      case 'bun':
        data = vitalsData.bun;
        label = 'BUN (mg/dL)';
        break;
      case 'sodium':
        data = vitalsData.sodium;
        label = 'Sodium (mEq/L)';
        break;
      case 'potassium':
        data = vitalsData.potassium;
        label = 'Potassium (mEq/L)';
        break;
      // Liver Function
      case 'alt':
        data = vitalsData.alt;
        label = 'ALT (U/L)';
        break;
      case 'ast':
        data = vitalsData.ast;
        label = 'AST (U/L)';
        break;
      case 'bilirubin':
        data = vitalsData.bilirubin;
        label = 'Bilirubin (mg/dL)';
        break;
      // Thyroid
      case 'tsh':
        data = vitalsData.tsh;
        label = 'TSH (mIU/L)';
        break;
      case 't3':
        data = vitalsData.t3;
        label = 'T3 (ng/dL)';
        break;
      case 't4':
        data = vitalsData.t4;
        label = 'T4 (mcg/dL)';
        break;
      // Gender Specific
      case 'testosterone':
        data = vitalsData.testosterone;
        label = 'Testosterone (ng/dL)';
        break;
      case 'psa':
        data = vitalsData.psa;
        label = 'PSA (ng/mL)';
        break;
      case 'estrogen':
        data = vitalsData.estrogen;
        label = 'Estrogen (pg/mL)';
        break;
      case 'progesterone':
        data = vitalsData.progesterone;
        label = 'Progesterone (ng/mL)';
        break;
      case 'fsh':
        data = vitalsData.fsh;
        label = 'FSH (mIU/mL)';
        break;
      default:
        return null;
    }

    const filteredData = data.filter(v => v !== null) as number[];

    if (filteredData.length === 0) {
      return null;
    }

    return {
      labels: vitalsData.dates.slice(0, filteredData.length),
      datasets: [
        {
          data: filteredData,
          color: () => '#00ACC1',
          strokeWidth: 2,
        },
      ],
      legend: [label],
    };
  };

  const metricCategories = [
    {
      category: 'Vitals',
      metrics: [
        {id: 'blood_pressure', name: 'Blood Pressure', icon: 'favorite', color: '#F44336'},
        {id: 'heart_rate', name: 'Heart Rate', icon: 'monitor-heart', color: '#E91E63'},
        {id: 'temperature', name: 'Temperature', icon: 'thermostat', color: '#FF9800'},
        {id: 'weight', name: 'Weight', icon: 'scale', color: '#9C27B0'},
        {id: 'oxygen_level', name: 'Oxygen Level', icon: 'air', color: '#2196F3'},
        {id: 'glucose_level', name: 'Blood Sugar', icon: 'bloodtype', color: '#00ACC1'},
      ],
    },
    {
      category: 'CBC (Complete Blood Count)',
      metrics: [
        {id: 'hemoglobin', name: 'Hemoglobin', icon: 'opacity', color: '#D32F2F'},
        {id: 'wbc', name: 'WBC', icon: 'healing', color: '#1976D2'},
        {id: 'rbc', name: 'RBC', icon: 'water-drop', color: '#C62828'},
        {id: 'platelets', name: 'Platelets', icon: 'bubble-chart', color: '#7B1FA2'},
        {id: 'hematocrit', name: 'Hematocrit', icon: 'show-chart', color: '#E64A19'},
      ],
    },
    {
      category: 'Lipid Panel',
      metrics: [
        {id: 'total_cholesterol', name: 'Total Cholesterol', icon: 'local-pharmacy', color: '#FFA000'},
        {id: 'ldl', name: 'LDL', icon: 'trending-down', color: '#F57C00'},
        {id: 'hdl', name: 'HDL', icon: 'trending-up', color: '#00ACC1'},
        {id: 'triglycerides', name: 'Triglycerides', icon: 'waves', color: '#0288D1'},
      ],
    },
    {
      category: 'Metabolic Panel',
      metrics: [
        {id: 'creatinine', name: 'Creatinine', icon: 'science', color: '#5D4037'},
        {id: 'bun', name: 'BUN', icon: 'biotech', color: '#616161'},
        {id: 'sodium', name: 'Sodium', icon: 'grain', color: '#00796B'},
        {id: 'potassium', name: 'Potassium', icon: 'eco', color: '#689F38'},
      ],
    },
    {
      category: 'Liver Function',
      metrics: [
        {id: 'alt', name: 'ALT', icon: 'local-hospital', color: '#C2185B'},
        {id: 'ast', name: 'AST', icon: 'medical-services', color: '#AD1457'},
        {id: 'bilirubin', name: 'Bilirubin', icon: 'colorize', color: '#F57F17'},
      ],
    },
    {
      category: 'Thyroid Function',
      metrics: [
        {id: 'tsh', name: 'TSH', icon: 'psychology', color: '#512DA8'},
        {id: 't3', name: 'T3', icon: 'psychology-alt', color: '#5E35B1'},
        {id: 't4', name: 'T4', icon: 'lightbulb', color: '#673AB7'},
      ],
    },
    {
      category: 'Hormones (Men)',
      metrics: [
        {id: 'testosterone', name: 'Testosterone', icon: 'male', color: '#1565C0'},
        {id: 'psa', name: 'PSA', icon: 'health-and-safety', color: '#0277BD'},
      ],
    },
    {
      category: 'Hormones (Women)',
      metrics: [
        {id: 'estrogen', name: 'Estrogen', icon: 'female', color: '#E91E63'},
        {id: 'progesterone', name: 'Progesterone', icon: 'pregnant-woman', color: '#EC407A'},
        {id: 'fsh', name: 'FSH', icon: 'wc', color: '#F06292'},
      ],
    },
  ];

  const chartData = getChartData();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ACC1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Metric Categories */}
        {metricCategories.map(category => (
          <View key={category.category} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>{category.category}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.metricsRow}>
                {category.metrics.map(metric => (
                  <TouchableOpacity
                    key={metric.id}
                    style={[
                      styles.metricButton,
                      selectedMetric === metric.id && styles.metricButtonActive,
                      {borderColor: metric.color},
                    ]}
                    onPress={() => setSelectedMetric(metric.id)}>
                    <Icon
                      name={metric.icon}
                      size={24}
                      color={
                        selectedMetric === metric.id ? metric.color : '#999'
                      }
                    />
                    <Text
                      style={[
                        styles.metricButtonText,
                        selectedMetric === metric.id && {color: metric.color},
                      ]}>
                      {metric.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        ))}

        {/* Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>
            {metricCategories
              .flatMap(c => c.metrics)
              .find(m => m.id === selectedMetric)?.name}{' '}
            Trend
          </Text>

          {chartData && chartData.datasets[0].data.length > 0 ? (
            <>
              <LineChart
                data={chartData}
                width={screenWidth - 32}
                height={260}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: '#00ACC1',
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '',
                    stroke: '#e0e0e0',
                    strokeWidth: 1,
                  },
                }}
                bezier
                style={styles.chart}
              />

              {selectedMetric === 'blood_pressure' && (
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, {backgroundColor: '#F44336'}]}
                    />
                    <Text style={styles.legendText}>Systolic</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, {backgroundColor: '#2196F3'}]}
                    />
                    <Text style={styles.legendText}>Diastolic</Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyChart}>
              <Icon name="show-chart" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                No data available for this metric
              </Text>
              <Text style={styles.emptySubtext}>
                Record your vitals to see trends over time
              </Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        {chartData && chartData.datasets[0].data.length > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Quick Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Latest</Text>
                <Text style={styles.statValue}>
                  {
                    chartData.datasets[0].data[
                      chartData.datasets[0].data.length - 1
                    ]
                  }
                  {selectedMetric === 'blood_pressure' &&
                    chartData.datasets[1] &&
                    `/${
                      chartData.datasets[1].data[
                        chartData.datasets[1].data.length - 1
                      ]
                    }`}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Average</Text>
                <Text style={styles.statValue}>
                  {Math.round(
                    chartData.datasets[0].data.reduce((a, b) => a + b, 0) /
                      chartData.datasets[0].data.length,
                  )}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Highest</Text>
                <Text style={styles.statValue}>
                  {Math.max(...chartData.datasets[0].data)}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Lowest</Text>
                <Text style={styles.statValue}>
                  {Math.min(...chartData.datasets[0].data)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
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
  content: {
    flex: 1,
  },
  categoryContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricButton: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    minWidth: 100,
  },
  metricButtonActive: {
    backgroundColor: '#f5f5f5',
  },
  metricButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  chartContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
  },
  statsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00ACC1',
  },
});
