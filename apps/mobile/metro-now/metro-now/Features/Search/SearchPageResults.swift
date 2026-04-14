// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SearchPageResults: View {
    let stops: [ApiStop]
    let onSelect: (ApiStop) -> Void

    var body: some View {
        ForEach(stops, id: \.id) { stop in
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

#Preview {
    List {
        SearchPageResults(stops: PreviewData.stops) { _ in }
    }
}
