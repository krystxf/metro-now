// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI
import Translation

struct InfotextsPageView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = InfotextsViewModel()
    @State private var translationConfiguration: TranslationSession.Configuration?

    private let czechLanguage = Locale.Language(identifier: "cs")
    private let englishLanguage = Locale.Language(identifier: "en")

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
                            infotext: infotext,
                            englishText: viewModel.englishText(for: infotext)
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
        .translationTask(translationConfiguration) { session in
            await viewModel.translateMissingInfotexts(using: session)
        }
        .onAppear {
            updateTranslationConfiguration(
                pendingAutomaticTranslationIDs: viewModel.pendingAutomaticTranslationIDs
            )
        }
        .onChange(of: viewModel.pendingAutomaticTranslationIDs) { _, pendingIDs in
            updateTranslationConfiguration(
                pendingAutomaticTranslationIDs: pendingIDs
            )
        }
    }

    private func updateTranslationConfiguration(
        pendingAutomaticTranslationIDs: [String]
    ) {
        guard !pendingAutomaticTranslationIDs.isEmpty else {
            translationConfiguration = nil
            return
        }

        if var currentConfiguration = translationConfiguration {
            currentConfiguration.invalidate()
            translationConfiguration = currentConfiguration
            return
        }

        translationConfiguration = TranslationSession.Configuration(
            source: czechLanguage,
            target: englishLanguage
        )
    }
}

#Preview {
    InfotextsPageView()
}
