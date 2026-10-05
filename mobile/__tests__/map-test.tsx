import { render, screen, userEvent } from '@testing-library/react-native';

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

  it('draws the route line and clears it', async () => {
    const { rerender } = await render(<Map {...EMPTY} />);
    expect(screen.queryByLabelText('경로가 그려져 있습니다')).toBeNull();

    await rerender(<Map {...EMPTY} route={[GATE, LIBRARY]} />);
    expect(screen.getByLabelText('경로가 그려져 있습니다')).toBeVisible();

    await rerender(<Map {...EMPTY} route={null} />);
    expect(screen.queryByLabelText('경로가 그려져 있습니다')).toBeNull();
  });
});

describe('what is on the plain ground', () => {
  it("draws a look as the design system's view, read once, by the marker's name", async () => {
    await render(<Map {...EMPTY} avatars={[FRIEND]} />);

    expect(screen.getByText('민준', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByLabelText('김민준 · 공강')).toBeNull();
    expect(screen.getByLabelText('김민준 · 공강', { includeHiddenElements: true })).toBeOnTheScreen();
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
