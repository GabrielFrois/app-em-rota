import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import CreateItineraryScreen    from '../screens/Itinerary/CreateItineraryScreen';
import ItineraryDetailScreen    from '../screens/Itinerary/ItineraryDetailScreen';
import MyItinerariesScreen      from '../screens/Main/MyItinerariesScreen';
import { ItineraryStackParamList } from '../types';

const Stack = createNativeStackNavigator<ItineraryStackParamList>();

const ItineraryNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ItineraryList"    component={MyItinerariesScreen} />
    <Stack.Screen name="CreateItinerary"  component={CreateItineraryScreen} />
    <Stack.Screen name="ItineraryDetail"  component={ItineraryDetailScreen} />
  </Stack.Navigator>
);

export default ItineraryNavigator;