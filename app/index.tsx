import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import HomeScreen from '../screens/HomeScreen';
import SnakeScreen from '../screens/SnakeScreen';
import DebugScreen from '../screens/DebugScreen';
import LoadingScreen from '../screens/LoadingScreen';
import ConfigScreen from '../screens/ConfigScreen';

const Stack = createStackNavigator<RootStackParamList>();

const Index = () => (
  <>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Config" component={ConfigScreen} />
      <Stack.Screen name="Debug" component={DebugScreen} />
      <Stack.Screen name="Snake" component={SnakeScreen} />
      <Stack.Screen name="Loading" component={LoadingScreen} />
    </Stack.Navigator>
  </>
);

export default Index;