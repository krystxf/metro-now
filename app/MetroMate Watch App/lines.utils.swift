//
//  lines.utils.swift
//  MetroMate
//
//  Created by Kryštof Krátký on 31.03.2024.
//

import Foundation
import SwiftUI

func getLineColor(line: String) -> Color {
    switch line {
    case "A":
        return .green
    case "B":
        return .yellow
    case "C":
        return .red
    default:
        return .white
    }
}
