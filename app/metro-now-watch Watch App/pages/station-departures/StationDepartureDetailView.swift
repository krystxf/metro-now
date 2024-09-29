import SwiftUI

struct StationDepartureDetailView: View {
    var body: some View {
        TabView {
            TabView {
                DepartureDetailView(platformID: "unknown")
                    .tag(Optional(0))
                DeparturesListView(platformID: "unknown")
                    .tag(Optional(1))
            }
            .tabViewStyle(.verticalPage(transitionStyle: .blur))

            TabView {
                DepartureDetailView(platformID: "unknown")
                    .tag(Optional(0))
                DeparturesListView(platformID: "unknown")
                    .tag(Optional(1))
            }
            .tabViewStyle(.verticalPage(transitionStyle: .blur))
        }
        .tabViewStyle(.page)
    }
}
