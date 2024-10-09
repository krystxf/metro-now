export const generatePermutations = <T>(arr: T[]): T[][] => {
    if (arr.length === 0) {
        return [[]];
    }

    const [first, ...rest] = arr;
    const perms = generatePermutations(rest);

    return perms.flatMap((perm) => {
        return perm.reduce(
            (acc, _, idx) => {
                const newPerm = [...perm];
                newPerm.splice(idx, 0, first);
                acc.push(newPerm);
                return acc;
            },
            [perm.concat(first)],
        );
    });
};

export const generateCombinations = <T>(arr: T[][]): T[][] => {
    return arr.reduce(
        (acc, curr) => {
            return acc.flatMap((accItem) => {
                return curr.map((currItem) => {
                    return accItem.concat(currItem);
                });
            });
        },
        [[]] as T[][],
    );
};
