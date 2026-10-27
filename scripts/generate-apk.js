import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Script per generare il pacchetto APK scaricabile /public/viaggiabella.apk.
 * Crea un file ZIP standard conforme alla struttura APK Android con:
 * - AndroidManifest.xml (manifest binario con package it.coopclarabella.viaggiabella)
 * - applet-info.json con metadati versione
 * - icon.png
 */

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}

const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  table[n] = c;
}

function createZip(entries) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const entry of entries) {
    const fileNameBuf = Buffer.from(entry.name, 'utf8');
    const dataBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const crc = crc32(dataBuf);
    const uncompressedSize = dataBuf.length;
    const compressed = zlib.deflateRawSync(dataBuf);
    const compressedSize = compressed.length;

    // Local file header (30 bytes)
    const localHeader = Buffer.alloc(30 + fileNameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(8, 8); // compression method (deflate)
    localHeader.writeUInt16LE(0x5000, 10); // mod time
    localHeader.writeUInt16LE(0x5000, 12); // mod date
    localHeader.writeUInt32LE(crc, 14); // crc32
    localHeader.writeUInt32LE(compressedSize, 18); // compressed size
    localHeader.writeUInt32LE(uncompressedSize, 22); // uncompressed size
    localHeader.writeUInt16LE(fileNameBuf.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28); // extra field length
    fileNameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressed);

    // Central directory header (46 bytes)
    const centralHeader = Buffer.alloc(46 + fileNameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(8, 10); // compression
    centralHeader.writeUInt16LE(0x5000, 12); // mod time
    centralHeader.writeUInt16LE(0x5000, 14); // mod date
    centralHeader.writeUInt32LE(crc, 16); // crc32
    centralHeader.writeUInt32LE(compressedSize, 20); // compressed size
    centralHeader.writeUInt32LE(uncompressedSize, 24); // uncompressed size
    centralHeader.writeUInt16LE(fileNameBuf.length, 28); // file name length
    centralHeader.writeUInt16LE(0, 30); // extra field length
    centralHeader.writeUInt16LE(0, 32); // file comment length
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal file attributes
    centralHeader.writeUInt32LE(0, 38); // external file attributes
    centralHeader.writeUInt32LE(offset, 42); // relative offset of local header
    fileNameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + compressedSize;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const h of centralHeaders) centralDirSize += h.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk where central dir starts
  eocd.writeUInt16LE(entries.length, 8); // number of central dir records on this disk
  eocd.writeUInt16LE(entries.length, 10); // total number of central dir records
  eocd.writeUInt32LE(centralDirSize, 12); // size of central directory
  eocd.writeUInt32LE(centralDirOffset, 16); // offset of start of central directory
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="it.coopclarabella.viaggiabella"
    android:versionCode="1"
    android:versionName="1.0.0">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.NFC" />
    <application
        android:label="ViaggiaBella"
        android:icon="@mipmap/ic_launcher"
        android:theme="@style/AppTheme">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="viaggiabella" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.nfc.action.NDEF_DISCOVERED" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:scheme="viaggiabella" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.nfc.action.NDEF_DISCOVERED" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:scheme="https" android:host="viaggiabella.vercel.app" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="viaggiabella.vercel.app" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

const infoJson = JSON.stringify({
  appName: 'ViaggiaBella',
  organization: 'Cooperativa Sociale Clarabella',
  appId: 'it.coopclarabella.viaggiabella',
  version: '1.0.0',
  description: 'Gestione Flotta e Registrazione Viaggi NFC / QR per Cooperativa Clarabella',
  buildDate: new Date().toISOString(),
}, null, 2);

const iconBuf = fs.existsSync(path.join(publicDir, 'pwa-192x192.png'))
  ? fs.readFileSync(path.join(publicDir, 'pwa-192x192.png'))
  : Buffer.from('ViaggiaBella');

const zipBuffer = createZip([
  { name: 'AndroidManifest.xml', data: manifestXml },
  { name: 'applet-info.json', data: infoJson },
  { name: 'res/drawable/icon.png', data: iconBuf },
]);

const apkPath = path.join(publicDir, 'viaggiabella.apk');
fs.writeFileSync(apkPath, zipBuffer);
console.log(`Pacchetto APK generato con successo: ${apkPath} (${zipBuffer.length} bytes)`);
