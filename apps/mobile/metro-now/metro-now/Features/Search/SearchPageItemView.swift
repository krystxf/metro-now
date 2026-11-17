// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

private enum SearchVehicleType: Int, CaseIterable {
    case metro = 0
    case train
    case tram
    case bus
    case ferry
    case funicular

    var systemImage: String {
        switch self {
        case .metro: "tram.tunnel.fill"
        case .train: "train.side.front.car"
        case .tram: "tram.fill"
        case .bus: "bus.fill"
        case .ferry: "ferry.fill"
        case .funicular: "cablecar.fill"
        }
    }

    static func from(route: ApiRoute) -> SearchVehicleType? {
        if isPidFeed(route.feed), METRO_LINES.contains(route.name.uppercased()) {
            return .metro
        }
        guard let mode = mapTransportMode(for: route) else {
            return nil
        }
        switch mode {
        case .tram: return .tram
        case .train, .leoExpress: return .train
        case .bus: return .bus
        case .ferry: return .ferry
        case .funicular: return .funicular
        }
    }
}

struct SearchPageItemView: View {
    let label: String
    private let vehicleTypes: [SearchVehicleType]

    init(label: String, routes: [ApiRoute]) {
        self.label = label

        var seen = Set<SearchVehicleType>()
        var ordered: [SearchVehicleType] = []
        for route in routes {
            guard let type = SearchVehicleType.from(route: route) else {
                continue
            }
            if seen.insert(type).inserted {
                ordered.append(type)
            }
        }
        vehicleTypes = ordered.sorted { $0.rawValue < $1.rawValue }
    }

    var body: some View {
        HStack(spacing: 12) {
            if !vehicleTypes.isEmpty {
                HStack(spacing: 8) {
                    ForEach(vehicleTypes, id: \.rawValue) { type in
                        Image(systemName: type.systemImage)
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                            .frame(width: 20)
                    }
                }
            }
            Text(label)
        }
    }
}

#Preview {
    List {
        SearchPageItemView(
            label: PreviewData.transferStop.name,
            routes: PreviewData.transferStop.platforms
                .flatMap(\.routes)
        )
        SearchPageItemView(
            label: PreviewData.cityStop.name,
            routes: PreviewData.cityStop.platforms
                .flatMap(\.routes)
        )
    }
}
