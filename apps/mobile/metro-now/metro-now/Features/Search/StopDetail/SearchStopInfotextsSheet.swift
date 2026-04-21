// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SearchStopInfotextsSheet: View {
    let infotexts: [ApiInfotext]
    let onDone: () -> Void

    var body: some View {
        NavigationStack {
            List {
                ForEach(infotexts, id: \.id) { infotext in
                    InfotextsItem(infotext: infotext, showsRelatedStops: false)
                }
            }
            .navigationTitle("Alerts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done", action: onDone)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
