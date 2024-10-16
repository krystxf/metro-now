import CoreLocation
import SwiftUI
import os

struct ContentView: View {
    @StateObject private var locationModel = LocationModel()
    var stopManager = StopManager()

    var body: some View {
        StationDeparturesView(label: stopManager.closestStop?.name ?? "Loading...")

            .task {
                let stops = await getAllMetroStops()
                print("Helloooooo")
                stopManager.stops = stops
                stopManager.closestStop = stops.first
                //                print(stops)

                //                print(locationModel.location)
            }
            .environmentObject(stopManager)
    }
}

#Preview {
    ContentView()
}
