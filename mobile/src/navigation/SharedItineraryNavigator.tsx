import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import SharedItinerariesScreen from '../screens/Main/SharedItinerariesScreen';
import ItineraryDetailScreen   from '../screens/Itinerary/ItineraryDetailScreen';
import { SharedStackParamList } from '../types';

const Stack = createNativeStackNavigator<SharedStackParamList>();

const SharedItineraryNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SharedList"      component={SharedItinerariesScreen} />
    <Stack.Screen name="ItineraryDetail" component={ItineraryDetailScreen} />
  </Stack.Navigator>
);

export default SharedItineraryNavigator;