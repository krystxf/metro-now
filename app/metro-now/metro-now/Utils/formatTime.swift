//
//  formatTime.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import Foundation

let twelveHoursSeconds = 12 * 60 * 60

func formatTime(seconds: Int) -> String {
    let isNegative = seconds < 0

    if isNegative, seconds < -twelveHoursSeconds {
        return "- >12h"
    } else if !isNegative, seconds > twelveHoursSeconds {
        return ">12h"
    }

    let positiveSeconds = isNegative ? -seconds : seconds

    let hours = positiveSeconds / 3600
    let minutes = (positiveSeconds % 3600) / 60
    let remainingSeconds = positiveSeconds % 60

    var output: String = isNegative ? "-" : ""
    if hours > 0 {
        if minutes == 0 {
            output += String(format: "%dh", hours)
        } else {
            output += String(format: "%dh %dm", hours, minutes)
        }
    } else if minutes > 0 {
        if remainingSeconds == 0 {
            output += String(format: "%dm", minutes)
        } else {
            output += String(format: "%dm %ds", minutes, remainingSeconds)
        }
    } else {
        output += String(format: "%ds", remainingSeconds)
    }

    return output
}
