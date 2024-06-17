import { Controller, Get, Query } from '@nestjs/common';
import { parseMetroStation } from '../validation/metro-station';
import {
  platformsByMetroStation,
  titleByMetroStation,
} from '../data/metro-stations';
import { getDepartures } from 'src/utils/fetch-departures';

const ERROR_MSG = `Invalid "station" parameter. Supported stations: ${Object.keys(titleByMetroStation).join(', ')}`;
const MAX_STATIONS = 10;

const parseQueryParam = (
  param: string | string[] | undefined,
): string[] | null => {
  if (!param) {
    return null;
  }

  if (param instanceof Array) {
    return param.length === 0 ? null : param;
  }

  if (param.startsWith('[') && param.endsWith(']')) {
    try {
      return JSON.parse(param);
    } catch {
      return param.slice(1, -1).split(',');
    }
  }

  return [param];
};

@Controller('metro')
export class MetroController {
  @Get()
  async getMetroDepartures(@Query('station') station?: string | string[]) {
    if (!station) {
      return ERROR_MSG;
    }

    const stations = parseQueryParam(station);
    if (!stations.length) {
      return ERROR_MSG;
    }

    const parsedStations = stations.map(parseMetroStation);
    if (parsedStations.includes(null)) {
      return ERROR_MSG;
    } else if (parsedStations.length > MAX_STATIONS) {
      return `Too many stations. Maximum is ${MAX_STATIONS}.`;
    }

    const res = await getDepartures(
      parsedStations.flatMap((station) => platformsByMetroStation[station]),
    );

    return res;
  }
}
