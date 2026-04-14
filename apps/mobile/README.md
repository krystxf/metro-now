# Mobile App

iOS and watchOS app built with Swift and SwiftUI.

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
MAPBOX_ACCESS_TOKEN = pk.your_token_here
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
| `widgets` | Home screen widgets |
| `metro-nowTests` | Unit tests |
| `metro-nowUITests` | UI tests |

## GraphQL

GraphQL queries live in `metro-now/GraphQL/Operations/`. Generated code is in `metro-now/GraphQL/Generated/` and is produced by [Apollo iOS](https://www.apollographql.com/docs/ios/) using the config in `apollo-codegen-config.json`.

## Code formatting

```bash
# from repo root
pnpm app:format
```
