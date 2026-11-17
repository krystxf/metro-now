// metro-now
// https://github.com/krystxf/metro-now

import Foundation

public func formatVersionNumber(version: String?, build: String?) -> String {
    guard let version else {
        if let build {
            return "(\(build))"
        } else {
            return "uknknown version"
        }
    }

    if let build {
        return "\(version)(\(build))"
    }

    return version
}

public func getFormattedVersionNumber() -> String {
    formatVersionNumber(
        version: Bundle.main.versionNumber,
        build: Bundle.main.buildNumber
    )
}
