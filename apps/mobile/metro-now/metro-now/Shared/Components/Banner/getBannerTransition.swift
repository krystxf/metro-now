// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

func getBannerTransition(_ edge: Edge) -> some Transition {
    MoveTransition
        .move(edge: edge)
        .combined(with: .opacity)
}
