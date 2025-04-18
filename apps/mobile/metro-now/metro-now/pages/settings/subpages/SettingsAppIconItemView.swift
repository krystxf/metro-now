
// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SettingsAppIconItemView: View {
    let label: String
    let iconName: String
    let description: String

    var body: some View {
        HStack(alignment: .center) {
            Image("\(iconName)-Image")
                .resizable()
                .frame(width: 52, height: 52)
                .cornerRadius(10)
                .shadow(color: Color.black.opacity(0.2), radius: 4, x: 0, y: 2)
            VStack(alignment: .leading) {
                HStack {
                    Text(label)
                        .font(.headline)
                        .fontWeight(.semibold)
                    Spacer()
                }
                Text(description)
                    .font(.caption)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            UIApplication.shared.setAlternateIconName(iconName) { error in
                if let error {
                    print("Failed to change icon: \(error.localizedDescription)")
                } else {
                    print("Icon changed to \(iconName)")
                }
            }
        }
    }
}

struct SettingsAppIconPageView: View {
    var body: some View {
        List {
            Section(header: Text("Choose your app icon")) {
                SettingsAppIconItemView(
                    label: "Metro now",
                    iconName: "AppIcon-MetroNow",
                    description: "Why so serious"
                )
                SettingsAppIconItemView(
                    label: "Prague metro",
                    iconName: "AppIcon-PragueMetro",
                    description: "For Prague metro lovers"
                )
            }
        }
        .navigationTitle("App Icon")
    }
}

#Preview {
    NavigationStack {
        SettingsAppIconPageView()
    }
}
