import React from 'react'
import { Text, View, StyleSheet } from 'react-native'

import { Typo } from "../components/Typo";
import { FilledButton } from "../components/Button";
import { useAuth, useAuthDispatch, logoutUser } from "../contexts";

export default function Home () {

	// authentication information
	const profile = useAuth();
	const dispatch = useAuthDispatch();

	const encrypt = async () => {

		console.log(profile.key);

		const cipher_msg = await SEA.encrypt("abc", profile.key);
		console.log("Encrypted Message", cipher_msg);

		var msg = await SEA.decrypt(cipher_msg, profile.key);

		console.log("Decrypted Message", msg);
	}

    return (
		<View>
			<Typo size="xl" weight="bold" color="#505050">
				Welcome, {profile.username}
			</Typo>
			<Typo size="sm" weight="200" color="#505050">
				{profile.key}
			</Typo>

			<FilledButton onPress={encrypt}>
				Encrypt
			</FilledButton>

			<FilledButton onPress={() => logoutUser(dispatch)}>
				Logout
			</FilledButton>
		</View>
	);
}