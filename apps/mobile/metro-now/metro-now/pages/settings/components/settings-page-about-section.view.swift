// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

private let reportBugUrl = URL(
    string: "https://github.com/krystxf/metro-now/issues/new?assignees=&labels=&projects=&template=bug_report.md&title="
)

private let requestFeatureUrl = URL(
    string: "https://github.com/krystxf/metro-now/issues/new?assignees=&labels=&projects=&template=feature_request.md&title="
)

private let appStoreUrl = URL(
    string: "https://apps.apple.com/cz/app/metro-now/id6504659402?platform=iphone"
)

private let appStoreReviewUrl = URL(
    string: "https://itunes.apple.com/us/app/metro-now/id6504659402?mt=8&action=write-review"
)

struct SettingsPageAboutSectionView: View {
    var body: some View {
        Section(
            header: Label("About", systemImage: "info.circle")
        ) {
            if let appStoreUrl {
                ShareLink(item: appStoreUrl) {
                    Label(
                        "Share app with friends",
                        systemImage: "square.and.arrow.up"
                    )
                }
            }

            if let appStoreReviewUrl {
                Link(
                    destination: appStoreReviewUrl
                ) {
                    Label(
                        "Give us a rating",
                        systemImage: "star"
                    )
                }
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
