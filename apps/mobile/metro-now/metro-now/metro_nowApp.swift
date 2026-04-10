// metro-now
// https://github.com/krystxf/metro-now

import MapboxMaps
import SwiftUI
import WidgetKit


@main
struct metro_nowApp: App {

    init() {
        if let accessToken =
            (Bundle.main.object(forInfoDictionaryKey: "MAPBOX_ACCESS_TOKEN") as? String)
                ?? ProcessInfo.processInfo.environment["MAPBOX_ACCESS_TOKEN"],
            !accessToken.isEmpty
        {
            MapboxOptions.accessToken = accessToken
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .task {
                    WidgetCenter.shared.reloadAllTimelines()
                }
        }
    }
}
