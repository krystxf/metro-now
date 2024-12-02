

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
        VStack(spacing: 16) {
            Divider()
            ChangelogItem(
                version: "v0.3.0",
                changes: [
                    "bus departures",
                    "settings",
                    "search",
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
        .frame(maxHeight: .infinity, alignment: .top)
        .navigationTitle("What's new")
    }
}

#Preview {
    SettingsChangelogPageView()
}
