/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { fireEvent, screen, within } from '@testing-library/react';

import type { AdminUser } from '@/main-server';

import { fakeMainServer } from './support/fake-main-server';
import { openUser, openUsers, rowsOf, signInAs } from './support/pages';

let minsu: AdminUser;
let seoyeon: AdminUser;
let doyun: AdminUser;
let newcomer: AdminUser;

function stored(name: string, email: string, department: string, friendId: string): AdminUser {
  const [user] = fakeMainServer.users.has({ name, email, department, friendId });
  if (user === undefined) {
    throw new Error('No User was stored.');
  }
  return user;
}

beforeEach(() => {
  fakeMainServer.hasAdministrators('kim@snu.ac.kr');
  signInAs('kim@snu.ac.kr');
  minsu = stored('김민수', 'minsu@snu.ac.kr', '컴퓨터공학부', 'K7MS2QXA');
  seoyeon = stored('박서연', 'seoyeon@snu.ac.kr', '경영학과', 'P3SY8LMB');
  doyun = stored('이도윤', 'doyun@snu.ac.kr', '물리천문학부', 'L9DY4RTC');
  newcomer = stored('', 'newcomer@snu.ac.kr', '', 'N2NB6WQE');
  fakeMainServer.users.makeFriends(minsu.id, seoyeon.id, '2026-10-01T03:00:00.000Z');
});

function choices(): (string | null)[] {
  return within(screen.getByRole('list', { name: 'Users to befriend' }))
    .queryAllByRole('button')
    .map((button) => button.textContent);
}

function click(name: string): void {
  fireEvent.click(screen.getByRole('button', { name }));
}

describe('the Users page', () => {
  it('lists every User with their Friends counted, a User before onboarding marked', async () => {
    await openUsers();

    expect(rowsOf('Users')).toEqual([
      ['김민수', 'minsu@snu.ac.kr', '컴퓨터공학부', 'K7MS2QXA', '1'],
      ['박서연', 'seoyeon@snu.ac.kr', '경영학과', 'P3SY8LMB', '1'],
      ['이도윤', 'doyun@snu.ac.kr', '물리천문학부', 'L9DY4RTC', '0'],
      ['Before onboarding', 'newcomer@snu.ac.kr', '', 'N2NB6WQE', '0'],
    ]);
    expect(screen.getByRole('link', { name: '이도윤' })).toHaveAttribute('href', `/users/${doyun.id}`);
  });

  it.each([
    ['name', '서연', '박서연'],
    ['email', 'DOYUN@', '이도윤'],
    ['department', '컴퓨터', '김민수'],
    ['Friend ID', 'n2nb', 'Before onboarding'],
  ])('finds Users by %s', async (_field, text, name) => {
    await openUsers();

    fireEvent.change(screen.getByLabelText('Find a User'), { target: { value: text } });

    expect(rowsOf('Users').map(([first]) => first)).toEqual([name]);
  });
});

describe('a User’s page', () => {
  it('lists their Friends', async () => {
    await openUser(minsu.id);

    expect(screen.getByRole('heading', { level: 1, name: '김민수' })).toBeVisible();
    expect(rowsOf('Friends')).toEqual([
      ['박서연', 'seoyeon@snu.ac.kr', '경영학과', 'P3SY8LMB', '2026-10-01 12:00', '친구 끊기'],
    ]);
  });

  it('makes a Friend of an onboarded User who is not one yet', async () => {
    await openUser(minsu.id);

    expect(choices()).toEqual(['이도윤 · doyun@snu.ac.kr']);
    click('이도윤 · doyun@snu.ac.kr');

    expect(await screen.findByRole('alert')).toHaveTextContent('김민수 and 이도윤 are now Friends.');
    await vi.waitFor(() => {
      expect(rowsOf('Friends').map(([name]) => name)).toEqual(['박서연', '이도윤']);
    });
    expect(choices()).toEqual([]);
  });

  it('ends a friendship only after the Administrator confirms', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await openUser(minsu.id);

    click('친구 끊기');
    expect(confirm.mock.calls[0]?.[0]).toContain('Location Sharing between the two stops');
    expect(fakeMainServer.requests).not.toContain(`DELETE /admin/friendships/${minsu.id}/${seoyeon.id}`);

    confirm.mockReturnValue(true);
    click('친구 끊기');

    expect(await screen.findByRole('alert')).toHaveTextContent('김민수 and 박서연 are no longer Friends.');
    expect(await screen.findByText('No Friends yet.')).toBeVisible();
  });
});

describe('a refused change', () => {
  it('says that the two were already Friends', async () => {
    await openUser(minsu.id);
    fakeMainServer.users.makeFriends(minsu.id, doyun.id);

    click('이도윤 · doyun@snu.ac.kr');

    expect(await screen.findByRole('alert')).toHaveTextContent('김민수 and 이도윤 were already Friends.');
  });

  it('says that a User has not finished onboarding', async () => {
    await openUser(newcomer.id);

    click('이도윤 · doyun@snu.ac.kr');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'newcomer@snu.ac.kr and 이도윤 cannot be made Friends: one of them has not finished onboarding.',
    );
  });

  it('says that a User no longer exists', async () => {
    await openUser(minsu.id);
    fakeMainServer.users.remove(doyun.id);

    click('이도윤 · doyun@snu.ac.kr');

    expect(await screen.findByRole('alert')).toHaveTextContent('one of them no longer exists.');
  });

  it('says that the two were no longer Friends', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await openUser(minsu.id);
    fakeMainServer.users.endFriends(minsu.id, seoyeon.id);

    click('친구 끊기');

    expect(await screen.findByRole('alert')).toHaveTextContent('김민수 and 박서연 were no longer Friends.');
  });
});
