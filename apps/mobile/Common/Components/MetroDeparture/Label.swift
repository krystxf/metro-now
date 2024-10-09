
import SwiftUI

struct MetroDepartureCardLabel: View {
    let direction: String
    let metroLine: String

    var body: some View {
        Label(
            title: {
                Text(direction)
            },
            icon: {
                Image(systemName: getMetroLineIcon(metroLine))
            }
        )
        .fontWeight(.bold)
        .font(.headline)
        .foregroundStyle(.white)
    }
}
