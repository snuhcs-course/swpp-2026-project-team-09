# 94: The Assistant's input takes no words autofill writes into it

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

On the user's phone (2026-11-26), after a 관정 login from the seat card, the answer's input ("이어서 말하기") held the saved library login ID. The field had Android's yellow autofill highlight, and 보내기 was lit.

The same fault was fixed once in P01 ticket 02 (PR 481, 2026-11-22). Since then every text field of the app takes `NOT_AUTOFILLED`: `autoComplete="off"`, `importantForAutofill="no"` and `textContentType="none"`. A test pins them, and the AI input carries them. They did not stop it. Some autofill services fill fields marked not important too.

## What to build

The AI input takes no words written into it while the User is not in it:

- A change that comes while the field is not focused is dropped, and the field shows the words it had.
- Nobody types or pastes into a field without focusing it first, so only autofill writes into an unfocused one.
- `NOT_AUTOFILLED` stays on every field.

## Acceptance criteria

- [x] A test fails on the code before: words written into the AI input while it is not focused leave it empty, with 보내기 off.
- [x] Words the User types are taken as before.
- [x] No native file changes; lint, format and types pass on the app.
- [ ] Checked on the user's phone after the Release. Only a phone with a saved library login can show the effect.

## Comments

What the guard does not cover: an autofill that lands while the field is focused, for example with the keyboard up right after the login. If it comes back that way, the next step is native, a config plugin that marks the field `IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS` on its parent. That would need a native Release.
