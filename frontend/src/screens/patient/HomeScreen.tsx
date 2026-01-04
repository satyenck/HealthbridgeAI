import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {EncounterType} from '../../types';

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
    color: '#4CAF50',
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

  useEffect(() => {
    // Rotate tips every 10 seconds
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % healthTips.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleNewEncounter = (type: EncounterType) => {
    navigation.navigate('NewEncounter', {encounterType: type});
  };

  const handleHealthAssistant = () => {
    navigation.navigate('HealthAssistant');
  };

  const handleVitalsReport = () => {
    navigation.navigate('VitalsReport');
  };

  const currentTip = healthTips[currentTipIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Icon name="favorite" size={24} color="#fff" />
          </View>
          <Text style={styles.pageTitle}>Consult Doctor</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <TouchableOpacity
          style={[styles.actionCard, {backgroundColor: '#E1BEE7'}]}
          onPress={handleHealthAssistant}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#7B1FA2'}]}>
            <Icon name="record-voice-over" size={32} color="#fff" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, {color: '#6A1B9A'}]}>Talk to Health Assistant</Text>
            <Text style={[styles.cardDescription, {color: '#7B1FA2'}]}>Get instant AI-powered health guidance</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#7B1FA2" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, {backgroundColor: '#C8E6C9'}]}
          onPress={handleVitalsReport}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#388E3C'}]}>
            <Icon name="favorite" size={32} color="#fff" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, {color: '#2E7D32'}]}>Report Vitals with AI</Text>
            <Text style={[styles.cardDescription, {color: '#388E3C'}]}>Record your blood pressure, weight, and more using voice</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#388E3C" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, {backgroundColor: '#BBDEFB'}]}
          onPress={() => handleNewEncounter(EncounterType.REMOTE_CONSULT)}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#1976D2'}]}>
            <Icon name="message" size={32} color="#fff" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, {color: '#1565C0'}]}>Send Symptoms</Text>
            <Text style={[styles.cardDescription, {color: '#1976D2'}]}>Share your symptoms for remote consultation</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#1976D2" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, {backgroundColor: '#FFCCBC'}]}
          onPress={() => handleNewEncounter(EncounterType.LIVE_VISIT)}>
          <View style={[styles.cardIconContainer, {backgroundColor: '#E64A19'}]}>
            <Icon name="local-hospital" size={32} color="#fff" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, {color: '#D84315'}]}>Schedule Appointment</Text>
            <Text style={[styles.cardDescription, {color: '#E64A19'}]}>Book an in-person visit with a doctor</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#E64A19" />
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3498db',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
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
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    minHeight: 100,
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
