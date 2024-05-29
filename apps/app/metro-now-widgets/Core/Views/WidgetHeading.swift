//
//  Author: Kryštof Krátký
//

import SwiftUI

struct WidgetHeading: View {
    let stationName: String

    var body: some View {
        HStack {
            Text(stationName)
                .font(.headline)
                .frame(alignment: .topLeading)
            Spacer()
        }
    }
}
