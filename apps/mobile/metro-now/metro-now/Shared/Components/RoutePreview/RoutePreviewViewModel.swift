// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import SwiftUI

class RoutePreviewViewModel: ObservableObject {
    @Published var routeId: String
    @Published var data: ApiRouteDetail?

    init(routeId: String) {
        self.routeId = routeId

        fetchRoute(routeId: routeId)
    }

    private func fetchRoute(routeId: String) {
        let request = apiSession.request(
            "\(API_URL)/v1/route/\(routeId)",
            method: .get
        )

        request
            .validate()
            .responseDecodable(of: ApiRouteDetail.self) { response in
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
