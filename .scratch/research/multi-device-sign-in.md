# One account on two devices: benchmark and policy for SNU Now

Sources accessed 2026-09-29. Only vendor help centres were used. `[X1]`-style links point to the Sources list at the end.

## 1. Summary

- Location-first apps tie the shared location to exactly one device. Life360 and Zenly allow one signed-in device and sign the old one out automatically. Find My allows many devices but has one "Sharing From" device that the user switches by hand.
- Messaging apps allow one primary phone plus secondary devices (WhatsApp: up to four linked devices; KakaoTalk: one PC or Mac and a companion tablet). Live location stays on the primary phone: WhatsApp companion phones cannot share it.
- No vendor documents a "last uploader wins" model. Google Maps makes sharing a per-device setting and does not say which position viewers see when two devices share.
- **Recommendation: option A, one app session per User.** A new app sign-in ends the old phone's session and cuts its uploads and socket at once. Administrator sign-in is kept separate.

## 2. Comparison

| App                             | Several devices at once?                                                                                           | Old device on new sign-in                                                                             | Which device supplies location                                                                            | How it is switched                                                                                 | How the user or old device is told                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Apple Find My                   | Yes, every signed-in device is listed [A4]. Location only from iPhone, iPad, iPod touch or Watch, never a Mac [A2] | Both stay signed in and are listed [A4]. Whether a new device takes over location is not documented   | One device, shown next to "Sharing From" [A1]. A cellular Watch takes over when away from its iPhone [A1] | On the device that should share: _Use This iPhone as My Location_, in Find My or Settings [A1][A3] | New sign-in may need a code shown on trusted devices [A5]. Notice of a location-device change: not documented         |
| Google Maps                     | Yes. Location Sharing is a per-device, per-account setting [G1]                                                    | Stays signed in; sessions listed at google.com/devices [G2]                                           | Each device with the setting on [G1]. Which position wins if two share: not documented                    | Turn the setting off on the other devices [G1]                                                     | Session list [G2]; alert to the old device: not documented                                                            |
| Life360                         | No [L1]                                                                                                            | Signed out automatically [L1]                                                                         | The single signed-in phone [L1]                                                                           | Sign in on the other phone; logging out of the old one first is advised [L2]                       | New-device email on every login [L1]; message on the old device: not documented                                       |
| Snapchat / Snap Map             | App: several sessions, listed in Session Management [S1]. Web: one computer at a time [S2]                         | Web: previous computer logged out [S2]. App: not documented                                           | Not documented                                                                                            | Not documented; remote logout via Session Management [S1]                                          | Not documented                                                                                                        |
| WhatsApp                        | Primary phone plus up to 4 linked devices [W1]                                                                     | New primary phone: old phone logged out when re-registration completes [W3]. Linked devices stay [W1] | Primary phone only; companion phones cannot use live location [W2]                                        | Re-register on the other phone [W3]                                                                | Old phone shows a "registered on a new device" screen [W4]; linking an unrecognised device asks for confirmation [W6] |
| KakaoTalk (+ KakaoMap 친구위치) | One main device, plus one PC/Mac [K1] and a tablet as "다른 기기와 함께 사용" [K2]                                 | Old main device must re-authenticate [K3]; phone unusable while a tablet is main device [K2]          | 친구위치 uses the mobile device's location with "always" permission [K4]; multi-device: not documented    | Sign in as main device, not as companion [K2][K5]                                                  | PC sign-in sends a notice to mobile KakaoTalk [K6]; old phone shows re-authentication [K3]                            |
| Zenly (closed 2023 [Z2])        | No [Z1]                                                                                                            | Session disconnected [Z1]                                                                             | The currently connected device [Z1]                                                                       | Sign in on the other device [Z1]                                                                   | Not documented; the old device must sign in again [Z1]                                                                |

## 3. Per-app notes

**Apple Find My.** Many signed-in devices, one location device, moved by the user from the device that should take over [A1]. The guides (iOS 27 version) do not say what a new iPhone's sign-in does to the location device, or whether anyone is told of a change.

**Google Maps.** The setting is "device and account-specific" [G1]. How two sharing devices are reconciled appears only in community threads, which are not evidence here.

