/**
 * flameEngine.js
 * MapleStory Eternal (Rainbow) Flame Probability & Expected Gain Engine
 * Computes exact discrete probability distribution P(flame_score)
 * and marginal expected gain E[gain from 1 flame] = sum_{s > current} P(s) * (s - current)
 */

(function(exports) {
    'use strict';

    // Tier probabilities for Eternal (Rainbow) Flames
    // Flame Advantaged: Tiers 4 to 7
    // Non-Advantaged: Tiers 2 to 5
    const ETERNAL_TIERS_ADV = [
        { tier: 4, prob: 0.29 },
        { tier: 5, prob: 0.45 },
        { tier: 6, prob: 0.25 },
        { tier: 7, prob: 0.01 }
    ];

    const ETERNAL_TIERS_NON_ADV = [
        { tier: 2, prob: 0.29 },
        { tier: 3, prob: 0.45 },
        { tier: 4, prob: 0.25 },
        { tier: 5, prob: 0.01 }
    ];

    // Non-advantaged line count distribution
    const NON_ADV_LINE_PROBS = {
        1: 0.40,
        2: 0.40,
        3: 0.15,
        4: 0.05
    };

    // Stat per tier table for armor/accessories
    const STAT_PER_TIER = {
        '120-139': { single: 7, double: 4, hp: 390 },
        '140-159': { single: 8, double: 4, hp: 450 },
        '160-179': { single: 9, double: 5, hp: 510 },
        '180-199': { single: 10, double: 5, hp: 570 },
        '200-229': { single: 11, double: 6, hp: 640 },
        '230-249': { single: 12, double: 6, hp: 680 },
        '250+':    { single: 13, double: 7, hp: 700 }
    };

    // Weapon attack percentage of base attack per tier (from StrategyWiki / KMS standard)
    // Flame Advantaged weapons: Tiers 3 to 7 (rounded up)
    const WEAPON_ATT_ADV = {
        '0-39':    { 3: 0.03, 4: 0.044, 5: 0.0605, 6: 0.07986, 7: 0.102487 },
        '40-79':   { 3: 0.06, 4: 0.088, 5: 0.121,  6: 0.15972, 7: 0.204974 },
        '80-119':  { 3: 0.09, 4: 0.132, 5: 0.1815, 6: 0.23958, 7: 0.307461 },
        '120-159': { 3: 0.12, 4: 0.176, 5: 0.242,  6: 0.31944, 7: 0.409948 },
        '160-199': { 3: 0.15, 4: 0.22,  5: 0.3025, 6: 0.3993,  7: 0.512435 },
        '200-249': { 3: 0.18, 4: 0.264, 5: 0.363,  6: 0.47916, 7: 0.614922 },
        '250+':    { 3: 0.21, 4: 0.308, 5: 0.4235, 6: 0.55902, 7: 0.717409 }
    };

    // Non-advantaged weapons: Tiers 1 to 5 (rounded up)
    const WEAPON_ATT_NON_ADV = {
        '0-39':    { 1: 0.01, 2: 0.022, 3: 0.0363, 4: 0.05324, 5: 0.073205 },
        '40-79':   { 1: 0.02, 2: 0.044, 3: 0.0726, 4: 0.10648, 5: 0.14641 },
        '80-119':  { 1: 0.03, 2: 0.066, 3: 0.1089, 4: 0.15972, 5: 0.219615 },
        '120-159': { 1: 0.04, 2: 0.088, 3: 0.1452, 4: 0.21296, 5: 0.29282 },
        '160-199': { 1: 0.05, 2: 0.11,  3: 0.1815, 4: 0.2662,  5: 0.366025 },
        '200-249': { 1: 0.06, 2: 0.132, 3: 0.2178, 4: 0.31944, 5: 0.43923 },
        '250+':    { 1: 0.07, 2: 0.154, 3: 0.2541, 4: 0.37268, 5: 0.512435 }
    };

    function combinations(n, k) {
        if (k < 0 || k > n) return 0;
        if (k === 0 || k === n) return 1;
        let res = 1;
        for (let i = 1; i <= k; i++) {
            res = (res * (n - i + 1)) / i;
        }
        return res;
    }

    function chooseSubsets(arr, k) {
        if (k === 0) return [[]];
        if (arr.length === 0) return [];
        const head = arr[0];
        const tail = arr.slice(1);
        const withHead = chooseSubsets(tail, k - 1).map(c => [head, ...c]);
        const withoutHead = chooseSubsets(tail, k);
        return [...withHead, ...withoutHead];
    }

    /**
     * Builds the useful bonus stat lines and their flame score value per tier
     */
    function getUsefulLines(config) {
        const {
            itemType,          // 'armor' or 'weapon'
            levelBracket,      // '120-139', '140-159', '160-179', '180-199', '200-229', '230-249', '250+'
            classType,         // 'standard', 'dual_sec', 'xenon', 'demon_avenger'
            statWeights,       // { att: 3, allStat: 10, secStat: 0.1, secStat2: 0.1, bossDmg: 15, hpStat: 1/70 }
            baseAttack,        // number (for weapons)
            flameAdvantaged    // boolean
        } = config;

        const statTierData = STAT_PER_TIER[levelBracket] || STAT_PER_TIER['160-179'];
        const singleStatVal = statTierData.single;
        const comboStatVal = statTierData.double;
        const hpStatVal = statTierData.hp;

        const attWeight = Number(statWeights.att) || 3;
        const allStatWeight = Number(statWeights.allStat) || 10;
        const secRatio = Number(statWeights.secStat) || 0.1;
        const secRatio2 = Number(statWeights.secStat2) || 0.1;
        const bossDmgWeight = Number(statWeights.bossDmg) || 15;
        const hpStatWeight = Number(statWeights.hpStat) || (1 / 70); // For DA or Kanna

        const lines = [];

        if (classType === 'demon_avenger') {
            // Demon Avenger cares primarily about HP and ATT
            lines.push({ name: 'Max HP', scorePerTier: hpStatVal * hpStatWeight, isAttWeapon: false });

            if (itemType === 'armor') {
                lines.push({ name: 'Attack', scorePerTier: 1 * attWeight, isAttWeapon: false });
            } else {
                lines.push({ name: 'Weapon Attack', scorePerTier: null, isAttWeapon: true });
                lines.push({ name: 'Boss Damage %', scorePerTier: 2 * bossDmgWeight, isAttWeapon: false });
                lines.push({ name: 'Damage %', scorePerTier: 1 * bossDmgWeight, isAttWeapon: false });
            }
            return lines;
        }

        if (classType === 'xenon') {
            // Xenon uses STR, DEX, LUK equally
            lines.push({ name: 'STR', scorePerTier: singleStatVal * 1, isAttWeapon: false });
            lines.push({ name: 'DEX', scorePerTier: singleStatVal * 1, isAttWeapon: false });
            lines.push({ name: 'LUK', scorePerTier: singleStatVal * 1, isAttWeapon: false });

            lines.push({ name: 'STR+DEX', scorePerTier: comboStatVal * 2, isAttWeapon: false });
            lines.push({ name: 'STR+LUK', scorePerTier: comboStatVal * 2, isAttWeapon: false });
            lines.push({ name: 'DEX+LUK', scorePerTier: comboStatVal * 2, isAttWeapon: false });
            lines.push({ name: 'STR+INT', scorePerTier: comboStatVal * 1, isAttWeapon: false });
            lines.push({ name: 'DEX+INT', scorePerTier: comboStatVal * 1, isAttWeapon: false });
            lines.push({ name: 'LUK+INT', scorePerTier: comboStatVal * 1, isAttWeapon: false });

            if (itemType === 'armor') {
                lines.push({ name: 'Attack', scorePerTier: 1 * attWeight, isAttWeapon: false });
            } else {
                lines.push({ name: 'Weapon Attack', scorePerTier: null, isAttWeapon: true });
                lines.push({ name: 'Boss Damage %', scorePerTier: 2 * bossDmgWeight, isAttWeapon: false });
                lines.push({ name: 'Damage %', scorePerTier: 1 * bossDmgWeight, isAttWeapon: false });
            }
            lines.push({ name: 'All Stat %', scorePerTier: 1 * allStatWeight, isAttWeapon: false });
            return lines;
        }

        if (classType === 'dual_sec') {
            // Dual secondary stat classes (Dual Blade, Shadower, Cadena)
            lines.push({ name: 'LUK (Main)', scorePerTier: singleStatVal * 1, isAttWeapon: false });
            lines.push({ name: 'DEX (Sec 1)', scorePerTier: singleStatVal * secRatio, isAttWeapon: false });
            lines.push({ name: 'STR (Sec 2)', scorePerTier: singleStatVal * secRatio2, isAttWeapon: false });

            lines.push({ name: 'LUK+DEX', scorePerTier: comboStatVal * (1 + secRatio), isAttWeapon: false });
            lines.push({ name: 'LUK+STR', scorePerTier: comboStatVal * (1 + secRatio2), isAttWeapon: false });
            lines.push({ name: 'DEX+STR', scorePerTier: comboStatVal * (secRatio + secRatio2), isAttWeapon: false });
            lines.push({ name: 'LUK+INT', scorePerTier: comboStatVal * 1, isAttWeapon: false });
            lines.push({ name: 'DEX+INT', scorePerTier: comboStatVal * secRatio, isAttWeapon: false });
            lines.push({ name: 'STR+INT', scorePerTier: comboStatVal * secRatio2, isAttWeapon: false });

            if (itemType === 'armor') {
                lines.push({ name: 'Attack', scorePerTier: 1 * attWeight, isAttWeapon: false });
            } else {
                lines.push({ name: 'Weapon Attack', scorePerTier: null, isAttWeapon: true });
                lines.push({ name: 'Boss Damage %', scorePerTier: 2 * bossDmgWeight, isAttWeapon: false });
                lines.push({ name: 'Damage %', scorePerTier: 1 * bossDmgWeight, isAttWeapon: false });
            }
            lines.push({ name: 'All Stat %', scorePerTier: 1 * allStatWeight, isAttWeapon: false });
            return lines;
        }

        // Standard Class (1 Main Stat, 1 Secondary Stat)
        lines.push({ name: 'Main Stat', scorePerTier: singleStatVal * 1, isAttWeapon: false });
        lines.push({ name: 'Secondary Stat', scorePerTier: singleStatVal * secRatio, isAttWeapon: false });

        lines.push({ name: 'Main+Sec', scorePerTier: comboStatVal * (1 + secRatio), isAttWeapon: false });
        lines.push({ name: 'Main+Other1', scorePerTier: comboStatVal * 1, isAttWeapon: false });
        lines.push({ name: 'Main+Other2', scorePerTier: comboStatVal * 1, isAttWeapon: false });
        lines.push({ name: 'Sec+Other1', scorePerTier: comboStatVal * secRatio, isAttWeapon: false });
        lines.push({ name: 'Sec+Other2', scorePerTier: comboStatVal * secRatio, isAttWeapon: false });

        if (itemType === 'armor') {
            lines.push({ name: 'Attack', scorePerTier: 1 * attWeight, isAttWeapon: false });
        } else {
            lines.push({ name: 'Weapon Attack', scorePerTier: null, isAttWeapon: true });
            lines.push({ name: 'Boss Damage %', scorePerTier: 2 * bossDmgWeight, isAttWeapon: false });
            lines.push({ name: 'Damage %', scorePerTier: 1 * bossDmgWeight, isAttWeapon: false });
        }
        lines.push({ name: 'All Stat %', scorePerTier: 1 * allStatWeight, isAttWeapon: false });

        return lines;
    }

    /**
     * Resolves level bracket identifier to weapon attack table key
     */
    function getBracketKey(levelBracket) {
        if (!levelBracket) return '160-199';
        const str = String(levelBracket);
        if (str === '0-39' || str.startsWith('0-')) return '0-39';
        if (str === '40-79' || str.startsWith('40-')) return '40-79';
        if (str === '80-119' || str.startsWith('80-')) return '80-119';
        if (str === '120-159' || str === '120-139' || str === '140-159' || str.startsWith('120-') || str.startsWith('140-')) return '120-159';
        if (str === '160-199' || str === '160-179' || str === '180-199' || str.startsWith('160-') || str.startsWith('180-')) return '160-199';
        if (str === '250+' || str.startsWith('250')) return '250+';
        if (str === '200+' || str === '200-229' || str === '230-249' || str.startsWith('200') || str.startsWith('230')) return '200-249';
        return '160-199';
    }

    /**
     * Helper to compute weapon raw attack increase per tier (rounded up per StrategyWiki)
     */
    function getWeaponAttack(tier, levelBracket, baseAttack, flameAdvantaged = true) {
        const bracketKey = getBracketKey(levelBracket);
        const table = flameAdvantaged ? WEAPON_ATT_ADV[bracketKey] : WEAPON_ATT_NON_ADV[bracketKey];
        const pct = (table && table[tier]) || 0;
        return Math.ceil(baseAttack * pct);
    }

    /**
     * Helper to compute weapon attack flame score per tier
     */
    function getWeaponAttackScore(tier, levelBracket, baseAttack, flameAdvantaged, attWeight) {
        const rawAtt = getWeaponAttack(tier, levelBracket, baseAttack, flameAdvantaged);
        return rawAtt * attWeight;
    }

    /**
     * Computes the exact probability distribution of flame score.
     * Returns a Map of { roundedScore -> probability }
     */
    function computeScoreDistribution(config) {
        const {
            itemType = 'armor',
            flameAdvantaged = true,
            baseAttack = 350,
            statWeights = {}
        } = config;

        const attWeight = Number(statWeights.att) || 3;
        const totalPool = itemType === 'weapon' ? 21 : 19;
        const usefulLines = getUsefulLines(config);
        const U = usefulLines.length;
        const J = totalPool - U; // Number of junk lines

        const tierList = flameAdvantaged ? ETERNAL_TIERS_ADV : ETERNAL_TIERS_NON_ADV;

        // Map: roundedScore -> prob
        const distribution = new Map();

        function addScore(score, prob) {
            if (prob <= 0) return;
            const rounded = Math.round(score * 10) / 10;
            distribution.set(rounded, (distribution.get(rounded) || 0) + prob);
        }

        // Precompute score per tier for each useful line
        const linesWithScores = usefulLines.map(line => {
            const scoresByTier = {};
            for (const t of tierList) {
                if (line.isAttWeapon) {
                    scoresByTier[t.tier] = getWeaponAttackScore(t.tier, config.levelBracket, baseAttack, flameAdvantaged, attWeight);
                } else {
                    scoresByTier[t.tier] = line.scorePerTier * t.tier;
                }
            }
            return {
                name: line.name,
                scoresByTier
            };
        });

        // Determine total lines rolled:
        const totalLinesDist = flameAdvantaged ?
            [{ lines: 4, prob: 1.0 }] :
            [
                { lines: 1, prob: NON_ADV_LINE_PROBS[1] },
                { lines: 2, prob: NON_ADV_LINE_PROBS[2] },
                { lines: 3, prob: NON_ADV_LINE_PROBS[3] },
                { lines: 4, prob: NON_ADV_LINE_PROBS[4] }
            ];

        for (const lineConfig of totalLinesDist) {
            const totalLines = lineConfig.lines;
            const lineProb = lineConfig.prob;
            const totalCombos = combinations(totalPool, totalLines);

            const maxK = Math.min(U, totalLines);

            for (let k = 0; k <= maxK; k++) {
                const junkLinesNeeded = totalLines - k;
                if (junkLinesNeeded > J) continue;

                const junkCombos = combinations(J, junkLinesNeeded);
                if (junkCombos === 0 && junkLinesNeeded > 0) continue;

                const subsetCombProb = (junkCombos / totalCombos) * lineProb;
                if (subsetCombProb <= 0) continue;

                if (k === 0) {
                    addScore(0, subsetCombProb);
                    continue;
                }

                const usefulSubsets = chooseSubsets(linesWithScores, k);

                for (let s = 0; s < usefulSubsets.length; s++) {
                    const subset = usefulSubsets[s];

                    function recurseTiers(idx, currentScore, currentProb) {
                        if (idx === k) {
                            addScore(currentScore, currentProb * subsetCombProb);
                            return;
                        }
                        const line = subset[idx];
                        for (let t = 0; t < tierList.length; t++) {
                            const tierObj = tierList[t];
                            const addedScore = line.scoresByTier[tierObj.tier];
                            recurseTiers(idx + 1, currentScore + addedScore, currentProb * tierObj.prob);
                        }
                    }

                    recurseTiers(0, 0, 1.0);
                }
            }
        }

        return distribution;
    }

    /**
     * Calculates user metrics:
     * - E[gain from 1 flame] = sum_{s > current} P(s) * (s - current)
     * - Expected flames for +1 score = 1 / E[gain]
     * - Expected meso cost for +1 score = flamePrice / E[gain]
     * - P(score > current)
     * - Expected flames for any improvement = 1 / P(better)
     * - Expected gain conditional on improvement = E[gain] / P(better)
     */
    function calculateMetrics(distribution, currentFlameScore, flamePrice) {
        const current = Number(currentFlameScore) || 0;
        const price = Number(flamePrice) || 0;

        let expectedGain = 0;
        let probBetter = 0;
        let maxScore = 0;
        let minScore = Infinity;
        let overallMean = 0;

        for (const [score, prob] of distribution.entries()) {
            overallMean += score * prob;
            if (score > maxScore) maxScore = score;
            if (score < minScore) minScore = score;

            if (score > current) {
                const gain = score - current;
                expectedGain += prob * gain;
                probBetter += prob;
            }
        }

        const flamesPerPoint = expectedGain > 0 ? (1 / expectedGain) : Infinity;
        const mesoPerPoint = expectedGain > 0 ? (price / expectedGain) : Infinity;
        const flamesToImprove = probBetter > 0 ? (1 / probBetter) : Infinity;
        const mesoToImprove = probBetter > 0 ? (price / probBetter) : Infinity;
        const condExpectedGain = probBetter > 0 ? (expectedGain / probBetter) : 0;

        return {
            currentFlameScore: current,
            flamePrice: price,
            expectedGainPerFlame: expectedGain,
            flamesPerOneScore: flamesPerPoint,
            mesoPerOneScore: mesoPerPoint,
            probImprovement: probBetter,
            flamesToImprove: flamesToImprove,
            mesoToImprove: mesoToImprove,
            condExpectedGain: condExpectedGain,
            maxScore: maxScore,
            minScore: minScore === Infinity ? 0 : minScore,
            overallMeanScore: overallMean
        };
    }

    /**
     * Generates a curve of E[gain] and Flames per +1 score across a range of current scores
     */
    function generateEfficiencyCurve(distribution, flamePrice, maxScore, step = 1) {
        const points = [];
        const max = Math.ceil(maxScore);

        for (let s = 0; s <= max; s += step) {
            const m = calculateMetrics(distribution, s, flamePrice);
            points.push({
                score: s,
                expectedGain: m.expectedGainPerFlame,
                flamesPerOneScore: m.flamesPerOneScore,
                mesoPerOneScore: m.mesoPerOneScore,
                probImprovement: m.probImprovement,
                flamesToImprove: m.flamesToImprove
            });
        }
        return points;
    }

    /**
     * Computes percentiles of the distribution
     */
    function computePercentiles(distribution) {
        const sorted = Array.from(distribution.entries()).sort((a, b) => a[0] - b[0]);
        const percentiles = [
            { label: '50th Percentile (Median)', p: 0.50 },
            { label: '75th Percentile', p: 0.75 },
            { label: '85th Percentile', p: 0.85 },
            { label: '90th Percentile', p: 0.90 },
            { label: '95th Percentile (Standard Target)', p: 0.95 },
            { label: '99th Percentile (Min-Maxed)', p: 0.99 },
            { label: '99.9th Percentile (God Flame)', p: 0.999 }
        ];

        let cumulative = 0;
        let pIdx = 0;
        const results = [];

        for (let i = 0; i < sorted.length && pIdx < percentiles.length; i++) {
            const [score, prob] = sorted[i];
            cumulative += prob;

            while (pIdx < percentiles.length && cumulative >= percentiles[pIdx].p) {
                results.push({
                    label: percentiles[pIdx].label,
                    percentile: percentiles[pIdx].p,
                    score: score
                });
                pIdx++;
            }
        }
        return results;
    }

    /**
     * Finds the target flame score that satisfies a target efficiency (in Billions / 1% FD).
     * Solves for the maximum score s* where marginal spend / 1% FD <= targetBillionsPerFd.
     */
    function findTargetScoreForEfficiency(distribution, targetBillionsPerFd, flamePrice, fdPer100, step = 0.5) {
        const targetB = Number(targetBillionsPerFd) || 10;
        const price = Number(flamePrice) || 3000000;
        const fdRate = Number(fdPer100) || 0.785;
        const scoreForOneFd = fdRate > 0 ? (100 / fdRate) : Infinity;

        let maxScore = 0;
        for (const s of distribution.keys()) {
            if (s > maxScore) maxScore = s;
        }

        const getBillions = (s) => {
            const m = calculateMetrics(distribution, s, price);
            if (!Number.isFinite(m.mesoPerOneScore) || m.mesoPerOneScore <= 0) return Infinity;
            return (m.mesoPerOneScore * scoreForOneFd) / 1e9;
        };

        if (getBillions(0) > targetB) {
            const m0 = calculateMetrics(distribution, 0, price);
            return {
                targetScore: 0,
                achievedBillions: getBillions(0),
                metrics: m0,
                probAtLeastTarget: 1.0,
                flamesToHitTarget: 1.0,
                maxScore
            };
        }

        let best = 0;
        let l = 0;
        let r = Math.floor(maxScore / step);

        while (l <= r) {
            const mid = Math.floor((l + r) / 2);
            const score = mid * step;
            const b = getBillions(score);
            if (b <= targetB) {
                best = score;
                l = mid + 1;
            } else {
                r = mid - 1;
            }
        }

        const metricsAtTarget = calculateMetrics(distribution, best, price);
        const achievedBillions = getBillions(best);

        // Cumulative probability of rolling >= best from a clean flame
        let probAtLeast = 0;
        for (const [score, prob] of distribution.entries()) {
            if (score >= best) probAtLeast += prob;
        }

        const flamesToHitTarget = probAtLeast > 0 ? (1 / probAtLeast) : Infinity;

        return {
            targetScore: best,
            achievedBillions: Number.isFinite(achievedBillions) ? achievedBillions : 0,
            metrics: metricsAtTarget,
            probAtLeastTarget: probAtLeast,
            flamesToHitTarget,
            maxScore
        };
    }

    /**
     * Generates a descriptive in-game stat roll equivalent for a target score.
     * - For armor/accessory: exact X + 6% all stat required to achieve the target flame score
     * - For weapon: T7 ATT (+raw) + X% Boss where X makes the flame score match the target
     */
    function getStatBreakdownRecommendation(config, targetScore) {
        const { itemType = 'armor', levelBracket = '160-179', baseAttack = 353, statWeights = {} } = config;
        const attWeight = Number(statWeights.att) || 3.0;
        const allStatWeight = Number(statWeights.allStat) || 10.0;
        const bossWeight = Number(statWeights.bossDmg) || 15.0;

        if (itemType === 'weapon') {
            const bracketKey = getBracketKey(levelBracket);
            const t7Pct = (WEAPON_ATT_ADV[bracketKey] && WEAPON_ATT_ADV[bracketKey][7]) || 0.614922;
            const t7Att = Math.ceil(baseAttack * t7Pct);
            const t7AttScore = t7Att * attWeight;
            const xBoss = (targetScore - t7AttScore) / bossWeight;
            const xBossRounded = Math.round(xBoss * 10) / 10;
            const xBossDisplay = (xBossRounded % 1 === 0) ? xBossRounded.toFixed(0) : xBossRounded.toFixed(1);
            return `T7 ATT (+${t7Att}) + ${xBossDisplay}% Boss`;
        }

        // Armor / Accessory: exact X + 6% all stat
        const allStatContribution = 6 * allStatWeight;
        const xStat = targetScore - allStatContribution;
        const xStatRounded = Math.round(xStat * 10) / 10;
        const xStatDisplay = (xStatRounded % 1 === 0) ? xStatRounded.toFixed(0) : xStatRounded.toFixed(1);
        return `${xStatDisplay} stat + 6% all stat`;
    }

    // Expose API
    exports.flameEngine = {
        STAT_PER_TIER,
        WEAPON_ATT_ADV,
        WEAPON_ATT_NON_ADV,
        ETERNAL_TIERS_ADV,
        ETERNAL_TIERS_NON_ADV,
        getWeaponAttack,
        getWeaponAttackScore,
        computeScoreDistribution,
        calculateMetrics,
        generateEfficiencyCurve,
        computePercentiles,
        findTargetScoreForEfficiency,
        getStatBreakdownRecommendation
    };

})(typeof module !== 'undefined' && module.exports ? module.exports : window);

