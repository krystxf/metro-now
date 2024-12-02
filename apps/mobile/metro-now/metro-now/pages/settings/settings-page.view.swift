// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SettingsPageView: View {
    @AppStorage(
        AppStorageKeys.showMetroOnly.rawValue
    ) var showMetroOnly = false

    var body: some View {
        List {
            Section(header: Text("Customize")) {
                NavigationLink(
                    destination: SettingsAppIconPageView()
                ) {
                    Label("App icon", systemImage: "app.dashed")
                }
                Toggle(isOn: $showMetroOnly) {
                    Text("Show only metro")
                }
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
