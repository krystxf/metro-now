//
//  getStationsFromJSONTest.swift
//  metro-now-tests
//
//  Created by Kryštof Krátký on 15.05.2024.
//

@testable import metro_now
import XCTest

final class getStationsFromJSONTest: XCTestCase {
    // MARK: - check if JSON data loads successfully

    func testIfGetStationsFromJSONFails() {
        let _ = parseStationsJSON()
    }
}
