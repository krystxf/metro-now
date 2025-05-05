

// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import CoreLocation

class RoutePreviewViewModel: ObservableObject {
    @Published var routeId: String
    @Published var data: RouteAPIType?

    init(routeId: String) {
        self.routeId = routeId

        fetchRoute(routeId: routeId)
    }

    private func fetchRoute(routeId: String) {
        let request = AF.request(
            "\(API_URL)/v1/route/\(routeId)",
            method: .get
        )

        request
            .validate()
            .responseDecodable(of: RouteAPIType.self) { response in
                switch response.result {
                case let .success(data):
                    DispatchQueue.main.async {
                        self.data = data
                    }
                case let .failure(error):
                    print("Error fetching route: \(error)")
                }
            }
    }
}

// MARK: - RouteAPIType

struct RouteAPIType: Decodable {
    let id, shortName, longName: String
    let isNight: Bool
    let color: String
    let url: String
    let type: String
    let directions: [String: [RouteAPITypeDirection]]
}

// MARK: - Direction

struct RouteAPITypeDirection: Identifiable, Decodable {
    var id = UUID()

    let directionId, stopId: String
    let stopSequence: Int
    let stop: RouteAPITypeStop
}

// MARK: - Stop

struct RouteAPITypeStop: Decodable {
    let id: String
    let latitude, longitude: Double
    let name: String
    let isMetro: Bool
    let code: String
    let routes: [RouteAPITypeRouteElement]
}

// MARK: - RouteElement

struct RouteAPITypeRouteElement: Decodable {
    let route: RouteAPITypeRouteRoute
}

// MARK: - RouteRoute

struct RouteAPITypeRouteRoute: Decodable {
    let id, name: String
}
