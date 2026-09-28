const formatWeight = (weightInGrams) => {

    const grams = Number(weightInGrams || 0);

    if (grams >= 1000) {
        return {
            weight: Number((grams / 1000).toFixed(2)),
            unit: "kg"
        };
    }

    return {
        weight: grams,
        unit: "g"
    };
};

module.exports = formatWeight;