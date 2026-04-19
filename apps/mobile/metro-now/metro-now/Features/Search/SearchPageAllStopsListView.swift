// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SearchPageAllStopsListView: View {
    let stops: [ApiStop]
    let onSelect: (ApiStop) -> Void

    var transferStops: [ApiStop] {
        stops.filter { stop in
            stop.platforms.count > 2
        }
    }

    var body: some View {
        Section(header: Text("Transfer stations")) {
            ForEach(transferStops, id: \.id) { stop in
                Button {
                    onSelect(stop)
                } label: {
                    SearchPageItemView(
                        label: stop.name,
                        routes: stop.platforms
                            .flatMap(\.routes)
                    )
                }
                .buttonStyle(.plain)
            }
        }

        ForEach(["A", "B", "C"], id: \.self) { metroLine in
            let metroLineStops = stops.filter { stop in
                stop.platforms.flatMap(\.routes).contains(where: { $0.name == metroLine })
            }

            Section(header: Text(metroLine)) {
                ForEach(metroLineStops, id: \.id) { stop in
                    let routes = stop.platforms.flatMap(\.routes)

                    Button {
                        onSelect(stop)
                    } label: {
                        SearchPageItemView(
                            label: stop.name,
                            routes: routes
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

#Preview {
    List {
        SearchPageAllStopsListView(stops: PreviewData.stops) { _ in }
    }
}
