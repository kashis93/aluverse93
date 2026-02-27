import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth, db } from "@/services/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getDoc as getDocFn } from "firebase/firestore";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        
        if (!userDoc.exists()) {
          // If user exists in Auth but not in Firestore (e.g., first Google login)
          const userData = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || "User",
            email: firebaseUser.email,
            role: "student",
            photoURL: firebaseUser.photoURL || "",
            createdAt: serverTimestamp()
          };
          await setDoc(doc(db, "users", firebaseUser.uid), userData);
          setUser(userData);
        } else {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            ...userDoc.data()
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Allows other components to refresh the cached user data from Firestore
  const refreshUser = useCallback(async (uid) => {
    try {
      const targetUid = uid || (auth.currentUser && auth.currentUser.uid);
      if (!targetUid) return null;
      const userDoc = await getDoc(doc(db, "users", targetUid));
      if (userDoc.exists()) {
        const firebaseUser = auth.currentUser;
        setUser({
          uid: targetUid,
          email: firebaseUser?.email,
          displayName: firebaseUser?.displayName,
          photoURL: firebaseUser?.photoURL,
          ...userDoc.data()
        });
        return true;
      }
      return null;
    } catch (err) {
      console.warn("refreshUser failed:", err);
      return null;
    }
  }, []);

  const signup = async (email, password, name, role = "student") => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(firebaseUser, { displayName: name });

      const userData = {
        uid: firebaseUser.uid,
        name,
        email,
        role,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, "users", firebaseUser.uid), userData);
      setUser(userData);
      setShowLoginModal(false);
      return { success: true };
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowLoginModal(false);
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowLoginModal(false);
      return { success: true };
    } catch (error) {
      console.error("Google login error:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, []);

  const requireAuth = useCallback((_action) => {
    if (!user) {
      setShowLoginModal(true);
      return false;
    }
    return true;
  }, [user]);

  const checkProfileComplete = useCallback((userData) => {
    if (!userData) return false;
    if (userData.role === "alumni") {
      return !!(userData.graduationYear && userData.department && userData.company && userData.achievement);
    } else {
      return !!(userData.graduationYear && userData.department);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn: !!user,
      isProfileComplete: checkProfileComplete(user),
      refreshUser,
      loading,
      signup,
      login,
      loginWithGoogle,
      logout,
      showLoginModal,
      setShowLoginModal,
      requireAuth
    }}>
      {loading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">Loading your session...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
