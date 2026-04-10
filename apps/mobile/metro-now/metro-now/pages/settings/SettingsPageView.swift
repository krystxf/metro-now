// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SettingsPageView: View {
    @AppStorage(
        AppStorageKeys.showMetroOnly.rawValue
    ) var showMetroOnly = false
    @AppStorage(
        AppStorageKeys.showTraffic.rawValue
    ) var showTraffic = false

    var body: some View {
        List {
            Section(header: Text("Customize")) {
                if UIApplication.shared.supportsAlternateIcons {
                    NavigationLink(
                        destination: SettingsAppIconPageView()
                    ) {
                        Label("App icon", systemImage: "app.dashed")
                    }
                }
                Toggle(isOn: $showMetroOnly) {
                    Label("Show only metro", systemImage: "")
                }
                .tint(.indigo)
            }

            Section(header: Text("Map")) {
                Toggle(isOn: $showTraffic) {
                    Label("Show traffic", systemImage: "car.fill")
                }
                .tint(.indigo)
            }

            Section(header: Text("More")) {
                NavigationLink(
                    destination: SettingsChangelogPageView()
                ) {
                    Label("What's new", systemImage: "sparkles")
                }
                NavigationLink(
                    destination: SettingsAboutPageView()
                ) {
                    Label("About", systemImage: "info.square")
                }
                NavigationLink(
                    destination: SettingsWidgetsPageView()
                ) {
                    Label("Home Screen Widgets", systemImage: "widget.small")
                }
            }
        }
        .navigationTitle("Settings")
    }
}

#Preview {
    NavigationStack {
        SettingsPageView()
    }
}
