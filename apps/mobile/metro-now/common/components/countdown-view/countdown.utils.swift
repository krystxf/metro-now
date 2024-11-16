// metro-now
// https://github.com/krystxf/metro-now

import Foundation

func getRemainingTime(_ remainingSeconds: TimeInterval) -> String {
    let remainingSecondsAbs = abs(remainingSeconds)

    let hours = Int(remainingSecondsAbs) / 3600
    let minutes = Int(remainingSecondsAbs) % 3600 / 60
    let seconds = Int(remainingSecondsAbs) % 60
    let isNegative = Bool(remainingSeconds < 0)

    var res = isNegative ? "-" : ""

    if hours > 0 {
        res += "\(hours)h \(minutes)m"
    } else if minutes > 0 {
        res += "\(minutes)m \(seconds)s"
    } else {
        res += "\(seconds)s"
    }

    return res
}
