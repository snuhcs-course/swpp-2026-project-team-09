// Answers in place of the outside services, inside the test stack. Compose gives this container the services' host
// names, and the servers trust its certificate, so they reach it as they would reach the real ones.
// Run by Node in the container as it is, with the saved pages and answers of the servers' own tests mounted.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:https';

const SAVED_MENU_DAY = '2026-10-01';

const read = (path: string): string => readFileSync(path, 'utf8');

const tls = { key: read('/tls/sources-key.pem'), cert: read('/tls/sources-cert.pem') };
const coopMenus = read(`/pages/coop-menus-${SAVED_MENU_DAY}.html`);
const dormitoryMenus = read(`/pages/dormitory-menus-${SAVED_MENU_DAY}.html`);

const html = (body: string): { body: string; type: string } => ({ body, type: 'text/html; charset=utf-8' });
const json = (body: string): { body: string; type: string } => ({ body, type: 'application/json; charset=utf-8' });

// A menu page asked for any day is the saved day's page, dated as the day asked for.
const menuPage = (page: string, url: URL): string =>
  page.replaceAll(SAVED_MENU_DAY, url.searchParams.get('date') ?? SAVED_MENU_DAY);

const answers: Record<string, (url: URL) => { body: string; type: string }> = {
  'GET www.googleapis.com/oauth2/v1/certs': () =>
    json(JSON.stringify({ 'flow-tests': read('/tls/google-public-key.pem') })),
  'GET snuco.snu.ac.kr/foodmenu/': (url) => html(menuPage(coopMenus, url)),
  'GET snudorm.snu.ac.kr/foodmenu/': (url) => html(menuPage(dormitoryMenus, url)),
  'GET web.busin.co.kr/BuslineCircleS.aspx': () => html(read('/pages/shuttle-stops-2026-10-02.html')),
  'POST web.busin.co.kr/BuslineCircleS.aspx/GetRoute': () => json(read('/pages/shuttle-vehicles-2026-10-02.json')),
  'GET dapi.kakao.com/v2/routing/walk': () =>
    json(read('/answers/kakao-walk-main-gate-to-central-library-2026-10-02.json')),
};

createServer(tls, (request, response) => {
  const url = new URL(request.url ?? '/', `https://${request.headers.host ?? 'unknown'}`);
  const at = `${request.method ?? 'GET'} ${url.hostname}${url.pathname}`;
  const answer = answers[at];
  if (answer === undefined) {
    console.log(`Not served: ${at}`);
    response.writeHead(404).end();
    return;
  }
  const { body, type } = answer(url);
  response.writeHead(200, { 'Content-Type': type }).end(body);
}).listen(443);
