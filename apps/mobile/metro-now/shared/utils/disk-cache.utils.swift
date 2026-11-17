// metro-now
// https://github.com/krystxf/metro-now

import Foundation

enum DiskCache {
    private static let cacheDirectory: URL? = FileManager.default.urls(
        for: .cachesDirectory, in: .userDomainMask
    ).first

    private static let ioQueue = DispatchQueue(
        label: "com.krystxf.metro-now.disk-cache",
        qos: .utility
    )

    static func save(_ data: some Codable, key: String) {
        guard let dir = cacheDirectory else { return }
        let fileURL = dir.appendingPathComponent("cache_\(key).json")
        let wrapper = CacheEntry(savedAt: Date(), data: data)

        ioQueue.async {
            do {
                let encoded = try JSONEncoder().encode(wrapper)
                try encoded.write(to: fileURL, options: .atomic)
            } catch {
                print("DiskCache save error [\(key)]: \(error)")
            }
        }
    }

    /// Loads a cached value, only if it is younger than `maxAge`.
    static func load<T: Codable>(key: String, maxAge: TimeInterval, as _: T.Type) -> T? {
        guard let entry = readEntry(key: key, as: T.self) else { return nil }

        if Date().timeIntervalSince(entry.savedAt) > maxAge {
            return nil
        }

        return entry.data
    }

    /// Loads a cached value regardless of age, along with its saved timestamp.
    /// Use as a fallback when a network fetch fails — better stale data than nothing.
    static func loadStale<T: Codable>(
        key: String,
        as _: T.Type
    ) -> (data: T, savedAt: Date)? {
        guard let entry = readEntry(key: key, as: T.self) else { return nil }
        return (entry.data, entry.savedAt)
    }

    static func invalidate(key: String) {
        guard let dir = cacheDirectory else { return }
        let fileURL = dir.appendingPathComponent("cache_\(key).json")
        ioQueue.async {
            try? FileManager.default.removeItem(at: fileURL)
        }
    }

    /// Removes every `cache_*.json` file produced by this utility.
    static func invalidateAll() {
        guard let dir = cacheDirectory else { return }
        ioQueue.async {
            guard let files = try? FileManager.default.contentsOfDirectory(
                at: dir,
                includingPropertiesForKeys: nil
            ) else { return }

            for url in files where url.lastPathComponent.hasPrefix("cache_")
                && url.pathExtension == "json"
            {
                try? FileManager.default.removeItem(at: url)
            }
        }
    }

    private static func readEntry<T: Codable>(
        key: String,
        as _: T.Type
    ) -> CacheEntry<T>? {
        guard let dir = cacheDirectory else { return nil }
        let fileURL = dir.appendingPathComponent("cache_\(key).json")

        do {
            let data = try Data(contentsOf: fileURL)
            return try JSONDecoder().decode(CacheEntry<T>.self, from: data)
        } catch let error as DecodingError {
            // Corrupted or schema-incompatible — drop it so the next save succeeds.
            print("DiskCache decode error [\(key)]: \(error). Removing file.")
            try? FileManager.default.removeItem(at: fileURL)
            return nil
        } catch {
            // File probably doesn't exist yet — expected on first run.
            return nil
        }
    }
}

private struct CacheEntry<T: Codable>: Codable {
    let savedAt: Date
    let data: T
}
