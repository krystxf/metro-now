// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SettingsWidgetsPageView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Label(
                    "Widgets don't show real-time data",
                    systemImage: "exclamationmark.triangle"
                )
                .fontWeight(.semibold)
                .foregroundStyle(.orange)

                Text("Widget departure times might be inaccurate, as widgets don't show real-time data. They display scheduled departures without accounting for delays. ")
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
        }
        .navigationTitle("Home Screen Widgets")
    }
}

#Preview {
    NavigationStack {
        SettingsWidgetsPageView()
    }
}
