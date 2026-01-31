import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('token');
const userStr = localStorage.getItem('user');

interface AuthState {
  token: string | null;
  user: {
    _id: string;
    username: string;
    fullName: string;
    roles: string[];
    permissions: string[];
    companyAccess: string[];
  } | null;
}

const initialState: AuthState = {
  token,
  user: userStr ? JSON.parse(userStr) : null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      if (action.payload.token) localStorage.setItem('token', action.payload.token);
      if (action.payload.user) localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
