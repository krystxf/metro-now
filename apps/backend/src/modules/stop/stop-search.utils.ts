import type { StopRecordBase } from "src/modules/stop/stop.types";

export type SearchableStopTerm = {
    normalizedTokens: string[];
    normalizedValue: string;
    sourceRank: number;
};

export type SearchableStopRow = StopRecordBase & {
    hasMetro: boolean;
    normalizedStopName: string;
    searchTerms: SearchableStopTerm[];
};

export type StopSearchMatchScore = {
    candidateLength: number;
    distance: number;
    lengthDelta: number;
    matchRank: number;
    position: number;
    sourceRank: number;
};

const DIACRITIC_REGEX = /\p{Diacritic}/gu;

export const tokenizeStopSearchValue = (value: string): string[] =>
    value
        .normalize("NFD")
        .replace(DIACRITIC_REGEX, "")
        .replaceAll(".", " ")
        .toLocaleLowerCase()
        .split(/\s+/)
        .filter((part) => part.length > 0);

export const normalizeStopSearchValue = (value: string): string =>
    tokenizeStopSearchValue(value).join("");

export const squaredGeoDistance = (
    latA: number,
    lonA: number,
    latB: number,
    lonB: number,
): number => {
    const latDiff = latA - latB;
    const lonDiff =
        (lonA - lonB) * Math.cos(((latA + latB) / 2) * (Math.PI / 180));

    return latDiff * latDiff + lonDiff * lonDiff;
};

const maxFuzzyDistanceForQuery = (queryLength: number): number => {
    if (queryLength <= 4) {
        return 1;
    }

    if (queryLength <= 8) {
        return 2;
    }

    return 3;
};

const damerauLevenshteinDistance = (left: string, right: string): number => {
    if (left === right) {
        return 0;
    }

    if (left.length === 0) {
        return right.length;
    }

    if (right.length === 0) {
        return left.length;
    }

    const matrix = Array.from({ length: left.length + 1 }, () =>
        Array.from<number>({ length: right.length + 1 }).fill(0),
    );

    for (let leftIndex = 0; leftIndex <= left.length; leftIndex += 1) {
        matrix[leftIndex][0] = leftIndex;
    }

    for (let rightIndex = 0; rightIndex <= right.length; rightIndex += 1) {
        matrix[0][rightIndex] = rightIndex;
    }

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
        for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
            const substitutionCost =
                left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

            matrix[leftIndex][rightIndex] = Math.min(
                matrix[leftIndex - 1][rightIndex] + 1,
                matrix[leftIndex][rightIndex - 1] + 1,
                matrix[leftIndex - 1][rightIndex - 1] + substitutionCost,
            );

            if (
                leftIndex > 1 &&
                rightIndex > 1 &&
                left[leftIndex - 1] === right[rightIndex - 2] &&
                left[leftIndex - 2] === right[rightIndex - 1]
            ) {
                matrix[leftIndex][rightIndex] = Math.min(
                    matrix[leftIndex][rightIndex],
                    matrix[leftIndex - 2][rightIndex - 2] + 1,
                );
            }
        }
    }

    return matrix[left.length][right.length];
};

export const compareStopSearchMatchScores = (
    left: StopSearchMatchScore,
    right: StopSearchMatchScore,
): number =>
    left.matchRank - right.matchRank ||
    left.distance - right.distance ||
    left.position - right.position ||
    left.lengthDelta - right.lengthDelta ||
    left.sourceRank - right.sourceRank ||
    left.candidateLength - right.candidateLength;

export const compareStopSearchMatchQuality = (
    left: StopSearchMatchScore,
    right: StopSearchMatchScore,
): number =>
    left.matchRank - right.matchRank ||
    left.distance - right.distance ||
    left.position - right.position ||
    left.lengthDelta - right.lengthDelta ||
    left.candidateLength - right.candidateLength;

const getStopSearchMatchScoreForValue = ({
    normalizedCandidate,
    normalizedQuery,
    sourceRank,
}: {
    normalizedCandidate: string;
    normalizedQuery: string;
    sourceRank: number;
}): StopSearchMatchScore | null => {
    if (normalizedCandidate.length === 0) {
        return null;
    }

    if (normalizedCandidate === normalizedQuery) {
        return {
            candidateLength: normalizedCandidate.length,
            distance: 0,
            lengthDelta: 0,
            matchRank: 0,
            position: 0,
            sourceRank,
        };
    }

    if (normalizedCandidate.startsWith(normalizedQuery)) {
        return {
            candidateLength: normalizedCandidate.length,
            distance: 0,
            lengthDelta: normalizedCandidate.length - normalizedQuery.length,
            matchRank: 1,
            position: 0,
            sourceRank,
        };
    }

    const substringPosition = normalizedCandidate.indexOf(normalizedQuery);

    if (substringPosition >= 0) {
        return {
            candidateLength: normalizedCandidate.length,
            distance: 0,
            lengthDelta: normalizedCandidate.length - normalizedQuery.length,
            matchRank: 2,
            position: substringPosition,
            sourceRank,
        };
    }

    const maxDistance = maxFuzzyDistanceForQuery(normalizedQuery.length);
    const lengthDelta = Math.abs(
        normalizedCandidate.length - normalizedQuery.length,
    );

    if (lengthDelta > maxDistance) {
        return null;
    }

    const distance = damerauLevenshteinDistance(
        normalizedCandidate,
        normalizedQuery,
    );

    if (distance > maxDistance) {
        return null;
    }

    return {
        candidateLength: normalizedCandidate.length,
        distance,
        lengthDelta,
        matchRank: 3,
        position: 0,
        sourceRank,
    };
};

export const getStopSearchMatchScore = ({
    normalizedQuery,
    searchableStop,
}: {
    normalizedQuery: string;
    searchableStop: SearchableStopRow;
}): StopSearchMatchScore | null => {
    let bestScore: StopSearchMatchScore | null = null;

    for (const term of searchableStop.searchTerms) {
        const candidateValues = [
            term.normalizedValue,
            ...term.normalizedTokens,
        ];

        for (const candidateValue of candidateValues) {
            const score = getStopSearchMatchScoreForValue({
                normalizedCandidate: candidateValue,
                normalizedQuery,
                sourceRank: term.sourceRank,
            });

            if (!score) {
                continue;
            }

            if (
                bestScore === null ||
                compareStopSearchMatchScores(score, bestScore) < 0
            ) {
                bestScore = score;
            }
        }
    }

    return bestScore;
};

export const createSearchableStopTerm = ({
    sourceRank,
    value,
}: {
    sourceRank: number;
    value: string;
}): SearchableStopTerm => ({
    normalizedTokens: tokenizeStopSearchValue(value),
    normalizedValue: normalizeStopSearchValue(value),
    sourceRank,
});
