//
//  SettingsView.swift
//  MetroMate
//
//  Created by Kryštof Krátký on 31.03.2024.
//

import SwiftUI

struct SettingsView: View {
    // TODO:

    @State private var shortenNames = true
    @State private var showLineNames = true
    @State private var allowFlashingEffects = true
    @State private var allowVibrations = true
    @State private var allowSounds = false

    var body: some View {
        List {
            Toggle("Shorten station names", isOn: $shortenNames)
            Toggle("Show line names", isOn: $showLineNames)
            Toggle("Allow flashing effects", isOn: $allowFlashingEffects)
            Toggle("Allow vibrations", isOn: $allowVibrations)
            Toggle("Allow sounds", isOn: $allowSounds)
        }
        .navigationTitle("Settings")
    }
}

#Preview {
    SettingsView()
}
