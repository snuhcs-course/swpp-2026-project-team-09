import { fireEvent, screen, within } from '@testing-library/react';

import { fakeMainServer } from './support/fake-main-server';
import { openPlaces, signInAs } from './support/pages';

const square = (latitude: number, longitude: number): { latitude: number; longitude: number }[] => [
  { latitude, longitude },
  { latitude: latitude + 0.0002, longitude },
  { latitude: latitude + 0.0002, longitude: longitude + 0.0002 },
  { latitude, longitude },
];

const STADIUM = square(37.4635, 126.9585);

beforeEach(() => {
  fakeMainServer.hasAdministrators('kim@snu.ac.kr');
  signInAs('kim@snu.ac.kr');
  fakeMainServer.hasPlaces(
    {
      number: '71',
      name: '종합운동장',
      latitude: 37.4636,
      longitude: 126.9586,
      outlines: [STADIUM],
    },
    {
      number: '100',
      name: '버들골 풍산마당',
      latitude: 37.4621,
      longitude: 126.9548,
      outlines: [square(37.462, 126.9547)],
    },
    {
      number: '149',
      name: '종합운동장본부석',
      latitude: 37.4637,
      longitude: 126.9587,
      outlines: [STADIUM, square(37.464, 126.959)],
    },
    {
      number: '71-1',
      name: '체육문화교육연구동(71-1동)',
      latitude: 37.46651,
      longitude: 126.95266,
      origin: 'openstreetmap',
    },
    { number: null, name: '자하연', latitude: 37.46071, longitude: 126.9521 },
  );
});

function find(text: string): string[] {
  fireEvent.change(screen.getByLabelText('Find a Place'), { target: { value: text } });
  return within(screen.getByRole('list', { name: 'Found Places' }))
    .queryAllByRole('button')
    .map((button) => button.textContent ?? '');
}

function record(): HTMLElement {
  return screen.getByRole('region', { name: (name) => name !== '' });
}

it('hands every Place to the map with its outlines', async () => {
  await openPlaces();

  const onMap = within(screen.getByRole('list', { name: 'On the map' })).getAllByRole('button');
  expect(onMap.map((button) => button.textContent)).toEqual([
    'Map: 71 · 1 outlines',
    'Map: 100 · 1 outlines',
    'Map: 149 · 2 outlines',
    'Map: 71-1 · 0 outlines',
    'Map: 자하연 · 0 outlines',
  ]);
});

describe('the search', () => {
  it.each([
    ['a number', '149', ['149 종합운동장본부석']],
    ['a number with 동', '71-1동', ['71-1 체육문화교육연구동(71-1동)']],
    ['a name', '운동장', ['71 종합운동장', '149 종합운동장본부석']],
  ])('finds Places by %s', async (_case, text, found) => {
    await openPlaces();

    expect(find(text)).toEqual(found);
  });

  it('says when nothing matches', async () => {
    await openPlaces();

    find('공대');

    expect(screen.getByText('No Place matches.')).toBeVisible();
  });
});

describe('selecting a Place', () => {
  it('shows the record of a Place chosen from the results, and marks it on the map', async () => {
    await openPlaces();

    find('100');
    fireEvent.click(screen.getByRole('button', { name: '100 버들골 풍산마당' }));

    expect(within(record()).getByRole('heading', { name: '100 버들골 풍산마당' })).toBeVisible();
    expect(record()).toHaveTextContent('Number100Name버들골 풍산마당OriginSNU campus mapPosition37.4621, 126.9548');
    expect(record()).toHaveTextContent('Outline 1 · 4 points');
    expect(screen.getByRole('button', { name: 'Map: 100 · 1 outlines' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the record of a Place clicked on the map, one without an outline', async () => {
    await openPlaces();

    fireEvent.click(screen.getByRole('button', { name: 'Map: 71-1 · 0 outlines' }));

    expect(record()).toHaveTextContent('OriginOpenStreetMap');
    expect(record()).toHaveTextContent('No outline: the map shows it as a marker at its position.');
  });

  it('lists the Places that share an outline, and selects one of them', async () => {
    await openPlaces();

    fireEvent.click(screen.getByRole('button', { name: 'Map: 149 · 2 outlines' }));
    expect(record()).toHaveTextContent('Outline 1 · 4 points · also the outline of 71 종합운동장');
    expect(record()).toHaveTextContent('Outline 2 · 4 points');
    fireEvent.click(within(record()).getByRole('button', { name: '71 종합운동장' }));

    expect(within(record()).getByRole('heading', { name: '71 종합운동장' })).toBeVisible();
    expect(record()).toHaveTextContent('also the outline of 149 종합운동장본부석');
  });
});
