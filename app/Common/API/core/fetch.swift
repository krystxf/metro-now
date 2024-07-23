//
//  fetch.swift
//  metro-now
//
//  Created by Kryštof Krátký on 22.07.2024.
//

import Foundation

enum FetchError:
    Error
{
    case InvalidURL
    case InvalidResponse
    case InvalidaData
}

func fetch<ResponseType: Decodable>(_ url: String) async throws -> ResponseType {
    #if DEBUG
        print("GET \(url)")
    #endif

    guard let parsedUrl = URL(string: url) else {
        throw FetchError.InvalidURL
    }

    let (data, response) = try await URLSession.shared.data(from: parsedUrl)

    guard let response = response as? HTTPURLResponse, response.statusCode == 200 else {
        throw FetchError.InvalidResponse
    }

    do {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        return try decoder.decode(ResponseType.self, from: data)

    } catch {
        throw FetchError.InvalidaData
    }
}
