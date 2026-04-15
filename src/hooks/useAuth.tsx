import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, Gym } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  gym: Gym | null;
  loading: boolean;
  isAuthReady: boolean;
  isAdmin: boolean;
  isApproved: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  gym: null,
  loading: true,
  isAuthReady: false,
  isAdmin: false,
  isApproved: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
      if (!user) {
        setProfile(null);
        setGym(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || !isAuthReady) return;

    const profilePath = `users/${user.uid}`;
    const unsubscribeProfile = onSnapshot(
      doc(db, profilePath),
      (docSnap) => {
        if (docSnap.exists()) {
          const profileData = docSnap.data() as UserProfile;
          setProfile(profileData);

          if (profileData.gymId) {
            const gymPath = `gyms/${profileData.gymId}`;
            onSnapshot(
              doc(db, gymPath),
              (gymSnap) => {
                if (gymSnap.exists()) {
                  setGym(gymSnap.data() as Gym);
                }
                setLoading(false);
              },
              (error) => handleFirestoreError(error, OperationType.GET, gymPath)
            );
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, profilePath)
    );

    return () => unsubscribeProfile();
  }, [user, isAuthReady]);

  const isAdmin = profile?.role === 'admin' || user?.email === 'laptopyt0000@gmail.com';
  const isApproved = profile?.status === 'approved' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, profile, gym, loading, isAuthReady, isAdmin, isApproved }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
