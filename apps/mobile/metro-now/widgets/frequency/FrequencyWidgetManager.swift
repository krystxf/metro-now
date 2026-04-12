// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import CoreLocation

class FrequencyWidgetManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    @Published var location: CLLocation?
    @Published var metroStops: [ApiStop]?
    @Published var closestMetroStop: ApiStop?
    @Published var nearestDepartures: [ApiDeparture] = []

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.requestWhenInUseAuthorization()
        locationManager.startUpdatingLocation()
        fetchMetroStops()
    }

    func locationManager(_: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        self.location = location
        updateClosestMetroStop()
        fetchDeparturesForClosestStop()
    }

    private func fetchMetroStops() {
        let request = apiSession.request(
            "\(API_URL)/v1/stop/all",
            method: .get,
            parameters: ["metroOnly": "true"]
        )

        request.validate().responseDecodable(of: [ApiStop].self) { response in
            switch response.result {
            case let .success(stops):
                DispatchQueue.main.async {
                    self.metroStops = stops
                    self.updateClosestMetroStop()
                }
            case let .failure(error):
                print("Failed to fetch metro stops: \(error)")
            }
        }
    }

    private func updateClosestMetroStop() {
        guard let location, let metroStops else { return }
        closestMetroStop = metroStops.min(by: {
            let distance1 = $0.distance(to: location)
            let distance2 = $1.distance(to: location)
            return distance1 < distance2
        })
    }

    private func fetchDeparturesForClosestStop() {
        guard let closestStop = closestMetroStop else { return }

        let platformIds = closestStop.platforms.map(\.id)
        guard !platformIds.isEmpty else {
            return
        }

        Task {
            do {
                let departures = try await fetchDeparturesGraphQL(
                    stopIds: [],
                    platformIds: platformIds,
                    limit: 4,
                    metroOnly: nil,
                    minutesBefore: 0,
                    minutesAfter: 12 * 60
                )
                await MainActor.run {
                    self.nearestDepartures = departures
                }
            } catch {
                print("Failed to fetch departures: \(error)")
            }
        }
    }
}
