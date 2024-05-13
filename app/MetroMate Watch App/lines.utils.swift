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
        .green
    case "B":
        .yellow
    case "C":
        .red
    default:
        .white
    }
}
