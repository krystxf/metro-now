// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI
import WidgetKit

@main
struct widgetsBundle: WidgetBundle {
    var body: some Widget {
        FrequencyWidget()
        DeparturesWidget()
        #if !targetEnvironment(macCatalyst)
            if #available(iOS 16.2, *) {
                DeparturesLiveActivity()
            }
        #endif
    }
}
