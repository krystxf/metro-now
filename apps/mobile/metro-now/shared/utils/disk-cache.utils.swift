// metro-now
// https://github.com/krystxf/metro-now

import Foundation

enum DiskCache {
    private static let cacheDirectory: URL? = FileManager.default.urls(
        for: .cachesDirectory, in: .userDomainMask
    ).first

    static func save(_ data: some Codable, key: String) {
        guard let dir = cacheDirectory else { return }
        let fileURL = dir.appendingPathComponent("cache_\(key).json")
        let wrapper = CacheEntry(savedAt: Date(), data: data)

        do {
            let encoded = try JSONEncoder().encode(wrapper)
            try encoded.write(to: fileURL)
        } catch {
            print("DiskCache save error: \(error)")
        }
    }

    static func load<T: Codable>(key: String, maxAge: TimeInterval, as _: T.Type) -> T? {
        guard let dir = cacheDirectory else { return nil }
        let fileURL = dir.appendingPathComponent("cache_\(key).json")

        do {
            let data = try Data(contentsOf: fileURL)
            let wrapper = try JSONDecoder().decode(CacheEntry<T>.self, from: data)

            if Date().timeIntervalSince(wrapper.savedAt) > maxAge {
                return nil
            }

            return wrapper.data
        } catch {
            return nil
        }
    }
}

private struct CacheEntry<T: Codable>: Codable {
    let savedAt: Date
    let data: T
}
