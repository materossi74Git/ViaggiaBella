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
  version: '1.1.0',
  versionCode: 2,
  appName: 'ViaggiaBella',
};

/**
 * Controlla se sul server è presente una versione APK più recente di quella attualmente installata.
 */
export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  const defaultResult: UpdateCheckResult = {
    hasUpdate: false,
    currentVersion: APP_INFO.version,
    currentVersionCode: APP_INFO.versionCode,
  };

  try {
    // Prova a scaricare version.json dal dominio ufficiale con timestamp anti-cache
    const url = `${OFFICIAL_DOMAIN}/version.json?t=${Date.now()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return defaultResult;
    }

    const remote: RemoteVersionInfo = await res.json();

    if (remote && typeof remote.versionCode === 'number') {
      const hasUpdate = remote.versionCode > APP_INFO.versionCode;
      const isMandatory =
        typeof remote.minRequiredVersionCode === 'number' &&
        APP_INFO.versionCode < remote.minRequiredVersionCode;

      return {
        hasUpdate,
        currentVersion: APP_INFO.version,
        currentVersionCode: APP_INFO.versionCode,
        remoteInfo: remote,
        isMandatory,
      };
    }

    return defaultResult;
  } catch (error) {
    console.warn('Verifica aggiornamenti app non riuscita:', error);
    return defaultResult;
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