**Life360.** "Automatically sign you out of any other device", for accurate location and Place Alerts [L1] (updated 2026-01-28). The new-phone article (updated 2026-06-01) still advises logging out of the old phone first. If the new phone shows the old location, it advises changing the password and signing in again [L2].

**Snapchat.** The brief assumes a mobile rule of one device at a time. I could not find it in the current help centre. The Session Management article (updated 2026-06-17) assumes several signed-in devices, and only Snapchat for Web is limited to one computer [S1][S2]. **Unverified.** Snap Map documents who sees you, and that location expires after 24 hours when permission is "only while using" [S3]. It says nothing about which device supplies the location.

**WhatsApp.** Linked devices log out if the primary phone is unused for more than 14 days [W1]. The companion-phone page says "Live location isn't supported on companion phones." [W2] The pages are ambiguous. The consumer linked-devices page lists only _viewing_ live location as unsupported [W1], while the Business page lists both sharing and viewing [W5]. Re-registering on a new phone logs the old phone out [W3]. The old phone can take the account back, which logs out every other device [W4].

**KakaoTalk.** KakaoTalk runs on one PC or Mac at a time and alongside mobile [K1]. A tablet either joins as a companion ("다른 기기와 함께 사용") or becomes the main device, and then the phone cannot use the account [K2]. KakaoTalk asks for re-authentication when the same number or account is signed in on another device, and chats deleted by re-authentication cannot be restored [K3]. KakaoMap 친구위치 needs "always" location permission on the mobile device [K4] and hides friends who are logged out [K7]. It does not document behaviour across several devices. Kakao pages render client-side. Several article IDs returned by search engines now redirect to the help home, so I cite only pages that loaded today.

**Zenly.** The official help centre is offline; zen.ly shows only "2014-2023" [Z2]. A Wayback copy of Zenly's own article (2022-10-04) says "the same account cannot be simultaneously connected to two devices". It adds that friends see only the connected device, and switching disconnects the other session [Z1].

## 4. Policy options for SNU Now

**(A) One app session per User.** A new app sign-in revokes the User's other app refresh-token families.

- Pros: exactly one uploader, so "one live position per User" holds by construction. It matches the location-first apps (Life360, Zenly). Signing in on a replacement phone also shuts out a lost phone, which then cannot see Friends' positions either. No device picker is needed.
- Cons: no second device, not even a tablet for viewing. Signing in on a friend's phone signs you out of your own (recoverable). Without extra work the old phone keeps a valid access token for up to 1 hour, and P17's background task keeps uploading until that token expires.
- Impact: `POST /auth/google` for the app revokes the other families in the same transaction. To close the one-hour gap, add the family id as an `sid` claim. The upload endpoint checks it against the User's current family in Redis, one GET per upload. The main server also emits a "session replaced" event over the existing Redis channel, and the socket server disconnects that User's sockets with another `sid`. It reads the `sid` from the token, so it still holds no data. The app treats a 401 with a dedicated code as "signed in on another device": it stops the background task (as on sign-out in P17) and shows the sign-in screen with that message. **Admin site:** today it shares `/auth/google`, so a per-User rule would sign an Administrator's phone out. Scope revocation to the app's Google client (ID-token `aud`), or land ticket 14, which gives Administrators their own route and table.

**(B) Several sessions, one "location device" per User (Find My).**

- Pros: a tablet or second phone can view the map, and the User controls which device shares.
- Cons: a new domain concept, a switch screen and an endpoint. The server must drop uploads from other devices without marking the User hidden. Nothing documented says what a new sign-in should do. A lost phone that is not the location device stays signed in and can still see Friends until the User signs out everywhere.
- Impact: sessions get a device label, `users` gets the location session id, and the upload filter, switch endpoint, socket notice and tests follow. Rough estimate: about twice the work of A.

**(C) Last uploader wins.**

- Pros: no work.
- Cons: the Avatar flips between devices, and an off-campus device hides a User who is on campus, so the product requirement fails. A forgotten device keeps broadcasting. No vendor documents this model.
- Impact: none now. Every fix, such as ignoring the "hidden" mark from the non-latest device, ends up rebuilding B.

