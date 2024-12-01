// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

enum SearchPageSorting: String, CaseIterable, Identifiable {
    case alphabetical, distance
    var id: Self { self }
}
