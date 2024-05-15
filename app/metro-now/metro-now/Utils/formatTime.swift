//
//  formatTime.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import Foundation

func formatTime(seconds: Int) -> String {
    let hours = seconds / 3600
    let minutes = (seconds % 3600) / 60
    let remainingSeconds = seconds % 60

    if hours > 0 {
        return String(format: "%dh %dm", hours, minutes)
    } else if minutes > 0 {
        return String(format: "%dm %ds", minutes, remainingSeconds)
    } else {
        return String(format: "%ds", remainingSeconds)
    }
}
