//
//  Author: Kryštof Krátký
//

import Foundation
import SwiftUI

final class PlatformListViewModel: ObservableObject {
    @Published var departuresByGtfsID: [String: [ApiDeparture]] = [:]

    func getData(gtfsIDs: [String]) async throws {
        let params = (gtfsIDs.map { "gtfsID=\($0)" }).joined(separator: "&")
        let endpoint = "\(METRO_NOW_API)/v1/metro/departures?\(params)"

        guard let url = URL(string: endpoint) else { throw FetchError.InvalidURL }

        let (data, response) = try await URLSession.shared.data(from: url)

        guard let respones = response as? HTTPURLResponse else {
            throw FetchError.InvalidResponse
        }

        do {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            decoder.dateDecodingStrategy = .iso8601
            let decoded = try decoder.decode([String: [ApiDeparture]].self, from: data)
            DispatchQueue.main.async {
                self.departuresByGtfsID = decoded
            }
        }

        catch {
            print(error)
            throw FetchError.InvalidaData
        }
    }
}
