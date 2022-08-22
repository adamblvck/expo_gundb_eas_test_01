import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useAuth, useGunDB } from "../contexts";

import { getConnectedPeers } from '../data_sync/gun_helpers';
import useInterval from '../hooks/useInterval';

const PeersConnected = (props) => {

	const { gun } = useGunDB(); // hooks to gunDB instance
	const [connectedPeers, setConnectedPeers] = useState(0);

	// check peer # every 5 seconds
	useInterval(() => {
		const connectedPeers = getConnectedPeers(gun);
		setConnectedPeers(connectedPeers.length);

		if (connectedPeers.length <= 0) {
			gun.opt({peers:'https://ancient-journey-24749.herokuapp.com/gun'});
			gun.get('heartbeat').put({wow:'thumb'});
			console.log('yooo');
		}

	}, 5000);

	// check peer # after component mount (sideEffect)
	useEffect(() => {
		const connectedPeers = getConnectedPeers(gun);
		setConnectedPeers(connectedPeers.length);
	}, []);

	return (
		<View style={{width:50, height:50, borderRadius:25, backgroundColor:'#444', justifyContent: 'center'}}>
			<Text style={{color:'#eee', textAlign:'center'}}>Peers{'\n'}{connectedPeers}</Text>
		</View>
	)
}

export default PeersConnected;