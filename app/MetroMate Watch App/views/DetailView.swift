//
//  DetailView.swift
//  MetroMate
//
//  Created by Kryštof Krátký on 01.04.2024.
//

import SwiftUI

struct DetailView: View {
    @State var allDepartures: [Departure]
    @State var selectedDeparture: Departure.ID?

    @State private var critical: Bool = false

    var body: some View {
        let departureRecord = allDepartures.first {
            $0.id == selectedDeparture
        }

        if let departureRecord {
            let filteredDepartures = allDepartures
                .filter {
                    $0.stop.id == departureRecord.stop.id
                }

            VStack {
                Label(
                    getShortenStationName(departureRecord.trip.headsign),
                    systemImage: "arrowshape.right.fill"
                )
                .foregroundStyle(.secondary)
                .font(.title3).bold()
                CountdownView(countdownViewModel: CountdownViewModel(targetDateString: departureRecord.departureTimestamp.predicted)).font(.title)
                HStack {
                    if filteredDepartures.count >= 2 {
                        Text("Also in")
                        CountdownView(countdownViewModel: CountdownViewModel(targetDateString: filteredDepartures[1].departureTimestamp.predicted))
                    }
                }
                .foregroundStyle(.tertiary)
            }
            .onAppear {
                Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { _ in
                    dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                    guard let targetDate = ISO8601DateFormatter().date(from: departureRecord.departureTimestamp.predicted) else {
                        fatalError("Invalid date format")
                    }

                    let currentDate = Date()
                    let remainingTime = Int(targetDate.timeIntervalSince(currentDate))

                    if remainingTime < 20 {
                        critical = !critical
                    } else {
                        critical = false
                    }
                }
            }
            .containerBackground(
                (critical ? .black :
                    getLineColor(line: departureRecord.route.shortName)).gradient,
                for: .tabView
            )
        }
    }
}
