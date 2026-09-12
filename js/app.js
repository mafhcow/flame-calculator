/**
 * app.js
 * MapleStory Eternal Flame Expected Gain Calculator
 * Handles UI events, application state, recalculations, and visual chart updates.
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // State
    const state = {
        itemType: 'armor',
        levelBracket: '140-159',
        flameAdvantaged: true,
        baseAttack: 326,
        classType: 'standard',
        statWeights: {
            att: 2.44,
            allStat: 12.21,
            secStat: 0.08,
            secStat2: 0.08,
            bossDmg: 10.12,
            hpStat: 0.014
        },
        currentFlameScore: 95,
        flamePrice: 3000000,
        fdPer100: 0.785,
        activeChartTab: 'dist', // 'dist', 'cost', 'gain'
        currentDistribution: null,
        currentMaxScore: 180,
        efficiencyCurve: [],
        hoverCanvasX: null,

        // Target Efficiency (Inverse Mode) State
        calculatorMode: 'eval', // 'eval' or 'target'
        targetEfficiencyB: 10.0,
        wep200BaseAttack: 326,
        wep250BaseAttack: 358,
        targetZeroWeapon: false
    };

    // DOM Elements
    const elements = {
        // Mode Controls
        tabModeEval: document.getElementById('tabModeEval'),
        tabModeTarget: document.getElementById('tabModeTarget'),
        cardTargetEfficiencyInputs: document.getElementById('cardTargetEfficiencyInputs'),
        inputTargetSpend: document.getElementById('inputTargetSpend'),
        targetSpendPresets: document.getElementById('targetSpendPresets'),
        inputTargetWep200Att: document.getElementById('inputTargetWep200Att'),
        inputTargetWep250Att: document.getElementById('inputTargetWep250Att'),
        lblTargetWep200: document.getElementById('lblTargetWep200'),
        lblTargetWep250: document.getElementById('lblTargetWep250'),
        checkTargetZeroWeapon: document.getElementById('checkTargetZeroWeapon'),

        // Sidebar card wrappers & titles
        evalEquipControls: document.getElementById('evalEquipControls'),
        cardEquipClass: document.getElementById('cardEquipClass'),
        titleEquipCard: document.getElementById('titleEquipCard'),
        cardCurrentRollMarket: document.getElementById('cardCurrentRollMarket'),
        titleCurrentRollCard: document.getElementById('titleCurrentRollCard'),
        evalScoreRollControls: document.getElementById('evalScoreRollControls'),

        // Evaluator inputs
        selectItemType: document.getElementById('selectItemType'),
        selectLevelBracket: document.getElementById('selectLevelBracket'),
        checkFlameAdvantaged: document.getElementById('checkFlameAdvantaged'),
        groupBaseAttack: document.getElementById('groupBaseAttack'),
        inputBaseAttack: document.getElementById('inputBaseAttack'),
        selectClassType: document.getElementById('selectClassType'),

        // Weights
        inputWeightAtt: document.getElementById('inputWeightAtt'),
        inputWeightAllStat: document.getElementById('inputWeightAllStat'),
        inputWeightSecStat: document.getElementById('inputWeightSecStat'),
        inputWeightBossDmg: document.getElementById('inputWeightBossDmg'),
        inputWeightHp: document.getElementById('inputWeightHp'),
        groupAllStatWeight: document.getElementById('groupAllStatWeight'),
        groupSecStatWeight: document.getElementById('groupSecStatWeight'),
        groupBossDmgWeight: document.getElementById('groupBossDmgWeight'),
        groupHpWeight: document.getElementById('groupHpWeight'),

        // Current Score & Conversion
        sliderCurrentScore: document.getElementById('sliderCurrentScore'),
        inputCurrentScore: document.getElementById('inputCurrentScore'),
        labelMaxScore: document.getElementById('labelMaxScore'),
        inputFlamePrice: document.getElementById('inputFlamePrice'),
        inputFdPer100: document.getElementById('inputFdPer100'),

        // Stat Builder
        btnToggleStatBuilder: document.getElementById('btnToggleStatBuilder'),
        panelStatBuilder: document.getElementById('panelStatBuilder'),
        btnApplyStatBuilder: document.getElementById('btnApplyStatBuilder'),
        builderMainStat: document.getElementById('builderMainStat'),
        builderSecStat: document.getElementById('builderSecStat'),
        builderAtt: document.getElementById('builderAtt'),
        builderAllStat: document.getElementById('builderAllStat'),
        builderBossDmg: document.getElementById('builderBossDmg'),
        builderDmg: document.getElementById('builderDmg'),
        builderGroupSec: document.getElementById('builderGroupSec'),
        builderGroupAll: document.getElementById('builderGroupAll'),
        builderGroupBoss: document.getElementById('builderGroupBoss'),
        builderGroupDmg: document.getElementById('builderGroupDmg'),

        // Metric Display Cards
        valExpectedGain: document.getElementById('valExpectedGain'),
        valFlamesPerScore: document.getElementById('valFlamesPerScore'),
        valMesoPerScore: document.getElementById('valMesoPerScore'),
        valMesoPerFd: document.getElementById('valMesoPerFd'),
        valProbImprovement: document.getElementById('valProbImprovement'),
        valFlamesToImprove: document.getElementById('valFlamesToImprove'),
        valCondGain: document.getElementById('valCondGain'),

        // Charts
        mainChartCanvas: document.getElementById('mainChartCanvas'),
        chartTitle: document.getElementById('chartTitle'),
        tabBtnDist: document.getElementById('tabBtnDist'),
        tabBtnCost: document.getElementById('tabBtnCost'),
        tabBtnGain: document.getElementById('tabBtnGain'),
        chartLegend: document.getElementById('chartLegend'),
        legendImprovementItem: document.getElementById('legendImprovementItem'),
        legendMutedItem: document.getElementById('legendMutedItem'),

        // Preset Chips
        presetChipsContainer: document.getElementById('presetChipsContainer'),
        btnPresetAbso: document.getElementById('btnPresetAbso'),
        btnPresetArcaneArmor: document.getElementById('btnPresetArcaneArmor'),
        btnPresetEternal: document.getElementById('btnPresetEternal'),
        btnPresetGenWep: document.getElementById('btnPresetGenWep'),
        btnPresetDestinyWep: document.getElementById('btnPresetDestinyWep'),

        // Target Efficiency View elements
        viewSingleEvaluation: document.getElementById('viewSingleEvaluation'),
        viewTargetEfficiency: document.getElementById('viewTargetEfficiency'),
        targetHeroBDisplay: document.getElementById('targetHeroBDisplay'),
        targetHeroValBox: document.getElementById('targetHeroValBox'),
        targetCardsContainer: document.getElementById('targetCardsContainer')
    };

    // Equipment Presets
    const PRESETS = {
        cra_armor: {
            itemType: 'armor',
            levelBracket: '140-159',
            flameAdvantaged: true,
            currentScore: 90
        },
        absolab_armor: {
            itemType: 'armor',
            levelBracket: '160-179',
            flameAdvantaged: true,
            currentScore: 100
        },
        arcane_armor: {
            itemType: 'armor',
            levelBracket: '200-229',
            flameAdvantaged: true,
            currentScore: 120
        },
        eternal_armor: {
            itemType: 'armor',
            levelBracket: '250+',
            flameAdvantaged: true,
            currentScore: 140
        },
        genesis_weapon: {
            itemType: 'weapon',
            levelBracket: '200-229',
            flameAdvantaged: true,
            baseAttack: 326,
            currentScore: 320
        },
        destiny_weapon: {
            itemType: 'weapon',
            levelBracket: '250+',
            flameAdvantaged: true,
            baseAttack: 358,
            currentScore: 350
        }
    };

    // Formatters
    function formatMeso(num) {
        if (!Number.isFinite(num) || num <= 0) return 'N/A';
        if (num >= 1e9) {
            return (num / 1e9).toFixed(2) + 'B';
        }
        if (num >= 1e6) {
            return (num / 1e6).toFixed(1) + 'M';
        }
        if (num >= 1e3) {
            return (num / 1e3).toFixed(0) + 'K';
        }
        return Math.round(num).toLocaleString();
    }

    function formatFlames(num) {
        if (!Number.isFinite(num) || num <= 0) return 'N/A';
        if (num >= 100) return Math.round(num).toLocaleString();
        if (num >= 10) return num.toFixed(1);
        return num.toFixed(2);
    }

    function formatBillions(num) {
        if (!Number.isFinite(num) || num <= 0) return 'N/A';
        if (num >= 1000) return Math.round(num).toLocaleString() + 'B';
        if (num >= 100) return num.toFixed(1) + 'B';
        return num.toFixed(2) + 'B';
    }

    // 5 Standard Target Equipment Configurations
    const TARGET_CONFIGS = [
        {
            id: 'armor_160',
            name: 'Level 160 Armor / Accessory',
            subName: 'Absolab / Sweetwater',
            badge: 'Lvl 160 Armor',
            isWeapon: false,
            itemType: 'armor',
            levelBracket: '160-179',
            flameAdvantaged: true,
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
        },
        {
            id: 'armor_200',
            name: 'Level 200 Armor / Accessory',
            subName: 'Arcane Umbra',
            badge: 'Lvl 200 Armor',
            isWeapon: false,
            itemType: 'armor',
            levelBracket: '200-229',
            flameAdvantaged: true,
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
        },
        {
            id: 'armor_250',
            name: 'Level 250 Armor / Accessory',
            subName: 'Eternal',
            badge: 'Lvl 250 Armor',
            isWeapon: false,
            itemType: 'armor',
            levelBracket: '250+',
            flameAdvantaged: true,
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
        },
        {
            id: 'weapon_200',
            name: 'Genesis Weapon (200)',
            subName: 'Genesis Weapon',
            badge: 'Lvl 200 Genesis',
            isWeapon: true,
            itemType: 'weapon',
            levelBracket: '200-229',
            flameAdvantaged: true,
            getBaseAttack: () => state.wep200BaseAttack,
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>'
        },
        {
            id: 'weapon_250',
            name: 'Destiny Weapon (250)',
            subName: 'Destiny Weapon',
            badge: 'Lvl 250 Destiny',
            isWeapon: true,
            itemType: 'weapon',
            levelBracket: '250+',
            flameAdvantaged: true,
            getBaseAttack: () => state.wep250BaseAttack,
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>'
        }
    ];

    // Mode Switcher Handler
    function setCalculatorMode(mode) {
        state.calculatorMode = mode;

        if (mode === 'eval') {
            elements.tabModeEval.classList.add('active');
            elements.tabModeEval.setAttribute('aria-selected', 'true');
            elements.tabModeTarget.classList.remove('active');
            elements.tabModeTarget.setAttribute('aria-selected', 'false');

            if (elements.cardTargetEfficiencyInputs) elements.cardTargetEfficiencyInputs.style.display = 'none';
            if (elements.evalEquipControls) elements.evalEquipControls.style.display = 'block';
            if (elements.evalScoreRollControls) elements.evalScoreRollControls.style.display = 'block';

            if (elements.titleEquipCard) {
                elements.titleEquipCard.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    Equipment &amp; Class
                `;
            }
            if (elements.titleCurrentRollCard) {
                elements.titleCurrentRollCard.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
                    Current Flame Roll
                `;
            }
            if (elements.btnToggleStatBuilder) elements.btnToggleStatBuilder.style.display = 'inline-flex';

            elements.viewSingleEvaluation.style.display = 'block';
            elements.viewTargetEfficiency.style.display = 'none';

            recalculate();
        } else if (mode === 'target') {
            elements.tabModeTarget.classList.add('active');
            elements.tabModeTarget.setAttribute('aria-selected', 'true');
            elements.tabModeEval.classList.remove('active');
            elements.tabModeEval.setAttribute('aria-selected', 'false');

            if (elements.cardTargetEfficiencyInputs) elements.cardTargetEfficiencyInputs.style.display = 'block';
            if (elements.evalEquipControls) elements.evalEquipControls.style.display = 'none';
            if (elements.evalScoreRollControls) elements.evalScoreRollControls.style.display = 'none';

            if (elements.titleEquipCard) {
                elements.titleEquipCard.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    Class &amp; Equivalences
                `;
            }
            if (elements.titleCurrentRollCard) {
                elements.titleCurrentRollCard.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8"/><path d="M12 6v12"/></svg>
                    Market &amp; Damage Scaling
                `;
            }
            if (elements.btnToggleStatBuilder) elements.btnToggleStatBuilder.style.display = 'none';
            if (elements.panelStatBuilder) elements.panelStatBuilder.style.display = 'none';

            elements.viewSingleEvaluation.style.display = 'none';
            elements.viewTargetEfficiency.style.display = 'block';

            renderTargetEfficiencyResults();
        }
    }

    // Render Target Efficiency Results for the 5 configs
    function renderTargetEfficiencyResults() {
        const targetB = parseFloat(elements.inputTargetSpend.value);
        state.targetEfficiencyB = (!isNaN(targetB) && targetB > 0) ? targetB : 10.0;

        const flamePriceMillions = parseFloat(elements.inputFlamePrice.value);
        state.flamePrice = (isNaN(flamePriceMillions) ? 3 : Math.max(0, flamePriceMillions)) * 1000000;

        const fdVal = parseFloat(elements.inputFdPer100.value);
        state.fdPer100 = (!isNaN(fdVal) && fdVal > 0) ? fdVal : 0.785;

        state.wep200BaseAttack = Number(elements.inputTargetWep200Att.value) || 326;
        state.wep250BaseAttack = Number(elements.inputTargetWep250Att.value) || 358;
        state.targetZeroWeapon = elements.checkTargetZeroWeapon ? elements.checkTargetZeroWeapon.checked : false;
        state.classType = elements.selectClassType.value;

        state.statWeights.att = Number(elements.inputWeightAtt.value) || 2.44;
        state.statWeights.allStat = Number(elements.inputWeightAllStat.value) || 12.21;
        state.statWeights.secStat = Number(elements.inputWeightSecStat.value) || 0.08;
        state.statWeights.secStat2 = Number(elements.inputWeightSecStat.value) || 0.08;
        state.statWeights.bossDmg = Number(elements.inputWeightBossDmg.value) || 10.12;
        state.statWeights.hpStat = Number(elements.inputWeightHp.value) || 0.014;

        // Update hero banner
        if (elements.targetHeroBDisplay) {
            elements.targetHeroBDisplay.textContent = `${state.targetEfficiencyB.toFixed(1)}B`;
        }
        if (elements.targetHeroValBox) {
            elements.targetHeroValBox.innerHTML = `${state.targetEfficiencyB.toFixed(1)}B <small style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">/ 1% FD</small>`;
        }

        let cardsHtml = '';

        for (const item of TARGET_CONFIGS) {
            const isWeapon = item.isWeapon;
            const isAdv = isWeapon ? !state.targetZeroWeapon : item.flameAdvantaged;
            const baseAtt = isWeapon ? item.getBaseAttack() : 0;
            const cfg = {
                itemType: item.itemType,
                levelBracket: item.levelBracket,
                flameAdvantaged: isAdv,
                baseAttack: baseAtt,
                classType: state.classType,
                statWeights: state.statWeights
            };

            const dist = flameEngine.computeScoreDistribution(cfg);
            const solved = flameEngine.findTargetScoreForEfficiency(
                dist,
                state.targetEfficiencyB,
                state.flamePrice,
                state.fdPer100,
                0.5
            );
            const breakdown = flameEngine.getStatBreakdownRecommendation(cfg, solved.targetScore);

            const scoreDisplay = solved.targetScore % 1 === 0 ? solved.targetScore.toFixed(0) : solved.targetScore.toFixed(1);
            const flamesDisplay = formatFlames(solved.metrics.flamesPerOneScore);
            const mesoDisplay = formatMeso(solved.metrics.mesoPerOneScore);
            const oddsDisplay = Number.isFinite(solved.flamesToHitTarget) && solved.flamesToHitTarget > 0
                ? `1 in ${Math.round(solved.flamesToHitTarget).toLocaleString()}`
                : 'N/A';
            const pctDisplay = (solved.probAtLeastTarget * 100).toFixed(2) + '%';
            const gainDisplay = solved.metrics.expectedGainPerFlame > 0
                ? `+${solved.metrics.expectedGainPerFlame.toFixed(2)}`
                : '0.00';
            const spendDisplay = formatBillions(solved.achievedBillions);

            const displayName = isWeapon && state.targetZeroWeapon
                ? (item.id === 'weapon_200' ? 'Zero Genesis (200)' : 'Zero Destiny (250)')
                : item.name;
            const displaySub = isWeapon && state.targetZeroWeapon
                ? `Zero (Non-Adv) &bull; ${baseAtt} Base ATT`
                : `${item.subName}${isWeapon ? ` &bull; ${baseAtt} Base ATT` : ''}`;
            const displayBadge = isWeapon && state.targetZeroWeapon
                ? (item.id === 'weapon_200' ? 'Lvl 200 Zero' : 'Lvl 250 Zero')
                : item.badge;

            // Card HTML
            cardsHtml += `
                <div class="target-card ${item.isWeapon ? 'highlight-weapon' : ''}">
                    <div class="target-card-header">
                        <div>
                            <h3 class="target-card-title">${displayName}</h3>
                            <span style="font-size: 0.78rem; color: var(--text-muted);">${displaySub}</span>
                        </div>
                        <span class="target-card-badge">${displayBadge}</span>
                    </div>

                    <div class="target-card-score-box">
                        <div class="target-score-num">${scoreDisplay}</div>
                        <div class="target-score-label">Target Flame Score</div>
                        <div class="target-spend-pill">Achieved: ${spendDisplay} / 1% FD</div>
                    </div>

                    <div class="target-metrics-grid">
                        <div class="target-metric-item">
                            <span class="target-metric-name">Flames / +1 Score</span>
                            <span class="target-metric-val">${flamesDisplay}</span>
                        </div>
                        <div class="target-metric-item">
                            <span class="target-metric-name">Mesos / +1 Score</span>
                            <span class="target-metric-val">${mesoDisplay}</span>
                        </div>
                        <div class="target-metric-item">
                            <span class="target-metric-name">Odds (&ge; Target)</span>
                            <span class="target-metric-val">${oddsDisplay}</span>
                        </div>
                        <div class="target-metric-item">
                            <span class="target-metric-name">Roll Probability</span>
                            <span class="target-metric-val">${pctDisplay}</span>
                        </div>
                    </div>

                    <div class="target-breakdown-box">
                        <strong>Roll Equivalent:</strong> ${breakdown}
                    </div>

                    <div class="target-card-actions">
                        <button type="button" class="btn btn-secondary btn-sm btn-inspect-target" data-config-id="${item.id}" data-score="${solved.targetScore}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            Inspect in Calculator &rarr;
                        </button>
                    </div>
                </div>
            `;
        }

        if (elements.targetCardsContainer) {
            elements.targetCardsContainer.innerHTML = cardsHtml;
        }
    }

    // Inspect Target Score in Single Item Calculator
    function inspectTargetInCalculator(configId, targetScore) {
        const cfgItem = TARGET_CONFIGS.find(c => c.id === configId);
        if (!cfgItem) return;

        setCalculatorMode('eval');

        elements.selectItemType.value = cfgItem.itemType;
        elements.selectLevelBracket.value = cfgItem.levelBracket;

        if (cfgItem.isWeapon) {
            elements.inputBaseAttack.value = cfgItem.getBaseAttack();
            elements.checkFlameAdvantaged.checked = !state.targetZeroWeapon;
        } else {
            elements.checkFlameAdvantaged.checked = true;
        }

        document.querySelectorAll('.preset-chips .chip').forEach(c => c.classList.remove('active'));
        if (configId === 'armor_160') elements.btnPresetAbso?.classList.add('active');
        else if (configId === 'armor_200') elements.btnPresetArcaneArmor?.classList.add('active');
        else if (configId === 'armor_250') elements.btnPresetEternal?.classList.add('active');
        else if (configId === 'weapon_200') elements.btnPresetGenWep?.classList.add('active');
        else if (configId === 'weapon_250') elements.btnPresetDestinyWep?.classList.add('active');

        state.currentFlameScore = Number(targetScore);
        elements.sliderCurrentScore.value = state.currentFlameScore;
        elements.inputCurrentScore.value = state.currentFlameScore;

        updateFieldVisibilities();
        recalculate();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // UI Updates according to Item & Class Type
    function updateFieldVisibilities() {
        // Read directly from DOM elements so visibility updates immediately
        state.itemType = elements.selectItemType.value;
        state.classType = elements.selectClassType.value;

        const isWeapon = state.itemType === 'weapon';
        const isDA = state.classType === 'demon_avenger';
        const isXenon = state.classType === 'xenon';

        // Weapon controls
        elements.groupBaseAttack.style.display = isWeapon ? 'block' : 'none';
        elements.groupBossDmgWeight.style.display = isWeapon ? 'flex' : 'none';
        elements.builderGroupBoss.style.display = isWeapon ? 'flex' : 'none';
        elements.builderGroupDmg.style.display = isWeapon ? 'flex' : 'none';

        // DA & Xenon specific
        elements.groupHpWeight.style.display = isDA ? 'flex' : 'none';
        elements.groupAllStatWeight.style.display = isDA ? 'none' : 'flex';
        elements.groupSecStatWeight.style.display = (isDA || isXenon) ? 'none' : 'flex';

        elements.builderGroupSec.style.display = (isDA || isXenon) ? 'none' : 'flex';
        elements.builderGroupAll.style.display = isDA ? 'none' : 'flex';
    }

    // Main Recalculation
    function recalculate() {
        // Ensure field visibilities and state match current DOM inputs
        updateFieldVisibilities();

        state.levelBracket = elements.selectLevelBracket.value;
        state.flameAdvantaged = elements.checkFlameAdvantaged.checked;
        state.baseAttack = Number(elements.inputBaseAttack.value) || 326;
        state.classType = elements.selectClassType.value;

        state.statWeights.att = Number(elements.inputWeightAtt.value) || 2.44;
        state.statWeights.allStat = Number(elements.inputWeightAllStat.value) || 12.21;
        state.statWeights.secStat = Number(elements.inputWeightSecStat.value) || 0.08;
        state.statWeights.secStat2 = Number(elements.inputWeightSecStat.value) || 0.08;
        state.statWeights.bossDmg = Number(elements.inputWeightBossDmg.value) || 10.12;
        state.statWeights.hpStat = Number(elements.inputWeightHp.value) || 0.014;

        const flamePriceMillions = parseFloat(elements.inputFlamePrice.value);
        state.flamePrice = (isNaN(flamePriceMillions) ? 3 : Math.max(0, flamePriceMillions)) * 1000000;

        const fdVal = parseFloat(elements.inputFdPer100.value);
        state.fdPer100 = (!isNaN(fdVal) && fdVal > 0) ? fdVal : 0.785;
        state.currentFlameScore = Number(elements.inputCurrentScore.value) || 0;

        // Run flame probability distribution
        const distribution = flameEngine.computeScoreDistribution({
            itemType: state.itemType,
            levelBracket: state.levelBracket,
            flameAdvantaged: state.flameAdvantaged,
            baseAttack: state.baseAttack,
            classType: state.classType,
            statWeights: state.statWeights
        });

        state.currentDistribution = distribution;

        // Calculate primary user metrics
        const metrics = flameEngine.calculateMetrics(distribution, state.currentFlameScore, state.flamePrice);
        state.currentMaxScore = Math.ceil(metrics.maxScore);

        // Update slider min/max
        elements.sliderCurrentScore.max = state.currentMaxScore;
        elements.inputCurrentScore.max = state.currentMaxScore;
        elements.labelMaxScore.textContent = `Max: ${state.currentMaxScore}`;

        // Ensure slider sync
        if (state.currentFlameScore > state.currentMaxScore) {
            state.currentFlameScore = state.currentMaxScore;
            elements.sliderCurrentScore.value = state.currentFlameScore;
            elements.inputCurrentScore.value = state.currentFlameScore;
        }

        // Render Metric Cards
        elements.valExpectedGain.textContent = metrics.expectedGainPerFlame > 0 ?
            `+${metrics.expectedGainPerFlame.toFixed(2)}` : '0.00';
        elements.valFlamesPerScore.textContent = formatFlames(metrics.flamesPerOneScore);
        elements.valMesoPerScore.textContent = formatMeso(metrics.mesoPerOneScore);

        // Calculate Expected Spend to Gain 1% Final Damage
        const scoreForOneFd = state.fdPer100 > 0 ? (100 / state.fdPer100) : Infinity;
        const mesoForOneFd = Number.isFinite(metrics.mesoPerOneScore) && metrics.mesoPerOneScore > 0 ?
            (metrics.mesoPerOneScore * scoreForOneFd) : Infinity;
        const billionsForOneFd = Number.isFinite(mesoForOneFd) ? (mesoForOneFd / 1e9) : Infinity;

        elements.valMesoPerFd.textContent = formatBillions(billionsForOneFd);

        elements.valProbImprovement.textContent = `${(metrics.probImprovement * 100).toFixed(2)}%`;
        elements.valFlamesToImprove.textContent = formatFlames(metrics.flamesToImprove);
        elements.valCondGain.textContent = metrics.condExpectedGain > 0 ?
            `+${metrics.condExpectedGain.toFixed(1)} pts` : '0 pts';

        // Generate efficiency curve for charts
        state.efficiencyCurve = flameEngine.generateEfficiencyCurve(
            distribution,
            state.flamePrice,
            state.currentMaxScore,
            state.itemType === 'weapon' ? 2 : 1
        );

        // Render Active Chart
        renderActiveChart();
    }

    // Active Chart Rendering
    function renderActiveChart() {
        if (!state.currentDistribution) return;

        if (state.activeChartTab === 'dist') {
            elements.chartTitle.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                Score Probability Distribution
            `;
            if (elements.legendImprovementItem) elements.legendImprovementItem.style.display = 'flex';
            if (elements.legendMutedItem) elements.legendMutedItem.style.display = 'flex';

            chartRenderer.renderDistributionChart(
                elements.mainChartCanvas,
                state.currentDistribution,
                state.currentFlameScore,
                state.hoverCanvasX
            );
        } else if (state.activeChartTab === 'cost') {
            elements.chartTitle.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Flames Required for +1 Flame Score vs Current Score
            `;
            if (elements.legendImprovementItem) elements.legendImprovementItem.style.display = 'none';
            if (elements.legendMutedItem) elements.legendMutedItem.style.display = 'none';

            chartRenderer.renderEfficiencyCurve(
                elements.mainChartCanvas,
                state.efficiencyCurve,
                state.currentFlameScore,
                'flames',
                state.hoverCanvasX
            );
        } else if (state.activeChartTab === 'gain') {
            elements.chartTitle.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                Expected Score Gain from 1 Flame vs Current Score
            `;
            if (elements.legendImprovementItem) elements.legendImprovementItem.style.display = 'none';
            if (elements.legendMutedItem) elements.legendMutedItem.style.display = 'none';

            chartRenderer.renderEfficiencyCurve(
                elements.mainChartCanvas,
                state.efficiencyCurve,
                state.currentFlameScore,
                'gain',
                state.hoverCanvasX
            );
        }
    }

    // Apply Item Stat Builder
    function applyStatBuilder() {
        const isDA = state.classType === 'demon_avenger';
        const isWeapon = state.itemType === 'weapon';

        const mainStat = Number(elements.builderMainStat.value) || 0;
        const secStat = Number(elements.builderSecStat.value) || 0;
        const att = Number(elements.builderAtt.value) || 0;
        const allStat = Number(elements.builderAllStat.value) || 0;
        const bossDmg = Number(elements.builderBossDmg.value) || 0;
        const dmg = Number(elements.builderDmg.value) || 0;

        let computedScore = 0;

        if (isDA) {
            computedScore = (mainStat * state.statWeights.hpStat) + (att * state.statWeights.att);
            if (isWeapon) computedScore += (bossDmg + dmg) * state.statWeights.bossDmg;
        } else {
            computedScore = mainStat + (secStat * state.statWeights.secStat) + (att * state.statWeights.att) + (allStat * state.statWeights.allStat);
            if (isWeapon) computedScore += (bossDmg + dmg) * state.statWeights.bossDmg;
        }

        computedScore = Math.round(computedScore * 10) / 10;

        state.currentFlameScore = computedScore;
        elements.sliderCurrentScore.value = computedScore;
        elements.inputCurrentScore.value = computedScore;

        recalculate();

        elements.sliderCurrentScore.value = state.currentFlameScore;
        elements.inputCurrentScore.value = state.currentFlameScore;
    }

    // Handles inputs shared across both modes (weights, price, % FD, class)
    function handleGeneralConfigChange() {
        if (state.calculatorMode === 'target') {
            renderTargetEfficiencyResults();
        } else {
            recalculate();
        }
    }

    // Mode Switcher Events
    if (elements.tabModeEval) {
        elements.tabModeEval.addEventListener('click', () => setCalculatorMode('eval'));
    }
    if (elements.tabModeTarget) {
        elements.tabModeTarget.addEventListener('click', () => setCalculatorMode('target'));
    }

    // Target Spend Presets
    if (elements.targetSpendPresets) {
        elements.targetSpendPresets.addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            const targetVal = chip.getAttribute('data-target');
            if (targetVal) {
                elements.inputTargetSpend.value = targetVal;
                elements.targetSpendPresets.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                renderTargetEfficiencyResults();
            }
        });
    }

    // Target Spend Input
    if (elements.inputTargetSpend) {
        elements.inputTargetSpend.addEventListener('input', () => {
            const val = parseFloat(elements.inputTargetSpend.value);
            if (elements.targetSpendPresets) {
                elements.targetSpendPresets.querySelectorAll('.chip').forEach(c => {
                    c.classList.toggle('active', parseFloat(c.getAttribute('data-target')) === val);
                });
            }
            renderTargetEfficiencyResults();
        });
        elements.inputTargetSpend.addEventListener('wheel', (e) => e.target.blur(), { passive: true });
    }

    // Target Weapon Base Attacks
    if (elements.inputTargetWep200Att) {
        elements.inputTargetWep200Att.addEventListener('input', renderTargetEfficiencyResults);
    }
    if (elements.inputTargetWep250Att) {
        elements.inputTargetWep250Att.addEventListener('input', renderTargetEfficiencyResults);
    }

    // Zero Weapon Toggle
    if (elements.checkTargetZeroWeapon) {
        elements.checkTargetZeroWeapon.addEventListener('change', () => {
            state.targetZeroWeapon = elements.checkTargetZeroWeapon.checked;
            if (state.targetZeroWeapon) {
                if (elements.lblTargetWep200) elements.lblTargetWep200.textContent = 'Zero Genesis (342)';
                if (elements.inputTargetWep200Att && (elements.inputTargetWep200Att.value === '326' || !elements.inputTargetWep200Att.value)) {
                    elements.inputTargetWep200Att.value = '342';
                }
                if (elements.lblTargetWep250) elements.lblTargetWep250.textContent = 'Zero Destiny (375)';
                if (elements.inputTargetWep250Att && (elements.inputTargetWep250Att.value === '358' || !elements.inputTargetWep250Att.value)) {
                    elements.inputTargetWep250Att.value = '375';
                }
            } else {
                if (elements.lblTargetWep200) elements.lblTargetWep200.textContent = 'Genesis Wep (200)';
                if (elements.inputTargetWep200Att && elements.inputTargetWep200Att.value === '342') {
                    elements.inputTargetWep200Att.value = '326';
                }
                if (elements.lblTargetWep250) elements.lblTargetWep250.textContent = 'Destiny Wep (250)';
                if (elements.inputTargetWep250Att && elements.inputTargetWep250Att.value === '375') {
                    elements.inputTargetWep250Att.value = '358';
                }
            }
            renderTargetEfficiencyResults();
        });
    }

    // Event Bindings for Evaluator
    elements.selectItemType.addEventListener('change', () => {
        updateFieldVisibilities();
        recalculate();
    });

    elements.selectLevelBracket.addEventListener('change', recalculate);
    elements.checkFlameAdvantaged.addEventListener('change', recalculate);
    elements.inputBaseAttack.addEventListener('input', recalculate);

    elements.selectClassType.addEventListener('change', () => {
        updateFieldVisibilities();
        handleGeneralConfigChange();
    });

    // Weight inputs
    [elements.inputWeightAtt, elements.inputWeightAllStat, elements.inputWeightSecStat, elements.inputWeightBossDmg, elements.inputWeightHp].forEach(input => {
        if (input) input.addEventListener('input', handleGeneralConfigChange);
    });

    elements.inputFlamePrice.addEventListener('input', handleGeneralConfigChange);
    elements.inputFdPer100.addEventListener('input', handleGeneralConfigChange);

    // Prevent mouse wheel from inadvertently stepping purely typed numbers
    [elements.inputFlamePrice, elements.inputFdPer100].forEach(input => {
        if (input) {
            input.addEventListener('wheel', (e) => e.target.blur(), { passive: true });
        }
    });

    // Current Score Slider & Input (Bidirectional)
    elements.sliderCurrentScore.addEventListener('input', (e) => {
        state.currentFlameScore = Number(e.target.value);
        elements.inputCurrentScore.value = state.currentFlameScore;
        recalculate();
    });

    elements.inputCurrentScore.addEventListener('input', (e) => {
        state.currentFlameScore = Number(e.target.value);
        elements.sliderCurrentScore.value = state.currentFlameScore;
        recalculate();
    });

    // Preset Chips
    elements.presetChipsContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        const presetKey = chip.getAttribute('data-preset');
        const preset = PRESETS[presetKey];
        if (!preset) return;

        // Active state
        document.querySelectorAll('.preset-chips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        // Apply preset
        elements.selectItemType.value = preset.itemType;
        elements.selectLevelBracket.value = preset.levelBracket;
        elements.checkFlameAdvantaged.checked = preset.flameAdvantaged;
        if (preset.baseAttack) elements.inputBaseAttack.value = preset.baseAttack;

        updateFieldVisibilities();

        state.currentFlameScore = preset.currentScore;
        elements.sliderCurrentScore.value = preset.currentScore;
        elements.inputCurrentScore.value = preset.currentScore;

        recalculate();
    });

    // Stat Builder Toggle
    elements.btnToggleStatBuilder.addEventListener('click', () => {
        const isHidden = elements.panelStatBuilder.style.display === 'none';
        elements.panelStatBuilder.style.display = isHidden ? 'block' : 'none';
        elements.btnToggleStatBuilder.classList.toggle('btn-primary', isHidden);
        elements.btnToggleStatBuilder.classList.toggle('btn-secondary', !isHidden);
    });

    // Item Stat Builder auto-updates on direct user edits
    const builderInputs = [
        elements.builderMainStat,
        elements.builderSecStat,
        elements.builderAtt,
        elements.builderAllStat,
        elements.builderBossDmg,
        elements.builderDmg
    ];
    builderInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', applyStatBuilder);
            input.addEventListener('change', applyStatBuilder);
        }
    });

    if (elements.btnApplyStatBuilder) {
        elements.btnApplyStatBuilder.addEventListener('click', applyStatBuilder);
    }

    // Click Delegation for "Inspect in Calculator" buttons
    document.addEventListener('click', (e) => {
        const inspectBtn = e.target.closest('.btn-inspect-target');
        if (!inspectBtn) return;
        const configId = inspectBtn.getAttribute('data-config-id');
        const score = inspectBtn.getAttribute('data-score');
        if (configId) {
            inspectTargetInCalculator(configId, score);
        }
    });

    // Chart Tabs
    elements.tabBtnDist.addEventListener('click', () => {
        state.activeChartTab = 'dist';
        elements.tabBtnDist.classList.add('active');
        elements.tabBtnCost.classList.remove('active');
        elements.tabBtnGain.classList.remove('active');
        renderActiveChart();
    });

    elements.tabBtnCost.addEventListener('click', () => {
        state.activeChartTab = 'cost';
        elements.tabBtnCost.classList.add('active');
        elements.tabBtnDist.classList.remove('active');
        elements.tabBtnGain.classList.remove('active');
        renderActiveChart();
    });

    elements.tabBtnGain.addEventListener('click', () => {
        state.activeChartTab = 'gain';
        elements.tabBtnGain.classList.add('active');
        elements.tabBtnDist.classList.remove('active');
        elements.tabBtnCost.classList.remove('active');
        renderActiveChart();
    });

    // Canvas Mouse Hover Tracking
    elements.mainChartCanvas.addEventListener('mousemove', (e) => {
        const rect = elements.mainChartCanvas.getBoundingClientRect();
        state.hoverCanvasX = e.clientX - rect.left;
        renderActiveChart();
    });

    elements.mainChartCanvas.addEventListener('mouseleave', () => {
        state.hoverCanvasX = null;
        renderActiveChart();
    });

    // Responsive window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(renderActiveChart, 100);
    });

    // Initial load
    updateFieldVisibilities();
    recalculate();
});
