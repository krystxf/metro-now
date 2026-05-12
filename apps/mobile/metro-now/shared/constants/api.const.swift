// metro-now
// https://github.com/krystxf/metro-now

import Foundation

let API_URL: String = {
    guard let value = Bundle.main.object(forInfoDictionaryKey: "APIURL") as? String,
          !value.isEmpty
    else {
        assertionFailure("APIURL not found in Info.plist. Add API_URL to Secrets.xcconfig.")
        return ""
    }
    return value
}()

let GRAPHQL_URL: String = {
    let normalized = API_URL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    if normalized.hasSuffix("/graphql") {
        return normalized
    }
    return "\(normalized)/graphql"
}()
