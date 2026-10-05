import { render, screen, userEvent } from '@testing-library/react-native';

import MapCheck from '@/app/map-check';

describe('the map check for developers', () => {
  it('shows sample markers and Avatars on the map', async () => {
    await render(<MapCheck />);

    for (const name of ['AI 커리어 채용설명회', '보드게임 파티', '내 위치', '김민준']) {
      expect(screen.getByRole('button', { name })).toBeVisible();
    }
    expect(screen.getByText('카메라: 37.45800, 126.95400 · 줌 14')).toBeVisible();
  });

  it('says what was pressed', async () => {
    await render(<MapCheck />);

    await userEvent.press(screen.getByRole('button', { name: '김민준' }));

    expect(screen.getByText('누른 것: friend:f1')).toBeVisible();
  });

  it('draws and clears the route line, and moves the camera', async () => {
    await render(<MapCheck />);

    await userEvent.press(screen.getByRole('button', { name: '경로 그리기' }));
    expect(screen.getByText('경로가 그려져 있습니다')).toBeVisible();
    await userEvent.press(screen.getByRole('button', { name: '경로 지우기' }));
    expect(screen.queryByText('경로가 그려져 있습니다')).toBeNull();

    await userEvent.press(screen.getByRole('button', { name: '확대' }));
    expect(screen.getByText('카메라: 37.45800, 126.95400 · 줌 15')).toBeVisible();
    await userEvent.press(screen.getByRole('button', { name: '아바타 옮기기' }));
    expect(screen.getByRole('button', { name: '내 위치' })).toBeVisible();
  });
});