A variant of B without a picker (the newest sign-in shares and older sessions only view, as with WhatsApp and Kakao) keeps the lost-phone viewing problem.

## 5. Recommendation

Choose **(A), scoped to the app client**, because:

1. The product requirement is one live position per User. The benchmarked apps built around the same requirement (Life360, Zenly) enforce it by allowing a single signed-in device [L1][Z1]. Even the messaging apps that allow many devices keep live location on the primary phone [W2].
2. It protects Friends' privacy when a phone is lost. B and its variants leave a lost phone able to watch Friends.
3. It fits the current design. Families already exist and sign-out already revokes them. The added pieces are one revocation at sign-in, an `sid` claim and one Redis check per upload.

Suggested order: (1) revoke other app families at sign-in; (2) `sid` check on upload plus the socket disconnect event; (3) app handling of the "replaced" 401. The Administrator separation (ticket 14 or an `aud` check) must land together with (1).

**Open questions for the team**

- On takeover, should the Master Switch turn off, as on sign-out, or stay as it was?
- Should takeover clear the stored position and hidden flag, so the old phone's last point does not linger for up to 10 minutes?
- Is a view-only tablet a real need for students? If it is, revisit B later.
- Do we want the device name in the message ("signed in on another device: Galaxy S24")? That needs the app to send a device label at sign-in.
- Ticket 14 or an `aud` check: which one lands first?

## 6. Sources (all accessed 2026-09-29)

- [A1]: Apple, Share your location in Find My on iPhone (iOS 27 guide). https://support.apple.com/guide/iphone/share-your-location-iph01954dc44/ios
- [A2]: Apple, Share your location in Find My on Mac. https://support.apple.com/guide/findmy-mac/share-your-location-fmm949cc7610/mac
- [A3]: Apple, Share your location with your Family Sharing group. https://support.apple.com/en-us/105107
- [A4]: Apple, Review devices signed in to your Apple Account. https://support.apple.com/en-us/102649
- [A5]: Apple, Two-factor authentication for Apple Account. https://support.apple.com/en-us/102660
- [G1]: Google, Manage your Location Sharing settings (Android). https://support.google.com/accounts/answer/9363497?hl=en&co=GENIE.Platform%3DAndroid
- [G2]: Google, Check devices with account access. https://support.google.com/accounts/answer/3067630?hl=en
- [L1]: Life360, Life360 on Multiple Devices (updated 2026-01-28). https://support.life360.com/hc/en-us/articles/23053659701655-Life360-on-Multiple-Devices
- [L2]: Life360, Login to Life360 on My New Device (updated 2026-06-01). https://support.life360.com/hc/en-us/articles/23053664643223-Login-to-Life360-on-My-New-Device
- [S1]: Snapchat, How do I manage the devices where I'm currently signed into my Snapchat account? (updated 2026-06-17). https://help.snapchat.com/hc/en-us/articles/23515601788948-How-do-I-manage-the-devices-where-I-m-currently-signed-into-my-Snapchat-account
- [S2]: Snapchat, How to Call, Snap, and Chat from Snapchat for Web. https://help.snapchat.com/hc/en-us/articles/7121575005332-How-to-Call-Snap-and-Chat-from-Snapchat-for-Web
- [S3]: Snapchat, How long does my location stay on Snap Map? https://help.snapchat.com/hc/en-us/articles/7012280385684-How-long-does-my-location-stay-on-Snap-Map
- [W1]: WhatsApp, About linked devices. https://faq.whatsapp.com/378279804439436/?cms_platform=android
- [W2]: WhatsApp, About linking WhatsApp to a second phone. https://faq.whatsapp.com/1046791737425017/?cms_platform=android
- [W3]: WhatsApp, About changing phones. https://faq.whatsapp.com/1197347060992858/?cms_platform=android
- [W4]: WhatsApp, Seeing "Your phone number was registered with WhatsApp on a new device". https://faq.whatsapp.com/1234181997583400
- [W5]: WhatsApp, About linked devices on the WhatsApp Business app. https://faq.whatsapp.com/647349420360876
- [W6]: WhatsApp, How to link a device. https://faq.whatsapp.com/1317564962315842/?cms_platform=android
- [K1]: Kakao, 동일한 카카오계정으로 PC 버전과 Mac 버전 양쪽에서 카카오톡을 이용할 수 있나요? https://cs.kakao.com/helps_html/1073209664?locale=ko
- [K2]: Kakao, 다른 기기와 함께 사용이 무엇인가요? https://cs.kakao.com/helps_html/1073209304?locale=ko
- [K3]: Kakao, 인증 정보가 만료되었다는 메시지를 확인했어요. https://cs.kakao.com/helps_html/1073209527?locale=ko
- [K4]: Kakao, [친구위치] 위치 접근 허용은 왜 항상이 필수인가요? https://cs.kakao.com/helps_html/1073211361?locale=ko
- [K5]: Kakao, 태블릿을 '다른 기기와 함께 사용'하는 기기로 사용했었는데 메인 기기로 사용하고 싶어요. https://cs.kakao.com/helps_html/1073209308?locale=ko
- [K6]: Kakao, 다른 사람이 내 카카오계정으로 PC 버전에 로그인한 것 같아요. https://cs.kakao.com/helps_html/1073209496?locale=ko
- [K7]: Kakao, [친구위치] 친구위치 초대 메시지를 보냈는데 지도에서 친구들이 보이지 않아요. https://cs.kakao.com/helps_html/1073211331?locale=ko
- [Z1]: Zenly, Using Zenly on Multiple Devices Simultaneously (Wayback copy, 2022-10-04). https://web.archive.org/web/20221004005217/https://community.zen.ly/hc/en-us/articles/5491319522961-Using-Zenly-on-Multiple-Devices-Simultaneously
- [Z2]: Zenly, zen.ly home page. https://zen.ly/

