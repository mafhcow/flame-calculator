# MapleStory Eternal Flame Expected Gain Calculator

A modern, high-performance web application for calculating the **marginal expected flame score gain** and **expected cost (in flames and mesos) to gain 1 additional flame score or 1% Final Damage (FD)** using **Eternal (Rainbow) Flames** in MapleStory.

🌐 **Live Web App**: [https://mafhcow.github.io/flame-calculator/](https://mafhcow.github.io/flame-calculator/)

---

## 🎯 Motivation & Mathematical Model

Traditional flame calculators calculate the cost to reach a fixed threshold (geometric distribution quantile / stopping probability). However, during progression players want to know:

> *"Given my item's current flame score, what is the expected gain from rolling one more Eternal Flame, and what is the expected cost to gain 1 additional flame score or 1% Final Damage?"*

### Marginal Expected Gain Formula:
$$E[\text{Gain from 1 Flame}] = \sum_{\text{score} > \text{current}} P(\text{score}) \times (\text{score} - \text{current})$$

From this foundational metric:
- **Expected Flames for +1 Flame Score**: $\frac{1}{E[\text{Gain}]}$
- **Expected Meso Cost for +1 Flame Score**: $\frac{\text{Flame Price}}{E[\text{Gain}]}$
- **Expected Meso Spend for 1% Final Damage**: $\text{Meso Cost for +1 Score} \times \frac{100}{\% \text{ FD per 100 Score}}$
- **Probability of Rolling Any Better Flame**: $P(\text{score} > \text{current})$
- **Average Flames to See Any Improvement**: $\frac{1}{P(\text{score} > \text{current})}$

---

## ✨ Features

- **Exact Combinatorial Distribution Engine**: Closed-form probability engine computing the full discrete score distribution in **< 4ms** on the main thread.
- **Equipment Scope**: Armor & Accessories and Weapons across major progression tiers:
  - 140–159 (CRA, Empress)
  - 160–179 (Absolab, Sweetwater)
  - 200–229 (Arcane Umbra, Genesis)
  - 250+ (Eternal, Destiny)
- **Class Archetypes**: Standard (STR/DEX/INT/LUK), Dual Secondary (DB/Shadower/Cadena), Xenon (STR+DEX+LUK), and Demon Avenger (HP/ATT).
- **In-Game Item Reader**: Expandable tool to input raw bonus stats (+Main, +Sec, +ATT, +All Stat %, +Boss/Dmg %) and auto-compute current score.
- **Final Damage Conversion**: Configurable `% FD per 100 Flame Score` (default 0.785%, extractable via MapleScouter) to compute expected billions of mesos per 1% FD.
- **Interactive Visualizations**:
  - Score Probability Distribution area chart with cutoff and improvement region.
  - Marginal Cost Curve (+1 Score vs. Current Score) highlighting diminishing returns.
  - E[Gain] Curve.

---

## 📜 Credits & Acknowledgments

- Special thanks and credit to [MathBro's MapleStory Flaming Calculator](https://brendonmay.github.io/flameCalculator/) by Brendon May for bonus stat tier data, flame logic references, and inspiration.
- Data modeled on official GMS/KMS bonus stat tier distributions.
