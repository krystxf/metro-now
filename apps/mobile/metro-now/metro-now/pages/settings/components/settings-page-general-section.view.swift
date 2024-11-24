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
            Text("Other means of transport will be hidden")
        ) {
            Toggle(isOn: $showMetroOnly) {
                Text("Show only metro")
            }
        }
    }
}

#Preview {
    List {
        SettingsPageGeneralSectionView()
    }
}
