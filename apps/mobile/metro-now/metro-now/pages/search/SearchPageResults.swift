// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SearchPageResults: View {
    let stops: [ApiStop]

    var body: some View {
        ForEach(stops, id: \.id) { stop in
            let routes = stop.platforms.flatMap(\.routes)

            SearchPageItemView(
                label: stop.name,
                routeNames: routes.map(\.name)
            )
        }
    }
}
