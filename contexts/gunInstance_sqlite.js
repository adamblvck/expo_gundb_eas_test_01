import 'gun/lib/mobile'
import Gun from 'gun/gun';
import SEA from 'gun/sea';

import * as SQLite from 'expo-sqlite';

import 'gun/lib/promise';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/open';

import { makeStoreAdapter } from '@altrx/gundb-expo-sqlite-adapter';
makeStoreAdapter(Gun);

// WARNING - USER SPACE WRITING IS JUST PLAINLY BUGGY IN OFFLINE MODE -- WRITE REQUESTS GET STUCK

const useGun = () => {
	const gun = Gun({
		peers: ['https://ancient-journey-24749.herokuapp.com/gun'],
		localStorage: false,
		file: false,
		sqlite: {
			SQLite,
			databaseName: 'test.db',
			onOpen: () => {},
			onError: (err) => {
				console.log('SQLITE - ERROR');
			},
			onReady: (err) => {
				console.log('SQLITE - READY');
			},
		},
	})

	//App namespace
	const app = gun.get('spellbook-testdb');
	const user = gun.user();

	return { gun, app, user, SEA }
}

export default useGun;