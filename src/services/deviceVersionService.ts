import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { APP_INFO } from './appUpdateService';

export interface InstalledAppVersionDetails {
  version: string;
  versionCode: number;
  appName: string;
  buildDate: string;
  isNativeApk: boolean;
  isPWA: boolean;
  platformLabel: string;
  environmentDescription: string;
}

export const BUILD_DATE = '30 Ottobre 2026';

/**
 * Rileva il tipo di piattaforma e le credenziali di versione installate sul dispositivo
 */
export async function getInstalledVersionDetails(): Promise<InstalledAppVersionDetails> {
  const isNative = Capacitor.isNativePlatform();
  const isStandalonePWA =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  let version = APP_INFO.version;
  let versionCode = APP_INFO.versionCode;
  let appName = APP_INFO.appName;

  if (isNative) {
    try {
      const info = await CapApp.getInfo();
      if (info.version) version = info.version;
      if (info.build) {
        const parsedBuild = parseInt(info.build, 10);
        if (!isNaN(parsedBuild)) versionCode = parsedBuild;
      }
      if (info.name) appName = info.name;
    } catch (err) {
      console.warn('Lettura info Capacitor fallita, uso costanti di fallback:', err);
    }
  }

  let platformLabel = 'Browser Web';
  let environmentDescription = 'Applicazione in esecuzione su browser desktop/mobile';

  if (isNative) {
    platformLabel = 'App Android (APK Nativa)';
    environmentDescription = 'Applicazione Android nativa installata su smartphone (Capacitor)';
  } else if (isStandalonePWA) {
    platformLabel = 'PWA (Schermata Home)';
    environmentDescription = 'Applicazione web installata sulla schermata Home dello smartphone';
  }

  return {
    version,
    versionCode,
    appName,
    buildDate: BUILD_DATE,
    isNativeApk: isNative,
    isPWA: isStandalonePWA,
    platformLabel,
    environmentDescription,
  };
}
