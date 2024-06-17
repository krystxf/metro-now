import { Delay } from 'src/types/types';

export const GOLEMIO_ENDPOINT = new URL(
  '/v2/pid/departureboards',
  'https://api.golemio.cz',
);

export const getGolemioHeaders = () => {
  return new Headers({
    'Content-Type': 'application/json',
    'X-Access-Token': process.env.GOLEMIO_API_KEY,
  });
};

export const getDelayInSeconds = (delay?: Delay | null): number => {
  if (!delay) {
    return 0;
  }

  let seconds = 0;

  if (typeof delay?.seconds === 'number') {
    seconds += delay.seconds;
  }
  if (typeof delay?.minutes === 'number') {
    seconds += delay.minutes * 60;
  }

  return seconds;
};
