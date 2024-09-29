import SwiftUI

struct DepartureDetailView: View {
    let platformID: String

    var body: some View {
        VStack {
            Label(
                "Haje",
                systemImage: "arrowshape.right.fill"
            )
            .font(.title2)
            Text("1m 20s")
                .font(.title2)
            Text("Also to Kacerov in 1m 20s")
                .font(.footnote)
        }

        .containerBackground(
            .red.gradient,
            for: .tabView
        )
    }
}
