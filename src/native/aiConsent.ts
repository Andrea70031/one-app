import { Alert } from 'react-native';

// Ask for each request: consent cannot leak across accounts or silently cover new files.
export function requestAIConsent(): Promise<boolean> {
  return new Promise(resolve => Alert.alert(
    'Inviare a OpenAI?',
    'ONE invierà a OpenAI la richiesta, le foto, i documenti o l’audio allegati e il contesto dei tuoi Spazi accessibili (commesse, attività e criticità) per generare la risposta. Supabase gestisce il trasferimento e la cronologia. Puoi annullare e continuare a usare Recall e Spazi. Dettagli nella Privacy, disponibile in Account.',
    [{ text: 'Annulla', style: 'cancel', onPress: () => resolve(false) },
     { text: 'Consenti e invia', onPress: () => resolve(true) }],
    { cancelable: true, onDismiss: () => resolve(false) },
  ));
}
