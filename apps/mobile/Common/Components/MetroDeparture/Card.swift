
import SwiftUI

struct MetroDepartureCard<Content: View>: View {
    let backgroundColor: Color
    let content: Content

    init(backgroundColor: Color, @ViewBuilder content: () -> Content) {
        self.backgroundColor = backgroundColor
        self.content = content()
    }

    var body: some View {
        HStack {
            content
        }.padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(
                LinearGradient(
                    colors: [
                        backgroundColor,
                        backgroundColor.opacity(0.8),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(.rect(cornerRadius: 15))
    }
}

#Preview {
    VStack {
        MetroDepartureCard(
            backgroundColor: getMetroLineColor("A"))
        {
            HStack {
                MetroDepartureCardLabel(direction: "Nemocnice Motol", metroLine: "A")
                Spacer()
            }
        }
        MetroDepartureCard(
            backgroundColor: getMetroLineColor("B"))
        {
            HStack {
                MetroDepartureCardLabel(direction: "Černý Most", metroLine: "B")
                Spacer()
            }
        }
        MetroDepartureCard(
            backgroundColor: getMetroLineColor("C"))
        {
            HStack {
                MetroDepartureCardLabel(direction: "Haje", metroLine: "C")
                Spacer()
            }
        }
    }
    .padding(.horizontal, 10)
    Spacer()
}
