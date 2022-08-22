import 'gun/lib/mobile'
import Gun from 'gun/gun';
import SEA from 'gun/sea';

// import 'gun/lib/not';
import 'gun/lib/then';

const useGun = () => {
	const gun = Gun({
		peers: ['http://localhost:8765/gun', 'http://192.168.1.159:8765/gun'],
		// peers: ['https://quiet-temple-72109.herokuapp.com/gun'],
		// peers: ['https://ancient-journey-24749.herokuapp.com/gun'],
		// peers: ['https://spellbook-gundb-relay.herokuapp.com/gun'],
		// peers: ['https://triple-flame-relay-eu.herokuapp.com/gun'],
		// localStorage: false,
		// file: false,
		// radix: false,
	})

	//App namespace
	// const app = gun.get('spellbook-testdb');
	const user = gun.user();

	return { gun, user, SEA };
}

export default useGun;