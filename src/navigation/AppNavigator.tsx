import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen} from '../screens/HomeScreen';
import {DrillScreen} from '../screens/DrillScreen';
import {MLSettingsScreen} from '../screens/MLSettingsScreen';
import {RootStackParamList} from '../types/navigation';
import {MLSettingsProvider} from '../contexts/MLSettingsContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <MLSettingsProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: {backgroundColor: '#1a1a2e'},
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Drill" component={DrillScreen} />
          <Stack.Screen name="MLSettings" component={MLSettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </MLSettingsProvider>
  );
}
