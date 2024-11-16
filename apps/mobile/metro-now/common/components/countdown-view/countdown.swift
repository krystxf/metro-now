// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct CountdownView: View {
    typealias CustomFormatFunctionType = (_ formattedTime: String) -> String

    let targetDate: Date
    let customFunction: CustomFormatFunctionType
    @State private var timeRemaining: TimeInterval = 0
    private let timer = Timer.publish(
        every: 0.1,
        on: .main,
        in: .common
    )
    .autoconnect()

    init(targetDate: Date, customFunction: CustomFormatFunctionType? = nil) {
        self.targetDate = targetDate
        self.customFunction = customFunction ?? { $0 }
        updateRemainingTime()
    }

    var body: some View {
        Text(
            customFunction(
                getRemainingTime(
                    timeRemaining
                )
            )
        )
        .onReceive(timer) { _ in
            updateRemainingTime()
        }
    }

    private func updateRemainingTime() {
        timeRemaining = targetDate.timeIntervalSinceNow
    }
}

#Preview {
    VStack {
        CountdownView(targetDate: .now)
        CountdownView(targetDate: .now + 60)
        CountdownView(targetDate: .now + 10 * 60)
        CountdownView(targetDate: .now + 2 * 60 * 60)
        CountdownView(targetDate: .now + 10 * 60) { "Also in \($0)" }
    }
}
