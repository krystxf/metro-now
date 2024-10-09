//
//  SmallWidgetPlaceholderView.swift
//  metro-now-widgetsExtension
//
//  Created by Kryštof Krátký on 29.05.2024.
//

import SwiftUI

struct SmallWidgetPlaceholderView: View {
    var body: some View {
        VStack {
            WidgetHeading(stationName: "Loading...")
            DeparturePlaceholderView()
            DeparturePlaceholderView()
        }
    }
}
