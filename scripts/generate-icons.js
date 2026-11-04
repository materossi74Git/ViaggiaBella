import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
const androidAssetsDir = path.resolve('android/app/src/main/assets/public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const svgPath = path.join(publicDir, 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
  console.log('Generazione icone PWA con Sharp in corso...');

  const targets = [
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  for (const target of targets) {
    const pngBuffer = await sharp(svgBuffer)
      .resize(target.size, target.size)
      .png()
      .toBuffer();

    const destPath = path.join(publicDir, target.name);
    fs.writeFileSync(destPath, pngBuffer);
    console.log(`Generata ${target.name} (${target.size}x${target.size}) in /public`);

    if (fs.existsSync(androidAssetsDir)) {
      const androidDestPath = path.join(androidAssetsDir, target.name);
      fs.writeFileSync(androidDestPath, pngBuffer);
      console.log(`Copiata ${target.name} in android assets`);
    }
  }

  // Copia anche icon.svg in android assets se esiste
  if (fs.existsSync(androidAssetsDir)) {
    fs.writeFileSync(path.join(androidAssetsDir, 'icon.svg'), svgBuffer);
  }

  console.log('Generazione icone completata con successo!');
}

generateIcons().catch((err) => {
  console.error('Errore durante la generazione delle icone:', err);
  process.exit(1);
});
