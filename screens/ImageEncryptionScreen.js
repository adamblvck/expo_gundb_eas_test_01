import React, {useCallback, useState, useReducer, useRef } from 'react'
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

	const [pickedImage, setPickedImage] = useState();
	const [decryptedImage, setDecryptedImage] = useState();

	const chunkString = (str, length) => {
		return str.match(new RegExp('.{1,' + length + '}', 'g'));
	}

	const pickImage = async () => {


		// No permissions request is necessary for launching the image library
		let result = await ImagePicker.launchImageLibraryAsync({
		  mediaTypes: ImagePicker.MediaTypeOptions.All,
		  allowsEditing: true,
		  aspect: [4, 3],
		  quality: 1,
			//   base64:true
		});

		
		// resize image to a max siwth of 1080 (keep aspect ratio)
		const manipResult = await manipulateAsync(
			result.uri, [
				{ resize: {width: 1080} }
			],
			{ compress: 0.8, format: SaveFormat.JPEG, base64:true }
		);
	
		setPickedImage(manipResult);

		let start = new Date().getTime();
		console.log(Object.keys(manipResult), user._.sea);

		// chunk image / file into smaller pieces of 20kbyte
		const image_chunks = chunkString(manipResult.base64, 1024*10);

		// create promise array
		const encrypt_promises = image_chunks.map(chunk => SEA.encrypt(chunk, user._.sea));

		// encrypt promises
		const encrypted_chunks = await Promise.all(encrypt_promises);

		// log some data
		let end = new Date().getTime();
		console.log(image_chunks.length, "vs", encrypted_chunks.length);
		console.log("Time taken = " + (end-start)/1000 + 's' );
		console.log("base64 length, compressed image", manipResult.base64.length, Object.keys(manipResult));

		// make a signature of the first chunk
		const hash = await SEA.work(encrypted_chunks[0], user._.sea);
		const signed_hash = await SEA.sign(hash, user._.sea);

		const to_upload = JSON.stringify({
			id: "", // file id, as identified in SpellBook 
			signature: signed_hash, // signature to verify 'enc[0]' data came from the public key
			enc: encrypted_chunks, // encrypted chunks

			// image metadata
			width: manipResult.width,
			height: manipResult.height,
			data_type: 'jpeg',
		});

		console.log("HASH & MORE", hash, signed_hash);

		// log
		console.log("upload size", to_upload.length / 1024 , "kb");
		console.log("upload size signed", signed_hash.length / 1024 , "kb");

		// upload encrypted file / picture / ... to 

		///// DECRYPTION TESTING!
		start = new Date().getTime();

		const other_someone = await SEA.pair();

		const pub = user._.sea.pub; // public key of user who's uploading
		const { signature, enc, data_type, width, height } = JSON.parse(to_upload);

		const test_123 = await SEA.verify(signature, pub);

		if (test_123 !== false) {

			// create promise array
			const decrypt_promises = enc.map(chunk => SEA.decrypt(chunk, user._.sea));

			// encrypt promises
			const decrypted_chunks = await Promise.all(decrypt_promises);

			// join things together to recreate base64
			const base64 = decrypted_chunks.join('');

			if (data_type == "jpeg") {

				const img = {
					uri: 'data:image/jpeg;base64,' + base64,
					width,
					height
				}

				setDecryptedImage(img);
				
			}
		}

		end = new Date().getTime();

		console.log("Time taken for decryption" + (end-start)/1000 + 's' );

	};

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

		console.log("THINGS ALL-->", Object.keys(new_store.things["all"]));

		updateStore(new_store);
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
				<FilledButton onPress={()=>pickImage()} style={{flex:1}}>
					Load Image
				</FilledButton>
			</View>
			
			<Text style={{fontSize:18}}>Load a large image, and see it being chunked and encrypted, and then decrypted! </Text>
			<View style={{height:20}}/>

			<ScrollView>
				<Text>Picked</Text>
				<Image source={pickedImage} style={{width:200, height:200}}/>

				<View style={{height:40}}/>
				<Text>Decrypted (after encryption)</Text>
				<Image source={decryptedImage} style={{width:200, height:200}}/>

			</ScrollView>

		</View>
	  )
}