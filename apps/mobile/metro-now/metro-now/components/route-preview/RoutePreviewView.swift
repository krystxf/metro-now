// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SheetIdItem: Identifiable {
    var id: String
}

struct RoutePreviewView: View {
    @StateObject private var viewModel: RoutePreviewViewModel

    init(routeId: String) {
        _viewModel = StateObject(wrappedValue: RoutePreviewViewModel(routeId: routeId))
    }

    var body: some View {
        if let data = viewModel.data {
            List {
                Text(data.longName)
                    .font(.caption)
                    .fontWeight(.semibold)

                let item = data.directions.first

                if let item {
                    ForEach(item.value) { x in
                        HStack {
                            RouteNameIconView(
                                label: data.shortName,
                                background: getRouteColor(data.shortName)
                            )

                            Text(x.stop.name)
                        }
                    }
                }
            }
        } else {
            Text("Loading")
        }
    }
}

#Preview {
    RoutePreviewView(
        routeId: "L991"
    )
}
