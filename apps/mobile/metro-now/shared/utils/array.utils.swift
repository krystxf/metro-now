// metro-now
// https://github.com/krystxf/metro-now

func uniqueBy<T, E: Hashable>(array: [T], by keySelector: (T) -> E) -> [T] {
    var seen = Set<E>()
    return array.filter { element in
        let key = keySelector(element)
        return seen.insert(key).inserted
    }
}
