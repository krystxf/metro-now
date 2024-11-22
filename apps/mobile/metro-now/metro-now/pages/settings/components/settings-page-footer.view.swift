// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SettingsPageFooterView: View {
    var body: some View {
        VStack {
            let versionNumber = Bundle.main.versionNumber ?? ""
            let buildNumber = Bundle.main.buildNumber ?? ""
            let formattedVersion = "\(versionNumber)(\(buildNumber))"

            Text("metro-now")

            Text("version: ")
                + Text(formattedVersion).fontDesign(.monospaced)

            Text(
                "[source code](https://github.com/krystxf/metro-now)"
            )
        }
    }
}

#Preview {
    Spacer()
    SettingsPageFooterView()
}
