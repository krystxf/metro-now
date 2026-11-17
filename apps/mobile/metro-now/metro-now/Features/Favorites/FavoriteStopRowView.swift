// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct FavoriteStopRowView: View {
    let stop: ApiStop
    @StateObject private var departuresVM: FavoriteStopDeparturesViewModel

    init(stop: ApiStop) {
        self.stop = stop
        _departuresVM = StateObject(
            wrappedValue: FavoriteStopDeparturesViewModel(
                platformIds: stop.platforms.map(\.id)
            )
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            let routes = stop.platforms.flatMap(\.routes)
            SearchPageItemView(label: stop.name, routes: routes)

            if let dep = departuresVM.soonestDeparture {
                HStack(spacing: 8) {
                    RouteNameIconView(
                        label: dep.route,
                        background: getRouteColor(dep)
                    )
                    Text(dep.headsign)
                        .foregroundStyle(.secondary)
                    Spacer()
                    CountdownView(targetDate: dep.departure.predicted)
                        .foregroundStyle(.secondary)
                }
                .font(.footnote)
            }
        }
        .padding(.vertical, 2)
    }
}

#Preview {
    let stop = PreviewData.metroStop
    List {
        FavoriteStopRowView(stop: stop)
    }
    .environmentObject(FavoritesViewModel(previewFavoriteStopIds: [stop.id]))
}
