//
//  ListWidgetView.swift
//  metro-now-widgetsExtension
//
//  Created by Kryštof Krátký on 29.05.2024.
//

import SwiftUI

struct ListWidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        WidgetHeading(stationName: entry.stationName).padding(.bottom, 10)

        VStack {
            ForEach(entry.departures, id: \.direction) { departure in
                HStack {
                    Label(departure.direction, systemImage: getMetroLineIcon(departure.metroLine))
                    Spacer()
                    Text(departure.departureDate.formatted(.dateTime.hour().minute()))
                        .frame(alignment: .leading)
                        .font(.caption)
                        .fontWeight(.bold)
                }
                Divider()
            }
        }
    }
}
