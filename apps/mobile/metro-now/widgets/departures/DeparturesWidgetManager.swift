// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import CoreLocation

class DeparturesWidgetManager: NSObject, ObservableObject, CLLocationManagerDelegate {
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
        let request = AF.request(
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
            let distance1 = location.distance(from: CLLocation(latitude: $0.avgLatitude, longitude: $0.avgLongitude))
            let distance2 = location.distance(from: CLLocation(latitude: $1.avgLatitude, longitude: $1.avgLongitude))
            return distance1 < distance2
        })
    }

    private func fetchDeparturesForClosestStop() {
        guard let closestStop = closestMetroStop else { return }

        // Collecting stop and platform ids for the request
        let stopIds = closestStop.id
        let platformIds = closestStop.platforms.map(\.id)

        // Construct the API request URL with array-like syntax for `stop[]` and `platform[]`
        let stopQuery = stopIds.map { "stop[]=\($0)" }.joined(separator: "&")
        let platformQuery = platformIds.map { "platform[]=\($0)" }.joined(separator: "&")

        let url = "\(API_URL)/v2/departure?\(stopQuery)&\(platformQuery)&limit=4&minutesBefore=1&minutesAfter=\(1 * 60)"

        // Print the full API request URL for debugging
        print("API Request URL for Departures: \(url)")

        // API request to fetch departures
        let request = AF.request(url, method: .get)

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        request.validate().responseDecodable(of: [ApiDeparture].self, decoder: decoder) { response in
            switch response.result {
            case let .success(departures):
                DispatchQueue.main.async {
                    self.nearestDepartures = departures
                }
            case let .failure(error):
                print("Failed to fetch departures: \(error)")
            }
        }
    }
}
