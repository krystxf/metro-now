// metro-now
// https://github.com/krystxf/metro-now

import Foundation

class FavoritesViewModel: ObservableObject {
    @Published private(set) var favoriteStopIds: [String] = []

    init(initialFavoriteStopIds: [String]? = nil) {
        if let initialFavoriteStopIds {
            favoriteStopIds = initialFavoriteStopIds
        } else {
            favoriteStopIds = Self.loadFavorites()
        }
    }

    func isFavorite(_ stopId: String) -> Bool {
        favoriteStopIds.contains(stopId)
    }

    func toggleFavorite(_ stopId: String) {
        if isFavorite(stopId) {
            removeFavorite(stopId)
        } else {
            addFavorite(stopId)
        }
    }

    func addFavorite(_ stopId: String) {
        guard !isFavorite(stopId) else { return }
        favoriteStopIds.append(stopId)
        saveFavorites()
    }

    func removeFavorite(_ stopId: String) {
        favoriteStopIds.removeAll { $0 == stopId }
        saveFavorites()
    }

    private func saveFavorites() {
        guard let data = try? JSONEncoder().encode(favoriteStopIds) else { return }
        UserDefaults.standard.set(data, forKey: AppStorageKeys.favoriteStopIds.rawValue)
    }

    private static func loadFavorites() -> [String] {
        guard
            let data = UserDefaults.standard.data(forKey: AppStorageKeys.favoriteStopIds.rawValue),
            let ids = try? JSONDecoder().decode([String].self, from: data)
        else {
            return []
        }
        return ids
    }
}
