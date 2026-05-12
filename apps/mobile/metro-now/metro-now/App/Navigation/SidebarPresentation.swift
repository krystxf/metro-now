// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

/// When set, views nested inside the tablet sidebar call this closure
/// instead of presenting a route preview sheet locally, so the route
/// preview can be rendered as an overlay inside the sidebar frame.
private struct SidebarRoutePreviewPresenterKey: EnvironmentKey {
    static let defaultValue: ((SheetIdItem) -> Void)? = nil
}

private struct SidebarStopDetailPresenterKey: EnvironmentKey {
    static let defaultValue: ((ApiStop) -> Void)? = nil
}

extension EnvironmentValues {
    var sidebarRoutePreviewPresenter: ((SheetIdItem) -> Void)? {
        get { self[SidebarRoutePreviewPresenterKey.self] }
        set { self[SidebarRoutePreviewPresenterKey.self] = newValue }
    }

    var sidebarStopDetailPresenter: ((ApiStop) -> Void)? {
        get { self[SidebarStopDetailPresenterKey.self] }
        set { self[SidebarStopDetailPresenterKey.self] = newValue }
    }
}
