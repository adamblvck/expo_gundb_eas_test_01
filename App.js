import 'react-native-get-random-values';

import PolyfillCrypto from 'react-native-webview-crypto';

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, Fragment } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AuthProvider } from './contexts'
import GunDBTestingNavigator from './navigation/index';

import { useAssets } from 'expo-asset';

// console.log(Filesystem.documentDirectory);
// Filesystem.documentDirectory + 'blank.html'

export default function App() {

	// const [secureUri, setSecureUri] = useState('FFFAFA');

	// const [assets, error] = useAssets([require('./assets/blank.html')]);

	// console.log(assets ? assets[0]: undefined);

	// useEffect(() => {
	// 	const do_it = async() => {
	// 		// setSecureUri(FileSystem.documentDirectory + 'blank.html');
	// 		// await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + 'blank.html', `<html/>`, { encoding: FileSystem.EncodingType.UTF8 })
	// 	}

	// 	do_it();
	// }, []);

	const d = a => console.log(a);

	return (	
		<SafeAreaProvider>
			<PolyfillCrypto />

			<AuthProvider>
				<GunDBTestingNavigator/>
			</AuthProvider>
		</SafeAreaProvider>
	);
}
