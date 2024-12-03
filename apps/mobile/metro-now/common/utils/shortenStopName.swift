// metro-now
// https://github.com/krystxf/metro-now

func shortenStopName(_ stop: String) -> String {
    if stop == "Nemocnice Motol" {
        return "N. Motol"
    } else if stop == "Jiřího z Poděbrad" {
        return "J. z Poděbrad"
    } else if stop == "Pražského povstání" {
        return "P. povstání"
    } else if stop == "Depo Hostivař" {
        return "D. Hostivař"
    }

    if stop.hasPrefix("Nádraží") {
        return stop.replacingOccurrences(of: "Nádraží", with: "N.")
    } else if stop.hasSuffix("nádraží") {
        return stop.replacingOccurrences(of: "nádraží", with: "nádr.")
    }

    if stop.hasPrefix("Náměstí") {
        return stop.replacingOccurrences(of: "Náměstí", with: "Nám.")
    } else if stop.hasSuffix("náměstí") {
        return stop.replacingOccurrences(of: "náměstí", with: "nám.")
    }

    return stop
}

// All metro stops
/*
 Anděl
 Bořislavka
 Bubenská
 Budějovická
 Černý Most
 Českomoravská
 Dejvická
 Depo Hostivař
 Flora
 Florenc
 Háje
 Hlavní nádraží
 Hloubětín
 Hradčanská
 Hůrka
 Chodov
 I. P. Pavlova
 Invalidovna
 Jinonice
 Jiřího z Poděbrad
 Kačerov
 Karlovo náměstí
 Kobylisy
 Kolbenova
 Křižíkova
 Ládví
 Letňany
 Luka
 Lužiny
 Malostranská
 Masarykovo nádraží
 Můstek
 Muzeum
 Nádraží Holešovice
 Nádraží Veleslavín
 Nádraží Vysočany
 Náměstí Míru
 Národní třída
 Nemocnice Motol
 Nové Butovice
 Opatov
 Palmovka
 Pankrác
 Petřiny
 Praha-Rajská zahrada
 Praha-Smíchov
 Pražského povstání
 Prosek
 Radlická
 Roztyly
 Skalka
 Staroměstská
 Stodůlky
 Strašnická
 Střížkov
 Vyšehrad
 Zličín
 Želivského
 */
