// metro-now
// https://github.com/krystxf/metro-now

import Apollo
import MetroNowAPI
import SwiftUI

class InfotextsViewModel: ObservableObject {
    @Published var infotexts = [InfotextsQuery.Data.Infotext]()
    @Published var isLoading = true
    @Published var activeRequest: Cancellable?

    init() {
        loadInfotexts()
    }

    private func loadInfotexts() {
        activeRequest = Network.shared.apollo.fetch(query: InfotextsQuery(), cachePolicy: .returnCacheDataAndFetch) { [weak self] result in
            guard let self else {
                return
            }

            activeRequest = nil

            switch result {
            case let .success(graphQLResult):
                if let infotexts = graphQLResult.data?.infotexts {
                    self.infotexts = infotexts
                    print("Fetched infotexts")
                }

                if let errors = graphQLResult.errors {
                    print("Info errors: \(errors)")
                }
            case let .failure(error):
                print("Info errors: \(error)")
            }

            isLoading = false
        }
    }
}
