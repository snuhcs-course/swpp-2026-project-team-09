import { render, screen, userEvent } from '@testing-library/react-native';

import MapCheck from '@/app/map-check';

describe('the map check for developers', () => {
  it('shows sample markers and Avatars on the map', async () => {
    await render(<MapCheck />);

    for (const name of ['AI 커리어 채용설명회', '보드게임 파티', '내 위치', '김민준']) {
      expect(screen.getByRole('button', { name })).toBeVisible();
    }
    expect(screen.getByText('카메라: 37.45800, 126.95400 · 줌 15.84')).toBeVisible();
  });

  it('says what was pressed', async () => {
    await render(<MapCheck />);

    await userEvent.press(screen.getByRole('button', { name: '김민준' }));

    expect(screen.getByText('누른 것: friend:f1')).toBeVisible();
  });

  it('draws and clears two lines, one of them dashed', async () => {
    await render(<MapCheck />);

    await userEvent.press(screen.getByRole('button', { name: '경로 그리기' }));
    expect(screen.getAllByLabelText('경로가 그려져 있습니다')).toHaveLength(2);
    expect(screen.getAllByTestId('route-stroke').length).toBeGreaterThan(2);
    await userEvent.press(screen.getByRole('button', { name: '경로 지우기' }));
    expect(screen.queryByLabelText('경로가 그려져 있습니다')).toBeNull();
  });

  it('moves the camera: closer, to the route, and back to the whole campus', async () => {
    await render(<MapCheck />);

    await userEvent.press(screen.getByRole('button', { name: '확대' }));
    expect(screen.getByText('카메라: 37.45800, 126.95400 · 줌 16.84')).toBeVisible();
    await userEvent.press(screen.getByRole('button', { name: '경로에 맞추기' }));
    expect(screen.getByText(/카메라: 37\.4544\d, 126\.9518\d · 줌 17\.\d\d/u)).toBeVisible();
    await userEvent.press(screen.getByRole('button', { name: '캠퍼스 전체' }));
    expect(screen.getByText('카메라: 37.45800, 126.95400 · 줌 15.84')).toBeVisible();
  });

  it("moves the User's own Avatar", async () => {
    await render(<MapCheck />);

    await userEvent.press(screen.getByRole('button', { name: '아바타 옮기기' }));

    expect(screen.getByRole('button', { name: '내 위치' })).toBeVisible();
  });
});

describe('a camera call before the map is ready', () => {
  it('is carried out on a map made anew', async () => {
    await render(<MapCheck />);

    await userEvent.press(screen.getByRole('button', { name: '새로 열고 바로 맞추기' }));

    expect(screen.getByText(/카메라: 37\.4544\d, 126\.9518\d · 줌 17\.\d\d/u)).toBeVisible();
  });
});
