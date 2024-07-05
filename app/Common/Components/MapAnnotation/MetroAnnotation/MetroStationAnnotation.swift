 
import SwiftUI

struct MetroStationAnnotation: View {
    let metroLine: String

    var body: some View {
        Image(
            systemName:
            getMetroLineIcon(metroLine)
        )
        .imageScale(.medium)
        .padding(5)
        .foregroundStyle(.white)
        .background(getMetroLineColor(metroLine))
        .clipShape(.rect(cornerRadius: 6))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(.white, lineWidth: 2)
        )
    }
}
