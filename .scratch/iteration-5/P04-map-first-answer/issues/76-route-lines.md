# 76: A meal answer's lines tell the way there from the way on, and walking from the shuttle

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

- A meal Plan's way there is a solid dark blue line, 5 wide. Its way on to the next Class is drawn as dots of the same blue: short pieces every 24 metres, which the app builds because the native map cannot dash a line. A way on by the shuttle is purple dots.
- Where the two legs share a road, as they often do between a Class and the place next to it, the dots sit on the line and the two read as one. On the phone the dots look like noise rather than "after the meal".
- Every leg's minutes pill looks the same, blue words on white, whichever leg or mode it belongs to.

## What to build

1. Weight tells the leg. The way there is a dark thin solid line. The way on is a pale band about twice as wide, drawn before the way there so that the native map, which draws a later line on top, lays the way there over it where they share a road. No dots.
2. Hue tells the mode. On foot is blue (`snuBlue`, the band `routeOn`). The shuttle's ride is purple (`svcShuttle`, the band `routeShuttleOn`). A shuttle leg's walks to and from its stops are drawn as walks. The pale colours are opaque, so a band that crosses itself stays one colour.
3. A leg's pill follows its line. The way there's pill is dark with white words: blue on foot, purple by the shuttle. The way on's pill is pale with words in its line's colour: `blue100` with blue words, `svcShuttleSoft` with purple words.
4. Only a meal answer's Plans change: their `me` and `next` routes and their shuttle legs. Every other answer keeps its lines.

## Acceptance criteria

- [ ] A meal Plan's way there on foot is `snuBlue` 5 wide; by the shuttle, its ride is `svcShuttle` 5 wide, and its walks are the way there's.
- [ ] A meal Plan's way on on foot is a `routeOn` band 10 wide, at least 3:1 against the map's campus; by the shuttle, its ride is a `routeShuttleOn` band 10 wide, and its walks are the way on's band.
- [ ] The way on's lines come before the way there's, in the list the map draws.
- [ ] No line id holds `:dot:`.
- [ ] The four pills show the colours of rule 3.
- [ ] An answer that is not a meal draws its routes as before, in their order.

## Comments

### Built (2026-11-26)

- The look follows the proposal approved on 2026-11-26 ("길 표시는 그림대로 진행해줘").
- Styles: `LEG_STYLES` in `answer-groups.ts` holds the four (`walkThere`, `walkOn`, `rideThere`, `rideOn`); `walkThere` is `ROUTE_STYLES.me`, the same object as before. The pills are the label tones `leg`, `legOn`, `legShuttle` and `legShuttleOn`.
- Other answers keep `ROUTE_STYLES`: the User's way `snuBlue` 5, a Friend's in their colour 4, the next fixed thing's `borderStrong` 3, the shuttle's `svcShuttle` 4, and another way `inkSubtle` 2. They have no minutes pills; only a meal Plan's legs do.
- The walk-on band was first `#9FB0E6`. On the phone it was hard to see ("연한 파랑이 생각보다 잘 안보인다"): the Kakao map's campus ground is a light blue, `#D1E3EE` on the emulator, and that band stood only 1.6:1 against it. It is now `#5679E4`, 3.0:1 against the campus and 3.8:1 against the way there's `#001A72`, and a test holds both at 3:1, WCAG's measure for a graphic. The purple band `#C9B0EE` stays: it is 1.5:1 against the campus but stands apart by its hue.
- `withDots` stays as a pass-through, since `use-answer-walks.ts` calls it and is ticket 75's file. Ticket 75 can drop the call and the function.

### Agent usage (2026-11-26)

- Agent time: about 45 minutes in this session (an estimate), most of it waiting on tests at a high machine load. No subagents.
- Tokens: this session, input 214 uncached, cache reads 36,794,831 and cache writes 204,220; output 74,939. These also hold about 8 minutes of merging 5.0/Main into PR 573, and they are counted up to this entry. The pictures, if taken later, are not in them.
