// metro-now
// https://github.com/krystxf/metro-now

import Foundation

private let hoursMinutesFormatter: DateComponentsFormatter = {
    let formatter = DateComponentsFormatter()
    formatter.unitsStyle = .abbreviated
    formatter.allowedUnits = [.hour, .minute]
    formatter.maximumUnitCount = 2
    return formatter
}()

private let minutesSecondsFormatter: DateComponentsFormatter = {
    let formatter = DateComponentsFormatter()
    formatter.unitsStyle = .abbreviated
    formatter.allowedUnits = [.minute, .second]
    formatter.maximumUnitCount = 2
    return formatter
}()

private let secondsFormatter: DateComponentsFormatter = {
    let formatter = DateComponentsFormatter()
    formatter.unitsStyle = .abbreviated
    formatter.allowedUnits = [.second]
    formatter.maximumUnitCount = 1
    return formatter
}()

func getRemainingTime(_ remainingSeconds: TimeInterval) -> String {
    let remainingSecondsAbs = abs(remainingSeconds)

    let hours = Int(remainingSecondsAbs) / 3600
    let minutes = Int(remainingSecondsAbs) % 3600 / 60
    let formatter: DateComponentsFormatter = if hours > 0 {
        hoursMinutesFormatter
    } else if minutes > 0 {
        minutesSecondsFormatter
    } else {
        secondsFormatter
    }

    let formatted = formatter.string(from: remainingSecondsAbs) ?? "0s"

    if remainingSeconds < 0 {
        return "-\(formatted)"
    }

    return formatted
}
