import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  db,
  doc,
  getDoc,
  setDoc,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { UserProfile } from '../types';

export const DEFAULT_PROFILE: UserProfile = {
  uid: 'demo_user',
  email: 'tanjir.dollar@gmail.com',
  displayName: 'Tanjir',
  age: 38,
  gender: 'male',
  heightCm: 165,
  targetWeightKg: 63,
  targetWaistCm: 85, // intermediate goal toward < 82.5 cm
  dailyCalorieTarget: 1850,
  dailyProteinTargetGrams: 75,
  dailyStepsTarget: 7000,
  dailyWalkingMinutesTarget: 35,
  dailyWaterTargetGlasses: 9,
  weeklyWorkoutsTarget: 3,
  language: 'en',
  updatedAt: new Date().toISOString(),
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  isDemoUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            // First time setup with baseline profile
            const newProfile: UserProfile = {
              ...DEFAULT_PROFILE,
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Tanjir',
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        // Load demo/guest state from local storage or default
        const local = localStorage.getItem('myfit_demo_profile');
        if (local) {
          try {
            setProfile(JSON.parse(local));
          } catch {
            setProfile(DEFAULT_PROFILE);
          }
        } else {
          setProfile(DEFAULT_PROFILE);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-in failed:', error);
      throw error;
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      setProfile(DEFAULT_PROFILE);
    } catch (error) {
      console.error('Sign-out failed:', error);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const updated = {
      ...profile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setProfile(updated);

    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userDocRef, updated, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    } else {
      localStorage.setItem('myfit_demo_profile', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        logOut,
        updateProfile,
        isDemoUser: !user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
