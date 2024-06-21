//
//  Author: Kryštof Krátký
//

import Foundation

struct ApiDeparture: Codable {
    let departure: Date
    let line: String
    let heading: String
}
