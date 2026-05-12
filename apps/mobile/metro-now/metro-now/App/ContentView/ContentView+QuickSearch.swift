// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

extension ContentView {
    var quickSearchShortcutTrigger: some View {
        Button {
            guard supportsQuickSearchShortcut else { return }

            withAnimation(.easeOut(duration: 0.15)) {
                showDummyQuickSearch.toggle()
            }
        } label: {
            EmptyView()
        }
        .keyboardShortcut("k", modifiers: [.command])
        .opacity(0.001)
        .frame(width: 0, height: 0)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    var quickSearchDismissTrigger: some View {
        Button {
            guard supportsQuickSearchShortcut, showDummyQuickSearch else { return }

            withAnimation(.easeOut(duration: 0.15)) {
                showDummyQuickSearch = false
            }
        } label: {
            EmptyView()
        }
        .keyboardShortcut(.cancelAction)
        .opacity(0.001)
        .frame(width: 0, height: 0)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    var dummyQuickSearchOverlay: some View {
        DummyQuickSearchOverlay(
            isPresented: $showDummyQuickSearch
        )
        .environmentObject(locationModel)
        .transition(.opacity.combined(with: .scale(scale: 0.6)))
        .zIndex(10)
    }

    @MainActor
    func presentSearchSheet() {
        guard !showSearchSheet else { return }

        Task { @MainActor in
            showSearchSheet = true
        }
    }
}
