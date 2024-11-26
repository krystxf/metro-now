// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SettingsPageView: View {
    var body: some View {
        VStack {
            List {
                SettingsPageGeneralSectionView()
                SettingsPageAboutSectionView()
            }
            Spacer()
            SettingsPageFooterView()
        } 
        .navigationTitle("Settings")
    }
}

#Preview {
    NavigationStack {
        SettingsPageView()
    }
}
