import React from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from './src/navigation/AppNavigator';

function App() {
  return (
    <SafeAreaProvider style={styles.provider}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <AppNavigator />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  provider: {
    flex: 1,
    minHeight: '100vh',
  },
  container: {
    flex: 1,
    minHeight: '100vh',
  },
});

export default App;
