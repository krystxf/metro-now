//
//  getMetroLineColor.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import Foundation
import SwiftUI

func getMetroLineColor(_ letter: String) -> Color {
    switch letter.uppercased() {
    case "A":
        .green
    case "B":
        .yellow
    case "C":
        .red
    default:
        .purple
    }
}
