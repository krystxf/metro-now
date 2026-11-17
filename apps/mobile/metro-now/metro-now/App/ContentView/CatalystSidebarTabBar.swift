// metro-now
// https://github.com/krystxf/metro-now

#if targetEnvironment(macCatalyst)
    import SwiftUI

    struct CatalystSidebarTabBar: View {
        @Binding var selection: AppTab

        private struct Item {
            let tab: AppTab
            let titleKey: LocalizedStringKey
            let systemImage: String
            let selectedSystemImage: String
        }

        private let items: [Item] = [
            Item(
                tab: .departures,
                titleKey: "Departures",
                systemImage: "clock",
                selectedSystemImage: "clock.fill"
            ),
            Item(
                tab: .favorites,
                titleKey: "Favorites",
                systemImage: "star",
                selectedSystemImage: "star.fill"
            ),
            Item(
                tab: .search,
                titleKey: "Search",
                systemImage: "magnifyingglass",
                selectedSystemImage: "magnifyingglass"
            ),
        ]

        var body: some View {
            HStack(spacing: 0) {
                ForEach(items, id: \.tab) { item in
                    Button {
                        selection = item.tab
                    } label: {
                        VStack(spacing: 3) {
                            Image(
                                systemName: selection == item.tab
                                    ? item.selectedSystemImage
                                    : item.systemImage
                            )
                            .font(.system(size: 20, weight: .regular))
                            Text(item.titleKey)
                                .font(.system(size: 10, weight: .medium))
                        }
                        .frame(maxWidth: .infinity)
                        .foregroundStyle(
                            selection == item.tab ? Color.primary : Color.secondary
                        )
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.top, 8)
            .padding(.bottom, 6)
            .background(.bar)
        }
    }

    #Preview {
        CatalystSidebarTabBar(selection: .constant(.departures))
    }
#endif
