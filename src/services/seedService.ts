import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Vehicle } from '../types';

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'veh_ducato_01',
    name: 'Furgone Fiat Ducato 9 Posti',
    plate: 'FS 123 AB',
    brandModel: 'Fiat Ducato 2.3 Multijet',
    type: 'pulmino',
    status: 'attivo',
    qrCodeId: 'coop-veh-01',
    nfcTagId: 'nfc-ducato-01',
    currentKm: 48250,
    insuranceExpiry: '2026-11-08', // In scadenza tra 17 giorni
    insuranceCompany: 'UnipolSai Assicurazioni',
    inspectionExpiry: '2027-04-15',
    inspectionNotes: 'Revisione biennale MCTC',
    notes: 'Dotato di 9 posti e pedana laterale. Chiavi in bacheca ufficio 1.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'veh_panda_02',
    name: 'Fiat Panda Servizi Sociali',
    plate: 'GA 456 CD',
    brandModel: 'Fiat Panda Hybrid 1.0',
    type: 'auto',
    status: 'attivo',
    qrCodeId: 'coop-veh-02',
    nfcTagId: 'nfc-panda-02',
    currentKm: 23120,
    insuranceExpiry: '2027-02-28',
    insuranceCompany: 'Generali Italia',
    inspectionExpiry: '2026-11-15', // In scadenza tra 24 giorni
    inspectionNotes: 'Centro revisioni autorizzato via Roma',
    notes: 'Ideale per commissioni urbane, spesa e consegna farmaci.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'veh_master_03',
    name: 'Renault Master Trasporto Disabili',
    plate: 'EF 789 GH',
    brandModel: 'Renault Master dCi 145',
    type: 'speciale',
    status: 'attivo',
    qrCodeId: 'coop-veh-03',
    nfcTagId: 'nfc-master-03',
    currentKm: 64800,
    insuranceExpiry: '2026-10-18', // Scaduta da 4 giorni!
    insuranceCompany: 'Allianz SpA',
    inspectionExpiry: '2026-12-10',
    inspectionNotes: 'Verificare anche collaudo pedana elettroidraulica',
    notes: 'Mezzo attrezzato con sollevatore elettroidraulico per 2 carrozzine.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'veh_duster_04',
    name: 'Dacia Duster Assistenza Domiciliare',
    plate: 'FN 321 LM',
    brandModel: 'Dacia Duster 1.5 dCi 4x4',
    type: 'auto',
    status: 'attivo',
    qrCodeId: 'coop-veh-04',
    nfcTagId: 'nfc-duster-04',
    currentKm: 18940,
    insuranceExpiry: '2027-05-20',
    insuranceCompany: 'Reale Mutua',
    inspectionExpiry: '2027-06-30',
    notes: 'Trazione integrale per percorsi collinari e frazioni montane.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function ensureInitialFleet(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'vehicles'));
    if (snap.empty) {
      console.log('Inizializzazione flotta veicoli della cooperativa...');
      for (const v of INITIAL_VEHICLES) {
        await setDoc(doc(db, 'vehicles', v.id), v);
      }
    } else {
      // Se i veicoli esistono già ma non hanno ancora i campi scadenza, aggiornali
      for (const d of snap.docs) {
        const data = d.data() as Vehicle;
        if (!data.insuranceExpiry || !data.inspectionExpiry) {
          const preset = INITIAL_VEHICLES.find(item => item.id === d.id);
          if (preset) {
            await updateDoc(doc(db, 'vehicles', d.id), {
              insuranceExpiry: preset.insuranceExpiry,
              insuranceCompany: preset.insuranceCompany,
              inspectionExpiry: preset.inspectionExpiry,
              inspectionNotes: preset.inspectionNotes || '',
            }).catch(() => {});
          }
        }
      }
    }
  } catch (err) {
    console.warn('Controllo flotta iniziale:', err);
  }
}
