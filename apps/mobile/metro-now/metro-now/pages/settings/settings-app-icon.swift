
// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SettingsAppIconPageView: View {
    private let application = UIApplication.shared

    var body: some View {
        List {
            Section(header: Text("Choose your app icon")) {
//                    if application.supportsAlternateIcons {
                HStack {
                    Text("Prague metro")
                }
                .onTapGesture {
                    Task { @MainActor in
                        do {
                            try await application.setAlternateIconName("AppIconPragueMetro")
                        } catch {
                            print("error: \(error)")
                        }
                    }
                }
//                    }
                HStack {
                    Text("metro-now")
                }
                .onTapGesture {
                    Task { @MainActor in
                        do {
                            try await application.setAlternateIconName("AppIcon")
                        } catch {
                            print("error: \(error)")
                        }
                    }
                }
            }
        }
        .navigationTitle("App icon")
    }
}

#Preview {
    SettingsAppIconPageView()
}
