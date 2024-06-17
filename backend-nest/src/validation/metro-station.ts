import { titleByMetroStation, MetroStation } from '../data/metro-stations';
import { removeDiacritics } from '../utils/remove-diacritics';

export const parseMetroStation = (
  station: string | undefined,
): MetroStation | null => {
  if (!station) {
    return null;
  }

  const parsed = removeDiacritics(
    station.toLowerCase().replaceAll(' ', '-').replaceAll('.', ''),
  );

  if (parsed in titleByMetroStation) {
    return parsed as MetroStation;
  }

  return null;
};
