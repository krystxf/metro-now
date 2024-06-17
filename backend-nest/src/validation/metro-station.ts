import {
  titleByMetroStation,
  type MetroStation,
} from 'src/data/metro-stations';
import { removeDiacritics } from 'src/utils/remove-diacritics';

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
