import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'user' | 'merchant' | 'driver' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  bootstrapped: boolean;
  error: string | null;
}

const initialState: AuthState = {
  session: null,
  user: null,
  profile: null,
  loading: false,
  bootstrapped: false,
  error: null,
};

// Bootstrap auth (check existing session)
export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrap',
  async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }
);

// Sign up
export const signUp = createAsyncThunk(
  'auth/signUp',
  async (data: { email: string; password: string; fullName: string; phone?: string }, { rejectWithValue }) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: data.fullName,
          phone: data.phone || null,
          role: 'user',
        });

      if (profileError) throw profileError;

      return authData.session;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Sign in
export const signIn = createAsyncThunk(
  'auth/signIn',
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;
      return authData.session;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Sign out
export const signOut = createAsyncThunk(
  'auth/signOut',
  async () => {
    await supabase.auth.signOut();
  }
);

// Fetch profile
export const fetchMyProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Reset password
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'pattibytesexpress://reset-password',
      });
      if (error) throw error;
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<Session | null>) => {
      state.session = action.payload;
      state.user = action.payload?.user || null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Bootstrap
    builder.addCase(bootstrapAuth.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(bootstrapAuth.fulfilled, (state, action) => {
      state.session = action.payload;
      state.user = action.payload?.user || null;
      state.bootstrapped = true;
      state.loading = false;
    });
    builder.addCase(bootstrapAuth.rejected, (state) => {
      state.bootstrapped = true;
      state.loading = false;
    });

    // Sign up
    builder.addCase(signUp.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signUp.fulfilled, (state, action) => {
      state.session = action.payload;
      state.user = action.payload?.user || null;
      state.loading = false;
    });
    builder.addCase(signUp.rejected, (state, action) => {
      state.error = action.payload as string;
      state.loading = false;
    });

    // Sign in
    builder.addCase(signIn.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signIn.fulfilled, (state, action) => {
      state.session = action.payload;
      state.user = action.payload?.user || null;
      state.loading = false;
    });
    builder.addCase(signIn.rejected, (state, action) => {
      state.error = action.payload as string;
      state.loading = false;
    });

    // Sign out
    builder.addCase(signOut.fulfilled, (state) => {
      state.session = null;
      state.user = null;
      state.profile = null;
    });

    // Fetch profile
    builder.addCase(fetchMyProfile.fulfilled, (state, action) => {
      state.profile = action.payload;
    });

    // Reset password
    builder.addCase(resetPassword.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(resetPassword.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(resetPassword.rejected, (state, action) => {
      state.error = action.payload as string;
      state.loading = false;
    });
  },
});

export const { setSession, clearError } = authSlice.actions;
export default authSlice.reducer;
