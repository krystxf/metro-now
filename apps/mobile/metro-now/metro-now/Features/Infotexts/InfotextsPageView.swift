// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct InfotextsPageView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var viewModel: InfotextsViewModel
    let onClose: (() -> Void)?

    init(onClose: (() -> Void)? = nil) {
        self.onClose = onClose
    }

    var body: some View {
        NavigationView {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    viewModel.infotexts.isEmpty
                        ? Section {
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
                                Text(
                                    "Check [official website](https://pid.cz/zmeny/) for more detailed information."
                                )
                                .font(.footnote)
                            }
                            .padding()
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                        }
                        : nil

                    ForEach(viewModel.infotexts, id: \.id) { infotext in
                        InfotextsItem(
                            infotext: infotext
                        )
                    }
                }
                .navigationTitle("Info")
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            if let onClose {
                                onClose()
                            } else {
                                dismiss()
                            }
                        } label: {
                            Label("Close", systemImage: "xmark")
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    InfotextsPageView()
        .environmentObject(InfotextsViewModel())
}
