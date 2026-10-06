import { fireEvent, screen } from '@testing-library/react';

import { browser } from './support/browser';
import { fakeMainServer } from './support/fake-main-server';
import { listed, openAdministrators, removeButtonOf, signInAs } from './support/pages';

describe('the list of Administrators', () => {
  it('shows each email address and whether they have signed in, in the main server order', async () => {
    fakeMainServer.hasAdministrators('kim@snu.ac.kr', 'admin@example.com', 'lee@gmail.com');
    signInAs('kim@snu.ac.kr');

    await openAdministrators();

    expect(listed()).toEqual([
      ['admin@example.com', 'Not yet signed in'],
      ['kim@snu.ac.kr', 'Signed in'],
      ['lee@gmail.com', 'Not yet signed in'],
    ]);
  });
});

describe('registering an Administrator', () => {
  beforeEach(async () => {
    fakeMainServer.hasAdministrators('kim@snu.ac.kr');
    signInAs('kim@snu.ac.kr');
    await openAdministrators();
  });

  it('registers an email address of any domain', async () => {
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), { target: { value: 'Park@Gmail.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await vi.waitFor(() => {
      expect(listed()).toEqual([
        ['kim@snu.ac.kr', 'Signed in'],
        ['park@gmail.com', 'Not yet signed in'],
      ]);
    });
  });

  it('refuses an address that is not an email address without sending it', async () => {
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), { target: { value: 'park' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Enter an email address, such as name@example.com.')).toBeVisible();
    expect(fakeMainServer.requests).not.toContain('POST /admin/administrators');
  });
});

describe('removing an Administrator', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('removes one once the person confirms', async () => {
    fakeMainServer.hasAdministrators('kim@snu.ac.kr', 'lee@gmail.com');
    signInAs('kim@snu.ac.kr');
    await openAdministrators();

    fireEvent.click(removeButtonOf('lee@gmail.com'));

    expect(window.confirm).toHaveBeenCalledWith('Remove lee@gmail.com? They will no longer be able to sign in.');
    await vi.waitFor(() => {
      expect(listed()).toEqual([['kim@snu.ac.kr', 'Signed in']]);
    });
  });

  it('sends nothing when the person does not confirm', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    fakeMainServer.hasAdministrators('kim@snu.ac.kr', 'lee@gmail.com');
    signInAs('kim@snu.ac.kr');
    await openAdministrators();

    fireEvent.click(removeButtonOf('lee@gmail.com'));

    expect(fakeMainServer.requests.filter((request) => request.startsWith('DELETE'))).toEqual([]);
  });
});

describe('removing an Administrator the main server answers for', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('removes the signed-in Administrator, who then has to sign in again', async () => {
    fakeMainServer.hasAdministrators('kim@snu.ac.kr', 'lee@gmail.com');
    signInAs('kim@snu.ac.kr');
    await openAdministrators();

    fireEvent.click(removeButtonOf('kim@snu.ac.kr'));

    await vi.waitFor(() => {
      expect(browser.location).toBe('/sign-in?next=%2Fadministrators');
    });
  });

  it('says that the last Administrator is kept', async () => {
    fakeMainServer.hasAdministrators('kim@snu.ac.kr');
    signInAs('kim@snu.ac.kr');
    await openAdministrators();

    fireEvent.click(removeButtonOf('kim@snu.ac.kr'));

    expect(await screen.findByRole('alert')).toHaveTextContent('The last Administrator cannot be removed.');
    expect(listed()).toEqual([['kim@snu.ac.kr', 'Signed in']]);
  });

  it('says that an Administrator was already removed, and reads the list again', async () => {
    fakeMainServer.hasAdministrators('kim@snu.ac.kr', 'lee@gmail.com', 'park@gmail.com');
    const token = signInAs('kim@snu.ac.kr');
    await openAdministrators();
    const lee = (await fakeMainServer.listAdministrators(token)).find((each) => each.email === 'lee@gmail.com');
    await fakeMainServer.removeAdministrator(token, lee?.id ?? '');

    fireEvent.click(removeButtonOf('lee@gmail.com'));

    expect(await screen.findByRole('alert')).toHaveTextContent('This Administrator had already been removed.');
    await vi.waitFor(() => {
      expect(listed()).toEqual([
        ['kim@snu.ac.kr', 'Signed in'],
        ['park@gmail.com', 'Not yet signed in'],
      ]);
    });
  });
});
