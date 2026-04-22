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

2. Fill in `Secrets.xcconfig`:

```
MAPBOX_ACCESS_TOKEN = your_mapbox_access_token_here

SLASH = /
API_URL = https:$(SLASH)$(SLASH)api.metronow.dev
```

`API_URL` is split via `$(SLASH)` because `//` starts a comment in xcconfig. Point it at your local backend (e.g. `http:$(SLASH)$(SLASH)192.168.1.224:3009`) for development.

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

GraphQL queries live in `metro-now/GraphQL/Operations/`. The schema is in `metro-now/GraphQL/Schema/MetroNow.graphqls` (hand-mirrored from the backend — keep in sync when the backend schema changes). Generated code is written to `metro-now/GraphQL/Generated/` by Apollo iOS using the config in `apollo-codegen-config.json` (namespace: `MetroNowAPI`). The `Generated/` directory is git-ignored — it's regenerated locally and in CI.

### Running codegen

Codegen is needed whenever you add or modify a `.graphql` operation or update `MetroNow.graphqls`.

**One-time setup** — extract the `apollo-ios-cli` binary bundled with the Apollo iOS SPM checkout:

```bash
# Build the project at least once in Xcode so SPM resolves apollo-ios, then:
tar -xzf ~/Library/Developer/Xcode/DerivedData/metro-now-*/SourcePackages/checkouts/apollo-ios/CLI/apollo-ios-cli.tar.gz \
  -C apps/mobile/metro-now/
```

The binary is platform-specific and git-ignored.

**Generate** — from `apps/mobile/metro-now/`:

```bash
./apollo-ios-cli generate
```

This reads `apollo-codegen-config.json`, walks the operations in `GraphQL/Operations/`, validates them against `GraphQL/Schema/MetroNow.graphqls`, and writes Swift types under `GraphQL/Generated/`. The generated files are git-ignored; CI regenerates them in the mobile build and swift test jobs.

**Alternative — Xcode command plugin**: right-click the **metro-now** project in the Xcode navigator → Apollo iOS → Generate Apollo Code.

### Keeping the schema in sync

`MetroNow.graphqls` is a manual mirror of the backend's GraphQL schema. When the backend schema changes (new fields, enums, types), edit this file to match. If codegen fails with "unknown field" or "undefined type" errors, this is usually why.

Long-term, consider wiring up an introspection fetch via `apollo-ios-cli fetch-schema` against a running backend; not set up yet.

## Localization

The app is localized in English (default), Czech (`cs`), and Spanish (`es`). Localization files are in each target's `*.lproj/` directories.

## Code formatting

[SwiftFormat](https://github.com/nicklockwood/SwiftFormat) is configured via `.swiftformat` (excludes `metro-now/build`). Formatting settings (`.swift-format`) use 4-space indentation and a 100-character line length.

```bash
# from repo root
pnpm app:format
```
