# 50: Korean typed into a search box is composed and narrows the list as it is typed, in every search box of the app

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Reported by the user on 2026-11-28 from the released app on an Android phone: in the 친구 panel's search, "컴…" stayed as loose letters, "ㅋㅓㅁ", and the list said "결과 없음". The user asked for the search box to be shared so that no search box can have this fault.

Positions are as of `origin/5.0/Main` da54c9c18, under `mobile/src/`.

- **Loose letters.** On Android, React Native turns `autoCorrect={false}` into `TYPE_TEXT_FLAG_NO_SUGGESTIONS` (`ReactTextInputManager.setAutoCorrect`), and Samsung Keyboard then stops composing Hangul. `SearchField` set it until PR 712 (P06 ticket 34) removed it on 2026-11-28; Releases `26.11.28-9` onward carry that. An installed app takes an OTA update on the launch after it downloads, so a phone can still run the older bundle. Nothing stops another field from setting it again: eight files draw React Native's `TextInput` themselves, each with `NOT_AUTOFILLED` spread in by hand.
- **Loose letters in a panel or a sheet only.** After two restarts on the released app, the user's Samsung phone composed "컴" in 행사's and 파티's search and still split it in the 친구 panel. The panel is a `SidePanel`, which draws through `Overlay`: `OverlayHost` receives the children through state, so a field there gets its owner's new `value` one commit late. React Native's TextInput re-renders in between with the old value, sees it differs from the text just typed (`TextInput.js`, the layout effect at line 203), and sends the old text and then the new one to the native field (`setTextAndSelection`). That replaces the native text and drops the keyboard's composing on every key. Every field in a `BottomSheet` has the same fault: the 파티 form's 친구 초대 sheet and its place sheet.
- **No match while a syllable is being typed.** Every search list matches with `includes` on the whole words. The keyboard gives "ㅋ", then "커", then "컴", so "커" finds nothing and the list says "결과 없음" until the syllable is done; first consonants ("ㅋㅍㅌ") find nothing either. Each list has its own copy of this: the friend panel and 친구 관리 (`found`), the 파티 form's 친구 초대 (`matchesFriend`), 행사 and the 파티 form's 관련 행사 (`features/events/adapter.ts`), 파티 찾기 (`features/party/finding.ts`) and the "@" mention list (`features/assistant/mentions.ts`).
- **Different empty words.** 행사 and 관련 행사 say "검색 결과가 없어요"; the friend panel, 친구 관리 and 파티 찾기 say "결과 없음"; the 파티 form's 친구 초대 (inline and sheet) show nothing.

## What to build

1. **One text input.** `TextEntry` (`design-system/text-entry.tsx`) is the only place that draws `TextInput`. It applies `NOT_AUTOFILLED` and cannot be given `autoCorrect`, neither by type nor at run time. It shows the words just typed in the same commit as the change and takes its owner's words whenever the owner changes them, so a field in an overlay is never sent the old words. An owner takes what it is given: a length limit is `most` (the onboarding fields' cut, which moves with `lengthOf` to `design-system/length.ts`), and a refusal is `takes` (the AI input's words written while the User is not in it). Every field moves onto it: `SearchField`, `TextField`, `ChatInput`, the AI input, the timetable's rename, the onboarding `Input` and `FixedField`, and the 파티 form's title and text.
2. **One matcher.** `matchesWords(words, texts)` (`features/search/matches-words.ts`) ignores spaces, '#' and case and reads NFD Hangul as NFC. Words of consonants alone match the texts' first consonants ("ㅋㅍㅌ" finds 컴퓨터). Other words match as the keys typed for them, compound vowels and finals split into their keys: "커" finds 컴퓨터, "가바" finds 가방, "고" finds 과자, "달" finds 닭. Every list above uses it. The Friends' search is `matchesFriend` (`features/friends/matches-friend.ts`), shared by the friend panel, 친구 관리 and both 친구 초대 lists. The "@" list keeps its rule that a space typed after the words ends them.
3. **One empty state.** `NO_RESULTS`, "결과 없음", is what every list a search narrowed says when nothing is left, including the 파티 form's 친구 초대 lists.
4. **Kept as they are:** what each list searches (the fields), its order, its filters; the building search of the place sheet and the timetable's place picker, which the main server answers.

## Must not break

- Every text field's autofill rule (P01 ticket 02).
- The "@" mention list's rule that "민수 " finds no 김민수.
- 파티 찾기's search with '#' and spaces.

## Acceptance

- [ ] No file but `text-entry.tsx` draws `TextInput`, and `TextEntry` passes no `autoCorrect` (unit test).
- [ ] Typing ㅋ, 커, 컴 into a `TextEntry` in an `Overlay` sends the native field no text, with React Native's own TextInput (unit test, failing before).
- [ ] "커" and "ㅋㅍㅌ" find the 컴퓨터공학부 Friends in the friend panel (integration test, failing before).
- [ ] The matcher's cases, and each list's own test with a syllable being typed (unit tests, failing before for the lists).
- [ ] On the emulator, Korean typed in the friend panel's search is composed and narrows the list.

## Comments
