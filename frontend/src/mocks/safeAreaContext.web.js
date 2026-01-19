// Mock for react-native-safe-area-context on web
import React from 'react';

export const SafeAreaProvider = ({ children }) => {
  return React.createElement(React.Fragment, {}, children);
};

export const SafeAreaView = ({ children, style, ...props }) => {
  return React.createElement('div', { style, ...props }, children);
};

export const useSafeAreaInsets = () => {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
};

export const useSafeAreaFrame = () => {
  return {
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

// Additional exports required by React Navigation
export const initialWindowMetrics = {
  frame: {
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  insets: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
};

export const SafeAreaInsetsContext = React.createContext({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});

export const SafeAreaFrameContext = React.createContext({
  x: 0,
  y: 0,
  width: window.innerWidth,
  height: window.innerHeight,
});
