//
//  PlatformDetailView.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import SwiftUI

struct PlatformDetailView: View {
    var direction: String

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
                Label(direction, systemImage: "arrowshape.right.fill")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                Text(formatTime(seconds: 20))
                    .font(.title)
                    .foregroundStyle(.white)
                Text("Also in \(formatTime(seconds: 200))")
                    .font(.title2)
                    .foregroundStyle(.white)

                Spacer()
            }
        }
    }
}

#Preview {
    PlatformDetailView(
        direction: "Háje")
}
