// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SettingsPageGeneralSectionView: View {
    @AppStorage(
        AppStorageKeys.showMetroOnly.rawValue
    ) var showMetroOnly = false

    var body: some View {
        Section(
            header:
            Label("General", systemImage: "gear"),
            footer:
            Text("Doesn't show buses or any other means of transport, just metro.")
        ) {
            Toggle(isOn: $showMetroOnly) {
                Text("Metro only")
            }
        }
    }
}

#Preview {
    List {
        SettingsPageGeneralSectionView()
    }
}
