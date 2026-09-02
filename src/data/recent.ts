export type RecentItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  icon: 'document' | 'restaurant' | 'airplane' | 'briefcase';
};

export const recentItems: RecentItem[] = [
  {
    id: '1',
    title: 'Fattura ACME.pdf',
    subtitle: 'Salvata e promemoria creato',
    time: '10:34',
    icon: 'document',
  },
  {
    id: '2',
    title: 'Ristorante da Ibiza',
    subtitle: 'Aggiunto ai preferiti',
    time: 'Ieri',
    icon: 'restaurant',
  },
  {
    id: '3',
    title: 'Volo per Milano',
    subtitle: 'Monitoraggio attivo',
    time: 'Ieri',
    icon: 'airplane',
  },
  {
    id: '4',
    title: 'Preventivo serramenti',
    subtitle: 'Salvato in memoria',
    time: '2 gg',
    icon: 'briefcase',
  },
];

