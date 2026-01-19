import {AppRegistry} from 'react-native';
import App from './App';
import appConfig from './app.json';

console.log('Starting HealthbridgeAI web app...');
console.log('Root element:', document.getElementById('root'));

// Register the app for web
AppRegistry.registerComponent(appConfig.name, () => App);

// Run the app in the root div
const rootTag = document.getElementById('root');
if (rootTag) {
  console.log('Mounting app to root element');
  AppRegistry.runApplication(appConfig.name, {
    rootTag: rootTag,
  });
} else {
  console.error('Root element not found!');
}
