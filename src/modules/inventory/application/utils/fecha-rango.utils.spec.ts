import { hoyLima } from './fecha-rango.utils';

describe('hoyLima: fecha de calendario UTC-5', () => {
  afterEach(() => jest.useRealTimers());

  it.each([
    ['2026-11-04T23:59:59.999Z', '2026-11-04T05:00:00.000Z'],
    ['2026-11-05T00:00:00.000Z', '2026-11-04T05:00:00.000Z'],
    ['2026-11-05T04:59:59.999Z', '2026-11-04T05:00:00.000Z'],
    ['2026-11-05T05:00:00.000Z', '2026-11-05T05:00:00.000Z'],
    ['2026-11-05T17:30:00.000Z', '2026-11-05T05:00:00.000Z'],
    ['2027-01-01T02:00:00.000Z', '2026-12-31T05:00:00.000Z'],
    ['2028-03-01T02:00:00.000Z', '2028-02-29T05:00:00.000Z'],
    ['2026-07-15T02:00:00.000Z', '2026-07-14T05:00:00.000Z'],
  ])('UTC %s produce medianoche de Lima %s', (ahora, esperado) => {
    jest.useFakeTimers().setSystemTime(new Date(ahora));
    expect(hoyLima().toISOString()).toBe(esperado);
    expect(Date.now()).toBe(new Date(ahora).getTime());
  });
});
