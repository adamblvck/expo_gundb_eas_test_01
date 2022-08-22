import React, {useCallback, useEffect, useReducer, useRef } from 'react'
import { Text, View, Image, ScrollView, TouchableOpacity} from 'react-native'
import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';

import Auth from './AuthScreen'

import { Typo } from "../components/Typo";
import { FilledButton } from "../components/Button";
import { useAuth, useGunDB } from "../contexts";

import _, { add } from 'lodash';
import useGunUserData from "../hooks/useGunUserData";
import lorelIpsum from 'lorem-ipsum-react-native';

import * as FileSystem from 'expo-file-system';
import PeersConnected from '../components/PeersConnected';

import fake_store from '../data_sync/fake_data';
import { gun_sync } from '../data_sync/gun_helpers';
import { useImmer } from "use-immer";

import * as ImagePicker from 'expo-image-picker';

export default function Main () {
  	const profile = useAuth(); // hooks to profile context
	const { user, gun, SEA } = useGunDB(); // hooks to gunDB instance
	// const [things, putThingSecret] = useGunUserData("things_14"); // on key `things_7`

	const [userStore, updateStore] = useImmer(fake_store);

	function chunkString(str, length) {
		return str.match(new RegExp('.{1,' + length + '}', 'g'));
	}

	// For debugging purposes
	const msg_reducer = (state, action) => {
		switch(action.type) {
		  case 'append':
			return [...state, action.payload]
		}
	}

	// state for messages
	const [messages, dispatchMessage] = useReducer(msg_reducer, []);

	// reference for allowing one to log events, and show them real-time in a list
	const debugScrollViewRef = useRef();
	const dispatch_msg = (msg, type='normal') => {
		console.log(msg);
		dispatchMessage({type: 'append', payload: {msg, type}});
	};

	const add_thing = () => {

	}

	const sync_with_gundb = async () => {
		const config = {
			datasync_store_field: 'data_sync',
			keys_to_sync: {
				'appPreferences': {
					type: 'data',
					delta_dt_field: 'modified_dt'
				},
				'appstate': {
					type: 'data',
					delta_dt_field: 'modified_dt'
				},
				'things/all': {
					type: 'dict',
					delta_dt_field: 'modified_dt'
				},
				// 'things/groups': {
				// 	type: 'dict',
				// 	delta_dt_field: 'modified_dt'
				// }
			}
		}

		// launch
		const { new_store, house_keeping } = await gun_sync(userStore, config, gun, SEA, dispatch_msg);

		console.log("house_keeping", house_keeping);

		console.log("THINGS ALL-->", Object.keys(new_store.things["all"]).length);

		updateStore(new_store);
	}

	const encrypt_other = async () => {
		const p = await SEA.pair();

		

	}

	const addNew_localStore = async () => {
		const id = Math.floor(Math.random() * 1000000);

		// const pic_uri = `${FileSystem.documentDirectory}${id}.jpg`;
		// await FileSystem.downloadAsync(`https://picsum.photos/seed/${id}/300/300.jpg`, pic_uri);
		// const a = await FileSystem.readAsStringAsync(pic_uri, {encoding: FileSystem.EncodingType.Base64});

		const data = {
			id,
			modified_dt: `${JSON.stringify(new Date()).replace(/"/g, "")}`,
			title: lorelIpsum({units: 'sentences'
				, sentenceLowerBound: 1         // Minimum words per sentence.
				, sentenceUpperBound: 9}),
			content: lorelIpsum({units: 'paragraphs'
				, paragraphLowerBound: 1        // Minimum sentences per paragraph.
				, paragraphUpperBound: 3}),
			pictures: {
				"photoIds": [],
				"photos": {},
			},
			charge: 0
		}

		updateStore( draft => {
			draft.things.all[id] = data
		})
	}

	const addCharge = (id) => {
		updateStore( draft => {
			draft.things.all[id] = {
				...draft.things.all[id],
				charge: (draft.things.all[id].charge ?? 0) +1,
				modified_dt: `${JSON.stringify(new Date()).replace(/"/g, "")}`
			}
		})
	}

	const add = (number) => {
		updateStore( draft => {
			console.log("adding", number);
			for (let i=0; i<number; i++) {
				const id = Math.floor(Math.random() * 1000000);

				// const pic_uri = `${FileSystem.documentDirectory}${id}.jpg`;
				// await FileSystem.downloadAsync(`https://picsum.photos/seed/${id}/300/300.jpg`, pic_uri);
				// const a = await FileSystem.readAsStringAsync(pic_uri, {encoding: FileSystem.EncodingType.Base64});

				const data = {
					id,
					modified_dt: `${JSON.stringify(new Date()).replace(/"/g, "")}`,
					title: lorelIpsum({units: 'sentences'
						, sentenceLowerBound: 1         // Minimum words per sentence.
						, sentenceUpperBound: 9}),
					content: lorelIpsum({units: 'paragraphs'
						, paragraphLowerBound: 1        // Minimum sentences per paragraph.
						, paragraphUpperBound: 3}),
					pictures: {
						"photoIds": [],
						"photos": {},
					},
					charge: 0
				}

				draft.things.all[id] = data
			}
		});
	}

	function getMultipleRandom(arr, num) {
		const shuffled = [...arr].sort(() => 0.5 - Math.random());
	  
		return shuffled.slice(0, num);
	  }

	const change = (number) => {
		console.log("changing", number);
		const keys = Object.keys(userStore.things.all);
		const n_keys = getMultipleRandom(keys, number);

		console.log(n_keys);

		updateStore( draft => {
			for (let i=0; i<n_keys.length; i++) {
				const id = n_keys[i];
				draft.things.all[id] = {
					...draft.things.all[id],
					title: lorelIpsum({units: 'sentences'
						, sentenceLowerBound: 1         // Minimum words per sentence.
						, sentenceUpperBound: 9}),
					modified_dt: `${JSON.stringify(new Date()).replace(/"/g, "")}`
				}
			}
		})
	}

	// console.log("THINGS ALL", Object.keys(userStore.things.all));

  	return !user.is ? <Auth /> : (
		  <View style={{flex:1}}>
			<PeersConnected/>
			<View style={{flexDirection: 'row', justifyContent: 'space-around', flexWrap:1}}>
				<FilledButton onPress={addNew_localStore} style={{flex:1}}>
					Add 1
				</FilledButton>
				<FilledButton onPress={()=>add(100)} style={{flex:1}}>
					Add 100
				</FilledButton>
				<FilledButton onPress={()=>change(50)} style={{flex:1}}>
					Delta 50
				</FilledButton>
				<FilledButton onPress={()=>sync_with_gundb()} style={{flex:1}}>
					Sync
				</FilledButton>
				<FilledButton onPress={()=>encrypt_other()} style={{flex:1}}>
					Encrypt Other
				</FilledButton>
			</View>
			<Text>{Object.keys(userStore.things.all).length} items</Text>
			{ messages.length>0 &&
				<ScrollView
					ref={debugScrollViewRef}
					onContentSizeChange={() => debugScrollViewRef.current.scrollToEnd({ animated: true })}
					style={{width:'100%', maxHeight:300, margin:10}}
				>
					{
						_.map(messages,(msg, ii)=>{
							return <View key={ii} style={{width:'100%'}}>
								<Text style={{color:msg.type=='error'?'red':"black", flexShrink:1, fontSize:15}}>{msg.msg}</Text>
							</View>
						}) 
					}
				</ScrollView>
			}
			  <ScrollView>
				  {_.map(userStore.things.all, (data, kk) => {

					  return (
						  <View key={`${data?.id}_${kk}`} style={{flexDirection:'row', margin:5, backgroundColor:'#555', borderRadius:10}}>
							<TouchableOpacity onPress={()=>addCharge(kk)} style={{flex:2, justifyContent:'center', alignItems: 'center'}}>
								<View style={{backgroundColor:'#555', }}>
									<Text style={{color:'white'}}>Charge {data?.charge}</Text>
								</View>
							</TouchableOpacity>
								
							<View style={{flex:3}}>
							  <Text style={{color:'#eee', fontSize:18, margin:10}}>{data?.id}</Text>
							  <Text style={{color:'#eee', fontSize:18, margin:10}}>{data?.title}</Text>
							  <Text style={{color:'#eee', fontSize:10, margin: 5}}>{data?.content}</Text>
							  <Text style={{color:'#eee', fontSize:10, margin: 5}}>{data?.modified_dt}</Text>
							</View>
						  </View>
					  )
				  })}
			  </ScrollView>
		  </View>
	  )
}