// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct DummyQuickSearchResultRow: View {
    let stop: ApiStop
    let isLast: Bool
    let onSelect: (ApiStop) -> Void

    var body: some View {
        Button {
            onSelect(stop)
        } label: {
            SearchPageItemView(
                label: stop.name,
                routes: stop.platforms.flatMap(\.routes)
            )
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)

        if !isLast {
            Rectangle()
                .fill(.primary.opacity(0.1))
                .frame(height: 1)
                .padding(.horizontal, 18)
        }
    }
}
