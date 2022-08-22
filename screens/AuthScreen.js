import React, { useState, useEffect } from 'react'
import { StyleSheet, KeyboardAvoidingView, Text, View, Platform } from 'react-native';
import { FilledButton, TextButton } from '../components/Button'
import { Input } from '../components/Input'
import { useAuthDispatch, authUser, createUser, logoutUser, useGunDB,  } from '../contexts'

import PeersConnected from '../components/PeersConnected';

import * as SecureStore from 'expo-secure-store';

// quick save username and password, to avoid logging in all the time
// in the future, use pin-code based unlock with gun.SEA
const save_secure = async (key, value) => {
	await SecureStore.setItemAsync(key, value);
  }
  
const get_secure = async (key) => {
	let result = await SecureStore.getItemAsync(key);
	if (result) {
	  return JSON.parse(result);
	} else {
	  return -1;
	}
}

export default function Auth () {

	const [hasAccount, setAccount] = useState(false);
	const [username, setUsername] = useState('spelldev_002');
	const [key, setKey] = useState('rolling_balloon');

	const { user, SEA, gun } = useGunDB(); // hooks to gunDB instance
	const dispatch = useAuthDispatch();

	// attempt auto-login
	useEffect(() => {

		const attempt_login = async () => {
			const creds = await get_secure('GUNUSER');
			console.log("CREDS", creds);
			if (creds !== -1) {
				authUser(dispatch, creds);
			}
		}

		// attempt_login();
	}, [])

	const toggleState = () => {
		setAccount(!hasAccount)
	}

	const testSEA = async () => {
		const a = await SEA.pair();
		console.log(a);
	}

	const Login = () => {
		return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={styles.container}
		>
			<View>
				<PeersConnected/>
				<Text style={styles.headerTitle}>GunDB - Expo Boilet Setup</Text>
			</View>

			<Input value={username} onChangeText={setUsername} placeholder='Username' textContentType="username" />
			<Input value={key} onChangeText={setKey} placeholder='Password' secureTextEntry={true} textContentType="password" />
			
			<FilledButton onPress={() => authUser(dispatch, { username: username, pwd: key })}>
				Login
			</FilledButton>
			
			<TextButton onPress={toggleState}>Create One</TextButton>
		</KeyboardAvoidingView>
		)
	}
	const Register = () => {
		return (
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.container}
			>
				<View>
					<PeersConnected/>
					<Text style={styles.headerTitle}>GunDB - Expo Boilet Setup</Text>
				</View>
				
				<Input value={username} onChangeText={setUsername} placeholder='Username' textContentType="username" />
				<Input value={key} onChangeText={setKey} placeholder='Password' secureTextEntry={true} textContentType="password" />

				<FilledButton onPress={() => {
					const creds = { username: username, pwd:key }; // creds
					save_secure('GUNUSER', JSON.stringify(creds)) // store!
					createUser(dispatch, creds);
				} }>
					Register
				</FilledButton>

				<TextButton onPress={toggleState}>I already have an account</TextButton>
			</KeyboardAvoidingView>
		)
	}

	return hasAccount ? Login() : Register();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
	backgroundColor: '#fff',
  },
  headerTitle: {
    color: '#222',
    fontSize: 36,
    fontWeight: 'bold'
  }
})