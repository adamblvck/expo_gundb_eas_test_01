const app_name = 'spellbook_20'; // in production, should be "spellbook", during development... is arbitrary
import produce from "immer";
import _ from 'lodash';
import { resolve } from "patch-package/dist/path";

/**
 * 
 * Useful notes and thoughts
 * 
 * - Perhaps would be nice to allow people to sync their spellbook into seperate "spellbook names or keys"?
 * 		Of course, this will take away from the "all encompassing experience", but sometimes you need that freedom
 * 
 * - gun_sync should work through a produce state, and it should produce some type of PATCH system, such that
 * 		the above-lying function, can "REVERSE LOCAL CHANGES", to the previous local change...
 * 
 * - But this micromanagement of changes, and stuff.. feels like a huge hassle for the user actually ...
 * 
 * - 
 * 
*/

const goThroughPath = (store, path) => {
	const keys = path.split('/');
	let _path_store = store;
	for (let i=0; i<keys.length; i++) {
		_path_store = _path_store[keys[i]];
	}
	return _path_store;
}

const gun_sync = async (store, config, gun=_=>{}, SEA=_=>{}, debug_cb=_=>{}) => {

	// warm up v8-engine
	new Date().getTime();

	// house keeping, useful for communication to devs and users alike
	// Store per key (key_to_sync) --> local updates + remote
	let house_keeping = {

	};

	/** Sample configuration:
		const config = {
			data_sync_store: 'data_sync',
			keys_to_sync: {
				'appPreferences': {
					type: 'data',
					delta_dt_field: 'modified_dt'
				},
				'things/all': {
					type: 'dict',
					delta_dt_field: 'modified_dt'
				},
				...
			}
		} */

	const sea = gun.user()._.sea;

	const house_keep = (update_path, key, location, time_taken=0, error=false) => {


		// console.log("---",update_path, key, location, time_taken, "---")

		const time = (time_taken !== 0 ? (time_taken/1000)+'s' : '');

		debug_cb(`\t#${key} -> changed /${update_path} @${location} - ${time}`, error ? 'error' : 'normal');
		if (update_path in house_keeping) {
			house_keeping[update_path][location].push(key);
			house_keeping[update_path]['total'] += (time_taken/1000); // total seconds

			// calculate average
			house_keeping[update_path]['avg'] = house_keeping[update_path]['total'] / house_keeping[update_path][location].length;

			// calculate variance = <X^2> - <X>^2
			house_keeping[update_path]['total_pow'] += Math.pow(time_taken/1000, 2);
			house_keeping[update_path]['var'] = house_keeping[update_path]['total_pow']/house_keeping[update_path][location].length - Math.pow(house_keeping[update_path]['avg'], 2);
		} else {
			house_keeping[update_path] = {};
			house_keeping[update_path]['remote'] = [];
			house_keeping[update_path]['local'] = [];
			house_keeping[update_path][location].push(key);

			// some basic stats for pure fun
			house_keeping[update_path]['total'] = time_taken/1000;

			// calculate average
			house_keeping[update_path]['avg'] = 0;

			house_keeping[update_path]['total_pow'] = Math.pow(time_taken/1000, 2);
			house_keeping[update_path]['var'] = 0;
		}
	}

	let to_update_local = {};

	// A. For each KEY (in store) to sync, go through GunDB update cycle
	const sync_keys = Object.keys(config['keys_to_sync']);
	for (let jj=0; jj<sync_keys.length; jj++) {

		const key = sync_keys[jj];
		to_update_local[key] = {};
		const { type, delta_dt_field } = config['keys_to_sync'][key];

		debug_cb("Syncing on "+key);

		//////////
		// SYNCING SINGULAR DATA (no dictionary with similar items)
		//////////
		if (type == 'data') {
			// 0. retrieve local data on key
			const local_data = store[key];
			const local_mod_dt = local_data[delta_dt_field];

			// eg: spellbook/changes/appPreferences
			const full_path = app_name+'/changes/'+key;
			console.log(full_path, type, local_mod_dt);

			// 1. retrieve gun-db data, on key
			const ack = await gun.user().get(full_path).then(); // then promisifies

			// 2a. decrypt user data
			const decrypted_obj = await SEA.decrypt(ack, sea);

			// ---> UPDATE (AND ENCRYPT) DAT AIN GUNDB - IF:
			if ( 	decrypted_obj === undefined || // a. not stored
					decrypted_obj?.modified_dt === undefined ||  // b. not present
					decrypted_obj?.modified_dt < local_mod_dt) { // c. local version is later
				
				const encrypted_obj = await SEA.encrypt(local_data, sea);
				gun.user().get(full_path).put(encrypted_obj);

				// house keep
				house_keep(key, 'just', 'remote');
			}

			// ---> UPDATE LOCAL STORE - IF:
			else if (decrypted_obj?.modified_dt > local_mod_dt) {
				// draftStore[key] = decrypted_obj
				to_update_local[key] = decrypted_obj;

				// house keep
				house_keep(key, 'just', 'local');
			}
		}

		//////////
		// SYNCING DICTIONARY DATA (dict with similar items, different mod date)
		//////////
		else if (type == 'dict') {

			console.log("should sync brro ...");

			// 0a. retrieve local data on key, go through key-path
			let _path_store = goThroughPath(store, key);

			// const local_mod_dt = _path_store['modified_dt'];
			const full_path = app_name+'/changes/'+key; // gundb

			// Gather all LOCAL objects which we want to sync
			const all_local_keys = Object.keys(_path_store);

			let local_keys = [];
			let local_key_to_dt = {};
			for(let ii=0;ii<all_local_keys.length;ii++){
				const kk = all_local_keys[ii];
				// remove any quotes
				// console.log("kkk", "lll", kk, ii, all_local_keys[ii], _path_store[kk]);
				const _local_dt = _path_store[kk]?.['modified_dt'].replace(/"/g, "") ?? undefined;

				if (_local_dt !== undefined) {
					local_keys.push(kk); // keep reference in list
					local_key_to_dt[kk] = _local_dt // keep reference with mod_dt in list
				}
			};

			// For each key, check gunDB for artefacts older than `last_sync_dt`
			const data_full_path = gun.user().get(full_path);

			const removeMetaData = (o) => {
				const copy = {...o};
				delete copy._;
				return copy;
			};

			// fetch data - try 3x
			let ack = undefined;
			console.log('Getting list of modifications');
			for(let i=0; i<3; i++){
				// const mods_promise = new Promise((ok, err) => gun.user().get(full_path).get('mods').once(data => ok(data))); // gather all keys, and their stored last mod date
				// ack = await mods_promise();
				if (ack !== undefined) break;
			}

			// if nothing has ever been stored here, do a full blown commit to gunDB
			if (ack === undefined) {
				console.log('Doing full upload to gun (encrypted)');

				let thing_kk = 0;
				let thing = 0;
				let modified_dt = 0;
				let encrypted_obj = '';

				// encrypt thing
				for (let i=0; i<local_keys.length ; i++) {
					// the thing
					thing_kk = local_keys[i];
					thing = _path_store[thing_kk];
					modified_dt = thing['modified_dt'].replace(/"/g, "");; // its mod date

					
					try {
						// encrypt thing
						encrypted_obj = await SEA.encrypt(thing, sea);

						// put thing to @spellbook/changes/{store_key}/thing_kk
						await data_full_path.get(thing_kk).put(encrypted_obj).then();
					
						// put reference to a tracking list @spellbook/changes/{store_key}/mods
						await data_full_path.get('mods').put({[thing_kk]: modified_dt}).then();

						house_keep(key, thing_kk, 'remote');
					} catch (e) {
						console.log("ERROR!");
						house_keep(key, thing_kk, 'remote', 0, true);
					}
					
				}

				// console.log('Exiting loop', key);
				continue;
			}

			console.log("Going through iterative comparing of each thing");

			const remote_key_to_dt = removeMetaData(ack);
			const remote_keys = Object.keys(remote_key_to_dt);

			// go through all LOCAL KEYS (covers 3 cases)
			for (let l_ii=0 ; l_ii<local_keys.length ; l_ii++) {
				const local_kk = local_keys[l_ii];

				// Both contain reference to this key
				if (remote_keys.indexOf(local_kk) >= 0) {

					// if local mod_dt > gunDB mod_dt -> UPDATE REMOTE (gun) + store modification reference
					if ( local_key_to_dt[local_kk] > remote_key_to_dt[local_kk] ) {

						let start = new Date().getTime();
						try {
							// the thing
							const thing = _path_store[local_kk];

							// encrypt thing
							const encrypted_obj = await SEA.encrypt(thing, sea);

							// put thing to @spellbook/changes/{store_key}/thing_kk
							await data_full_path.get(local_kk).put(encrypted_obj).then();
						
							// put reference to a tracking LIST @spellbook/changes/{store_key}/mods/{mod_dt}
							await data_full_path.get('mods').put({[local_kk]:local_key_to_dt[local_kk]}).then();

							// house keep
							let end = new Date().getTime();
							house_keep(key, local_kk, 'remote', end-start);	

						} catch (e) {
							// house keep
							let end = new Date().getTime();
							house_keep(key+' error:' + e, local_kk, 'remote', end-start, true);
						}

					}

					// if REMOTE mod_dt > LOCAL mod_dt -> UPDATE LOCAL (store) + update last_mutation_dt
					else if ( local_key_to_dt[local_kk] < remote_key_to_dt[local_kk] ) { 


						let start = new Date().getTime();
						try {
							// FETCH FROM GUN, and DECRYPT
							const object_encrypted = await data_full_path.get(local_kk).then();
							const decrypted_obj = await SEA.decrypt(object_encrypted, sea);

							// UPDATE AT LOCAL
							// let _path_store = goThroughPath(draftStore, key);
							// _path_store[local_kk] = decrypted_obj;
							to_update_local[key][local_kk] = decrypted_obj;
					
							// house keep
							let end = new Date().getTime();
							house_keep(key, local_kk, 'local', end-start);
						} catch (e) {
							// house keep
							let end = new Date().getTime();
							house_keep(key+' error:' + e, local_kk, 'remote', end-start, true);
						}
						
					}

				// local contains reference, not present in remote
				// -> UPDATE REMOTE (gun) + store modification reference
				} else {

					let start = new Date().getTime();
					try {
						// the thing
						const thing = _path_store[local_kk];

						// encrypt thing
						const encrypted_obj = await SEA.encrypt(thing, sea);

						// put thing to @spellbook/changes/{store_key}/local_kk
						await data_full_path.get(local_kk).put(encrypted_obj).then();
					
						// put reference to a tracking LIST @spellbook/changes/{store_key}/mods/{mod_dt}
						await data_full_path.get('mods').put({[local_kk]:local_key_to_dt[local_kk]}).then();

						// house keep
						let end = new Date().getTime();
						house_keep(key, local_kk, 'remote', end-start);

					} catch (e) {
						// house keep
						let end = new Date().getTime();
						house_keep(key+' error:' + e, local_kk, 'remote', end-start, true);
					}
					
				}
			}

			// go through all REMOTE KEYS (covers 1 case)
			for (let r_ii=0 ; r_ii<remote_keys.length ; r_ii++) {
				
				const remote_kk = remote_keys[r_ii];

				// consider, if REMOTE YES, and LOCAL NOT
				if (local_keys.indexOf(remote_kk) < 0) {

					let start = new Date().getTime();
					try {
						// FETCH FROM GUN, and DECRYPT
						const object_encrypted = await data_full_path.get(remote_kk).then();
						const decrypted_obj = await SEA.decrypt(object_encrypted, sea);

						// UPDATE AT LOCAL
						// let _path_store = goThroughPath(draftStore, key);
						// _path_store[remote_kk] = decrypted_obj;

						to_update_local[key][remote_kk] = decrypted_obj;

						// house keep
						let end = new Date().getTime();
						house_keep(key, remote_kk, 'local', end-start);
					} catch (e) {
						// house keep
						let end = new Date().getTime();
						house_keep(key+' error:' + e, local_kk, 'remote', end-start, true);
					}
					
				}
			}
		}

		debug_cb("\t ... done sync logic on "+key);

	} // end of for-loop, going through the many syncs...

	const new_store = await produce(store, async (draftStore) => {
		const sync_keys = Object.keys(to_update_local);
		for (let jj=0; jj<sync_keys.length; jj++) {

			const key = sync_keys[jj];
			const data = to_update_local[key];
			const { type, delta_dt_field } = config['keys_to_sync'][key];

			debug_cb("Writing local on "+key);
			const properties = Object.keys(data);

			// if dealing with a data field, update
			if (type === 'data' && properties.length > 0) {

				draftStore[key] = data;
				debug_cb("\t... updated local "+key);

			// if dealing with a dict field, update differently
			} else if (type === 'dict' && properties.length > 0) {
				for (let kk_i=0; kk_i<properties.length; kk_i++){
					const thing_kk = properties[kk_i];
					let _path_store = goThroughPath(draftStore, key);
					_path_store[thing_kk] = data[thing_kk];

					debug_cb("\t... updated local "+key+'/'+thing_kk);
				}
			}
		}

	});

	debug_cb("DONE THE SYNC");

	return {new_store, house_keeping};
}

const gun_sync_lex_based = async (store, config, gun=_=>{}, debug_cb=_=>{}) => {

	// house keeping, useful for communication to devs and users alike
	// Store per key (key_to_sync) --> local updates + remote
	let house_keeping = {
	};

	/** Sample configuration:
		const config = {
			data_sync_store: 'data_sync',
			keys_to_sync: {
				'appPreferences': {
					type: 'data',
					delta_dt_field: 'modified_dt'
				},
				'things/all': {
					type: 'dict',
					delta_dt_field: 'modified_dt'
				},
				...
			}
		} */

	const house_keep = (update_path, key, location) => {
		if (update_path in house_keeping) {
			house_keeping[update_path][location].push(key);
		} else {
			house_keeping[update_path] = {};
			house_keeping[update_path]['remote'] = [];
			house_keeping[update_path]['local'] = [];
			house_keeping[update_path][location].push(key);
		}
	}

	const new_store = await produce(store, async (draftStore) => {

		console.log(draftStore['data_sync']['last_sync_dt']);

		// 1. get last_local_mutation_date, and last modified date of any object (anything in index list)
		const last_sync_dt = draftStore['data_sync']['last_sync_dt'].replace(/"/g, "");
		console.log("wow", last_sync_dt);
		// debug_cb("wow holy balls");
		// debug_cb(config);

		let new_last_sync_dt = last_sync_dt;

		// 2. For each key to sync, go through GunDB update cycle.
		const sync_keys = Object.keys(config['keys_to_sync']);
		for (let jj=0; jj<sync_keys.length; jj++) {
			const key = sync_keys[jj];
			const { type, delta_dt_field } = config['keys_to_sync'][key];

			//////////
			// SYNCING SINGULAR DATA (no dictionary with similar items)
			//////////
			if (type == 'data') {
				// 0. retrieve local data on key
				const local_data = draftStore[key];
				const local_mod_dt = local_data[delta_dt_field];

				// eg: spellbook/changes/appPreferences
				const full_path = app_name+'/changes/'+key;

				// 1. retrieve gun-db data, on key
				const ack = await gun.user().get(full_path).then(); // then promisifies

				// 2a. decrypt user data
				const decrypted_obj = await SEA.decrypt(ack, sea);

				// ---> UPDATE (AND ENCRYPT) DAT AIN GUNDB - IF:
				if ( 	decrypted_obj === undefined || // a. not stored
						decrypted_obj?.modified_dt === undefined ||  // b. not present
						decrypted_obj?.modified_dt < local_mod_dt) { // c. local version is later
					
					const encrypted_obj = await SEA.encrypt(local_data, sea);
					gun.user().get(full_path).put(encrypted_obj);

					// house keep
					house_keep(key, 'just', 'remote');
				}

				// ---> UPDATE LOCAL STORE - IF:
				else if (decrypted_obj?.modified_dt > local_mod_dt) {
					draftStore[key] = decrypted_obj

					// house keep
					house_keep(key, 'just', 'local');
				}
			}

			//////////
			// SYNCING DICTIONARY DATA
			//////////
			else if (type == 'dict') {

				// 0a. retrieve local data on key, go through key-path
				let _path_store = goThroughPath(draftStore, key);

				// const local_mod_dt = _path_store['modified_dt'];
				const full_path = app_name+'/changes/'+key; // gundb

				// Which local KEYS happened after the `last_fetch_dt`
				let local_keys = [];
				let local_key_to_dt = {};
				Object.keys(_path_store).forEach( (kk, ii) => { // go through each kk
					// remove any quotes
					const _local_dt = _path_store[kk]['modified_dt'].replace(/"/g, "");

					console.log("_local_dt -->",_local_dt, last_sync_dt);

					if (_local_dt > last_sync_dt) { // if this thing has been modified after fetch
						local_keys.push(kk); // keep reference in list
						local_key_to_dt[kk] = _local_dt // keep reference with mod_dt in list
					}
				});

				// For each key, check gunDB for artefacts older than `last_sync_dt`
				const data_full_path = gun.user().get(full_path);
				const mods = data_full_path.get('mods');

				const removeMetaData = (o) => {
					const copy = {...o};
					delete copy._;
					return copy;
				};

				// fetch data 
				const ack = await mods.get({'.': {'>': last_sync_dt}}).then(); // then creates a promise

				// if nothing has ever been stored here, do a full blown commit to gunDB
				if (ack === undefined) {
					console.log('creating !@# creating');
					for (let i=0; i<local_keys.length ; i++) {
						// the thing
						const thing_kk = local_keys[i];
						const thing = _path_store[thing_kk];
						const modified_dt = thing['modified_dt'].replace(/"/g, "");; // its mod date

						// encrypt thing
						const encrypted_obj = await SEA.encrypt(thing, sea);

						// put thing to @spellbook/changes/{store_key}/thing_kk
						data_full_path.get(thing_kk).put(encrypted_obj);
					
						// put reference to a tracking list @spellbook/changes/{store_key}/mods/{mod_dt}
						data_full_path.get('mods').get(modified_dt).set(thing_kk);

						// UPDATE NEW_LAST_SYNC_DT, if applicable
						if (new_last_sync_dt < modified_dt) {
							new_last_sync_dt = modified_dt
						}

						house_keep(key, thing_kk, 'remote');
					}

					continue;
				}

				// 0. Retrieve keys from GunDB, which have been processed later than XYZ
				//    We're processing a set - a list of unique items, which gun returns as a list of ids
				const {remote_keys, remote_key_to_dt} = await mods.get({'.': {'>': last_sync_dt}}).then()

				// 1. Remove _ key (metadata)
				.then(o => {
					console.log("lex filtered, apparently", o);
					return removeMetaData(o)
				})

				// 2. Retrieve an array with keys, pointing to individual items
				.then(o => Object.keys(o).map(k => [k, o[k]["#"]] ))

				// 3. For each key, make a call to GunDB (this involves waiting on many promises)
				.then(refs => {
					return Promise.all( // resolve a list of calls to GunDB, based on:
						refs.map(r => { // each retrieved reference (ID)
							const dt=r[0], g_path=r[1]; // modification dt | path to thing in gun

							// get itemS at `g_path`, but return an object with the dt key in it
							return gun.get(g_path).then(data => ({dt,...removeMetaData(data)}) )
						})
					)
				})

				/**  4. Post process results, we have an array now, with the following structure:
					Array [
						Object {
						"dt": "2022-07-16T20:39:40.404Z", <-- need this
						"l5ocrfv2Qh6j4Eu": "38621", <-- We're interested in the item (key in GunDB Based)
						},
						Object {
						"dt": "2022-07-13T21:23:42.253Z", <--
						"l5ocrfzf01a3SkZSsa": "20220713232342", <-- need this
						"l5ocrg3501a1Ewd5aH": "20220713232343", <-- need this
						},
					]

					What we need is to convert the above into two objects: [ids] and [id:dt], similar to the local_keys objects
				*/
				.then(res => {
					let _remote_keys = [];
					let _remote_key_to_dt = {};

					for (let i=0; i<res.length;i++){ // go through all items (date items, really)
						const o = res[i];
						const mod_dt = o['dt'] // retrieve the modification date
						Object.keys(o).forEach(d_kk => {

							// only insert for non-dt fields, and if field < last_fetch_dt
							if (d_kk !== "dt" && mod_dt > last_sync_dt) {
								const thing_kk = o[d_kk];

								// thing was never seen when iterating
								if (_remote_keys.indexOf(thing_kk) < 0) {
									_remote_keys.push(thing_kk);
									_remote_key_to_dt[thing_kk] = mod_dt;
								} else { //  thing has been indexed already -> compare dates

									// only keep track of the latest modified date to the object
									// as stored in gundb
									if ( _remote_key_to_dt[thing_kk] < mod_dt ) {
										_remote_key_to_dt[thing_kk] = mod_dt;
									}
								}
							}
						})
					}

					return {remote_keys:_remote_keys, remote_key_to_dt:_remote_key_to_dt};
				})

				// const not_considered_
				console.log("#remote --->>", remote_keys, remote_key_to_dt);
				console.log("#local --->>", local_keys, local_key_to_dt);

				// go through all LOCAL KEYS (covers 3 cases)
				for (let l_ii=0 ; l_ii<local_keys.length ; l_ii++) {
					const local_kk = local_keys[l_ii];

					// Both contain reference to this key
					if (remote_keys.indexOf(local_kk) >= 0) {

						// if local mod_dt > gunDB mod_dt -> UPDATE REMOTE (gun) + store modification reference
						if ( local_key_to_dt[local_kk] > remote_key_to_dt[local_kk] ) {

							// the thing
							const thing = _path_store[local_kk];

							// encrypt thing
							const encrypted_obj = await SEA.encrypt(thing, sea);

							// put thing to @spellbook/changes/{store_key}/thing_kk
							data_full_path.get(local_kk).put(encrypted_obj);
						
							// put reference to a tracking LIST @spellbook/changes/{store_key}/mods/{mod_dt}
							data_full_path.get('mods').get(local_key_to_dt[local_kk]).set(local_kk);

							// UPDATE NEW_LAST_SYNC_DT, if applicable
							if (new_last_sync_dt < local_key_to_dt[local_kk]) {
								new_last_sync_dt = local_key_to_dt[local_kk]
							}

							// house keep
							house_keep(key, local_kk, 'remote');
						}

						// if REMOTE mod_dt > LOCAL mod_dt -> UPDATE LOCAL (store) + update last_mutation_dt
						else if ( local_key_to_dt[local_kk] < remote_key_to_dt[local_kk] ) { 
							// FETCH FROM GUN, and DECRYPT
							const object_encrypted = await data_full_path.get(local_kk).then();
							const decrypted_obj = await SEA.decrypt(object_encrypted, sea);

							// UPDATE AT LOCAL
							let _path_store = goThroughPath(draftStore, key);
							_path_store[local_kk] = decrypted_obj;
							
							// UPDATE NEW_LAST_SYNC_DT, if applicable
							if (new_last_sync_dt < remote_key_to_dt[local_kk]) {
								new_last_sync_dt = remote_key_to_dt[local_kk]
							}

							// house keep
							house_keep(key, local_kk, 'local');
						}

					// local contains reference, not present in remote
					// -> UPDATE REMOTE (gun) + store modification reference
					} else {
						// the thing
						const thing = _path_store[local_kk];

						// encrypt thing
						const encrypted_obj = await SEA.encrypt(thing, sea);

						// put thing to @spellbook/changes/{store_key}/local_kk
						data_full_path.get(local_kk).put(encrypted_obj);
					
						// put reference to a tracking LIST @spellbook/changes/{store_key}/mods/{mod_dt}
						data_full_path.get('mods').get(local_key_to_dt[local_kk]).set(local_kk);

						// UPDATE LAST_SYNC_DT IN STORE, if applicable
						// UPDATE NEW_LAST_SYNC_DT, if applicable
						if (new_last_sync_dt < local_key_to_dt[local_kk]) {
							new_last_sync_dt = local_key_to_dt[local_kk]
						}

						// house keep
						house_keep(key, local_kk, 'remote');
					}
				}

				// go through all REMOTE KEYS (covers 1 case)
				for (let r_ii=0 ; r_ii<remote_keys.length ; r_ii++) {
					const remote_kk = remote_keys[r_ii];

					// consider, if REMOTE YES, and LOCAL NOT
					if (local_keys.indexOf(remote_kk) < 0) {
						// FETCH FROM GUN, and DECRYPT
						const object_encrypted = await data_full_path.get(remote_kk).then();
						const decrypted_obj = await SEA.decrypt(object_encrypted, sea);

						// UPDATE AT LOCAL
						let _path_store = goThroughPath(draftStore, key);
						_path_store[remote_kk] = decrypted_obj;

						// UPDATE NEW_LAST_SYNC_DT, if applicable
						if (new_last_sync_dt < remote_key_to_dt[remote_kk]) {
							new_last_sync_dt = remote_key_to_dt[remote_kk]
						}

						// house keep
						house_keep(key, remote_kk, 'local');
					}
				}

			}

		} // end of for-loop, going through the many syncs...

			
		// updating last sync date in store
		console.log("Updating last sync date in store:", new_last_sync_dt);
		draftStore[config['datasync_store_field']]['last_sync_dt'] = new_last_sync_dt
	});

	console.log("BLOWN THROUGH IT");

	return {new_store, house_keeping};
}

const getConnectedPeers = (gun) => {
	const opt_peers = gun.back('opt.peers');
	let connectedPeers = _.filter(Object.values(opt_peers), (peer) => {
		return  peer
				&& peer.wire
				&& peer.wire.readyState === 1
				&& peer.wire.OPEN === 1
				&& peer.wire.constructor.name === 'WebSocket';
	});

	// console.log("connectedPeers", connectedPeers);
	return connectedPeers;
}

export {
	gun_sync_lex_based,
	gun_sync,
	getConnectedPeers
};
