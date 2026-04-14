// metro-now
// https://github.com/krystxf/metro-now

func getPlatformLabel(_ platform: ApiPlatform) -> String {
    if let code = platform.code {
        return "\(platform.name) \(code)"
    }

    return platform.name
}
