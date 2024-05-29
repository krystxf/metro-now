//
//  PlatformDetailView.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import SwiftUI

struct PlatformDetailView: View {
    let defaultDirection: String
    @State var gtfsID: String
    @State private var departures: [ApiDeparture]?

    var body: some View {
        ZStack {
            Color.black.edgesIgnoringSafeArea(.all)

            LinearGradient(
                colors: [Color.green.opacity(0.50), Color.black],
                startPoint: .top,
                endPoint: .bottom
            )
            .edgesIgnoringSafeArea(.all)
            VStack {
                Label(departures?.first?.trip.headsign ?? defaultDirection, systemImage: "arrowshape.right.fill")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                if let departures, departures.count >= 1 {
                    Text(formatTime(seconds: secondsFromNow(departures[0].departureTimestamp.predicted)))
                        .font(.largeTitle)
                        .foregroundStyle(.white)
                }
                if let departures, departures.count >= 2 {
                    Text("Also in \(formatTime(seconds: secondsFromNow(departures[1].departureTimestamp.predicted)))")
                        .font(.title2)
                        .foregroundStyle(.white)
                }
                Spacer()
            }
            .padding(.top, 50)
            .task {
                do {
                    departures = try await getDeparturesByGtfsID(gtfsID)

                } catch {
                    print(error)
                }
            }
            .refreshable {
                do {
                    departures = try await getDeparturesByGtfsID(gtfsID)

                } catch {
                    print(error)
                }
            }
        }
    }
}

// #Preview {
//    PlatformDetailView(
//        direction: "Háje")
// }
