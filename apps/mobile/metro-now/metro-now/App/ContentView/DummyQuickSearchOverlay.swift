// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct DummyQuickSearchOverlay: View {
    @Binding var isPresented: Bool
    @EnvironmentObject private var appNavigation: AppNavigationViewModel
    @EnvironmentObject private var locationModel: LocationViewModel
    @State private var text = ""
    @StateObject private var searchViewModel = SearchStopsViewModel()
    @FocusState private var isFieldFocused: Bool
    @State private var nearestStops: [ApiStop] = []

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .top) {
                Color.clear
                    .ignoresSafeArea()
                    .contentShape(Rectangle())
                    .onTapGesture(perform: dismiss)

                VStack(spacing: 0) {
                    searchField

                    Rectangle()
                        .fill(.primary.opacity(0.14))
                        .frame(height: 1)

                    DummyQuickSearchResults(
                        query: text,
                        nearestStops: nearestStops,
                        searchViewModel: searchViewModel,
                        onSelect: handleSelect
                    )
                }
                .frame(maxWidth: 560)
                .glassEffect(
                    .regular.interactive(),
                    in: RoundedRectangle(
                        cornerRadius: 24,
                        style: .continuous
                    )
                )
                .shadow(color: .black.opacity(0.16), radius: 32, y: 14)
                .padding(.horizontal, 24)
                .padding(.top, geometry.size.height * 0.2)
            }
        }
        .onAppear { isFieldFocused = true }
        .task(id: locationModel.location?.coordinate.latitude) {
            await fetchNearestStops()
        }
        .onChange(of: text) { _, newValue in
            searchViewModel.updateSearch(query: newValue)
        }
    }

    private var searchField: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)

            TextField("Search Stops", text: $text)
                .textFieldStyle(.plain)
                .focused($isFieldFocused)

            Text("⌘K")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 18)
        .frame(height: 60)
    }

    private func handleSelect(_ stop: ApiStop) {
        appNavigation.openMap(for: stop)
        dismiss()
    }

    private func dismiss() {
        withAnimation(.easeOut(duration: 0.15)) {
            isPresented = false
        }
    }

    private func fetchNearestStops() async {
        guard let location = locationModel.location else { return }

        do {
            let response = try await fetchGraphQLQuery(
                MetroNowAPI.ClosestStopsQuery(
                    latitude: location.coordinate.latitude,
                    longitude: location.coordinate.longitude,
                    limit: .some(4)
                )
            )
            nearestStops = response.closestStops.map { mapGraphQLClosestStop($0) }
        } catch {
            print("Error fetching nearest stops for spotlight: \(error)")
        }
    }
}

#Preview {
    DummyQuickSearchOverlay(isPresented: .constant(true))
        .environmentObject(AppNavigationViewModel())
        .environmentObject(LocationViewModel(previewLocation: nil))
}
