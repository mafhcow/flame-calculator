/**
 * chartRenderer.js
 * High-performance, zero-dependency canvas charts for MapleStory Eternal Flame Calculator.
 * Renders:
 * 1. Score Probability Distribution (with cutoff line & shaded improvement area)
 * 2. Marginal Cost & Gain Efficiency Curve (Flames / Meso per +1 score vs Current Flame)
 */

(function(exports) {
    'use strict';

    function setupCanvas(canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = rect.width || 600;
        const height = rect.height || 260;

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);

        const ctx = canvas.getContext('2d');
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        return { ctx, width, height, dpr };
    }

    /**
     * Renders the Probability Distribution Chart
     */
    function renderDistributionChart(canvas, distribution, currentScore, hoverX = null) {
        if (!canvas || !distribution || distribution.size === 0) return null;
        const { ctx, width, height } = setupCanvas(canvas);

        const padding = { top: 30, right: 30, bottom: 45, left: 55 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;

        // Group into bins (e.g. 1 or 2 score step bins for smooth rendering)
        const entries = Array.from(distribution.entries()).sort((a, b) => a[0] - b[0]);
        if (entries.length === 0) return null;

        const minScore = entries[0][0];
        const maxScore = entries[entries.length - 1][0];
        const scoreRange = Math.max(1, maxScore - minScore);

        // Find max probability for Y scaling
        let maxProb = 0;
        for (let i = 0; i < entries.length; i++) {
            if (entries[i][1] > maxProb) maxProb = entries[i][1];
        }
        maxProb = maxProb * 1.15; // 15% headroom

        const getX = (score) => padding.left + ((score - minScore) / scoreRange) * plotWidth;
        const getY = (prob) => padding.top + plotHeight - (prob / maxProb) * plotHeight;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Draw horizontal grid lines
        const numYGrid = 4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= numYGrid; i++) {
            const val = (maxProb * i) / numYGrid;
            const y = getY(val);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            const label = (val * 100).toFixed(1) + '%';
            ctx.fillText(label, padding.left - 8, y);
        }

        // Draw vertical grid lines & X labels
        const numXSteps = 6;
        const stepVal = Math.round(scoreRange / numXSteps);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let i = 0; i <= numXSteps; i++) {
            const sVal = Math.round(minScore + (i * scoreRange) / numXSteps);
            const x = getX(sVal);
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + plotHeight);
            ctx.stroke();

            ctx.fillText(sVal.toString(), x, padding.top + plotHeight + 8);
        }

        // Current score cutoff X
        const currentX = Math.max(padding.left, Math.min(width - padding.right, getX(currentScore)));

        // Path for the full curve
        const points = entries.map(([score, prob]) => ({ x: getX(score), y: getY(prob), score, prob }));

        // 1. Shaded area for score <= currentScore (Muted Indigo)
        ctx.save();
        ctx.beginPath();
        ctx.rect(padding.left, padding.top, currentX - padding.left, plotHeight);
        ctx.clip();

        const gradMuted = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotHeight);
        gradMuted.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
        gradMuted.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

        ctx.beginPath();
        ctx.moveTo(points[0].x, padding.top + plotHeight);
        for (let i = 0; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineTo(points[points.length - 1].x, padding.top + plotHeight);
        ctx.closePath();
        ctx.fillStyle = gradMuted;
        ctx.fill();
        ctx.restore();

        // 2. Shaded area for score > currentScore (Glowing Emerald/Cyan Improvement Zone)
        ctx.save();
        ctx.beginPath();
        ctx.rect(currentX, padding.top, width - padding.right - currentX, plotHeight);
        ctx.clip();

        const gradImprove = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotHeight);
        gradImprove.addColorStop(0, 'rgba(16, 185, 129, 0.55)');
        gradImprove.addColorStop(1, 'rgba(6, 182, 212, 0.05)');

        ctx.beginPath();
        ctx.moveTo(points[0].x, padding.top + plotHeight);
        for (let i = 0; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineTo(points[points.length - 1].x, padding.top + plotHeight);
        ctx.closePath();
        ctx.fillStyle = gradImprove;
        ctx.fill();
        ctx.restore();

        // 3. Draw curve stroke
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            if (i === 0) ctx.moveTo(points[i].x, points[i].y);
            else ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        // Highlight curve in improvement region
        ctx.save();
        ctx.beginPath();
        ctx.rect(currentX, padding.top - 10, width - padding.right - currentX, plotHeight + 20);
        ctx.clip();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            if (i === 0) ctx.moveTo(points[i].x, points[i].y);
            else ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        ctx.restore();

        // 4. Draw Current Score Line
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(currentX, padding.top);
        ctx.lineTo(currentX, padding.top + plotHeight);
        ctx.stroke();
        ctx.restore();

        // Badge at top of current line
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Current: ${currentScore}`, currentX, padding.top - 14);

        // Hover handling
        let hoveredItem = null;
        if (hoverX !== null && hoverX >= padding.left && hoverX <= width - padding.right) {
            const hoverScore = minScore + ((hoverX - padding.left) / plotWidth) * scoreRange;
            let closest = points[0];
            let closestDist = Math.abs(points[0].score - hoverScore);
            for (let i = 1; i < points.length; i++) {
                const dist = Math.abs(points[i].score - hoverScore);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = points[i];
                }
            }
            hoveredItem = closest;

            // Draw hover indicator dot
            ctx.save();
            ctx.fillStyle = '#f43f5e';
            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(closest.x, closest.y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Hover tooltip
            const tipText1 = `Score: ${closest.score}`;
            const tipText2 = `Prob: ${(closest.prob * 100).toFixed(2)}%`;
            ctx.font = '11px "JetBrains Mono", monospace';
            const tipW = Math.max(ctx.measureText(tipText1).width, ctx.measureText(tipText2).width) + 16;
            const tipH = 38;
            let tipX = closest.x + 10;
            if (tipX + tipW > width - padding.right) tipX = closest.x - tipW - 10;
            let tipY = closest.y - 45;
            if (tipY < padding.top) tipY = closest.y + 10;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(tipX, tipY, tipW, tipH, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(tipText1, tipX + 8, tipY + 15);
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(tipText2, tipX + 8, tipY + 30);
            ctx.restore();
        }

        return {
            minScore,
            maxScore,
            padding,
            plotWidth,
            plotHeight,
            hoveredItem
        };
    }

    /**
     * Renders the Marginal Efficiency Curve:
     * Expected Flames needed to gain +1 flame score vs Current Flame Score
     */
    function renderEfficiencyCurve(canvas, curvePoints, currentScore, mode = 'flames', hoverX = null) {
        if (!canvas || !curvePoints || curvePoints.length === 0) return null;
        const { ctx, width, height } = setupCanvas(canvas);

        const padding = { top: 30, right: 35, bottom: 45, left: 65 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;

        // Filter valid points where flamesPerOneScore is finite
        // Cap upper Y to keep chart visually readable (e.g. up to 1000 flames or max finite point)
        const validPoints = curvePoints.filter(p => Number.isFinite(p.flamesPerOneScore) && p.expectedGain > 0.0001);
        if (validPoints.length < 2) return null;

        const minScore = validPoints[0].score;
        const maxScore = validPoints[validPoints.length - 1].score;
        const scoreRange = Math.max(1, maxScore - minScore);

        const isFlamesMode = mode === 'flames';

        // Choose Y value getter
        const getYVal = (p) => isFlamesMode ? p.flamesPerOneScore : p.expectedGain;

        let maxY = 0;
        for (let i = 0; i < validPoints.length; i++) {
            const v = getYVal(validPoints[i]);
            if (v > maxY) maxY = v;
        }

        // Clamp extreme outliers for display if in flames mode
        const yCeil = isFlamesMode ? Math.min(maxY, 200) : maxY * 1.1;

        const getX = (score) => padding.left + ((score - minScore) / scoreRange) * plotWidth;
        const getY = (val) => {
            const clamped = Math.min(val, yCeil);
            return padding.top + plotHeight - (clamped / yCeil) * plotHeight;
        };

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Horizontal grid
        const numYGrid = 4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= numYGrid; i++) {
            const val = (yCeil * i) / numYGrid;
            const y = getY(val);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            const label = isFlamesMode ? (val >= 10 ? Math.round(val).toString() : val.toFixed(1)) : val.toFixed(2);
            ctx.fillText(label, padding.left - 8, y);
        }

        // Vertical grid & X axis
        const numXSteps = 6;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let i = 0; i <= numXSteps; i++) {
            const sVal = Math.round(minScore + (i * scoreRange) / numXSteps);
            const x = getX(sVal);
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + plotHeight);
            ctx.stroke();

            ctx.fillText(sVal.toString(), x, padding.top + plotHeight + 8);
        }

        // Draw curve
        const points = validPoints.map(p => ({
            x: getX(p.score),
            y: getY(getYVal(p)),
            raw: p
        }));

        // Gradient under curve
        const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotHeight);
        if (isFlamesMode) {
            grad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
            grad.addColorStop(0.5, 'rgba(249, 115, 22, 0.15)');
            grad.addColorStop(1, 'rgba(234, 179, 8, 0.02)');
        } else {
            grad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
            grad.addColorStop(1, 'rgba(14, 165, 233, 0.02)');
        }

        ctx.beginPath();
        ctx.moveTo(points[0].x, padding.top + plotHeight);
        for (let i = 0; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineTo(points[points.length - 1].x, padding.top + plotHeight);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke line
        ctx.strokeStyle = isFlamesMode ? '#f97316' : '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            if (i === 0) ctx.moveTo(points[i].x, points[i].y);
            else ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        // Current score indicator
        const currentPt = validPoints.find(p => p.score >= currentScore) || validPoints[validPoints.length - 1];
        if (currentPt) {
            const curX = getX(currentPt.score);
            const curY = getY(getYVal(currentPt));

            ctx.save();
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(curX, padding.top);
            ctx.lineTo(curX, padding.top + plotHeight);
            ctx.stroke();

            // Pulsing dot
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(curX, curY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Hover handling
        let hoveredItem = null;
        if (hoverX !== null && hoverX >= padding.left && hoverX <= width - padding.right) {
            const hoverScore = minScore + ((hoverX - padding.left) / plotWidth) * scoreRange;
            let closest = points[0];
            let closestDist = Math.abs(points[0].raw.score - hoverScore);
            for (let i = 1; i < points.length; i++) {
                const dist = Math.abs(points[i].raw.score - hoverScore);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = points[i];
                }
            }
            hoveredItem = closest.raw;

            // Indicator dot
            ctx.save();
            ctx.fillStyle = '#ec4899';
            ctx.shadowColor = '#ec4899';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(closest.x, closest.y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Tooltip
            const pData = closest.raw;
            const tipText1 = `Score: ${pData.score}`;
            const tipText2 = isFlamesMode ?
                `Flames/+1: ${pData.flamesPerOneScore.toFixed(2)}` :
                `E[Gain]: ${pData.expectedGain.toFixed(3)}`;
            const tipText3 = `Improve %: ${(pData.probImprovement * 100).toFixed(2)}%`;

            ctx.font = '11px "JetBrains Mono", monospace';
            const tipW = Math.max(ctx.measureText(tipText1).width, ctx.measureText(tipText2).width, ctx.measureText(tipText3).width) + 16;
            const tipH = 52;
            let tipX = closest.x + 10;
            if (tipX + tipW > width - padding.right) tipX = closest.x - tipW - 10;
            let tipY = closest.y - 60;
            if (tipY < padding.top) tipY = closest.y + 10;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(tipX, tipY, tipW, tipH, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(tipText1, tipX + 8, tipY + 15);
            ctx.fillStyle = isFlamesMode ? '#f97316' : '#38bdf8';
            ctx.fillText(tipText2, tipX + 8, tipY + 30);
            ctx.fillStyle = '#10b981';
            ctx.fillText(tipText3, tipX + 8, tipY + 45);
            ctx.restore();
        }

        return {
            minScore,
            maxScore,
            padding,
            plotWidth,
            plotHeight,
            hoveredItem
        };
    }

    exports.chartRenderer = {
        renderDistributionChart,
        renderEfficiencyCurve
    };

})(typeof module !== 'undefined' && module.exports ? module.exports : window);
