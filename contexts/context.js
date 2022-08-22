import React, { createContext, useContext, useReducer } from 'react';
import { initialState, AuthReducer } from './reducer';


import newGunInstance from './gunInstance';
const gunInstance = newGunInstance();

export const AuthContext = createContext();
export const AuthDispatchContext = createContext();
export const GunDBContext = createContext();

export function useAuth () {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error('useAuth must be used within a AuthProvider')
	}
	return context
}

// custom hook to dispatch authentication to context
export function useAuthDispatch () {
	const context = useContext(AuthDispatchContext)
	if (context === undefined) {
		throw new Error('useAuthDispatch must be used within a AuthProvider')
	}

	return context
}

// custom hook to dispatch gun instance to context
export function useGunDB () {
	const context = useContext(GunDBContext)
	if (context === undefined) {
		throw new Error('useGunDB must be used within a AuthProvider')
	}

	return context
}

// Auth provider context for all child components in the application
export const AuthProvider = ({ children }) => {
  	const [user, dispatch] = useReducer(AuthReducer, initialState)

  	return (
		<GunDBContext.Provider value={gunInstance}>
    		<AuthContext.Provider value={user}>
      			<AuthDispatchContext.Provider value={dispatch}>
        			{children}
      			</AuthDispatchContext.Provider>
			</AuthContext.Provider>
		</GunDBContext.Provider>
  	)
}

export { gunInstance };