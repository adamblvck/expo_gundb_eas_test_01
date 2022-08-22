import React, {useCallback, useEffect, useState } from 'react'
import { Text, View, StyleSheet, ScrollView} from 'react-native'

import Auth from './AuthScreen'

import { Typo } from "../components/Typo";
import { FilledButton } from "../components/Button";
import { useAuth, useAuthDispatch, logoutUser, useGunDB} from "../contexts";

// import useGun from '../contexts/useGun';
// const { user, SEA, gun } = useGun();

import _ from 'lodash';

export default function Main () {
  	const profile = useAuth();
	const { user, SEA, gun } = useGunDB(); // hooks to gunDB instance
	const [things, setThings] = useState([]);

	useEffect(() => {

		// First map maps on all ids, the second maps on all data within IDs
		gun.get("things_3").map(captureThing);

		// gun.get("things_2").on(captureThing);
// 
		return ()=> {
			gun.get("things_3").off();
		}
	},[gun, user]);

	const captureThing = useCallback( (data, gun_id) => {
		// console.log("Capturing something", data, gun_id);
		setThings(prevThings => ({...prevThings, [gun_id]:data}))
	})

	const random_id = () => {return Math.floor(Math.random() * 100000) };

	const addThing = () => {

		const id = random_id();

		const obj = {
			id: random_id(),
			title: "test",
			content: "viable_testing"
		}

		// console.log("trying to put", obj);

		gun.get("things_3").get(id).put(obj, ack =>{
			console.log("putted", ack)
		});
	}

	const counter = Object.keys(things).length;

  	return !user.is ? <Auth /> : (
		  <View>
			<FilledButton onPress={addThing}>
				Add Thing
			</FilledButton>
			<Text>{counter} items</Text>
			<Text></Text>
			  <ScrollView>
				  {_.map(things, (data, ii) => {
					  return (
						  <View key={`${data.id}_${ii}`}>
							  <Text>{data.id}</Text>
						  </View>
					  )
				  })}
			  </ScrollView>
		  </View>
	  )
}