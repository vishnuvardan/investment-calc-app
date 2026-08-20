// System Formatter Functions
function formatINR(val, short = false) {
  val = Math.round(val);
  if (short) {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
    } else if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')} L`;
    } else if (val >= 1000) {
      return `₹${(val / 1000).toFixed(0)} K`;
    }
    return `₹${val}`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
}

function parseINRInput(str) {
  if (typeof str !== 'string') return parseFloat(str) || 0;
  
  // Clean string of currency symbols, spaces, and commas
  let clean = str.replace(/[₹\s,]/gi, '').toLowerCase();
  
  // Check multipliers
  let multiplier = 1;
  if (clean.includes('cr') || clean.includes('crore')) {
    multiplier = 10000000;
    clean = clean.replace(/cr(ore)?(s)?/gi, '');
  } else if (clean.includes('l') || clean.includes('lakh')) {
    multiplier = 100000;
    clean = clean.replace(/l(akh)?(s)?/gi, '');
  } else if (clean.includes('k') || clean.includes('thousand')) {
    multiplier = 1000;
    clean = clean.replace(/k|thousand/gi, '');
  }
  
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return num * multiplier;
}

$(document).ready(function() {
  // Initialize Lucide Icons
  lucide.createIcons();

  // Chart instance holder
  let showdownChart = null;

  // Global variables to store yearly simulation details for tooltip access
  let yearlyDataRecord = [];

  // Theme support
  const getStoredTheme = () => localStorage.getItem('theme') || 'dark';
  const setStoredTheme = theme => localStorage.setItem('theme', theme);
  
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      $('#theme-icon-light').show();
      $('#theme-icon-dark').hide();
      $('#theme-text').text('Light Mode');
    } else {
      $('#theme-icon-light').hide();
      $('#theme-icon-dark').show();
      $('#theme-text').text('Dark Mode');
    }
    
    // Refresh chart to match theme grid/label colors
    if (showdownChart) {
      updateChartStyles();
    }
  }

  $('#theme-toggle').on('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    setStoredTheme(newTheme);
  });

  // Slider Track Fill logic
  function updateSliderTrack($slider) {
    const min = parseFloat($slider.attr('min')) || 0;
    const max = parseFloat($slider.attr('max')) || 100;
    const val = parseFloat($slider.val()) || 0;
    const pct = ((val - min) / (max - min)) * 100;
    
    $slider.css(
      'background',
      `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${pct}%, var(--slider-track) ${pct}%, var(--slider-track) 100%)`
    );
  }

  // Definition of parameters configuration
  const inputsConfig = {
    propertyPrice: {
      id: 'propertyPrice',
      type: 'currency',
      default: 10000000,
      min: 2000000,
      max: 100000000,
      step: 100000,
      formatter: val => formatINR(val, false),
      extraUpdate: val => {
        // Trigger updates for dependent absolute badges
        const dpPercent = parseFloat($('#downPaymentPercent-slider').val()) || 0;
        const dpVal = val * (dpPercent / 100);
        $('#downPaymentValue-badge').text(`(${formatINR(dpVal, true)})`);

        const regPercent = parseFloat($('#registrationPercent-slider').val()) || 0;
        const regVal = val * (regPercent / 100);
        $('#registrationValue-badge').text(`(${formatINR(regVal, true)})`);

        const maintPercent = parseFloat($('#maintenancePercent-slider').val()) || 0;
        const maintVal = val * (maintPercent / 100) / 12;
        $('#maintenanceValue-badge').text(`(₹${Math.round(maintVal).toLocaleString('en-IN')}/mo)`);
      }
    },
    downPaymentPercent: {
      id: 'downPaymentPercent',
      type: 'percent',
      default: 20,
      min: 10,
      max: 50,
      step: 5,
      formatter: val => `${val}%`,
      extraUpdate: val => {
        const price = parseFloat($('#propertyPrice-slider').val()) || 0;
        const dpVal = price * (val / 100);
        $('#downPaymentValue-badge').text(`(${formatINR(dpVal, true)})`);
      }
    },
    registrationPercent: {
      id: 'registrationPercent',
      type: 'percent',
      default: 7.0,
      min: 0,
      max: 15,
      step: 0.5,
      formatter: val => `${val.toFixed(1)}%`,
      extraUpdate: val => {
        const price = parseFloat($('#propertyPrice-slider').val()) || 0;
        const regVal = price * (val / 100);
        $('#registrationValue-badge').text(`(${formatINR(regVal, true)})`);
      }
    },
    loanInterestRate: {
      id: 'loanInterestRate',
      type: 'percent',
      default: 8.5,
      min: 6.0,
      max: 14.0,
      step: 0.25,
      formatter: val => `${val.toFixed(2)}%`
    },
    loanTenure: {
      id: 'loanTenure',
      type: 'int',
      default: 20,
      min: 5,
      max: 30,
      step: 1,
      formatter: val => `${val} Yr${val > 1 ? 's' : ''}`,
      extraUpdate: val => {
        // Automatically sync Simulation Horizon to match Home Loan Tenure
        const $horizonSlider = $('#simulationHorizon-slider');
        const $horizonInput = $('#simulationHorizon-input');
        $horizonSlider.val(val);
        $horizonInput.val(inputsConfig.simulationHorizon.formatter(val));
        updateSliderTrack($horizonSlider);
      }
    },
    propertyAppreciation: {
      id: 'propertyAppreciation',
      type: 'percent',
      default: 6.0,
      min: 2.0,
      max: 12.0,
      step: 0.25,
      formatter: val => `${val.toFixed(2)}%`
    },
    maintenancePercent: {
      id: 'maintenancePercent',
      type: 'percent',
      default: 1.0,
      min: 0.2,
      max: 3.0,
      step: 0.1,
      formatter: val => `${val.toFixed(1)}%`,
      extraUpdate: val => {
        const price = parseFloat($('#propertyPrice-slider').val()) || 0;
        const maintVal = price * (val / 100) / 12;
        $('#maintenanceValue-badge').text(`(₹${Math.round(maintVal).toLocaleString('en-IN')}/mo)`);
      }
    },
    initialRent: {
      id: 'initialRent',
      type: 'currency',
      default: 30000,
      min: 5000,
      max: 300000,
      step: 1000,
      formatter: val => formatINR(val, false)
    },
    rentEscalation: {
      id: 'rentEscalation',
      type: 'percent',
      default: 5.0,
      min: 0.0,
      max: 12.0,
      step: 0.5,
      formatter: val => `${val.toFixed(1)}%`
    },
    equityReturn: {
      id: 'equityReturn',
      type: 'percent',
      default: 12.0,
      min: 6.0,
      max: 18.0,
      step: 0.25,
      formatter: val => `${val.toFixed(2)}%`
    },
    simulationHorizon: {
      id: 'simulationHorizon',
      type: 'int',
      default: 25,
      min: 5,
      max: 40,
      step: 1,
      formatter: val => `${val} Yr${val > 1 ? 's' : ''}`
    }
  };

  // Set default values from URL params or fallback to config defaults
  function initInputs() {
    const urlParams = new URLSearchParams(window.location.search);
    
    Object.keys(inputsConfig).forEach(key => {
      const config = inputsConfig[key];
      const $slider = $(`#${key}-slider`);
      const $input = $(`#${key}-input`);
      
      let val = config.default;
      
      if (urlParams.has(key)) {
        const parsed = parseFloat(urlParams.get(key));
        if (!isNaN(parsed)) {
          val = Math.max(config.min, Math.min(config.max, parsed));
        }
      }
      
      $slider.val(val);
      $input.val(config.formatter(val));
      updateSliderTrack($slider);
      
      if (config.extraUpdate) {
        config.extraUpdate(val);
      }
    });
  }

  // Retain parameters when navigating back to other calculators
  $('header .nav-link').on('click', function(e) {
    e.preventDefault();
    const href = $(this).attr('href');
    const params = new URLSearchParams(window.location.search);
    
    Object.keys(inputsConfig).forEach(key => {
      params.set(key, $(`#${key}-slider`).val());
    });
    
    window.location.href = href + '?' + params.toString();
  });

  // Slider change handlers
  $('input[type="range"]').on('input', function() {
    const id = $(this).attr('data-id');
    const val = parseFloat($(this).val());
    const config = inputsConfig[id];
    
    const $textInput = $(`#${id}-input`);
    if (!$textInput.is(':focus')) {
      $textInput.val(config.formatter(val));
    }
    
    updateSliderTrack($(this));
    if (config.extraUpdate) {
      config.extraUpdate(val);
    }
    calculateAndRender(true); // Fast update
  });

  // Text Input handlers
  $('input.text-input').on('focus', function() {
    const id = $(this).attr('data-id');
    if (!id) return;
    const val = parseINRInput($(this).val());
    $(this).val(val); // Raw number for easier typing
  }).on('blur', function() {
    const id = $(this).attr('data-id');
    if (!id) return;
    const config = inputsConfig[id];
    let val = parseINRInput($(this).val());
    
    val = Math.max(config.min, Math.min(config.max, val));
    if (config.type === 'percent') {
      val = Math.round(val * 100) / 100;
    }
    
    const $slider = $(`#${id}-slider`);
    $slider.val(val);
    updateSliderTrack($slider);
    
    $(this).val(config.formatter(val));
    if (config.extraUpdate) {
      config.extraUpdate(val);
    }
    calculateAndRender(false); // Full render
  }).on('keydown', function(e) {
    if (e.key === 'Enter') {
      $(this).blur();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const id = $(this).attr('data-id');
      if (!id) return;
      const config = inputsConfig[id];
      const $slider = $(`#${id}-slider`);
      const step = parseFloat($slider.attr('step')) || 1;
      let val = parseINRInput($(this).val());
      
      if (e.key === 'ArrowUp') {
        val = Math.min(config.max, val + step);
      } else {
        val = Math.max(config.min, val - step);
      }
      
      if (config.type === 'percent') {
        val = Math.round(val * 100) / 100;
      }
      
      $(this).val(val);
      $slider.val(val);
      updateSliderTrack($slider);
      if (config.extraUpdate) {
        config.extraUpdate(val);
      }
      calculateAndRender(false);
    }
  });

  // Accordion Toggle
  $('.accordion-header').on('click', function() {
    $(this).toggleClass('open');
    $(this).next('.accordion-body').slideToggle(300);
  });

  function calculateAndRender(fastUpdate = false) {
    // 1. Gather Inputs
    const propertyPrice = parseFloat($('#propertyPrice-slider').val());
    const downPaymentPercent = parseFloat($('#downPaymentPercent-slider').val());
    const registrationPercent = parseFloat($('#registrationPercent-slider').val());
    const loanInterestRate = parseFloat($('#loanInterestRate-slider').val());
    const loanTenure = parseInt($('#loanTenure-slider').val());
    const propertyAppreciation = parseFloat($('#propertyAppreciation-slider').val());
    const maintenancePercent = parseFloat($('#maintenancePercent-slider').val());
    const initialRent = parseFloat($('#initialRent-slider').val());
    const rentEscalation = parseFloat($('#rentEscalation-slider').val());
    const equityReturn = parseFloat($('#equityReturn-slider').val());
    const simulationHorizon = parseInt($('#simulationHorizon-slider').val());

    // 2. Calculations Preparation
    const downPaymentAmount = propertyPrice * (downPaymentPercent / 100);
    const regSetupCost = propertyPrice * (registrationPercent / 100);
    
    // Upfront Year 0 Out-of-pocket
    const upfrontCash = downPaymentAmount + regSetupCost;
    
    // Loan Calculation
    const loanPrincipal = propertyPrice - downPaymentAmount;
    const rLoan = loanInterestRate / 12 / 100;
    const nLoan = loanTenure * 12;
    
    let emi = 0;
    if (loanPrincipal > 0) {
      if (rLoan > 0) {
        emi = loanPrincipal * rLoan * Math.pow(1 + rLoan, nLoan) / (Math.pow(1 + rLoan, nLoan) - 1);
      } else {
        emi = loanPrincipal / nLoan;
      }
    }

    // Update loan EMI badge next to tenure slider label
    $('#loanEmi-badge').text(`(EMI: ${formatINR(emi, true)}/mo)`);

    // Rent & Equity Return rates
    const rEquity = equityReturn / 12 / 100;

    // Simulation Data Lists
    const labels = [];
    const buyerNetWorth = [];
    const renterNetWorth = [];
    const propertyValue = [];
    const loanBalance = [];
    const rentPaidYearly = [];
    const netInvestedYearly = [];

    // Year 0 initialization
    labels.push('Year 0');
    propertyValue.push(propertyPrice);
    loanBalance.push(loanPrincipal);
    buyerNetWorth.push(downPaymentAmount);
    renterNetWorth.push(upfrontCash); // Initial equity corpus
    rentPaidYearly.push(0);
    netInvestedYearly.push(0);

    yearlyDataRecord = [];
    yearlyDataRecord.push({
      year: 0,
      propertyValue: propertyPrice,
      loanBalance: loanPrincipal,
      buyerNetWorth: downPaymentAmount,
      rentPaid: 0,
      netInvested: 0,
      renterPortfolio: upfrontCash,
      delta: downPaymentAmount - upfrontCash
    });

    let renterPortfolio = upfrontCash;

    // Loop year by year
    for (let y = 1; y <= simulationHorizon; y++) {
      labels.push(`Year ${y}`);
      
      // Rent paid in Year y
      const monthlyRent = initialRent * Math.pow(1 + rentEscalation / 100, y - 1);
      const annualRent = monthlyRent * 12;
      rentPaidYearly.push(annualRent);

      // Property Appreciation
      const currentPropertyValue = propertyPrice * Math.pow(1 + propertyAppreciation / 100, y);
      propertyValue.push(currentPropertyValue);

      // Remaining Loan Balance
      const monthsElapsed = y * 12;
      let currentLoanBalance = 0;
      if (monthsElapsed < nLoan) {
        if (rLoan > 0) {
          currentLoanBalance = loanPrincipal * (Math.pow(1 + rLoan, nLoan) - Math.pow(1 + rLoan, monthsElapsed)) / (Math.pow(1 + rLoan, nLoan) - 1);
        } else {
          currentLoanBalance = loanPrincipal * (1 - monthsElapsed / nLoan);
        }
      } else {
        currentLoanBalance = 0;
      }
      loanBalance.push(currentLoanBalance);

      // Maintenance cost based on property value at the end of the previous year
      const annualMaintenance = propertyValue[y - 1] * (maintenancePercent / 100);

      // Cash outflows
      const emiMonthsThisYear = Math.max(0, Math.min(12, nLoan - (y - 1) * 12));
      const buyerAnnualOutflow = (emi * emiMonthsThisYear) + annualMaintenance;
      const renterAnnualOutflow = annualRent;

      // Net cash flow difference divided by 12
      const monthlyDifference = (buyerAnnualOutflow - renterAnnualOutflow) / 12;
      netInvestedYearly.push(monthlyDifference * 12);

      // Compounding renter portfolio month by month
      for (let m = 1; m <= 12; m++) {
        renterPortfolio = renterPortfolio * (1 + rEquity) + monthlyDifference;
        renterPortfolio = Math.max(0, renterPortfolio); // Portfolio cannot be negative
      }

      const currentBuyerNetWorth = currentPropertyValue - currentLoanBalance;
      buyerNetWorth.push(currentBuyerNetWorth);
      renterNetWorth.push(renterPortfolio);

      yearlyDataRecord.push({
        year: y,
        propertyValue: currentPropertyValue,
        loanBalance: currentLoanBalance,
        buyerNetWorth: currentBuyerNetWorth,
        rentPaid: annualRent,
        netInvested: monthlyDifference * 12,
        renterPortfolio: renterPortfolio,
        delta: currentBuyerNetWorth - renterPortfolio
      });
    }

    // 3. Find Crossover Year
    let crossoverYear = null;
    let crossoverIndex = -1;
    for (let y = 1; y <= simulationHorizon; y++) {
      const prevDelta = buyerNetWorth[y - 1] - renterNetWorth[y - 1];
      const currDelta = buyerNetWorth[y] - renterNetWorth[y];
      
      // Look for crossover (sign swap)
      if (prevDelta * currDelta < 0 || (prevDelta === 0 && currDelta !== 0) || (prevDelta !== 0 && currDelta === 0)) {
        crossoverYear = y;
        crossoverIndex = y;
        break;
      }
    }

    // 4. Update KPI Cards
    const finalBuyerNW = buyerNetWorth[simulationHorizon];
    const finalRenterNW = renterNetWorth[simulationHorizon];
    const absDiff = Math.abs(finalBuyerNW - finalRenterNW);
    
    // Verdict Banner
    const isBuyerWinner = finalBuyerNW > finalRenterNW;
    const winnerLabel = isBuyerWinner ? "Buying Wins" : "Renting Wins";
    $('#val-verdict').text(`${winnerLabel}!`);
    $('#sub-verdict').text(`By ${formatINR(absDiff, true)} over ${simulationHorizon} Yrs`);

    // Reset status classes
    $('#metric-verdict').removeClass('status-safe status-warning status-danger');
    $('#metric-buyer-networth').removeClass('status-safe status-warning status-danger');
    $('#metric-renter-networth').removeClass('status-safe status-warning status-danger');

    // Winner gets the green theme status-safe highlight
    $('#metric-verdict').addClass('status-safe');
    if (isBuyerWinner) {
      $('#metric-buyer-networth').addClass('status-safe');
    } else {
      $('#metric-renter-networth').addClass('status-safe');
    }

    // Set net worth display
    $('#val-buyer-networth').text(formatINR(finalBuyerNW, true));
    $('#sub-buyer-networth').text(`₹${Math.round(finalBuyerNW).toLocaleString('en-IN')} (Property)`);
    
    $('#val-renter-networth').text(formatINR(finalRenterNW, true));
    $('#sub-renter-networth').text(`₹${Math.round(finalRenterNW).toLocaleString('en-IN')} (Equities)`);

    // Monthly cash outflow comparison (Initial Year)
    const initialBuyerMonthlyOutflow = emi + (propertyPrice * (maintenancePercent / 100) / 12);
    const initialRenterMonthlyOutflow = initialRent;
    $('#val-outflow-comparison').text(`${formatINR(initialBuyerMonthlyOutflow, true)} vs. ${formatINR(initialRenterMonthlyOutflow, true)}`);
    const initialMaintenanceMonthly = propertyPrice * (maintenancePercent / 100) / 12;
    $('#sub-outflow-comparison').text(`EMI: ${formatINR(emi, true)} + Maint: ${formatINR(initialMaintenanceMonthly, true)}`);

    // Update Crossover Badge on UI
    if (crossoverYear !== null) {
      $('#crossover-badge').show().text(`Crossover Year: Year ${crossoverYear}`);
    } else {
      $('#crossover-badge').hide();
    }

    // 5. Render Chart.js
    renderShowdownChart(labels, buyerNetWorth, renterNetWorth, crossoverIndex, fastUpdate);

    // 6. Render Table rows
    renderDetailedTable();

    // 7. Update URL query parameters for persistence on refresh
    updateURLQueryParams();
  }

  function updateURLQueryParams() {
    const params = new URLSearchParams(window.location.search);
    Object.keys(inputsConfig).forEach(key => {
      const val = parseFloat($(`#${key}-slider`).val());
      if (!isNaN(val)) {
        params.set(key, val);
      }
    });
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    try {
      window.history.replaceState(null, '', newUrl);
    } catch (e) {
      // Silently catch exceptions when running via file://
    }
  }

  function renderShowdownChart(labels, buyerNW, renterNW, crossoverIndex, fastUpdate) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const labelColor = isDark ? '#9ca3af' : '#475569';

    // Highlight Crossover Point specifically
    const pointRadiiBuyer = labels.map((_, idx) => idx === crossoverIndex ? 9 : 2);
    const pointHoverRadiiBuyer = labels.map((_, idx) => idx === crossoverIndex ? 11 : 5);
    const pointStylesBuyer = labels.map((_, idx) => idx === crossoverIndex ? 'rectRot' : 'circle');
    const pointBorderWidthsBuyer = labels.map((_, idx) => idx === crossoverIndex ? 3 : 1);

    const pointRadiiRenter = labels.map((_, idx) => idx === crossoverIndex ? 9 : 2);
    const pointHoverRadiiRenter = labels.map((_, idx) => idx === crossoverIndex ? 11 : 5);
    const pointStylesRenter = labels.map((_, idx) => idx === crossoverIndex ? 'rectRot' : 'circle');
    const pointBorderWidthsRenter = labels.map((_, idx) => idx === crossoverIndex ? 3 : 1);

    if (showdownChart) {
      showdownChart.data.labels = labels;
      showdownChart.data.datasets[0].data = buyerNW;
      showdownChart.data.datasets[0].pointRadius = pointRadiiBuyer;
      showdownChart.data.datasets[0].pointHoverRadius = pointHoverRadiiBuyer;
      showdownChart.data.datasets[0].pointStyle = pointStylesBuyer;
      showdownChart.data.datasets[0].pointBorderWidth = pointBorderWidthsBuyer;

      showdownChart.data.datasets[1].data = renterNW;
      showdownChart.data.datasets[1].pointRadius = pointRadiiRenter;
      showdownChart.data.datasets[1].pointHoverRadius = pointHoverRadiiRenter;
      showdownChart.data.datasets[1].pointStyle = pointStylesRenter;
      showdownChart.data.datasets[1].pointBorderWidth = pointBorderWidthsRenter;

      showdownChart.options.scales.x.grid.color = gridColor;
      showdownChart.options.scales.x.ticks.color = labelColor;
      showdownChart.options.scales.y.grid.color = gridColor;
      showdownChart.options.scales.y.ticks.color = labelColor;

      showdownChart.update(fastUpdate ? 'none' : undefined);
    } else {
      const ctx = document.getElementById('showdown-chart').getContext('2d');
      showdownChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Buyer Net Worth',
              data: buyerNW,
              borderColor: '#6366f1', // Indigo / Deep Navy
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              fill: false,
              borderWidth: 3.5,
              tension: 0.3,
              pointRadius: pointRadiiBuyer,
              pointHoverRadius: pointHoverRadiiBuyer,
              pointStyle: pointStylesBuyer,
              pointBorderColor: '#6366f1',
              pointBackgroundColor: '#fff',
              pointBorderWidth: pointBorderWidthsBuyer
            },
            {
              label: 'Renter Net Worth',
              data: renterNW,
              borderColor: '#10b981', // Vibrant Emerald Green
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: false,
              borderWidth: 3.5,
              tension: 0.3,
              pointRadius: pointRadiiRenter,
              pointHoverRadius: pointHoverRadiiRenter,
              pointStyle: pointStylesRenter,
              pointBorderColor: '#10b981',
              pointBackgroundColor: '#fff',
              pointBorderWidth: pointBorderWidthsRenter
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index'
          },
          scales: {
            x: {
              grid: {
                color: gridColor
              },
              ticks: {
                color: labelColor,
                font: {
                  family: 'Outfit',
                  size: 11
                }
              }
            },
            y: {
              min: 0,
              grid: {
                color: gridColor
              },
              ticks: {
                color: labelColor,
                font: {
                  family: 'Outfit',
                  size: 11
                },
                callback: function(value) {
                  return formatINR(value, true);
                }
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: labelColor,
                font: {
                  family: 'Outfit',
                  size: 12
                }
              }
            },
            tooltip: {
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              titleColor: isDark ? '#ffffff' : '#0f172a',
              bodyColor: isDark ? '#e2e8f0' : '#334155',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)',
              borderWidth: 1,
              padding: 14,
              displayColors: true,
              titleFont: {
                family: 'Outfit',
                weight: 'bold',
                size: 13
              },
              bodyFont: {
                family: 'Inter',
                size: 12
              },
              callbacks: {
                title: function(tooltipItems) {
                  const index = tooltipItems[0].dataIndex;
                  return index === 0 ? 'Year 0 (Start state)' : `Simulation: Year ${index}`;
                },
                label: function(context) {
                  const index = context.dataIndex;
                  const r = yearlyDataRecord[index];
                  if (!r) return [];

                  if (context.datasetIndex === 0) {
                    return [
                      `[Buyer Side]`,
                      `  Property Value: ${formatINR(r.propertyValue)}`,
                      `  Loan Balance: ${formatINR(r.loanBalance)}`,
                      `  Net Worth: ${formatINR(r.buyerNetWorth)}`
                    ];
                  } else {
                    const diffText = r.delta >= 0 
                      ? `Buyer leads by ${formatINR(r.delta, true)}` 
                      : `Renter leads by ${formatINR(Math.abs(r.delta), true)}`;
                    return [
                      `[Renter Side]`,
                      `  Rent Paid (Yr): ${formatINR(r.rentPaid)}`,
                      `  Net Invested (Yr): ${formatINR(r.netInvested)}`,
                      `  Portfolio Value: ${formatINR(r.renterPortfolio)}`,
                      `-----------------------`,
                      `  Showdown Delta: ${diffText}`
                    ];
                  }
                }
              }
            }
          }
        }
      });
    }
  }

  function renderDetailedTable() {
    const $tbody = $('#financial-rows');
    $tbody.empty();

    yearlyDataRecord.forEach(r => {
      const isStart = r.year === 0;
      
      const deltaClass = r.delta >= 0 ? 'text-success' : 'text-danger';
      const deltaSign = r.delta >= 0 ? '+' : '';
      const formattedDelta = `${deltaSign}${Math.round(r.delta).toLocaleString('en-IN')}`;

      // CSS Classes matching layout tables in other planners
      const row = `
        <tr>
          <td class="text-center font-semibold">${isStart ? '0 (Start)' : r.year}</td>
          <td class="num-col">${Math.round(r.propertyValue).toLocaleString('en-IN')}</td>
          <td class="num-col">${Math.round(r.loanBalance).toLocaleString('en-IN')}</td>
          <td class="num-col font-semibold">${Math.round(r.buyerNetWorth).toLocaleString('en-IN')}</td>
          <td class="num-col">${Math.round(r.rentPaid).toLocaleString('en-IN')}</td>
          <td class="num-col">${Math.round(r.netInvested).toLocaleString('en-IN')}</td>
          <td class="num-col font-semibold">${Math.round(r.renterPortfolio).toLocaleString('en-IN')}</td>
          <td class="num-col font-semibold ${deltaClass}">${formattedDelta}</td>
        </tr>
      `;
      $tbody.append(row);
    });
  }

  function updateChartStyles() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const labelColor = isDark ? '#9ca3af' : '#475569';
    
    if (showdownChart) {
      showdownChart.options.scales.x.grid.color = gridColor;
      showdownChart.options.scales.x.ticks.color = labelColor;
      showdownChart.options.scales.y.grid.color = gridColor;
      showdownChart.options.scales.y.ticks.color = labelColor;
      showdownChart.options.plugins.legend.labels.color = labelColor;
      showdownChart.options.plugins.tooltip.backgroundColor = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)';
      showdownChart.options.plugins.tooltip.titleColor = isDark ? '#ffffff' : '#0f172a';
      showdownChart.options.plugins.tooltip.bodyColor = isDark ? '#e2e8f0' : '#334155';
      showdownChart.options.plugins.tooltip.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)';
      
      showdownChart.update();
    }
  }

  // Initialize page configuration
  const initialTheme = getStoredTheme();
  applyTheme(initialTheme);
  initInputs();
  calculateAndRender(false);
});
