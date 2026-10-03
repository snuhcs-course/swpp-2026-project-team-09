# P18: Write setup guide in GitHub Wiki and root README

Status: ready-for-agent

## Problem Statement

The root README is still the course template. A teammate, a teaching assistant or a new contributor who opens the repository cannot tell what the project is, how to run it or what works. The course requires a README with setup instructions, the features shown in the iteration and the known limitations.

## Solution

A root README that takes a reader from cloning the repository to a running system and a running app, states what Iteration 1 demonstrates, and lists what is known not to work. The same guide is published in the Wiki.

## User Stories

1. As a teaching assistant, I want to read in one paragraph what the project is, so that I know what I am looking at.
2. As a teaching assistant, I want the list of features shown in Iteration 1, so that I know what to try.
3. As a teaching assistant, I want the known limitations stated plainly, so that I do not report them as defects.
4. As a teaching assistant, I want to read which goals the prototype reached and what it was meant to validate, so that I can judge the iteration.
5. As a teaching assistant, I want the development and execution environment named, so that I can reproduce the demo.
6. As a teaching assistant, I want the short demo video in the README, so that I can see the key functions without setting anything up.
7. As a teammate, I want the required tools and their versions, so that I install the right ones.
8. As a teammate, I want the steps from cloning to running servers, in order, so that I can follow them without help.
9. As a teammate, I want the names of all settings each project needs and where to obtain their values, so that I can fill in my own file.
10. As a teammate, I want to know which keys must be registered with my own signing key, so that the map and sign-in work on my build.
11. As a teammate, I want the steps to build and start the app on a phone, so that I can see my change.
12. As a teammate on an Intel or Windows machine, I want to be told that the map needs a physical phone, so that I do not lose time on an emulator.
13. As a teammate, I want the command that runs the tests of each project, so that I can check my change.
14. As a teammate, I want to know how to make the local server reachable from a phone, so that the app can connect.
15. As a teammate, I want a map of the repository's folders with one line each, so that I know where things are.
16. As a reader, I want the sources of the map data credited, so that the project meets their licence.
17. As a reader, I want a link to the Wiki, so that I can find the requirements and the design.

## Implementation Decisions

- The README is written in English, like the Wiki.
- Sections, in order: what the project is; what the demo demonstrates (features implemented, goals achieved and what the prototype was meant to validate); the demo video; known limitations and todos; the development and execution environment used; requirements; setup; settings; running the servers; running the app; running the tests; repository layout; data sources and attribution; links.
- The course reads the README on the demo branch. It must say how to run the demo, what the demo demonstrates, and carry the short demo video or a link to it.
- Settings are listed by name with a description. No value, key or secret appears in the README.
- Setup steps are commands that were run on a clean checkout before the README is merged.
- The three demo flows are described as what a User does, not as a list of endpoints.
- Known limitations include at least: Android only; the map runs on ARM devices only; sharing stops when the app is closed by the User; the shuttle position is computed from the operator's drawing; collected events need an Administrator before they appear; Users are hidden outside the Campus Boundary.
- Each project keeps a short README of its own for what is specific to it. The root README links to them and does not repeat them.
- The README credits OpenStreetMap for the Campus Boundary, the shuttle route and the Places and outlines the seed takes from it, and 국토지리정보원's 연속수치지형도 for the national map's outlines and Places.
- The Wiki page holds the same content. Publishing to the Wiki is done on the team lead's request.

## Testing Decisions

- The check is that a person who did not write the README follows it on a clean machine and reaches a running system and a running app.
- Every command in the README is run once, as written, before merging.
- Every setting named in the README exists in the projects' example settings files, and every setting in those files is named in the README.
- There is no automated test for this task.

## Out of Scope

- The requirements, design and testing pages of the Wiki. They belong to P02, P03, P22 and P23.
- Deployment instructions for a cloud environment.
- A contribution guide beyond the pull request template.
- Screenshots of the final design, which does not exist until P19.

## Further Notes

- The schedule names 김태현 as the worker.
- The README is one of the three things the course collects at the end of each iteration, together with the demo branch and the demo video in P20.
- This task is written last among the code tasks, because the commands and the limitations are only known then.