[A1]: https://support.apple.com/guide/iphone/share-your-location-iph01954dc44/ios
[A2]: https://support.apple.com/guide/findmy-mac/share-your-location-fmm949cc7610/mac
[A3]: https://support.apple.com/en-us/105107
[A4]: https://support.apple.com/en-us/102649
[A5]: https://support.apple.com/en-us/102660
[G1]: https://support.google.com/accounts/answer/9363497?hl=en&co=GENIE.Platform%3DAndroid
[G2]: https://support.google.com/accounts/answer/3067630?hl=en
[L1]: https://support.life360.com/hc/en-us/articles/23053659701655-Life360-on-Multiple-Devices
[L2]: https://support.life360.com/hc/en-us/articles/23053664643223-Login-to-Life360-on-My-New-Device
[S1]: https://help.snapchat.com/hc/en-us/articles/23515601788948-How-do-I-manage-the-devices-where-I-m-currently-signed-into-my-Snapchat-account
[S2]: https://help.snapchat.com/hc/en-us/articles/7121575005332-How-to-Call-Snap-and-Chat-from-Snapchat-for-Web
[S3]: https://help.snapchat.com/hc/en-us/articles/7012280385684-How-long-does-my-location-stay-on-Snap-Map
[W1]: https://faq.whatsapp.com/378279804439436/?cms_platform=android
[W2]: https://faq.whatsapp.com/1046791737425017/?cms_platform=android
[W3]: https://faq.whatsapp.com/1197347060992858/?cms_platform=android
[W4]: https://faq.whatsapp.com/1234181997583400
[W5]: https://faq.whatsapp.com/647349420360876
[W6]: https://faq.whatsapp.com/1317564962315842/?cms_platform=android
[K1]: https://cs.kakao.com/helps_html/1073209664?locale=ko
[K2]: https://cs.kakao.com/helps_html/1073209304?locale=ko
[K3]: https://cs.kakao.com/helps_html/1073209527?locale=ko
[K4]: https://cs.kakao.com/helps_html/1073211361?locale=ko
[K5]: https://cs.kakao.com/helps_html/1073209308?locale=ko
[K6]: https://cs.kakao.com/helps_html/1073209496?locale=ko
[K7]: https://cs.kakao.com/helps_html/1073211331?locale=ko
[Z1]: https://web.archive.org/web/20221004005217/https://community.zen.ly/hc/en-us/articles/5491319522961-Using-Zenly-on-Multiple-Devices-Simultaneously
[Z2]: https://zen.ly/
