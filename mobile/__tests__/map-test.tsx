import { render, screen, userEvent, within } from '@testing-library/react-native';

import { Map } from '@/map';
import { EMPTY, EVENT, FRIEND, GATE, holdMap, LIBRARY } from './support/map';

describe('the map without a native module', () => {
  it('is a plain ground that says where the map shows', async () => {
    await render(<Map {...EMPTY} />);

    expect(screen.getByText('지도는 Android·iOS 빌드에서 보입니다')).toBeVisible();
  });

  it('credits the map data', async () => {
    await render(<Map {...EMPTY} />);

    expect(screen.getByText('© OpenStreetMap · 국토지리정보원')).toBeVisible();
  });

  it("lets a marker's and an Avatar's name be read, with the look and the text asked for", async () => {
    await render(<Map {...EMPTY} avatars={[FRIEND]} markers={[EVENT]} />);

    expect(screen.getByRole('button', { name: 'AI 커리어 채용설명회' })).toHaveProp('testID', 'official:pin');
    expect(screen.getByText('AI 커리어')).toBeVisible();
    expect(screen.getByRole('button', { name: '김민준' })).toBeVisible();
  });

  it('passes a press on with the identifier', async () => {
    const onPress = jest.fn<void, [string]>();
    await render(<Map {...EMPTY} avatars={[FRIEND]} markers={[EVENT]} onPress={onPress} />);

    await userEvent.press(screen.getByRole('button', { name: 'AI 커리어 채용설명회' }));
    await userEvent.press(screen.getByRole('button', { name: '김민준' }));

    expect(onPress.mock.calls).toEqual([['event:e1'], ['friend:f1']]);
  });
});

describe('the lines on the plain ground', () => {
  it('draws several lines, each with its look, changes one by its id and removes one that is no longer listed', async () => {
    const solid = { id: 'route', points: [GATE, LIBRARY], style: { color: '#2F6BFF', width: 5 } };
    const dashed = {
      id: 'shuttle',
      points: [LIBRARY, GATE],
      style: { color: '#6B46C1', width: 3, dash: [8, 6] },
    } as const;
    const { rerender } = await render(<Map {...EMPTY} />);
    expect(screen.queryByLabelText('경로가 그려져 있습니다')).toBeNull();

    await rerender(<Map {...EMPTY} lines={[solid, dashed]} />);
    expect(screen.getAllByLabelText('경로가 그려져 있습니다')).toHaveLength(2);
    expect(within(screen.getByTestId('line:route')).getAllByTestId('route-stroke')).toHaveLength(1);
    expect(within(screen.getByTestId('line:route')).getByTestId('route-stroke')).toHaveStyle({
      height: 5,
      backgroundColor: '#2F6BFF',
    });
    const dashes = within(screen.getByTestId('line:shuttle')).getAllByTestId('route-stroke');
    expect(dashes.length).toBeGreaterThan(1);
    // A dash of 8 with round ends, 3 wide.
    expect(dashes[0]).toHaveStyle({ width: 11, height: 3, backgroundColor: '#6B46C1' });
    // The later in the list is drawn later, on top.
    const drawn = screen.getAllByTestId(/^line:/u);
    expect(drawn[0]).toHaveProp('testID', 'line:route');
    expect(drawn[1]).toHaveProp('testID', 'line:shuttle');

    await rerender(<Map {...EMPTY} lines={[{ ...dashed, points: [GATE, LIBRARY, GATE] }]} />);
    expect(screen.queryByTestId('line:route')).toBeNull();
    expect(within(screen.getByTestId('line:shuttle')).getAllByTestId('route-stroke').length).toBeGreaterThan(
      dashes.length,
    );
  });
});

