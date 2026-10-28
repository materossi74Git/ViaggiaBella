import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { AppUser, UserRole } from '../types';
import { generateSalt, hashPin, verifyPin } from './pinService';
import { logAuditEvent } from './dbService';

export const ADMIN_EMAIL_BOOTSTRAP = 'materossi74@gmail.com';

/**
 * Recupera o inizializza il documento utente in Firestore.
 */
export async function syncUserProfile(fbUser: FirebaseUser): Promise<AppUser> {
  const userRef = doc(db, 'users', fbUser.uid);
  try {
    const snap = await getDoc(userRef);
    const isBootstrappedAdmin = fbUser.email?.toLowerCase() === ADMIN_EMAIL_BOOTSTRAP.toLowerCase();

    if (snap.exists()) {
      const data = snap.data() as AppUser;
      // Se l'email è quella dell'amministratore iniziale, assicurati che abbia il ruolo amministratore
      if (isBootstrappedAdmin && data.role !== 'amministratore') {
        const updated: AppUser = {
          ...data,
          role: 'amministratore',
          updatedAt: new Date().toISOString(),
        };
        await updateDoc(userRef, { role: 'amministratore', updatedAt: updated.updatedAt });
        await setDoc(doc(db, 'admins', fbUser.uid), {
          email: fbUser.email,
          grantedAt: new Date().toISOString(),
        }).catch(() => {});
        return updated;
      }
      return data;
    }

    // Nuovo utente: crea profilo iniziale
    const initialRole: UserRole = isBootstrappedAdmin ? 'amministratore' : 'operatore';
    const now = new Date().toISOString();
    const newUser: AppUser = {
      uid: fbUser.uid,
      email: fbUser.email || '',
      displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Operatore Cooperativa',
      role: initialRole,
      status: 'attivo',
      quickUnlockEnabled: false,
      failedPinAttempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(userRef, newUser);

    if (initialRole === 'amministratore') {
      await setDoc(doc(db, 'admins', fbUser.uid), {
        email: fbUser.email,
        grantedAt: now,
      }).catch(() => {});
    }

    return newUser;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${fbUser.uid}`);
  }
}

/**
 * Accesso con Email e Password
 */
export async function loginWithEmail(email: string, pass: string): Promise<AppUser> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return await syncUserProfile(cred.user);
}

/**
 * Registrazione nuovo operatore con Email e Password
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName: string
): Promise<AppUser> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  const now = new Date().toISOString();
  const isBootstrappedAdmin = email.toLowerCase() === ADMIN_EMAIL_BOOTSTRAP.toLowerCase();

  const newUser: AppUser = {
    uid: cred.user.uid,
    email,
    displayName: displayName.trim() || email.split('@')[0],
    role: isBootstrappedAdmin ? 'amministratore' : 'operatore',
    status: 'attivo',
    quickUnlockEnabled: false,
    failedPinAttempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'users', cred.user.uid), newUser);
  if (isBootstrappedAdmin) {
    await setDoc(doc(db, 'admins', cred.user.uid), {
      email,
      grantedAt: now,
    }).catch(() => {});
  }

  return newUser;
}

/**
 * Accesso rapido con Google (supporta sia Web con Popup sia WebView Android/APK con fallback su Redirect)
 */
export async function loginWithGoogle(): Promise<AppUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const cred = await signInWithPopup(auth, provider);
    return await syncUserProfile(cred.user);
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (
      msg.includes('operation-not-supported') ||
      msg.includes('popup-blocked') ||
      msg.includes('missing-initial-state') ||
      msg.includes('storage-partitioned') ||
      msg.includes('sessionStorage') ||
      msg.includes('disallowed_useragent')
    ) {
      await signInWithRedirect(auth, provider);
      return new Promise<never>(() => {});
    }
    throw err;
  }
}

/**
 * Verifica l'esito di un reindirizzamento OAuth (utilizzato all'avvio su Android/APK)
 */
export async function checkRedirectAuthResult(): Promise<AppUser | null> {
  try {
    const cred = await getRedirectResult(auth);
    if (cred && cred.user) {
      return await syncUserProfile(cred.user);
    }
  } catch (err) {
    console.warn('Verifica redirect OAuth:', err);
  }
  return null;
}

/**
 * Invia email per recuperare la password
 */
export async function resetPassword(email: string): Promise<void> {
  if (!email || !email.includes('@')) {
    throw new Error('Inserisci un indirizzo email valido.');
  }
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Configura o aggiorna il PIN personale di sblocco rapido.
 */
export async function setupUserPin(user: AppUser, pin: string): Promise<AppUser> {
  if (!pin || pin.length < 4 || pin.length > 6) {
    throw new Error('Il PIN deve essere composto da 4 a 6 cifre numeriche.');
  }

  const salt = await generateSalt();
  const hashed = await hashPin(pin, salt);
  const now = new Date().toISOString();

  const updates = {
    pinHash: hashed,
    pinSalt: salt,
    quickUnlockEnabled: true,
    failedPinAttempts: 0,
    lockUntil: null,
    updatedAt: now,
  };

  await updateDoc(doc(db, 'users', user.uid), updates);

  await logAuditEvent({
    usageId: 'PIN_SETUP',
    userId: user.uid,
    userName: user.displayName,
    userRole: user.role,
    actionType: 'modifica_operatore',
    summary: 'Attivato/aggiornato PIN personale di sblocco rapido',
  });

  return {
    ...user,
    ...updates,
  };
}

/**
 * Disattiva lo sblocco rapido con PIN
 */
export async function disableUserPin(user: AppUser): Promise<AppUser> {
  const updates = {
    quickUnlockEnabled: false,
    pinHash: '',
    pinSalt: '',
    failedPinAttempts: 0,
    lockUntil: null,
    updatedAt: new Date().toISOString(),
  };

  await updateDoc(doc(db, 'users', user.uid), updates);
  return {
    ...user,
    ...updates,
  };
}

/**
 * Verifica del PIN rapido con protezione da tentativi ripetuti e lockout progressivo.
 */
export async function attemptPinUnlock(
  user: AppUser,
  enteredPin: string
): Promise<{ success: boolean; errorMessage?: string; remainingAttempts?: number }> {
  const now = Date.now();

  // Controlla se l'account è temporaneamente bloccato
  if (user.lockUntil) {
    const lockTime = new Date(user.lockUntil).getTime();
    if (lockTime > now) {
      const waitSeconds = Math.ceil((lockTime - now) / 1000);
      return {
        success: false,
        errorMessage: `Troppi tentativi errati. Account temporaneamente bloccato. Riprova tra ${waitSeconds} secondi oppure accedi con password.`,
      };
    }
  }

  if (!user.pinHash || !user.pinSalt) {
    return {
      success: false,
      errorMessage: 'Nessun PIN configurato. Accedi con email e password.',
    };
  }

  const isValid = await verifyPin(enteredPin, user.pinHash, user.pinSalt);

  if (isValid) {
    // Reset tentativi falliti
    if ((user.failedPinAttempts || 0) > 0 || user.lockUntil) {
      await updateDoc(doc(db, 'users', user.uid), {
        failedPinAttempts: 0,
        lockUntil: null,
      }).catch(() => {});
    }
    return { success: true };
  }

  // PIN non corretto: applica ritardi progressivi
  const newFailedAttempts = (user.failedPinAttempts || 0) + 1;
  let lockUntilIso: string | null = null;
  let errorMsg = 'PIN non corretto.';

  if (newFailedAttempts >= 5) {
    // Blocco per 5 minuti
    lockUntilIso = new Date(now + 5 * 60 * 1000).toISOString();
    errorMsg = 'PIN errato per 5 volte consecutive. Account bloccato per 5 minuti.';
  } else if (newFailedAttempts >= 3) {
    // Blocco per 30 secondi
    lockUntilIso = new Date(now + 30 * 1000).toISOString();
    errorMsg = 'PIN errato per 3 volte. Attendi 30 secondi prima di riprovare.';
  }

  await updateDoc(doc(db, 'users', user.uid), {
    failedPinAttempts: newFailedAttempts,
    lockUntil: lockUntilIso,
  }).catch(() => {});

  return {
    success: false,
    errorMessage: errorMsg,
    remainingAttempts: Math.max(0, 5 - newFailedAttempts),
  };
}

/**
 * Disconnessione completa (cancella anche stato di sblocco rapido locale)
 */
export async function logoutUser(): Promise<void> {
  localStorage.removeItem('coop_session_locked');
  await signOut(auth);
}
