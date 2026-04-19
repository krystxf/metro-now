# Mobile App

iOS and watchOS app built with Swift 5.10 and SwiftUI. Communicates with the backend via GraphQL ([Apollo iOS](https://www.apollographql.com/docs/ios/)).

## Prerequisites

- Xcode (latest)
- [Mapbox access token](https://account.mapbox.com)

## Setup

1. Copy the secrets config:

```bash
cp metro-now/Secrets.xcconfig.example metro-now/Secrets.xcconfig
```

2. Add your Mapbox token to `Secrets.xcconfig`:

```
MAPBOX_ACCESS_TOKEN = your_mapbox_access_token_here
```

3. Open the project in Xcode:

```bash
pnpm xcode
```

4. Build and run (Cmd+R)

## Targets

| Target | Description |
| --- | --- |
| `metro-now` | iOS app |
| `metro-now Watch App` | watchOS companion |
| `widgets` | Home screen widgets (departures, frequency) |
| `metro-nowTests` | Unit tests |
| `metro-nowUITests` | UI tests |

## Project structure

```text
metro-now/
  metro-now/          iOS app
    App/              App entry point
    Core/             Networking and storage
    Features/         Feature modules
      ClosestStop/    Nearest stop view
      Error/          Error handling
      Favorites/      Saved stops
      Infotexts/      Service messages
      Map/            Mapbox map view
      Search/         Stop search
      Settings/       App settings
      StopDetail/     Stop departure detail
      Welcome/        Onboarding
    GraphQL/          Queries, schema, and generated code
    Shared/           Reusable components and previews
    State/            View models (location, stops, favorites)
  metro-now Watch App/  watchOS companion
  widgets/            Home screen widgets
    departures/       Departure countdown widget
    frequency/        Service frequency widget
  shared/             Components, constants, types, and utils shared across targets
```

## GraphQL

GraphQL queries live in `metro-now/GraphQL/Operations/`. The schema is in `metro-now/GraphQL/Schema/`. Generated code is in `metro-now/GraphQL/Generated/` and is produced by Apollo iOS using the config in `apollo-codegen-config.json` (namespace: `MetroNowAPI`).

## Localization

The app is localized in English (default), Czech (`cs`), and Spanish (`es`). Localization files are in each target's `*.lproj/` directories.

## Code formatting

[SwiftFormat](https://github.com/nicklockwood/SwiftFormat) is configured via `.swiftformat` (excludes `metro-now/build`). Formatting settings (`.swift-format`) use 4-space indentation and a 100-character line length.

```bash
# from repo root
pnpm app:format
```
