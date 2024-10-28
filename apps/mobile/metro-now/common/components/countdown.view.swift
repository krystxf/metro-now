// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct CountdownView: View {
    typealias CustomFormatFunctionType = (_ formattedTime: String) -> String

    let targetDate: Date
    let customFunction: CustomFormatFunctionType

    init(targetDate: Date, customFunction: CustomFormatFunctionType? = nil) {
        self.targetDate = targetDate
        self.customFunction = customFunction ?? { $0 }
    }

    @State private var timeRemaining: TimeInterval = 0

    private let timer = Timer.publish(every: 0.1, on: .main, in: .common).autoconnect()

    var body: some View {
        Text(formattedTime)
            .onAppear {
                updateRemainingTime()
            }
            .onReceive(timer) { _ in
                updateRemainingTime()
            }
    }

    private var formattedTime: String {
        let remainingTime = abs(timeRemaining)
        let hours = Int(remainingTime) / 3600
        let minutes = Int(remainingTime) % 3600 / 60
        let seconds = Int(remainingTime) % 60
        let isNegative = Bool(timeRemaining < 0)

        var res = isNegative ? "-" : ""

        if hours > 0 {
            res += "\(hours)h \(minutes)m"
        } else if minutes > 0 {
            res += "\(minutes)m \(seconds)s"
        } else {
            res += "\(seconds)s"
        }

        return customFunction(res)
    }

    private func updateRemainingTime() {
        timeRemaining = targetDate.timeIntervalSinceNow
    }
}
