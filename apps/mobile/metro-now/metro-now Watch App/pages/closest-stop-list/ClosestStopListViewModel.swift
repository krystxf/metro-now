// metro-now
// https://github.com/krystxf/metro-now

import Alamofire
import CoreLocation

private let REFETCH_INTERVAL: TimeInterval = 3 // seconds
private let SECONDS_BEFORE: TimeInterval = 3 // how many seconds after departure will it still be visible

class ClosestStopListViewModel: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    @Published var location: CLLocation?

    @Published var stops: [ApiStop]?
    @Published var closestStop: ApiStop?
    @Published var departures: [ApiDeparture]?

    private var refreshTask: Task<Void, Never>?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.requestWhenInUseAuthorization()
        locationManager.startUpdatingLocation()

        getStops()
        startPeriodicRefresh()
    }

    deinit {
        stopPeriodicRefresh()
    }

    private func startPeriodicRefresh() {
        stopPeriodicRefresh()
        refreshTask = Task(priority: .utility) { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(REFETCH_INTERVAL))
                guard !Task.isCancelled, let self else { return }

                let stopId: String? = await MainActor.run { self.closestStop?.id }
                guard let stopId else { continue }

                getDepartures(stopsIds: [stopId])
            }
        }
    }

    private func stopPeriodicRefresh() {
        refreshTask?.cancel()
        refreshTask = nil
    }

    func locationManager(_: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else {
            return
        }
        self.location = location

        updateClosestStop()
    }

    func updateClosestStop() {
        guard let location else {
            return
        }

        let stopsCopy = stops
        let currentStopId = closestStop?.id

        Task.detached(priority: .userInitiated) { [weak self] in
            guard let stopsCopy,
                  let nextValue = findClosestStop(to: location, stops: stopsCopy),
                  nextValue.id != currentStopId
            else { return }

            await MainActor.run {
                self?.closestStop = nextValue
                self?.getDepartures(stopsIds: [nextValue.id])
            }
        }
    }

    private func getStops() {
        Task {
            let request = apiSession.request(
                "\(API_URL)/v1/stop/all",
                method: .get,
                parameters: ["metroOnly": String(true)]
            )

            guard let fetchedStops = try? await fetchData(request, ofType: [ApiStop].self) else {
                print("Error fetching metroStops")
                return
            }

            await MainActor.run {
                self.stops = fetchedStops
                print("Fetched \(fetchedStops.count) metro stops")
                self.updateClosestStop()
            }
        }
    }

    private func getDepartures(stopsIds: [String]) {
        Task(priority: .utility) {
            do {
                let fetchedDepartures = try await fetchDeparturesGraphQL(
                    stopIds: stopsIds,
                    platformIds: [],
                    limit: 20,
                    metroOnly: nil,
                    minutesBefore: 1,
                    minutesAfter: 1 * 60
                )

                let oldDepartures = await MainActor.run { self.departures }

                let newDepartures: [ApiDeparture] = if let oldDepartures {
                    uniqueBy(
                        array: oldDepartures + fetchedDepartures,
                        by: \.id
                    )
                    .filter {
                        $0.departure.predicted > Date.now - SECONDS_BEFORE
                    }
                    .sorted(by: {
                        $0.departure.scheduled < $1.departure.scheduled
                    })
                } else {
                    fetchedDepartures
                }

                await MainActor.run {
                    self.departures = newDepartures
                }

                print("Fetched \(fetchedDepartures.count) departures")
            } catch {
                print("Error fetching departures: \(error)")
            }
        }
    }
}
