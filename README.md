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

## 🧮 Cashflow & Longevity Math Model

The calculation iterates year-by-year from $t = 0$ (Current Starting Age) up to $t = 100 - \text{Current Starting Age}$ or until the portfolio balance hits ₹0.

For each year index $t$:

1. **Age**:
   $$\text{Age}_t = \text{Current Starting Age} + t$$

2. **Compounded Inflated Expenses**:
   $$\text{Expenses}_t = \text{Initial Annual Expense} \times (1 + \text{Inflation Rate})^t$$

3. **Active Side Income**:
   $$\text{Side Income}_t = \begin{cases} \text{Monthly Side Income} \times 12 & \text{if } t < \text{Income Duration} \\ 0 & \text{otherwise} \end{cases}$$

4. **Net Base Outflow**:
   $$\text{Net Base Outflow}_t = \max(0, \text{Expenses}_t - \text{Side Income}_t)$$

5. **Milestone Outflow Integration**:
   If $\text{Age}_t == \text{Milestone Age}$, add $\text{Milestone Amount}$ to the outflow:
   $$\text{Total Outflow}_t = \text{Net Base Outflow}_t + \text{Milestone Outflow}_t$$

6. **Opening Balance**:
   $$\text{Opening Balance}_t = \begin{cases} \text{Initial Corpus} & \text{if } t = 0 \\ \text{Closing Balance}_{t-1} & \text{if } t > 0 \end{cases}$$

7. **Compounding Investment Returns**:
   $$\text{Returns Earned}_t = \text{Opening Balance}_t \times \text{Expected Portfolio Return \%}$$

8. **Closing Balance**:
   $$\text{Closing Balance}_t = \max(0, \text{Opening Balance}_t + \text{Returns Earned}_t - \text{Total Outflow}_t)$$

*Once $\text{Closing Balance}_t$ reaches 0, the portfolio is depleted. The simulation clamps all subsequent years to ₹0 and terminates the active line chart at that point.*

---

## 🎛️ Input Controls & Default Values

Every parameter is supported by a dual-interactive control: a smooth range slider and a badged text input box. The text inputs support raw numeric typing, commas, and multipliers (e.g. typing `1.5 Cr`, `50 L`, or `10000000` automatically parses and synchronizes the slider).

| Parameter | Slider Bounds | Step Size | Default Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Current Starting Age** | 20 – 75 Years | 1 Year | **35 Years** | Age when simulation begins |
| **Initial Corpus** | ₹25 L – ₹10 Cr | ₹1,00,000 | **₹1,00,00,000 (1 Cr)** | Starting retirement portfolio balance |
| **Annual Expenses** | ₹2 L – ₹30 L | ₹25,000 | **₹7,55,000** | Initial living expense requirement |
| **Inflation Rate** | 3.0% – 12.0% | 0.25% | **6.0%** | Annual index cost rate |
| **Expected Return** | 4.0% – 15.0% | 0.25% | **8.5% p.a.** | Compound interest return rate |
| **Milestone Outflow** | ₹0 – ₹1.5 Cr | ₹1,00,000 | **₹50,00,000** | One-time cash outflow (e.g., college funding) |
| **Milestone Age** | Syncs to Start Age + 1 to 75 | 1 Year | **45 Years** | Age when milestone lump sum triggers |
| **Side Income** | ₹0 – ₹2 L / mo | ₹5,000 | **₹0** | Supplementary income stream |
| **Income Duration** | 0 – 25 Years | 1 Year | **5 Years** | Active years for supplementary income |

---

## ⚡ Key Dashboard Features

### 🔗 Real-Time URL Parameter Share System
- Every adjustment to sliders or text fields dynamically updates the browser address bar with query variables (e.g. `?startAge=35&initialCorpus=10000000...`) using `history.replaceState`.
- When loading a shared link, the dashboard automatically extracts the query values, validates them against bounds, adjusts the sliders, and renders the specific state instantly.

### 📈 Smart Visualization & Fast Update
- **Interactive Chart.js Graph**: Draws the curve up to the depletion age. The line and fill gradients dynamically shift colors based on safety boundaries:
  - **Green** if the corpus is sustained past age 85 (or is lifelong).
  - **Orange** if it depletes between age 70 and 84.
  - **Red** if it depletes before age 70.
- **Milestone Highlight**: Automatically marks the exact milestone trigger year with a large, double-bordered pulsing highlight dot on the curve.
- **No-Lag Update**: Uses `chart.update('none')` on slider drag to avoid redraw lags and performance bottlenecks.

### 📋 Collapsible Financial Schedule
- Renders an accordion table detailing year-by-year changes (Opening, Returns, Expenses, Side Income, Milestones, and Closing).
- Rows are stylized: milestones highlighted in indigo, the exact depletion year in high-contrast red, and subsequent depleted years faded out. All numbers are localized using `Intl.NumberFormat('en-IN')`.

---

## 🚀 How to Run Locally

Since this dashboard is completely self-contained and utilizes local static resources, it does not require internet access or active server environments to run.

1. Clone or download the folder.
2. Double-click `index.html` to load the application in any modern web browser (Chrome, Edge, Firefox, Safari).
