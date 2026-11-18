/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { HttpStatus } from '@nestjs/common';
import { INVITE_LINK_TOKEN } from './invite-links.service.js';

// The page loads nothing, from this host or another, and runs no script: it is one inline style and one link.
export const INVITE_PAGE_POLICY =
  "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const TITLE = 'SNU Now 친구 초대';

// The app icon's wordmark, `docs/design/app-icon/sign-in-wordmark.svg`, drawn at a fifth of its size.
const WORDMARK = `<svg xmlns="http://www.w3.org/2000/svg" width="132" height="103" viewBox="19.600 26.080 60.840 47.312" role="img" aria-label="SNU Now">
  <g fill="#001A72">
    <path transform="translate(23.756,44) scale(0.01221,-0.01221)" d="M908 1034H1196C1192 1290 980 1468 660 1468C344 1468 112 1294 112 1030C112 818 262 696 506 636L664 598C822 558 912 512 912 414C912 306 810 232 652 232C492 232 376 306 366 452H74C82 142 306 -20 656 -20C1008 -20 1216 148 1216 414C1216 656 1030 782 782 838L652 870C528 898 418 946 420 1050C422 1146 506 1216 658 1216C804 1216 896 1148 908 1034Z"/>
    <path transform="translate(40.503,44) scale(0.01221,-0.01221)" d="M1330 1448H1032V528H1018L386 1448H122V0H422V920H434L1070 0H1330Z"/>
    <path transform="translate(59.228,44) scale(0.01221,-0.01221)" d="M1018 1448V532C1018 366 902 244 720 244C540 244 422 366 422 532V1448H122V508C122 190 360 -20 720 -20C1080 -20 1320 190 1320 508V1448Z"/>
  </g>
  <g transform="translate(19.6,70) scale(0.78)">
    <g fill="none" stroke="#001A72" stroke-width="5.5">
      <path d="M2.75,0V-10.5A8,8 0 0 1 18.75,-10.5V0"/>
      <path d="M51.25,-21V-9A6,6 0 0 0 63.25,-9V-15M63.25,-9A6,6 0 0 0 75.25,-9V-21"/>
    </g>
    <path fill="#2F6BFF" transform="translate(35,-10.5) rotate(-45) scale(0.525)" d="M-20,0A20,20 0 0 1 0,-20A20,20 0 0 1 20,0A20,20 0 0 1 0,20L-20,20Z"/>
    <circle cx="35" cy="-10.5" r="5" fill="#FFFFFF"/>
  </g>
</svg>`;

// The app's colours: the ink, the muted ink, SNU blue and its pressed shade, with the primary button's size and corner.
const STYLE = `
  * { box-sizing: border-box; }
  html { color-scheme: light; -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 20px;
    background: #FFFFFF;
    color: #0E1330;
    font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif;
    word-break: keep-all;
  }
  main { width: 100%; max-width: 360px; display: flex; flex-direction: column; align-items: center; text-align: center; }
  svg { display: block; margin-bottom: 28px; }
  h1 { margin: 0; font-size: 22px; line-height: 1.4; font-weight: 700; }
  a {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    height: 52px;
    margin-top: 32px;
    border-radius: 12px;
    background: #001A72;
    color: #FFFFFF;
    font-size: 17px;
    font-weight: 700;
    text-decoration: none;
  }
  a:active { background: #00114F; }
  p { margin: 12px 0 0; font-size: 15px; line-height: 1.5; color: #555C74; }
  p.gone { margin-top: 16px; font-size: 17px; color: #0E1330; }
`;

function page(content: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${TITLE}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${WORDMARK}
<h1>${TITLE}</h1>
${content}
</main>
</body>
</html>
`;
}

// The page at an Invite Link's address, for whoever opens it in a browser. A token of an Invite Link token's form gets
// a button that opens the app at the link, whether or not anyone made it or it can still be accepted: the app's accept
// screen says who sent it and whether it can. No script opens the app by itself, since a browser blocks that without a
// press. Any other token is not found, and nothing of it goes into the page.
export function invitePage(token: string): { status: HttpStatus; html: string } {
  if (!INVITE_LINK_TOKEN.test(token)) {
    return { status: HttpStatus.NOT_FOUND, html: page('<p class="gone">찾을 수 없는 초대 링크예요</p>') };
  }
  return {
    status: HttpStatus.OK,
    html: page(`<a href="snunow://invite/${token}">SNU Now에서 열기</a>\n<p>앱이 설치돼 있어야 열려요.</p>`),
  };
}
