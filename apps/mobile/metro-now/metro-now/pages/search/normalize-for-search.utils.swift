// metro-now
// https://github.com/krystxf/metro-now

func normalizeForSearch(_ input: String) -> String {
    // Remove diacritics
    let noDiacritics = input.folding(options: .diacriticInsensitive, locale: .current)
    // Replace dots with spaces
    let noDots = noDiacritics.replacingOccurrences(of: ".", with: " ")
    // Normalize spaces (trim and replace multiple spaces with single)
    let normalizedSpaces = noDots
        .components(separatedBy: .whitespacesAndNewlines)
        .filter { !$0.isEmpty }
        .joined(separator: "")
    return normalizedSpaces
}
