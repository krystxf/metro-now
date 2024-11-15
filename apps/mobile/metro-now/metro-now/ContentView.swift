// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI


struct ContentView: View {
    @State var allStops: [ApiStop]? = nil
    @State var metroStops: [ApiStop]? = nil

    var body: some View {
            NavigationStack {
                if let metroStops {
                    List {
                        Section(header: Text("Metro")) {
                            MetroDeparturesView(stops: metroStops)
                        }

                         
                        if let allStops {
                            NonMetroDeparturesView(stops: allStops)
                        }
                    }
//                    .navigationTitle(
//                        findClosestStop(
//                            to: location,
//                            stops: metroStops
//                        )?.name ??
//                            "Loading..."
//                    )
                } else {
                    ProgressView()
                }
            }
            .onAppear {
                getMetroStops()
                getAllStops()
            }
       
    }

    func getAllStops() {
        NetworkManager.shared.getStops(metroOnly: false) { result in
            DispatchQueue.main.async {
                switch result {
                case let .success(stops):
                    allStops = stops
                case let .failure(error):
                    print(error.localizedDescription)
                }
            }
        }
    }

    func getMetroStops() {
        NetworkManager.shared.getStops(metroOnly: true) { result in
            DispatchQueue.main.async {
                switch result {
                case let .success(stops):
                    metroStops = stops
                case let .failure(error):
                    print(error.localizedDescription)
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
