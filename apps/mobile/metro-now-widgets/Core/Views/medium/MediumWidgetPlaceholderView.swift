//
//  MediumWidgetPlaceholderView.swift
//  metro-now-widgetsExtension
//
//  Created by Kryštof Krátký on 29.05.2024.
//

import SwiftUI

struct MediumWidgetPlaceholderView: View {
    var body: some View {
        VStack {
            WidgetHeading(stationName: "Loading...")
            Grid {
                GridRow {
                    DeparturePlaceholderView()
                    DeparturePlaceholderView()
                }
                GridRow {
                    DeparturePlaceholderView()
                    DeparturePlaceholderView()
                }
            }
        }
    }
}
