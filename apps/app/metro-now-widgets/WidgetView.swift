//
//  WidgetView.swift
//  metro-now-widgetsExtension
//
//  Created by Kryštof Krátký on 29.05.2024.
//

import Foundation
import SwiftUI

struct WidgetView: View {
    var entry: WidgetEntry

    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        #if os(iOS)
            case .systemSmall:
                SmallWidgetView(entry: entry)
            case .systemMedium:
                MediumWidgetView(entry: entry)
            case .systemLarge:
                ListWidgetView(entry: entry)
        #endif
        default:
            Text("Unsupported!")
        }
    }
}
