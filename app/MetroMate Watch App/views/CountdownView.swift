//
//  CountdownView.swift
//  MetroMate
//
//  Created by Kryštof Krátký on 01.04.2024.
//

import Foundation
import SwiftUI

let SECONDS_IN_MINUTE = 60
let SECONDS_IN_HOUR = 60 * SECONDS_IN_MINUTE

func formatTime(seconds: Int) -> String {
    if seconds < 0 {
        return "\(seconds)s"
    }

    let (h, m, s) = (seconds / SECONDS_IN_HOUR, (seconds % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE, (seconds % SECONDS_IN_HOUR) % SECONDS_IN_MINUTE)

    var output: [String] = []

    if h > 0 {
        output.append("\(h)h")
    }
    if m > 0 {
        output.append("\(m)m")
    }
    // don't show seconds if wait time is over 1 hour
    if h == 0, s > 0 {
        output.append("\(s)s")
    }

    return output.joined(separator: " ")
}

struct CountdownView: View {
    @StateObject var countdownViewModel: CountdownViewModel

    var body: some View {
        VStack {
            Text(formatTime(seconds: countdownViewModel.remainingTimeInSeconds))
        }
        .onAppear {
            countdownViewModel.startCountdown()
        }
    }
}

let dateFormatter = ISO8601DateFormatter()

class CountdownViewModel: ObservableObject {
    @Published var remainingTimeInSeconds: Int = 0

    private var timer: Timer?

    private let targetDate: Date

    init(targetDateString: String) {
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = ISO8601DateFormatter().date(from: targetDateString) else {
            fatalError("Invalid date format")
        }
        targetDate = date
    }

    func startCountdown() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self else { return }
            let currentDate = Date()
            let remainingTime = Int(targetDate.timeIntervalSince(currentDate))
            remainingTimeInSeconds = remainingTime
        }
    }

    deinit {
        timer?.invalidate()
    }
}
