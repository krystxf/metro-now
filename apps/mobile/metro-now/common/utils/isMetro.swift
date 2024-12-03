// metro-now
// https://github.com/krystxf/metro-now

func isMetro(_ routeName: String) -> Bool {
    ["A", "B", "C"].contains(where: { $0 == routeName })
}
