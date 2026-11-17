// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SearchPageResults: View {
    let stops: [ApiStop]
    let onSelect: (ApiStop) -> Void
    let visibleRoutesForStop: (ApiStop) -> [ApiRoute]

    init(
        stops: [ApiStop],
        onSelect: @escaping (ApiStop) -> Void,
        visibleRoutesForStop: @escaping (ApiStop) -> [ApiRoute] = {
            $0.platforms.flatMap(\.routes)
        }
    ) {
        self.stops = stops
        self.onSelect = onSelect
        self.visibleRoutesForStop = visibleRoutesForStop
    }

    var body: some View {
        ForEach(stops, id: \.id) { stop in
            let routes = visibleRoutesForStop(stop)

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

#Preview {
    List {
        SearchPageResults(stops: PreviewData.stops) { _ in }
    }
}
