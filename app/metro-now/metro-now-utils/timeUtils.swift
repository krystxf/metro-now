//
//  timeUtils.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import Foundation

let SECONDS_IN_MINUTE = 60
let SECONDS_IN_HOUR = 60 * SECONDS_IN_MINUTE
let SECONDS_IN_TWELVE_HOURS = 12 * SECONDS_IN_HOUR

func formatTime(seconds: Int) -> String {
    // (-1 * Int.min) > Int.max
    //  => this has to be separate check before seconds is converted to positive number
    let isMoreThan12Hours = seconds > SECONDS_IN_TWELVE_HOURS
    guard !isMoreThan12Hours else {
        return ">12h"
    }
    let isLessThanMinus12Hours = seconds < -SECONDS_IN_TWELVE_HOURS
    guard !isLessThanMinus12Hours else {
        return "- >12h"
    }

    let output = seconds < 0 ? "-" : ""
    let positiveSeconds = abs(seconds)

    let hours = positiveSeconds / SECONDS_IN_HOUR
    let minutes = (positiveSeconds % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE
    let remainingSeconds = positiveSeconds % SECONDS_IN_MINUTE

    guard hours == 0 else {
        if minutes == 0 {
            return String(format: "\(output)%dh", hours)
        } else {
            return String(format: "\(output)%dh %dm", hours, minutes)
        }
    }
    guard minutes == 0 else {
        if remainingSeconds == 0 {
            return String(format: "\(output)%dm", minutes)
        } else {
            return String(format: "\(output)%dm %ds", minutes, remainingSeconds)
        }
    }

    return String(format: "\(output)%ds", remainingSeconds)
}
