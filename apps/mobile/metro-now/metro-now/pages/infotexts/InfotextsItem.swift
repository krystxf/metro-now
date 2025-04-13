// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct InfotextsItem: View {
    let relatedStops: [String]
    let description: String
    
    init(relatedStops: [String], description: String) {
        self.relatedStops = Array(Set(relatedStops))
        self.description = description
    }

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading) {
                    Text("Affected stops")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.tertiary)

                    ForEach(relatedStops, id: \.self) { stop in
                        Text(stop).font(.headline)
                    }
                }
                Divider()

                Text(description)
                    .font(.callout)
            }
        }
    }
}
