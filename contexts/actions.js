import { gunInstance } from "./context";
const { gun } = gunInstance;

export async function authUser (dispatch, payload) {
	console.log("authing user...", payload);
	gun.user().auth(payload.username, payload.pwd, (ack)=>{
		// console.log(gun.user().is, "... done status");

		// check i no error on user authentication
		if (! ('err' in ack)) {

			// check if authenticated
			gun.on( 'auth', ack2 => {
				console.log('Authentication was successful')

				// Update username in gundb
				gun.user()
					.get('profile').get('name').put(payload.username).then();

				// put public key in users node
				const user = gun.user();
				gun.get('spellbook/users').set(user.is.pub);

				// Update context after we've updated information in gundb
				gun.user()
					.get('profile').get('name')
					.on(username => {
						console.log('Got username from GunDB', username);
						
						// Update the username and key in our auth context
						dispatch({
							type: 'AUTH',
							payload: {
								username: username,
								key: JSON.stringify(user.is)
							}
						})
					});
				
			})



			// gun.user()
			// .get('profile')
			// .get('name')
			// .on(username => {
			// 	console.log('Got username', username);
				
			// 	// Update the username and key in our auth context
			// 	dispatch({
			// 		type: 'AUTH',
			// 		payload: {
			// 			username: username,
			// 			key: JSON.stringify(user.is)
			// 		}
			// 	})
			// })
	  	} else {
			console.log("Got error - ", ack.err);
		}

	});

	// console.log("... done auth");
	// console.log("user.is", user.is);
	// if (user.is) {
	//   	user
	// 	.get('profile')
	// 	.get('name')
	// 	.on(username => {

	// 		console.log('Got username', username);
			
	// 		// Update the username and key in our auth context
	// 		dispatch({
	// 			type: 'AUTH',
	// 			payload: {
	// 				username: username,
	// 				key: JSON.stringify(user.is)
	// 			}
	// 		})
	// 	})
	// }
}

export async function createUser (dispatch, payload) {
	gun.user().create(payload.username, payload.pwd, (ack) => {

		console.log("GOT IN", ack);
		authUser(dispatch, { username: payload.username, pwd: payload.pwd })
		// user
		// 	.get('profile')
		// 	.get('name')
		// 	.put(payload.username)
	})
	
	// console.log("new_user_data", new_user_data);
	// authUser(dispatch, { username: payload.username, pwd: payload.pwd })
	// user
	// 	.get('profile')
	// 	.get('name')
	// 	.put(payload.username)
}

export async function logoutUser (dispatch) {
	gun.user().leave()
	// Resets the username and key in our auth context
	dispatch({ type: 'AUTH_LOGOUT' })
}
