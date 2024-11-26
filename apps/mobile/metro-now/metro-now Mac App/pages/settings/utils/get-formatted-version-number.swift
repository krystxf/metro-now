// metro-now
// https://github.com/krystxf/metro-now

import Foundation

func getFormattedVersionNumber() -> String {
    let version = Bundle.main.versionNumber
    let build = Bundle.main.buildNumber

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
