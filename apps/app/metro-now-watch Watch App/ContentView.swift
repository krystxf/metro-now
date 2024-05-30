//
//  metro-now-watch
//
//  Created by Kryštof Krátký on 19.05.2024.
//

import MapKit
import SwiftUI

struct ContentView: View {
    @StateObject private var locationModel = LocationModel()
    @State var closestStation: MetroStationsGeoJSONFeature?
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationView {
            if let closestStation {
                ScrollView { LazyVStack {
                    ForEach(closestStation.properties.platforms, id: \.self) { platform in

                        Label(
                            title: { Text(platform.direction) },
                            icon: { Image(systemName: getMetroLineIcon(platform.name)) }
                        )
                    }
                }}

                .navigationTitle(
                    closestStation.properties.name
                )
            }
        }

        .onReceive(locationModel.$location) { location in

            guard let location else {
                print("Unknown location")
                return
            }
            print("User's location: \(location)")

            let res = getClosestStationFromGeoJSON(location: location)

            closestStation = res
        }
        .onAppear {
            locationModel.checkLocationServicesEnabled()
        }
    }
}

#Preview {
    ContentView()
}
