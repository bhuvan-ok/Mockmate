import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { axiosInstance } from '../../api/axios.js';
import { setAccessToken } from '../../api/tokenManager.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const registerCandidate = createAsyncThunk(
  'auth/register',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post('/auth/register', payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  }
);

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post('/auth/login', payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Invalid email or password');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await axiosInstance.post('/auth/logout');
});

// Uses raw axios, NOT axiosInstance — the axiosInstance response interceptor
// would intercept its own 401 and loop; this call is meant to silently fail
// on first visit (no session yet) without triggering that logic.
export const initializeAuth = createAsyncThunk('auth/initialize', async (_, { rejectWithValue }) => {
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
    return data.data;
  } catch {
    return rejectWithValue(null);
  }
});

const initialState = {
  user: null,
  status: 'idle',
  initialized: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Dispatched when axios.js gives up on a refresh-token retry — distinct
    // from `logout` (no server round-trip; the server-side session is
    // already unrecoverable at this point) but clears the same state so
    // ProtectedRoute redirects immediately instead of leaving a stale,
    // half-authenticated UI up.
    sessionExpired: (state) => {
      state.user = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerCandidate.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerCandidate.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        setAccessToken(action.payload.accessToken);
      })
      .addCase(registerCandidate.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        setAccessToken(action.payload.accessToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'idle';
        setAccessToken(null);
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.initialized = true;
        setAccessToken(action.payload.accessToken);
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.initialized = true;
      });
  },
});

export const { sessionExpired } = authSlice.actions;
export default authSlice.reducer;
