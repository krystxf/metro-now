// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SearchPageSortingMenuView: View {
    @Binding var sorting: SearchPageSorting

    private let Checkmark = Image(systemName: "checkmark")

    var body: some View {
        Menu {
            Button {
                sorting = .alphabetical
            } label: {
                Text("A-Z")
                if sorting == .alphabetical {
                    Checkmark
                }
            }
            Button {
                sorting = .distance
            } label: {
                Text("Distance")
                if sorting == .distance {
                    Checkmark
                }
            }
        } label: {
            Label("Sort", systemImage: "arrow.up.arrow.down")
        }
    }
}
