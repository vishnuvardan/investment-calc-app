# Longevity SWP Dashboard
### Interactive Retirement & Systematic Withdrawal Planner

A premium, responsive, single-page dashboard application built with **HTML5, CSS3 (variables), jQuery, and Chart.js**. This tool simulates year-by-year retirement portfolios, factoring in living expenses, side income, milestones (such as college education lump sums), compounding return rates, and inflation to calculate portfolio depletion ages and runway longevity.

---

## 📁 Project Directory Structure

```
c:\workspace\investment-calc-app/
├── index.html            # Main clean HTML structure and UI skeleton
├── README.md             # Project documentation and guide
├── css/
│   └── styles.css        # Premium Glassmorphism UI stylesheet and responsive queries
└── js/
    ├── jquery.min.js     # Vendor library: jQuery (v3.7.1)
    ├── chart.min.js      # Vendor library: Chart.js
    ├── lucide.min.js     # Vendor library: Lucide vector icons UMD bundle
    └── app.js            # Core simulation script and UI event handlers
```

---

## 🎨 Visual Design & Theme System

* **Glassmorphism UI**: Uses frosted-glass background cards (`backdrop-filter: blur(12px)`) with light borders, modern gradients, and rich shadows.
* **Dual Theme Toggle**: Instantly switchable between:
  - **Dark Mode (Default)**: Deep space obsidian/navy gradients (`#070913` to `#0d1222`) with glowing metric cards.
  - **Light Mode**: High-contrast, clean slate grey gradients (`#f8fafc` to `#e2e8f0`).
* **Responsive Layout Design**:
  - **Large Desktops (≥ 1400px)**: 2-column layout (40% Inputs, 60% Dashboard). Summary metrics render in a horizontal **4-column row**.
  - **Medium Desktops (1200px - 1399px)**: 2-column layout. Summary metrics dynamically shift to a **2x2 grid** to prevent text overlap.
  - **iPad & Tablets (577px - 1199px)**: Stacks vertically into a 1-column layout for comfortable scrolling. Summary metrics use 4 columns on iPad portrait (768px+) and 2 columns on smaller tablets.
  - **Mobile Screens (≤ 576px, e.g. 400px)**: Compact padding resets. Sliders label rows stack vertically above the input boxes to prevent squeezing. Summary metrics stack in a **single-column layout**.
* **Zero Horizontal Scrollbar Rule**: Configured with `overflow-x: hidden` resets, `min-width: 0` grid item limits, and scrollable table overflow blocks (`.table-responsive`) so the page content remains fully accessible without causing global horizontal page scrolling.

---

## 🧮 Cashflow & Lifecycle Compounding Math Model

The calculation iterates year-by-year from year $y = 1$ (Current Starting Age + 1) up to $y = 90 - \text{Current Starting Age}$ or until the corpus balance hits ₹0.

For each year index $y$:

1. **Age**:
   $$\text{Age}_y = \text{Current Starting Age} + y$$

2. **Phase Determination**:
   $$\text{Phase}_y = \begin{cases} \text{Accumulation (SIP)} & \text{if } \text{Age}_y \le \text{Retirement Age} \\ \text{Decumulation (SWP)} & \text{if } \text{Age}_y > \text{Retirement Age} \end{cases}$$

3. **Accumulation (SIP) Phase Compounding (Monthly)**:
   * SIP contribution for this year (stepped-up annually):
     $$\text{Monthly SIP Amount}_y = \text{Initial Monthly SIP} \times (1 + \text{Step-Up Rate})^{(y-1)}$$
   * Compounded monthly over 12 months using the Pre-Retirement Return rate $r = \text{Expected Return} / 12$:
     $$\text{Balance}_m = (\text{Balance}_{m-1} + \text{Monthly SIP Amount}_y) \times (1 + r)$$

4. **Decumulation (SWP) Phase Compounding (Monthly)**:
   * Living Expenses inflated annually based on the cost of living index since retirement:
     $$\text{Annual Expense Requirement}_y = \begin{cases} \text{Initial Annual Expense} \times (1 + \text{Inflation Rate})^{(\text{Age}_y - 1 - \text{Retirement Age})} & \text{if } (\text{Age}_y - \text{Retirement Age}) \le \text{Duration of Withdrawals} \\ 0 & \text{otherwise (Withdrawals Stopped)} \end{cases}$$
     $$\text{Monthly SWP Outflow}_y = \text{Annual Expense Requirement}_y / 12$$
   * Active Post-Retirement Side Income:
     $$\text{Monthly Side Income}_y = \begin{cases} \text{Retirement Side Income} & \text{if } (\text{Age}_y - \text{Retirement Age}) \le \text{Side Income Duration} \\ 0 & \text{otherwise} \end{cases}$$
   * Net monthly withdrawal outflow:
     $$\text{Net Monthly Outflow}_y = \max(0, \text{Monthly SWP Outflow}_y - \text{Monthly Side Income}_y)$$
   * Compounded monthly over 12 months using the Post-Retirement Return rate $r_{post} = \text{Post Expected Return} / 12$:
     $$\text{Balance}_m = (\text{Balance}_{m-1} - \text{Net Monthly Outflow}_y) \times (1 + r_{post})$$

