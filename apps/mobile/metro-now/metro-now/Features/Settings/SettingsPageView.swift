// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SettingsPageView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var stopsViewModel: StopsViewModel
    @AppStorage(
        AppStorageKeys.showTraffic.rawValue
    ) var showTraffic = false
    @State private var cacheCleared = false
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
        ZStack {
            List {
                if UIApplication.shared.supportsAlternateIcons {
                    Section(header: Text("Customize")) {
                        NavigationLink(
                            destination: SettingsAppIconPageView()
                        ) {
                            Label("App icon", systemImage: "app.dashed")
                        }
                    }
                }

                Section(header: Text("Map")) {
                    Toggle(isOn: $showTraffic) {
                        Label("Show traffic", systemImage: "car.fill")
                    }
                }

                Section(header: Text("Storage")) {
                    Button {
                        Task {
                            await clearAllAppCaches(stopsViewModel: stopsViewModel)
                            cacheCleared = true

                            try? await Task.sleep(for: .seconds(2))
                            cacheCleared = false
                        }
                    } label: {
                        HStack {
                            Label("Clear cache", systemImage: "trash")
                            Spacer()
                            if cacheCleared {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(.green)
                                    .transition(.opacity)
                            }
                        }
                    }
                    .animation(.default, value: cacheCleared)
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
            .environmentObject(StopsViewModel(previewStops: PreviewData.stops))
    }
}
