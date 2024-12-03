// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI
import UIKit

struct SettingsAboutPageView: View {
    private let formattedVersion = getFormattedVersionNumber()
    private let application = UIApplication.shared
    private let version = Bundle.main.versionNumber ?? ""
    private let build = Bundle.main.buildNumber ?? ""

    var body: some View {
        VStack {
            List {
                Section {
                    VStack {
                        Image("AppIcon-MetroNow-Image")
                            .resizable()
                            .frame(width: 64, height: 64)
                            .cornerRadius(16)
                            .frame(maxWidth: .infinity, alignment: .center)
                        Text("About")
                            .font(.title)
                            .fontWeight(.bold)
                            .frame(maxWidth: .infinity, alignment: .center)
                        Text("""
                        The app is still in development. Stay tuned to see what's next!
                        """)
                        .multilineTextAlignment(.center)
                    }
                }

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
                    title: "Bug in version \(formattedVersion)"
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

                Section {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text(version).fontDesign(.monospaced)
                    }
                    HStack {
                        Text("Build")
                        Spacer()
                        Text(String(build)).fontDesign(.monospaced)
                    }

                    if let sourceCodeUrl = URL(string: GITHUB_URL) {
                        Link("Source code", destination: sourceCodeUrl)
                    }
                }
            }
        }.background(Color(UIColor.systemGroupedBackground))
    }
}

#Preview {
    NavigationStack {
        SettingsAboutPageView()
    }
}