5. **Milestone Outflow Integration**:
   If $\text{Age}_y == \text{Milestone Age}$, subtract the milestone lump sum from the balance at year-end:
   $$\text{Balance}_y = \max(0, \text{Balance}_{m=12} - \text{Milestone Outflow})$$

6. **Inflation-Adjusted Real Value**:
   $$\text{Real Value}_y = \frac{\text{Balance}_y}{(1 + \text{Inflation Rate})^y}$$

*Once the balance reaches 0, the portfolio is depleted. The simulation clamps all subsequent years to ₹0 and terminates the active line chart at that point.*

---

## 🎛️ Input Controls & Default Values

Every parameter is supported by a dual-interactive control: a smooth range slider and a badged text input box. The text inputs support raw numeric typing, commas, multipliers (e.g. typing `1.5 Cr`, `50 L`, or `10000000` automatically parses and synchronizes the slider), and **ArrowUp/ArrowDown key accessibility** (pressing Up or Down arrow keys when a field is focused increments or decrements the value by the slider's step size in real time).

| Parameter | Slider Bounds | Step Size | Default Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Current Age** | 20 – 75 Years | 1 Year | **35 Years** | Starting age of the lifecycle simulation |
| **Retirement Age** | Start Age + 1 to 80 | 1 Year | **55 Years** | Age when SIP accumulation stops & SWP starts |
| **Initial Lumpsum / Corpus** | ₹0 – ₹10 Cr | ₹1,00,000 | **₹1,00,00,000 (1 Cr)** | Starting portfolio balance |
| **Monthly SIP Amount** | ₹0 – ₹10 L | ₹1,000 | **₹1,00,000 (1 L)** | Regular saving contribution pre-retirement |
| **Annual Step-Up Rate** | 0% – 30% | 1% | **5%** | Percentage increase in monthly SIP yearly |
| **Expected Return** | 4.0% – 25.0% | 0.25% | **12.0%** | Accumulation compounding rate % p.a. |
| **Annual Living Expenses** | ₹2 L – ₹50 L | ₹25,000 | **₹10,00,000 (10 L)** | Target expense requirement at retirement |
| **Duration of Withdrawals** | 1 to (90 - Retire Age) | 1 Year | **35 Years** | Total years systematic withdrawals remain active |
| **Post-Retirement Return** | 4.0% – 15.0% | 0.25% | **8.5% p.a.** | Conservative return rate during retirement |
| **Annual Inflation Rate** | 0.0% – 12.0% | 0.25% | **6.0%** | Cost of living increase index % |
| **Retirement Side Income** | ₹0 – ₹5 L / mo | ₹5,000 | **₹0** | Supplementary monthly income |
| **Side Income Duration** | 0 – 25 Years | 1 Year | **5 Years** | Active years for supplementary income |
| **Milestone Outflow** | ₹0 – ₹5 Cr | ₹1,00,000 | **₹0** | One-time cash outflow (e.g. child education) |
| **Milestone Trigger Age** | Start Age + 1 to 90 | 1 Year | **45 Years** | Age when milestone outflow is spent |

---

## ⚡ Key Dashboard Features

### 🔗 Real-Time URL Parameter Share System
- Every adjustment to sliders or text fields dynamically updates the browser address bar with query variables (e.g. `?startAge=35&retirementAge=55...`) using `history.replaceState`.
- When loading a shared link, the dashboard automatically extracts the query values, validates them against bounds, adjusts the sliders, and renders the specific state instantly.

### 📈 Smart Visualization & Fast Update
- **Interactive Chart.js Graph**: Draws the net worth curve up to depletion. Shades the background canvas visually using a custom plugin (`phaseBackgroundsPlugin`) to segment the Accumulation (SIP) phase (soft blue) from the Retirement (SWP) phase (soft gold).
- **Index-Mode Tooltips**: Configured with index-mode vertical tracking (`intersect: false, mode: 'index'`) so that hover tooltips showing money values display immediately as the mouse moves horizontally across the canvas. Displays phase labels, contributions, systematic outflows, milestone triggers, and real purchasing power.
- **Safety Theming**: The line and fill gradients dynamically shift colors (Green for safe lifelong portfolio, Orange for warning, Red for depletion <60).
- **No-Lag Update**: Uses `chart.update('none')` on slider drag to avoid redraw lags and performance bottlenecks.

### 📋 Collapsible Financial Schedule
- Renders an accordion table detailing year-by-year changes (Age, Phase, Monthly SIP, Annual SWP Outflow, Returns, Ending Balance, and Real Value).
- **Depletion Point Truncation**: To keep the schedule clean, the table dynamically terminates immediately after the ending balance hits ₹0 (the exact depletion year). Subsequent years are automatically omitted.
- Rows are stylized: milestones highlighted in indigo and the exact depletion year in high-contrast red.

---

## 🚀 How to Run Locally

Since this dashboard is completely self-contained and utilizes local static resources, it does not require internet access or active server environments to run.

1. Clone or download the folder.
2. Double-click `index.html` to load the application in any modern web browser (Chrome, Edge, Firefox, Safari).
3. If you double-click `sip-calculator.html`, it will automatically redirect you to the unified Master Planner on `index.html` carrying your query parameters.

