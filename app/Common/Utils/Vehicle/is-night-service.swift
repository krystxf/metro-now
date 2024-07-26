

func isNightService(_ name: String) -> Bool {
    let number = Int(name)
    guard let number else {
        return false
    }

    return number >= 900 || (number >= 90 && number < 100)
}
