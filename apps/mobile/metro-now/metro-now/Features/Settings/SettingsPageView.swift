// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SettingsPageView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage(
        AppStorageKeys.showMetroOnly.rawValue
    ) var showMetroOnly = false
    @AppStorage(
        AppStorageKeys.showTraffic.rawValue
    ) var showTraffic = false
    let showsCloseButton: Bool
    let onClose: (() -> Void)?

    init(
        showsCloseButton: Bool = false,
        onClose: (() -> Void)? = nil
    ) {
        self.showsCloseButton = showsCloseButton
        self.onClose = onClose
    }

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
                .tint(.brandPrimary)
            }

            Section(header: Text("Map")) {
                Toggle(isOn: $showTraffic) {
                    Label("Show traffic", systemImage: "car.fill")
                }
                .tint(.brandPrimary)
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
        .toolbar {
            if showsCloseButton {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        if let onClose {
                            onClose()
                        } else {
                            dismiss()
                        }
                    } label: {
                        Label("Close", systemImage: "xmark")
                    }
                    .accessibilityIdentifier("button.close-settings")
                }
            }
        }
        .accessibilityIdentifier("screen.settings")
    }
}

#Preview {
    NavigationStack {
        SettingsPageView()
    }
}
