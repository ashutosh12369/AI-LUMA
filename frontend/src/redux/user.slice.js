import { createSlice } from '@reduxjs/toolkit'
import { act } from 'react'

const initialState = {
  userData: null,
  isCheckingAuth: true
}

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserData: (state, action) => {
        state.userData = action.payload
    },
    setIsCheckingAuth: (state, action) => {
        state.isCheckingAuth = action.payload
    }
  },
})

export const { setUserData, setIsCheckingAuth } = userSlice.actions

export default userSlice.reducer