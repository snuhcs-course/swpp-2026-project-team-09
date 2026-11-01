/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { LIBRARY_READS, LIBRARY_ROOM_FORM, LIBRARY_WRITES } from './site';

// What the app asks the hidden web view for, and what it answers (the spec's "The message protocol").
export interface LibraryRequest {
  // A fresh id, matched by the app to its pending call.
  id: string;
  endpoint: string;
  // A flat object of form fields.
  body: Readonly<Record<string, string>>;
}

export type LibraryErrorKind = 'sessionEnded' | 'network' | 'notAllowed';

export type LibraryReply =
  { id: string; ok: true; result: unknown } | { id: string; ok: false; error: LibraryErrorKind };

// The one fixed script that every call injects into the hidden web view, on the library's own origin. Only its
// argument varies (`scriptFor`), a value made with `JSON.stringify`; no script text is ever built from the User's
// words or a reply. It makes the site's form POST with the browser's own cookie, which it never reads, and posts back
// only the parsed JSON or an error kind: never the raw text, the headers or a cookie. HTTP 999 (the site's "log in"),
// a redirect and a reply that is not JSON mean the session ended. For the room form page it posts back only the
// applicant's name and 학번 and the prefilled phone number and email.
export const CALL_SCRIPT = `function (request) {
  var READS = ${JSON.stringify(LIBRARY_READS)};
  var WRITES = ${JSON.stringify(LIBRARY_WRITES)};
  var ROOM_FORM = ${JSON.stringify(LIBRARY_ROOM_FORM)};
  var BASE = '/NEW_SNU_BOOKING';
  var REFERRER = 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/booking/roomForm';
  function reply(message) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
  function fail(kind) {
    reply({ id: request.id, ok: false, error: kind });
  }
  function encode(body) {
    var parts = [];
    for (var key in body) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(body[key])));
      }
    }
    return parts.join('&');
  }
  function ended(response) {
    return response.status === 999 || response.type === 'opaqueredirect' || response.redirected === true ||
      (response.status >= 300 && response.status < 400);
  }
  function valueOf(doc, selector) {
    var element = doc.querySelector(selector);
    if (element === null) {
      return null;
    }
    var value = element.getAttribute('value');
    return (value === null ? element.textContent || '' : value).trim();
  }
  function roomForm(text) {
    var doc = new DOMParser().parseFromString(text, 'text/html');
    var names = valueOf(doc, '[name="tmpUserNames"], #tmpUserNames');
    var schoolNos = valueOf(doc, '[name="tmpSchoolNos"], #tmpSchoolNos');
    if (names === null || schoolNos === null) {
      return null;
    }
    return {
      tmpUserNames: names,
      tmpSchoolNos: schoolNos,
      phoneNum: valueOf(doc, '.phoneNum') || '',
      eMail: valueOf(doc, '.eMail') || ''
    };
  }
  var isRoomForm = request.endpoint === ROOM_FORM;
  if (!isRoomForm && READS.indexOf(request.endpoint) < 0 && WRITES.indexOf(request.endpoint) < 0) {
    fail('notAllowed');
    return;
  }
  var headers = { 'X-Requested-With': 'XMLHttpRequest', 'OS_KIND': 'WEB' };
  var init = { credentials: 'same-origin', redirect: 'manual', referrer: REFERRER, headers: headers };
  var address;
  if (isRoomForm) {
    init.method = 'GET';
    address = BASE + '/pc/booking/roomForm';
  } else {
    init.method = 'POST';
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    init.body = encode(request.body);
    address = BASE + '/json/' + request.endpoint;
  }
  fetch(address, init).then(function (response) {
    if (ended(response)) {
      fail('sessionEnded');
      return undefined;
    }
    if (!response.ok) {
      fail('network');
      return undefined;
    }
    return response.text().then(function (text) {
      if (isRoomForm) {
        var form = roomForm(text);
        if (form === null) {
          fail('sessionEnded');
        } else {
          reply({ id: request.id, ok: true, result: form });
        }
        return;
      }
      var result;
      try {
        result = JSON.parse(text);
      } catch (error) {
        fail('sessionEnded');
        return;
      }
      if (result === null || typeof result !== 'object') {
        fail('sessionEnded');
        return;
      }
      reply({ id: request.id, ok: true, result: result });
    });
  }).catch(function () {
    fail('network');
  });
}`;

// The text injected for one call: the fixed script applied to the request, which `JSON.stringify` alone writes.
// `true` at the end is what the web view asks an injected script to end with.
export function scriptFor(request: LibraryRequest): string {
  return `(${CALL_SCRIPT})(${JSON.stringify(request)});\ntrue;`;
}

const ERROR_KINDS: ReadonlySet<unknown> = new Set<LibraryErrorKind>(['sessionEnded', 'network', 'notAllowed']);

function isErrorKind(value: unknown): value is LibraryErrorKind {
  return ERROR_KINDS.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The hidden view's message, if it is one of the protocol's replies. Anything else is ignored.
export function readReply(data: string): LibraryReply | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.id !== 'string') {
    return null;
  }
  if (parsed.ok === true && 'result' in parsed) {
    return { id: parsed.id, ok: true, result: parsed.result };
  }
  if (parsed.ok === false && isErrorKind(parsed.error)) {
    return { id: parsed.id, ok: false, error: parsed.error };
  }
  return null;
}
