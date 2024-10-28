// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct DeparturePlaceholder: View {
    let color: Color

    init(
        color: Color?
    ) {
        self.color = color ?? Color.gray.opacity(0.3)
    }

    var body: some View {
        VStack(alignment: .trailing) {
            HStack {
                Text("Loading...")
                Spacer()
                Text("--s")
            }
            HStack {
                Spacer()
                Text("also in --m --s")
            }.font(.system(size: 12))
        }
        .redacted(reason: .placeholder)
        .padding(.vertical, 10)
        .padding(.horizontal, 5)
        .background(color)
        .clipShape(.rect(cornerRadius: 10))
    }
}
