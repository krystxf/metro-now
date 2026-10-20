// metro-now
// https://github.com/krystxf/metro-now

import Foundation

func formatVersionNumber(version: String?, build: String?) -> String {
    guard let version else {
        if let build {
            return "(\(build))"
        } else {
            return "unknown version"
        }
    }

    if let build {
        return "\(version)(\(build))"
    }

    return version
}

func getFormattedVersionNumber() -> String {
    formatVersionNumber(
        version: Bundle.main.versionNumber,
        build: Bundle.main.buildNumber
    )
}
