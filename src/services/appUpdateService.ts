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

/**
 * Controlla se sul server è presente una versione APK più recente di quella attualmente installata.
 * Tenta prima il dominio relativo (Web/PWA/preview), poi il dominio ufficiale (APK nativo).
 */
export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = APP_INFO.version;
  const currentVersionCode = APP_INFO.versionCode;

  // Lista di endpoint candidati in ordine di affidabilità
  const candidateUrls: string[] = [];

  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    // Se non siamo su localhost/capacitor, il server corrente ha il file version.json più fresco
    if (!origin.includes('localhost') && !origin.startsWith('capacitor://')) {
      candidateUrls.push(`${origin}/version.json?t=${Date.now()}`);
    }
  }

  // Dominio ufficiale di produzione
  candidateUrls.push(`${OFFICIAL_DOMAIN.replace(/\/+$/, '')}/version.json?t=${Date.now()}`);
  
  // Fallback relativo (utile se servito dalla stessa app)
  candidateUrls.push(`/version.json?t=${Date.now()}`);

  // Rimuovi duplicati
  const uniqueUrls = Array.from(new Set(candidateUrls));

  let lastError: Error | null = null;
  let remote: RemoteVersionInfo | null = null;

  for (const url of uniqueUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

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
