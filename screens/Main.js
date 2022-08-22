import React from 'react'
import Home from './HomeScreen'
import Auth from './AuthScreen'

import { useAuth, useGunDB } from '../contexts'

export default function Main () {
  	const profile = useAuth()
	const { user } = useGunDB();

  	return !user.is ? <Auth /> : <Home />
}