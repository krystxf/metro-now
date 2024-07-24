
import Foundation
import SwiftUI

@available(iOS 18.0, *)
struct CountdownIOS18: View {
    let date: Date

    init(_ date: Date) {
        self.date = date
    }

    var body: some View {
        Text(
            .currentDate,
            format:
            .reference(
                to: date,
                allowedFields: [.second, .minute, .hour],
                maxFieldCount: 2
            )
        )
    }
}

struct CountdownLegacy: View {
    let date: Date
    @State var countdownText: String = " - "

    init(_ date: Date) {
        self.date = date
    }

    func updateCountdownText() {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        countdownText = formatter.localizedString(for: date, relativeTo: .now)
    }

    let timer = Timer.publish(every: 0.5, on: .main, in: .common).autoconnect()

    var body: some View {
        Text(countdownText)
            .onAppear {
                updateCountdownText()
            }
            .onReceive(timer) { _ in
                updateCountdownText()
            }
    }
}

struct Countdown: View {
    let date: Date

    init(_ date: Date) {
        self.date = date
    }

    var body: some View {
        Group {
            if #available(iOS 18.0, *) {
                CountdownIOS18(date)
            } else {
                CountdownLegacy(date)
            }
        }
    }
}

#Preview("Seconds") {
    Countdown(Date(timeIntervalSinceNow: 59))
}

#Preview("Seconds in past") {
    Countdown(Date(timeIntervalSinceNow: 0))
}

#Preview("Minutes") {
    Countdown(Date(timeIntervalSinceNow: 59 * 60))
}

#Preview("Minutes in past") {
    Countdown(Date(timeIntervalSinceNow: -1 * 60))
}

#Preview("Hours") {
    Countdown(Date(timeIntervalSinceNow: 10 * 60 * 60))
}

#Preview("Hours in past") {
    Countdown(Date(timeIntervalSinceNow: -1 * 2 * 60 * 60))
}
