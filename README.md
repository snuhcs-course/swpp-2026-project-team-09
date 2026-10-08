# SNU-SWPP-Template

You can use the README file to showcase and promote your mobile app. The template provided below is just a starting point. Feel free to craft your README as you see fit. 

Please note that the README doesn't affect your grade and is not included in documentation(Wiki).

# [Your Application Name]

[Short application description here]

![Application Screenshot](path_to_screenshot.png)

## Features

- Feature 1: Brief description
- Feature 2: Brief description
- ...

## Getting Started

### Prerequisites

- Android Studio [version, e.g., 4.2.1]
- Minimum Android SDK Version [e.g., 21]

### Installation

[Installation link here]

## Demo data

To try every feature at once, start the system with demo data in the repository root:

```bash
docker compose --profile demo up --build
```

It adds demo Users and their friendships, published Global Events, recruiting Quests on every Board, a running Party,
this week's menus and shuttle vehicles, and keeps the demo Users' Avatars moving on campus. List your own SNU address in
`DEMO_ACCOUNT_EMAILS` of `main-server/.env` to receive demo Friends, Friend Requests, a Quest invitation and a Meetup
after your Onboarding. `docker compose --profile demo down -v` removes it all. The details are in
[main-server/README.md](main-server/README.md#demo-data).
