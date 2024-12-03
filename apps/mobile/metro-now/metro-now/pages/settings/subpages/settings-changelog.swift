

// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

private struct ChangelogItem: View {
    let version: String
    let changes: String

    init(version: String, changes: [String]) {
        self.version = version

        self.changes = changes.map { "• \($0)" }.joined(separator: "\n")
    }

    var body: some View {
        VStack {
            Text(version)
                .font(.headline)
                .fontWeight(.bold)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(changes)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct SettingsChangelogPageView: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Divider()
                ChangelogItem(
                    version: "v0.3.5",
                    changes: [
                        "customizeable app icon",
                        "settings page redesign",
                    ]
                )
                Divider()
                ChangelogItem(
                    version: "v0.3.4",
                    changes: [
                        "search metro stations",
                    ]
                )
                Divider()
                ChangelogItem(
                    version: "v0.3.3",
                    changes: [
                        "settings page",
                    ]
                )
                Divider()
                ChangelogItem(
                    version: "v0.3.2",
                    changes: [
                        "welcome screen",
                        "no internet warning",
                    ]
                )
                Divider()
                ChangelogItem(
                    version: "v0.3.0",
                    changes: [
                        "buses, trams and more",
                    ]
                )
                Divider()
                ChangelogItem(
                    version: "v0.2.0",
                    changes: [
                        "fix: crash at the final metro stop",
                    ]
                )
                Divider()
                ChangelogItem(
                    version: "v0.2.0",
                    changes: [
                        "metro departures on iPhone",
                    ]
                )
                Divider()
                ChangelogItem(
                    version: "v0.1.0",
                    changes: [
                        "metro now is here!🎉",
                    ]
                )
            }
            .padding()
        }
        .navigationTitle("What's new")
    }
}

#Preview {
    NavigationStack {
        SettingsChangelogPageView()
    }
}
