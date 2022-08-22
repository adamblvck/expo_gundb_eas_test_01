import * as React from 'react';
import { View } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// import Colors from '../constants/Colors';

import Main from '../screens/Main';
import PublicDataScreen from '../screens/PublicDataScreen';
import UserDataScreen from '../screens/UserDataScreen';
import ImageEncryptionScreen from "../screens/ImageEncryptionScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const MainAppNavigatorStack = (props) =>
	<Tab.Navigator
		initialRouteName={'User'}
		screenOptions={({ route }) => ({
			headerShown: false,
			tabBarIcon: ({ focused, color, size }) => {
				let iconName;
				switch (route.name) {
					case 'Auth':
						iconName = 'person-outline';
						break;
					case 'Public':
						iconName = 'earth-outline';
						break;
					case 'User':
						iconName = 'sync';
						break;
					case 'LargeFile':
						iconName = 'lock-closed-outline';
						break;
				}

				// You can return any component that you like here!
				return <Ionicons name={iconName} size={size+2} color={color} iconStyle={{margin:0}} />	
			},

			tabBarActiveTintColor:"black",
			tabBarInactiveTintColor:"white",
			tabBarLabelStyle: { fontSize: 12},
			tabBarIconStyle: { marginTop: 0 },

			tabBarStyle: {
				// Remove border top on both android & ios
				borderTopWidth: 0,
				borderTopColor: "transparent",
				elevation: 0,
				shadowColor : '#5bc4ff',
				shadowOpacity: 0,
				shadowOffset: {
					height: 0,
				},
				shadowRadius: 0,
			},

			tabBarBackground: () => (
				<View style={{ flex: 1 }}>
					<LinearGradient
						// Button Linear Gradient
						colors={['#daae51', '#C197FF', '#3ad59f']}
						locations={[0.0, 0.5, 1.0]}
						style={{flex:1}}
						start={{ x: 0.0, y: 0.5 }}
						end={{ x: 1.0, y: 0.5 }}
					/>
				</View>
			)
		})}
		>
			<Tab.Screen
				name="Auth"
				component={Main}
				options={({ route }) => ({
					title: 'Auth Info',
					tabBarLabel: 'Auth Info'
				})}
			/>

			<Tab.Screen
				name="Public"
				component={PublicDataScreen}
				options={({ route }) => ({
					title: 'Public Data',
					tabBarLabel: 'Public Data'
				})}
			/>

			<Tab.Screen
				name="User"
				component={UserDataScreen}
				options={({ route }) => ({
					title: 'GunDB x Redux',
					tabBarLabel: 'GunDB x Redux'
				})}
			/>

			<Tab.Screen
				name="LargeFile"
				component={ImageEncryptionScreen}
				options={({ route }) => ({
					title: 'Large Encryption',
					tabBarLabel: 'Encryption'
				})}
			/>

	</Tab.Navigator>;

const GunDBTestingNavigator = (props) => {
	return (
		<NavigationContainer>
			<Stack.Navigator>
				<Stack.Screen name="Home" component={MainAppNavigatorStack} />

				{/* Possible authentication screens here */}
				{/* <Stack.Screen name="Home" component={MainAppNavigatorStack} /> */}

			</Stack.Navigator>
		</NavigationContainer>
	);
}

export default GunDBTestingNavigator;