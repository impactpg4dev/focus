// focus/src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, onAuthStateChanged, database, ref, get, DB_PATHS } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);

  // Fungsi untuk mencari user berdasarkan email di node users
  const findUserByEmail = async (email) => {
    try {
      const usersRef = ref(database, DB_PATHS.USERS);
      const snapshot = await get(usersRef);
      const data = snapshot.val();
      if (data) {
        for (const key in data) {
          if (data[key].email === email) {
            return {
              exists: true,
              userData: data[key],
              key: key
            };
          }
        }
      }
      return { exists: false, userData: null, key: null };
    } catch (error) {
      console.error('Error finding user by email:', error);
      return { exists: false, userData: null, key: null };
    }
  };

  // Fungsi untuk cek status tenaga kerja
  const checkEmploymentStatus = async (id_status_tenaga_kerja) => {
    try {
      if (!id_status_tenaga_kerja) {
        return { isActive: false, data: null };
      }
      const statusRef = ref(database, `${DB_PATHS.U_EMPLOYMENT_STATUS}/${id_status_tenaga_kerja}`);
      const snapshot = await get(statusRef);
      const data = snapshot.val();
      if (data && data.nama_status_tenaga_kerja === 'Aktif') {
        return { isActive: true, data };
      }
      return { isActive: false, data: null };
    } catch (error) {
      console.error('Error checking employment status:', error);
      return { isActive: false, data: null };
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          console.log('🔐 User authenticated:', firebaseUser.email);

          // 1. Cek email di u_email
          const emailRef = ref(database, DB_PATHS.U_EMAIL);
          const emailSnapshot = await get(emailRef);
          const emailData = emailSnapshot.val();

          let foundEmail = null;
          let emailKey = null;

          if (emailData) {
            for (const [key, value] of Object.entries(emailData)) {
              if (value.nama_email === firebaseUser.email && value.is_active === true) {
                foundEmail = value;
                emailKey = key;
                break;
              }
            }
          }

          if (!foundEmail || !emailKey) {
            console.log('❌ Email not found in u_email, signing out...');
            setIsActive(false);
            setUserData(null);
            await auth.signOut();
            setLoading(false);
            return;
          }

          // 2. Cari user di node users berdasarkan email
          const userSearch = await findUserByEmail(firebaseUser.email);
          if (!userSearch.exists) {
            console.log('❌ User not found in users, signing out...');
            setIsActive(false);
            setUserData(null);
            await auth.signOut();
            setLoading(false);
            return;
          }

          const userDataFromDb = userSearch.userData;
          console.log('👤 User data found:', userDataFromDb);

          // 3. Cek status tenaga kerja
          let isUserActive = false;
          let statusData = null;

          if (userDataFromDb.id_status_tenaga_kerja) {
            const statusCheck = await checkEmploymentStatus(userDataFromDb.id_status_tenaga_kerja);
            isUserActive = statusCheck.isActive;
            statusData = statusCheck.data;
          }

          console.log('📊 Status tenaga kerja:', statusData?.nama_status_tenaga_kerja || 'Not Set');
          console.log('✅ User active:', isUserActive);

          if (isUserActive) {
            setIsActive(true);
            setUserData({
              ...userDataFromDb,
              emailKey: emailKey,
              emailData: foundEmail,
              statusData: statusData,
            });
          } else {
            console.log('❌ User is NOT ACTIVE, signing out...');
            setIsActive(false);
            setUserData(null);
            await auth.signOut();
          }

        } catch (error) {
          console.error('❌ Error fetching user data:', error);
          setIsActive(false);
          setUserData(null);
          await auth.signOut();
        }
      } else {
        console.log('🔴 No user authenticated');
        setUserData(null);
        setIsActive(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userData,
    loading,
    isActive,
    setUser,
    setUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};