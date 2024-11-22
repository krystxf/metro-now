// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

private let reportBugUrl = URL(
    string: "https://github.com/krystxf/metro-now/issues/new?assignees=&labels=&projects=&template=bug_report.md&title="
)

private let requestFeatureUrl = URL(
    string: "https://github.com/krystxf/metro-now/issues/new?assignees=&labels=&projects=&template=feature_request.md&title="
)

private let appStoreLink = URL(
    string: "https://apps.apple.com/cz/app/metro-now/id6504659402?platform=iphone"
)

struct SettingsPageAboutSectionView: View {
    @Environment(\.requestReview) private var requestReview

    var body: some View {
        Section(
            header: Label("About", systemImage: "info.circle")
        ) {
            if let appStoreLink {
                ShareLink(item: appStoreLink) {
                    Label(
                        "Share app with friends",
                        systemImage: "square.and.arrow.up"
                    )
                }
            }

            Label("Rate the app", systemImage: "star")
                .foregroundStyle(.link)
                .onTapGesture {
                    requestReview()
                }

            if let reportBugUrl {
                Link(destination: reportBugUrl) {
                    Label(
                        "Report bug",
                        systemImage: "bubble.left.and.exclamationmark.bubble.right"
                    )
                }
            }

            if let requestFeatureUrl {
                Link(destination: requestFeatureUrl) {
                    Label(
                        "Feature request",
                        systemImage: "star.bubble"
                    )
                }
            }
        }
    }
}

#Preview {
    List {
        SettingsPageAboutSectionView()
    }
}
