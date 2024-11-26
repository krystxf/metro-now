// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SettingsPageFooterView: View {
    var body: some View {
        VStack {
            Text("metro-now")

            Text("version: ")
                + Text(getFormattedVersionNumber()).fontDesign(.monospaced)

            if let sourceCodeUrl = URL(string: GITHUB_URL) {
                Link("source code", destination: sourceCodeUrl)
            }
        }
    }
}

#Preview {
    Spacer()
    SettingsPageFooterView()
}
