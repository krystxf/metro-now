//
//  jsonUtils.swift
//  metro-now
//
//  Created by Kryštof Krátký on 15.05.2024.
//

import Foundation

func getParsedJSONFile<T: Decodable>(_ filename: FileName) -> T? {
    let path = Bundle.main.path(forResource: filename.rawValue, ofType: getFileExtension(filename))

    guard let path else {
        print("File not found")
        return nil
    }

    do {
        let data = try Data(
            contentsOf: URL(fileURLWithPath: path)
        )
        let stations = try JSONDecoder().decode(
            T.self,
            from: data
        )
        return stations
    } catch {
        print("Error parsing JSON: \(error)")
        return nil
    }
}
