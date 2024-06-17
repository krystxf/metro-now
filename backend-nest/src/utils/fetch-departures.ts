import { group, unique } from 'radash';
import { MetroStationName } from 'src/data/metro-stations';
import { PlatformID, platformIDs } from 'src/data/platforms';

type Timestamp = {
  predicted: string;
  scheduled: string;
};

type Res = {
  stops: {
    stop_id: PlatformID;
    stop_name: MetroStationName;
  }[];
  departures: {
    arrival_timestamp: Timestamp;
    route: {
      short_name: 'A' | 'B' | 'C';
    };
    stop: {
      id: string;
    };
    delay: {
      is_available: boolean;
      minutes: number | undefined;
      seconds: number | undefined;
    };
    departure_timestamp: Timestamp;
    trip: {
      headsign: MetroStationName;
    };
  }[];
};

export const getDepartures = async (platforms: PlatformID[]) => {
  const uniquePlatforms = unique(platforms);
  if (!uniquePlatforms.every((id) => platformIDs.includes(id))) {
    return null;
  }

  const GOLEMIO_ENDPOINT = new URL(
    '/v2/pid/departureboards',
    'https://api.golemio.cz',
  );

  const GOLEMIO_ENDPOINT_HEADERS = new Headers({
    'Content-Type': 'application/json',
    'X-Access-Token': process.env.GOLEMIO_API_KEY,
  });

  const res = await fetch(
    new URL(
      `${GOLEMIO_ENDPOINT}?${/*includeMetroTrains=true&*/ ''}order=real&${uniquePlatforms.map((id) => `ids[]=${id}`).join('&')}`,
    ),
    {
      method: 'GET',
      headers: GOLEMIO_ENDPOINT_HEADERS,
    },
  );
  console.log(
    `${GOLEMIO_ENDPOINT}?includeMetroTrains=true&${uniquePlatforms.map((id) => `ids[]=${id}`).join('&')}`,
  );

  const parsed: Res = await res.json();

  return group(parsed.departures, (d) => d.stop.id) as {
    [key in PlatformID]?: Res['departures'];
  };
};
