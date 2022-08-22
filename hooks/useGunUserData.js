import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useGunDB } from "../contexts";

const useGunUserData = (key) => {
	const [ data, setData ] = useState([]);
	const { user, SEA, gun } = useGunDB(); // hooks to gunDB instance

	// Remember the latest callback.
	useEffect(() => {
		// Create listener on all items within `key`
		gun.user().get(key).map(captureData);

		// Turn off subscription when components unmounts
		return ()=> {
			gun.user().get(key).map().off();
			gun.user().get(key).off();
		}
	}, [key]);

	const captureData = useCallback( async (data, gun_id) => {

		// decrypt user data
		const decrypt_data = await SEA.decrypt(data, user._.sea);

		// set user space data
		setData(prevData => ({...prevData, [gun_id]:decrypt_data}))
	});

	const putThingSecret = async (id, data) => {
		// encrypt user data
		const encrypted_obj = await SEA.encrypt(data, user._.sea);

		// put encrypted data into gun
		gun.user().get(key).get(id).put(encrypted_obj, ack => {
			if (ack.err === undefined)
				console.log("ok written")
			else
				console.log("Put error", ack.err);
		});
	}

	return [data, putThingSecret];
}

export default useGunUserData;