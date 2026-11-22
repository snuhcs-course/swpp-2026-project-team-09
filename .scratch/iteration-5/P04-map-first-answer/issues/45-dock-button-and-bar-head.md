# 45: The dock's button and words, and "＋ 같이" in the bar's head

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none. The caption's chip and "＋ 새 질문" of the same report are ticket 44.

Native files: none. Releases: an app OTA update only.

## What happens now

From the user's phone on Release 26.11.22-22, with a real meal answer:

- The main button beside the input ("일정에 넣기", and 예약하기, 확인, 만들고 초대 보내기 there) is a different height from the input, with other corners, and sits off the input's middle.
- The dock cuts the Assistant's words at two lines with "…", and nothing leads to the rest.
- "＋ 같이" in the bar's head is a dashed chip taller than the head's words, and it runs into the track under them.

## What to build

1. **The main button beside the input**: the input's height (50), fully rounded, standing on the input's bottom, so that the two share their middle. A `bar` size of the design system's Button, which every main button there takes.
2. **The whole reply is one press away.**
   - The dock keeps two lines. While the words are cut, the line ends with "더 보기", and a press on it raises the card.
   - The raised meal card opens with the Assistant's whole words over the list.
   - A reply of words alone (an hours question, a refusal) shows up to five lines before it is cut.
3. **"＋ 같이" in the bar's head**: a solid one-pixel outline, the head row's height (32), its top at the row's top so that the two share their middle. The head row keeps that height, so the track starts below the chip at its full width.

## Acceptance criteria

- [ ] The main button beside the input is the input's height and rounding, on the input's bottom. (Integration test.)
- [ ] A cut sentence says "더 보기", and a press raises the card to the whole words over the list; a line that fits takes no press. (Integration test.)
- [ ] "＋ 같이" is solid and the head row's height, its top at the row's, and the head row keeps that height. (Integration test.)
- [ ] Pictures: the dock with the button and the input level and the bar's head, and a cut reply raised (Emulator), or checked on the phone after the Release.
- [ ] No native file changes; lint, format, and types pass on the app.
