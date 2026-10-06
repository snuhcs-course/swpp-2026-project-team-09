import '@testing-library/jest-dom/vitest';

vi.mock('next/headers', async () => {
  const { cookieStore } = await import('./__tests__/support/browser');
  return { cookies: (): Promise<unknown> => Promise.resolve(cookieStore) };
});

vi.mock('next/navigation', async (importOriginal) => {
  const { Redirect } = await import('./__tests__/support/redirect');
  const { NotFound } = await import('./__tests__/support/not-found');
  return {
    ...(await importOriginal<object>()),
    redirect: (location: string): never => {
      throw new Redirect(location);
    },
    notFound: (): never => {
      throw new NotFound();
    },
  };
});

vi.mock('next/cache', async () => {
  const { refreshPage } = await import('./__tests__/support/browser');
  return { refresh: refreshPage };
});

vi.mock('@/main-server', async (importOriginal) => {
  const { fakeMainServer } = await import('./__tests__/support/fake-main-server');
  return { ...(await importOriginal<object>()), mainServer: fakeMainServer };
});

vi.mock('@/app/(signed-in)/events/position-map', () => import('./__tests__/support/fake-maps'));

afterEach(async () => {
  const { resetBrowser } = await import('./__tests__/support/browser');
  const { fakeMainServer } = await import('./__tests__/support/fake-main-server');
  resetBrowser();
  fakeMainServer.reset();
});
