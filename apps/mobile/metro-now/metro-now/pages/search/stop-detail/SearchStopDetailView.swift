// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SearchStopDetailView: View {
    let stop: ApiStop

    @StateObject var viewModel: SearchPageDetailViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            Section(header: Text("Metro")) {
                MetroDeparturesListView(
                    closestStop: stop,
                    departures: viewModel.departures
                )
            }
        }
        .navigationTitle(stop.name)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(
                    action: {
                        dismiss()
                    }
                ) {
                    Label("Close", systemImage: "xmark")
                }
            }
        }
    }
}
