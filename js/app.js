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
        baseAttack: 353,
        classType: 'standard',
        statWeights: {
            att: 3.0,
            allStat: 10.0,
            secStat: 0.10,
            secStat2: 0.10,
            bossDmg: 15.0,
            hpStat: 0.014
        },
        currentFlameScore: 95,
        flamePrice: 3000000,
        fdPer100: 0.785,
        activeChartTab: 'dist', // 'dist', 'cost', 'gain'
        currentDistribution: null,
        currentMaxScore: 180,
        efficiencyCurve: [],
        hoverCanvasX: null
    };

    // DOM Elements
    const elements = {
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
        presetChipsContainer: document.getElementById('presetChipsContainer')
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
        arcane_weapon: {
            itemType: 'weapon',
            levelBracket: '200-229',
            flameAdvantaged: true,
            baseAttack: 353,
            currentScore: 320
        },
        genesis_weapon: {
            itemType: 'weapon',
            levelBracket: '200-229',
            flameAdvantaged: true,
            baseAttack: 375,
            currentScore: 350
        },
        destiny_weapon: {
            itemType: 'weapon',
            levelBracket: '250+',
            flameAdvantaged: true,
            baseAttack: 373,
            currentScore: 380
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
        if (num > 9999) return '>9,999';
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
        state.baseAttack = Number(elements.inputBaseAttack.value) || 350;
        state.classType = elements.selectClassType.value;

        state.statWeights.att = Number(elements.inputWeightAtt.value) || 3.0;
        state.statWeights.allStat = Number(elements.inputWeightAllStat.value) || 10.0;
        state.statWeights.secStat = Number(elements.inputWeightSecStat.value) || 0.10;
        state.statWeights.secStat2 = Number(elements.inputWeightSecStat.value) || 0.10;
        state.statWeights.bossDmg = Number(elements.inputWeightBossDmg.value) || 15.0;
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

    // Event Bindings
    elements.selectItemType.addEventListener('change', () => {
        updateFieldVisibilities();
        recalculate();
    });

    elements.selectLevelBracket.addEventListener('change', recalculate);
    elements.checkFlameAdvantaged.addEventListener('change', recalculate);
    elements.inputBaseAttack.addEventListener('input', recalculate);
    elements.selectClassType.addEventListener('change', () => {
        updateFieldVisibilities();
        recalculate();
    });

    // Weight inputs
    [elements.inputWeightAtt, elements.inputWeightAllStat, elements.inputWeightSecStat, elements.inputWeightBossDmg, elements.inputWeightHp].forEach(input => {
        input.addEventListener('input', recalculate);
    });

    elements.inputFlamePrice.addEventListener('input', recalculate);
    elements.inputFdPer100.addEventListener('input', recalculate);

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
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
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
