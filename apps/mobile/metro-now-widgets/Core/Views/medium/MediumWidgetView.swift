//
//  MediumWidgetView.swift
//  metro-now-widgetsExtension
//
//  Created by Kryštof Krátký on 29.05.2024.
//

import SwiftUI
import WidgetKit

struct MediumWidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack {
            WidgetHeading(stationName: entry.stationName)
            if entry.departures.count == 0 {
                Spacer()
                Text("No departures").font(.footnote)
                Spacer()
            } else if entry.departures.count == 1 {
                DepartureView(
                    direction: entry.departures[0].direction,
                    departureDate: entry.departures[0].departureDate,
                    metroLine: entry.departures[0].metroLine
                )
                Spacer()
            } else {
                Grid(alignment: .topLeading,
                     horizontalSpacing: 5,
                     verticalSpacing: 5)
                {
                    ForEach(0 ..< 2) { rowIndex in
                        GridRow {
                            ForEach(0 ..< 2) { columnIndex in
                                let index = rowIndex * 2 + columnIndex
                                if entry.departures.count > index {
                                    DepartureView(
                                        direction: entry.departures[index].direction,
                                        departureDate: entry.departures[index].departureDate,
                                        metroLine: entry.departures[index].metroLine
                                    )
                                } else {
                                    Spacer()
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