describe('what is on the plain ground', () => {
  it("draws a look as the design system's view, read once, by the marker's name", async () => {
    await render(<Map {...EMPTY} avatars={[FRIEND]} />);

    expect(screen.getByText('민준', { includeHiddenElements: true })).toBeOnTheScreen();
    // The marker's button is read; the Avatar in its look is not.
    expect(screen.getAllByLabelText('김민준')).toHaveLength(1);
    expect(screen.getAllByLabelText('김민준', { includeHiddenElements: true })).toHaveLength(2);
  });

  it('removes a marker that is no longer listed', async () => {
    const { rerender } = await render(<Map {...EMPTY} markers={[EVENT]} />);

    await rerender(<Map {...EMPTY} />);

    expect(screen.queryByRole('button', { name: 'AI 커리어 채용설명회' })).toBeNull();
  });

  it('keeps a marker outside the view reachable by its name, and does not draw it', async () => {
    const onPress = jest.fn<void, [string]>();
    const map = await holdMap({ avatars: [{ ...FRIEND, text: '민준' }], markers: [EVENT], onPress });

    await map.move((handle) => {
      handle.moveCamera({ centre: LIBRARY, zoom: 19 });
    });

    expect(screen.getByText('민준')).toBeVisible();
    expect(screen.queryByText('AI 커리어')).toBeNull();
    await userEvent.press(screen.getByRole('button', { name: 'AI 커리어 채용설명회' }));
    expect(onPress.mock.calls).toEqual([['event:e1']]);
  });

  it('draws Avatars above markers, and the higher order above the lower', async () => {
    const second = { ...EVENT, id: 'event:e2', name: '둘째' };
    const top = { ...EVENT, id: 'event:e3', name: '맨 위', order: 1 };
    const me = { ...FRIEND, id: 'me', name: '내 위치', order: 2 };
    await render(<Map {...EMPTY} avatars={[me, FRIEND]} markers={[top, EVENT, second]} />);

    const names = screen.getAllByRole('button').map(({ props }): unknown => props.accessibilityLabel);

    expect(names).toEqual(['AI 커리어 채용설명회', '둘째', '맨 위', '김민준', '내 위치']);
  });
});

describe('the plain ground, as the frame draws and takes presses', () => {
  it('writes the text under a marker as the frame writes a name', async () => {
    await render(<Map {...EMPTY} markers={[EVENT]} />);

    const words = screen.getByText('AI 커리어');
    expect(words).toHaveStyle({ fontFamily: 'Pretendard-Bold', fontSize: 11, lineHeight: 16 });
    expect(words).toHaveStyle({ paddingVertical: 1, paddingHorizontal: 7, backgroundColor: '#FFFFFF' });
    expect(words).toHaveStyle({ boxShadow: '0 1px 3px rgba(14, 19, 48, 0.25)' });
    expect(words.parent).toHaveStyle({ top: '100%', marginTop: 3 });
  });

  it('gives a passive Avatar no press: it is read by its name and is no button', async () => {
    const onPress = jest.fn<void, [string]>();
    const me = { ...FRIEND, id: 'me', name: '내 위치', passive: true };
    await render(<Map {...EMPTY} avatars={[FRIEND, me]} onPress={onPress} />);

    expect(screen.getAllByRole('button').map((button) => String(button.props.accessibilityLabel))).toEqual(['김민준']);
    const drawn = screen.getByRole('image', { name: '내 위치' });
    expect(drawn).toHaveStyle({ pointerEvents: 'none' });
    expect(drawn.parent).toHaveStyle({ pointerEvents: 'none' });
    await userEvent.press(drawn);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("the map's credit", () => {
  it('draws the credit at the bottom left of the whole map, 8 from its edges', async () => {
    await render(<Map {...EMPTY} />);

    expect(screen.getByText('© OpenStreetMap · 국토지리정보원')).toHaveStyle({ left: 8, bottom: 8 });
  });

  it('draws the credit inside what an inset leaves of the map', async () => {
    await render(<Map {...EMPTY} inset={{ bottom: 126, left: 8, right: 62 }} />);

    expect(screen.getByText('© OpenStreetMap · 국토지리정보원')).toHaveStyle({ left: 16, bottom: 134 });
  });
});
