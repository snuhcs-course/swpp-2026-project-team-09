/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { color } from '@/design-system';
import { LIBRARY_HOST } from './site';

// The library's login form (`/pc/login/form`) is laid out for a desktop: its body is at least 959 pixels wide and the
// form is a 430-pixel box placed by absolute offsets, under a viewport that forbids zooming. On a phone the box sat off
// to the side, cut at the left. This style sheet lays the form out as one column across the screen's width.
const LOGIN_PATH = '/NEW_SNU_BOOKING/pc/login/';
export const LOGIN_FIT_ID = 'snu-now-login-fit';

const W = '.login_wrap';

export const LOGIN_FIT_CSS = [
  'html,body{min-width:0!important;width:auto!important;height:auto!important;background:#fff!important}',
  `${W}{position:static!important;width:auto!important;height:auto!important;margin:32px 20px!important;padding:0!important;border:0!important;background:transparent!important;font-family:sans-serif}`,
  `${W} *{font-family:sans-serif!important}`,
  `${W} h1{width:auto!important;margin:0 0 24px!important;text-align:center}`,
  `${W} h1 img{max-width:100%;height:auto}`,
  `${W} dl,${W} .login{float:none!important;width:auto!important;padding:0!important}`,
  `${W} dt{float:none!important;display:block!important;width:auto!important;padding:0!important;margin:16px 0 6px!important}`,
  `${W} dl label{font-size:14px!important;line-height:20px!important;color:${color.inkMuted}!important}`,
  `${W} dd{margin:0!important}`,
  `${W} dd input{width:100%!important;height:48px!important;box-sizing:border-box;padding:0 14px!important;font-size:16px!important;color:${color.ink};border:1px solid ${color.borderStrong}!important;border-radius:12px!important;background:#fff}`,
  `${W} .chk_id{height:auto!important;margin:16px 0 20px!important;font-size:14px!important;color:${color.inkMuted}}`,
  `${W} .chk_id input{width:20px;height:20px;margin:0 6px 0 0}`,
  `${W} .btn_login{display:block;width:100%!important;height:52px!important;padding:0!important;line-height:52px!important;font-size:16px!important;color:#fff!important;background:${color.snuBlue}!important;border:0!important;border-radius:12px!important}`,
].join('');

// The script that adds the style sheet, on the login pages only, once. It adds a style element and nothing else: it
// reads no field, and the login view takes no messages, so nothing on the page reaches the app. The web view runs it
// as the page starts and again when it has loaded, since on Android the first run can come before the page exists.
export const LOGIN_FIT_SCRIPT = `(function () {
  if (location.hostname !== ${JSON.stringify(LIBRARY_HOST)} || location.pathname.indexOf(${JSON.stringify(LOGIN_PATH)}) !== 0) {
    return;
  }
  function fit() {
    if (document.getElementById(${JSON.stringify(LOGIN_FIT_ID)}) !== null || document.documentElement === null) {
      return;
    }
    var style = document.createElement('style');
    style.id = ${JSON.stringify(LOGIN_FIT_ID)};
    style.textContent = ${JSON.stringify(LOGIN_FIT_CSS)};
    (document.head || document.documentElement).appendChild(style);
  }
  fit();
  document.addEventListener('DOMContentLoaded', fit);
})();
true;`;
