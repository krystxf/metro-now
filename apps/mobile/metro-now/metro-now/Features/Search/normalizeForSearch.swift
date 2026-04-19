// metro-now
// https://github.com/krystxf/metro-now

struct SearchMatchScore: Comparable {
    let candidateLength: Int
    let distance: Int
    let lengthDelta: Int
    let matchRank: Int
    let position: Int
    let sourceRank: Int

    static func < (left: SearchMatchScore, right: SearchMatchScore) -> Bool {
        if left.matchRank != right.matchRank {
            return left.matchRank < right.matchRank
        }

        if left.distance != right.distance {
            return left.distance < right.distance
        }

        if left.position != right.position {
            return left.position < right.position
        }

        if left.lengthDelta != right.lengthDelta {
            return left.lengthDelta < right.lengthDelta
        }

        if left.sourceRank != right.sourceRank {
            return left.sourceRank < right.sourceRank
        }

        return left.candidateLength < right.candidateLength
    }
}

func tokenizeForSearch(_ input: String) -> [String] {
    let normalizedCase = input.folding(
        options: [.diacriticInsensitive, .caseInsensitive],
        locale: .current
    )
    let noDots = normalizedCase.replacingOccurrences(of: ".", with: " ")

    return noDots
        .components(separatedBy: .whitespacesAndNewlines)
        .filter { !$0.isEmpty }
}

func normalizeForSearch(_ input: String) -> String {
    tokenizeForSearch(input).joined(separator: "")
}

private func maxFuzzyDistance(for queryLength: Int) -> Int {
    if queryLength <= 4 {
        return 1
    }

    if queryLength <= 8 {
        return 2
    }

    return 3
}

private func damerauLevenshteinDistance(_ left: String, _ right: String) -> Int {
    if left == right {
        return 0
    }

    let leftCharacters = Array(left)
    let rightCharacters = Array(right)

    if leftCharacters.isEmpty {
        return rightCharacters.count
    }

    if rightCharacters.isEmpty {
        return leftCharacters.count
    }

    var matrix = Array(
        repeating: Array(repeating: 0, count: rightCharacters.count + 1),
        count: leftCharacters.count + 1
    )

    for leftIndex in 0 ... leftCharacters.count {
        matrix[leftIndex][0] = leftIndex
    }

    for rightIndex in 0 ... rightCharacters.count {
        matrix[0][rightIndex] = rightIndex
    }

    for leftIndex in 1 ... leftCharacters.count {
        for rightIndex in 1 ... rightCharacters.count {
            let substitutionCost =
                leftCharacters[leftIndex - 1] == rightCharacters[rightIndex - 1] ? 0 : 1

            matrix[leftIndex][rightIndex] = min(
                matrix[leftIndex - 1][rightIndex] + 1,
                matrix[leftIndex][rightIndex - 1] + 1,
                matrix[leftIndex - 1][rightIndex - 1] + substitutionCost
            )

            if leftIndex > 1,
               rightIndex > 1,
               leftCharacters[leftIndex - 1] == rightCharacters[rightIndex - 2],
               leftCharacters[leftIndex - 2] == rightCharacters[rightIndex - 1]
            {
                matrix[leftIndex][rightIndex] = min(
                    matrix[leftIndex][rightIndex],
                    matrix[leftIndex - 2][rightIndex - 2] + 1
                )
            }
        }
    }

    return matrix[leftCharacters.count][rightCharacters.count]
}

private func searchScore(
    normalizedQuery: String,
    normalizedCandidate: String,
    sourceRank: Int
) -> SearchMatchScore? {
    guard !normalizedCandidate.isEmpty else {
        return nil
    }

    if normalizedCandidate == normalizedQuery {
        return SearchMatchScore(
            candidateLength: normalizedCandidate.count,
            distance: 0,
            lengthDelta: 0,
            matchRank: 0,
            position: 0,
            sourceRank: sourceRank
        )
    }

    if normalizedCandidate.hasPrefix(normalizedQuery) {
        return SearchMatchScore(
            candidateLength: normalizedCandidate.count,
            distance: 0,
            lengthDelta: normalizedCandidate.count - normalizedQuery.count,
            matchRank: 1,
            position: 0,
            sourceRank: sourceRank
        )
    }

    if let range = normalizedCandidate.range(of: normalizedQuery) {
        let position = normalizedCandidate.distance(
            from: normalizedCandidate.startIndex,
            to: range.lowerBound
        )

        return SearchMatchScore(
            candidateLength: normalizedCandidate.count,
            distance: 0,
            lengthDelta: normalizedCandidate.count - normalizedQuery.count,
            matchRank: 2,
            position: position,
            sourceRank: sourceRank
        )
    }

    let lengthDelta = abs(normalizedCandidate.count - normalizedQuery.count)
    let maxDistance = maxFuzzyDistance(for: normalizedQuery.count)

    guard lengthDelta <= maxDistance else {
        return nil
    }

    let distance = damerauLevenshteinDistance(normalizedCandidate, normalizedQuery)

    guard distance <= maxDistance else {
        return nil
    }

    return SearchMatchScore(
        candidateLength: normalizedCandidate.count,
        distance: distance,
        lengthDelta: lengthDelta,
        matchRank: 3,
        position: 0,
        sourceRank: sourceRank
    )
}

func searchScore(query: String, stop: ApiStop) -> SearchMatchScore? {
    let normalizedQuery = normalizeForSearch(query)

    guard !normalizedQuery.isEmpty else {
        return nil
    }

    let stopCandidates = [normalizeForSearch(stop.name)] + tokenizeForSearch(stop.name)
    let platformCandidates = stop.platforms.flatMap { platform in
        [normalizeForSearch(platform.name)] + tokenizeForSearch(platform.name)
    }

    let candidates = stopCandidates.map { candidate in
        (candidate, 0)
    } + platformCandidates.map { candidate in
        (candidate, 1)
    }

    return candidates.compactMap { candidate, sourceRank in
        searchScore(
            normalizedQuery: normalizedQuery,
            normalizedCandidate: candidate,
            sourceRank: sourceRank
        )
    }
    .min()
}
