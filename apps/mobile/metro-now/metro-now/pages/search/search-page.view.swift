// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

private enum Sorting: String, CaseIterable, Identifiable {
    case alphabetical, distance
    var id: Self { self }
}

private enum Filter: String, CaseIterable, Identifiable {
    case all, metro
    var id: Self { self }
}

struct SearchPageView: View {
    @State private var searchText = ""
    @StateObject private var viewModel = ClosestStopPageViewModel()

    @Environment(\.dismiss) private var dismiss
    @State private var sorting: Sorting = .distance
    @State private var filter: Filter = .metro

    var body: some View {
        NavigationStack {
            List {
                if filter == .metro {
                    if let stops = viewModel.metroStops {
                        ForEach(stops, id: \.id) { stop in
                            Text(stop.name)
                        }
                    }
                } else {
                    if let stops = viewModel.allStops {
                        ForEach(stops, id: \.id) { stop in
                            Text(stop.name)
                        }
                    }
                }
            }
            .searchable(
                text: $searchText,
                placement: .navigationBarDrawer(displayMode: .always)
            )
            .navigationTitle("Search")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Menu {
                        Button("Distance", action: {})
                        Button("A-Z", action: {})
                    } label: {
                        Label("Sorting", systemImage: "arrow.up.arrow.down")
                    }
                }
                ToolbarItem(placement: .principal) {
                    Picker("Filter", selection: $filter) {
                        Text("Metro").tag(Filter.metro)
                        Text("All").tag(Filter.all)
                    }
                    .pickerStyle(.inline)
                    .frame(maxWidth: 200)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(
                        action: {
                            dismiss()
                        }
                    ) {
                        Label("Close", systemImage: "xmark")
                    }
                    //                    Picker("Flavor", selection: $selectedFlavor) {
//                        Text("Distance").tag(Sorting.distance)
//                        Label("A-Z", systemImage: "textformat.characters").tag(Sorting.alphabetical)
//                        }
//
//                    .pickerStyle(.menu)
                }
            }
        }
    }
}

#Preview {
    SearchPageView()
}
