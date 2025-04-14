// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct InfotextsPageView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = InfotextsViewModel()

    var body: some View {
        NavigationView {
            List {
                viewModel.infotexts.isEmpty ?
                    Section {
                        VStack(spacing: 10) {
                            ZStack {
                                Image(systemName: "checkmark.circle")
                                    .foregroundStyle(.green)
                                    .font(.largeTitle)
                            }
                            .accessibilityHidden(true)
                            Text("No Traffic Changes Found")
                                .fontWeight(.bold)
                                .font(.title3)
                            Text("Check [official website](https://pid.cz/zmeny/) for more detailed information.")
                                .font(.footnote)
                        }
                        .padding()
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                    }
                    : nil

                ForEach(viewModel.infotexts, id: \.id) { infotext in
                    InfotextsItem(
                        relatedStops: infotext.relatedPlatforms.map(\.stop.name),
                        description: infotext.text
                    )
                }
            }
            .navigationTitle("Info")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Label("Close", systemImage: "xmark")
                    }
                }
            }
        }
    }
}

#Preview {
    InfotextsPageView()
}
