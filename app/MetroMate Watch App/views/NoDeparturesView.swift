//
//  NoDeparturesView.swift
//  MetroMate
//
//  Created by Kryštof Krátký on 01.04.2024.
//

import SwiftUI

struct NoDeparturesView: View {
    @State var degreesRotating = 0.0

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "gauge.with.needle").rotationEffect(.degrees(degreesRotating)).font(.system(size: 50))
                .foregroundStyle(.tint)
                .onAppear {
                    withAnimation(
                        .linear(duration: 1)
                            .speed(0.05).repeatForever(autoreverses: false)
                    ) {
                        degreesRotating = 360.0
                    }
                }
            Text(
                "Damn, that was the last one. But no worries, metro starts again at 5:00 😴")
                .foregroundStyle(.tint)
                .font(.caption)
                .multilineTextAlignment(.center)
        }
    }
}

#Preview {
    NoDeparturesView()
}
