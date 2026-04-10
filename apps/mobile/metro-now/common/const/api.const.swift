// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import Foundation

let API_URL: String = "https://api.metronow.dev"
let GRAPHQL_URL: String = "\(API_URL)/graphql"

let apiSession: Session = {
    var headers = HTTPHeaders.default
    headers.add(name: "X-App-Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown")
    headers.add(name: "X-App-Build", value: Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown")
    headers.add(name: "X-App-Platform", value: "ios")

    let configuration = URLSessionConfiguration.default
    configuration.httpAdditionalHeaders = HTTPHeaders.default.dictionary
        .merging(headers.dictionary) { _, new in new }
    // TODO: re-enable caching
//    configuration.urlCache = URLCache(
//        memoryCapacity: 10 * 1024 * 1024,
//        diskCapacity: 50 * 1024 * 1024
//    )
//    configuration.requestCachePolicy = .useProtocolCachePolicy
    configuration.urlCache = nil
    configuration.requestCachePolicy = .reloadIgnoringLocalCacheData

    return Session(configuration: configuration)
}()
