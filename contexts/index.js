import { authUser, createUser, logoutUser } from './actions'
import { AuthProvider, useAuthDispatch, useAuth, useGunDB } from './context'

// This file is made for cleaner imports
export {
	AuthProvider,
	useAuth,
	useAuthDispatch,
	useGunDB,
	authUser,
	createUser,
	logoutUser
}