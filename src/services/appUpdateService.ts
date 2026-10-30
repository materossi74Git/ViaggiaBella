/**
 * Servizio per il controllo e download degli aggiornamenti APK in-app.
 * Verifica la presenza di una nuova release pubblicata su Vercel/GitHub
 * e permette all'utente di scaricare e aggiornare l'APK con un solo tocco.
 */

import { Capacitor } from '@capacitor/core';
import { OFFICIAL_DOMAIN } from './nfcService';

export interface RemoteVersionInfo {
  version: string;
  versionCode: number;
  releaseDate: string;
  apkUrl: string;
  minRequiredVersionCode?: number;
  releaseNotes?: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  currentVersionCode: number;
  remoteInfo?: RemoteVersionInfo;
  isMandatory?: boolean;
}

// Versione compilata in questa build dell'app
export const APP_INFO = {
  version: '1.2.0',
  versionCode: 3,
  appName: 'ViaggiaBella',
};

export interface RemoteVersionInfo {
  version: string;
  versionCode: number;
  releaseDate: string;
  apkUrl: string;
  minRequiredVersionCode?: number;
  releaseNotes?: string;
}

export interface UpdateCheckResult {
  success: boolean;
  hasUpdate: boolean;
  currentVersion: string;
  currentVersionCode: number;
  remoteInfo?: RemoteVersionInfo;
  isMandatory?: boolean;
  checkedAt?: string;
  error?: string;
}

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Controlla se sul server o su Firestore è presente una versione APK più recente di quella attualmente installata.
 * Su Android nativo legge direttamente da Firebase Firestore per evitare blocchi CORS o asset locali interni.
 */
export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = APP_INFO.version;
  const currentVersionCode = APP_INFO.versionCode;

  let remote: RemoteVersionInfo | null = null;
  let lastError: Error | null = null;

  // 1. Lettura diretta da Firebase Firestore (massima affidabilità in assoluto su APK nativo)
  try {
    const versionDocRef = doc(db, 'appSettings', 'version');
    const snapshot = await getDoc(versionDocRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data && typeof data.versionCode === 'number') {
        remote = {
          version: data.version || '1.2.0',
          versionCode: data.versionCode,
          releaseDate: data.releaseDate || '',
          apkUrl: data.apkUrl || `${OFFICIAL_DOMAIN}/viaggiabella.apk`,
          minRequiredVersionCode: data.minRequiredVersionCode,
          releaseNotes: data.releaseNotes || '',
        };
      }
    }
  } catch (err: any) {
    console.warn('Verifica versione su Firestore non riuscita, procedo con fallback HTTP:', err);
    lastError = err;
  }

  // 2. Fallback via endpoint HTTP se Firestore non ha fornito la versione
  if (!remote) {
    const isNative = Capacitor.isNativePlatform();
    const candidateUrls: string[] = [];

    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const origin = window.location.origin.replace(/\/+$/, '');
      if (!origin.includes('localhost') && !origin.startsWith('capacitor://')) {
        candidateUrls.push(`${origin}/version.json?t=${Date.now()}`);
      }
    }

    // Dominio ufficiale
    candidateUrls.push(`${OFFICIAL_DOMAIN.replace(/\/+$/, '')}/version.json?t=${Date.now()}`);

    // NOTA: Su app nativa Android NON interroghiamo '/version.json' relativo,
    // perché la WebView lo risolverebbe nelle risorse locali interne dell'APK stesso,
    // facendo credere che l'app sia sempre all'ultima versione di se stessa!
    if (!isNative) {
      candidateUrls.push(`/version.json?t=${Date.now()}`);
    }

    const uniqueUrls = Array.from(new Set(candidateUrls));

    for (const url of uniqueUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.versionCode === 'number') {
            remote = data;
            break;
          }
        }
      } catch (err: any) {
        lastError = err;
      }
    }
  }

  if (remote) {
    const hasUpdate = remote.versionCode > currentVersionCode;
    const isMandatory =
      typeof remote.minRequiredVersionCode === 'number' &&
      currentVersionCode < remote.minRequiredVersionCode;

    return {
      success: true,
      hasUpdate,
      currentVersion,
      currentVersionCode,
      remoteInfo: remote,
      isMandatory,
      checkedAt: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  return {
    success: false,
    hasUpdate: false,
    currentVersion,
    currentVersionCode,
    error: lastError?.message || 'Impossibile contattare il server per verificare le versioni.',
  };
}

/**
 * Registra o sincronizza le informazioni dell'ultima versione in Firebase Firestore
 */
export async function syncAppVersionToFirestore(): Promise<void> {
  try {
    const versionDocRef = doc(db, 'appSettings', 'version');
    const versionData: RemoteVersionInfo = {
      version: APP_INFO.version,
      versionCode: APP_INFO.versionCode,
      releaseDate: new Date().toISOString().split('T')[0],
      apkUrl: `${OFFICIAL_DOMAIN}/viaggiabella.apk`,
      minRequiredVersionCode: 1,
      releaseNotes:
        'Avvio viaggio immediato anche a GPS spento o assente. Accesso con Account Google migliorato su Android APK con supporto popup integrato. Verifica automatica aggiornamenti in-app.',
    };
    await setDoc(versionDocRef, versionData, { merge: true });
  } catch (err) {
    console.warn('Sincronizzazione versione Firestore non riuscita:', err);
  }
}

/**
 * Avvia il download dell'aggiornamento APK sul dispositivo Android
 */
export function triggerApkDownload(apkUrl?: string): void {
  const targetUrl = apkUrl || `${OFFICIAL_DOMAIN}/viaggiabella.apk?t=${Date.now()}`;

  // Se siamo su Android WebView o browser mobile
  if (typeof window !== 'undefined') {
    // Apriamo il link diretto al file APK. Android avvia il download manager di sistema.
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = 'viaggiabella.apk';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Fallback di navigazione se il click non parte
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 300);
  }
}
