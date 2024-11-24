// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

private let appStoreUrl = URL(
    string: "https://apps.apple.com/cz/app/metro-now/id6504659402?platform=iphone"
)

struct SettingsPageAboutSectionView: View {
    let version = getFormattedVersionNumber()

    var body: some View {
        Section(
            header: Label("About", systemImage: "info.circle")
        ) {
            if let appStoreUrl {
                ShareLink(item: appStoreUrl) {
                    Label(
                        "Share metro-now",
                        systemImage: "square.and.arrow.up"
                    )
                }
            }

            if let REVIEW_URL {
                Link(destination: REVIEW_URL) {
                    Label(
                        "Give us a rating",
                        systemImage: "star"
                    )
                }
                .accessibilityHint("Opens app rating in app store")
            }

            if let reportBugUrl = getGithubIssueUrl(
                template: .bug_report,
                title: "Bug in version \(version)"
            ) {
                Link(destination: reportBugUrl) {
                    Label(
                        "Report bug",
                        systemImage: "bubble.left.and.exclamationmark.bubble.right"
                    )
                }
                .accessibilityHint("Opens Github issue form")
            }

            if let featureRequestUrl = getGithubIssueUrl(
                template: .feature_request
            ) {
                Link(destination: featureRequestUrl) {
                    Label(
                        "Feature request",
                        systemImage: "star.bubble"
                    )
                }
                .accessibilityHint("Opens Github feature request form")
            }
        }
    }
}

#Preview {
    List {
        SettingsPageAboutSectionView()
    }
}
