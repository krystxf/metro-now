//
//  name.utils.swift
//  MetroMate
//
//  Created by Kryštof Krátký on 31.03.2024.
//

import Foundation

func getShortenStationName(_ name: String) -> String {
    // Exceptions:
    switch name {
    case "Černý Most":
        return "Č. Most"
    case "Nemocnice Motol":
        return "Motol"
    case "Depo Hostivař":
        return "Hostivař"
    case "Jiřího z Poděbrad":
        return "J. z Poděbrad"
    case "Hlavní nádraží":
        return "Hl. nádraží"
    case "Pražského povstání":
        return "P. povstání"
    case "I. P. Pavlova":
        return "I. P. Pavl."
    case "Nové Butovice":
        return "N. Butovice"
    default:
        break
    }

    var shortened = name

    // Replace frequent woeds in station names
    shortened = shortened.replacing(/^Nádraží/, with: "Nádr.")
    shortened = shortened.replacing(/nádraží$/, with: "nádr.")

    shortened = shortened.replacing(/^Náměstí/, with: "Nám.")
    shortened = shortened.replacing(/náměstí$/, with: "nám.")

    return shortened
}
