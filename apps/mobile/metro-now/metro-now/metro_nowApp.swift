// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI
import WidgetKit

@main
struct metro_nowApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .task {
                    WidgetCenter.shared.reloadAllTimelines()
                }
        }
    }
}
