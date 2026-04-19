// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

enum SearchPageVehicleTypeFilter: String, CaseIterable, Identifiable {
    case all
    case metro
    case tram
    case bus
    case train
    case ferry
    case funicular
    case leoExpress

    var id: Self {
        self
    }

    var title: String {
        switch self {
        case .all:
            "All"
        case .metro:
            "Metro"
        case .tram:
            "Tram"
        case .bus:
            "Bus"
        case .train:
            "Train"
        case .ferry:
            "Ferry"
        case .funicular:
            "Funicular"
        case .leoExpress:
            "Leo Express"
        }
    }

    var systemImage: String {
        switch self {
        case .all:
            "magnifyingglass"
        case .metro:
            "tram.fill"
        case .tram:
            "tram.fill"
        case .bus:
            "bus.fill"
        case .train:
            "train.side.front.car"
        case .ferry:
            "ferry.fill"
        case .funicular:
            "cablecar.fill"
        case .leoExpress:
            "train.side.front.car"
        }
    }

    func matches(routeName: String) -> Bool {
        switch self {
        case .all:
            true
        case .metro:
            isMetro(routeName)
        case .tram:
            mapTransportMode(for: routeName) == .tram
        case .bus:
            mapTransportMode(for: routeName) == .bus
        case .train:
            mapTransportMode(for: routeName) == .train
        case .ferry:
            mapTransportMode(for: routeName) == .ferry
        case .funicular:
            mapTransportMode(for: routeName) == .funicular
        case .leoExpress:
            mapTransportMode(for: routeName) == .leoExpress
        }
    }
}

struct SearchPageFilterMenuView: View {
    @Binding var vehicleTypeFilter: SearchPageVehicleTypeFilter

    private let Checkmark = Image(systemName: "checkmark")

    init(vehicleTypeFilter: Binding<SearchPageVehicleTypeFilter>) {
        _vehicleTypeFilter = vehicleTypeFilter
    }

    var body: some View {
        Menu {
            Section("Vehicle Type") {
                ForEach(SearchPageVehicleTypeFilter.allCases) { filter in
                    Button {
                        vehicleTypeFilter = filter
                    } label: {
                        Text(filter == .all ? "Select All" : filter.title)
                        if vehicleTypeFilter == filter {
                            Checkmark
                        }
                    }
                }
            }
        } label: {
            Label("Filter", systemImage: "line.3.horizontal.decrease.circle")
        }
    }
}

#Preview {
    @Previewable @State var vehicleTypeFilter: SearchPageVehicleTypeFilter = .all

    SearchPageFilterMenuView(vehicleTypeFilter: $vehicleTypeFilter)
        .padding()
}
