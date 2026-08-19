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
  
  // Clean string of currency icons, spaces, and commas
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
  // Shared active simulation results to prevent stale tooltip closure states
  let chartData = [];

  // Initialize Lucide Icons
  lucide.createIcons();

  // Definition of parameters configuration
  const inputsConfig = {
    startAge: {
      id: 'startAge',
      type: 'int',
      default: 35,
      min: 20,
      max: 75,
      formatter: val => `${val} Years`
    },
    initialCorpus: {
      id: 'initialCorpus',
      type: 'currency',
      default: 10000000,
      min: 2500000,
      max: 100000000,
      formatter: val => formatINR(val, false)
    },
    annualExpenses: {
      id: 'annualExpenses',
      type: 'currency',
      default: 755000,
      min: 200000,
      max: 3000000,
      formatter: val => formatINR(val, false),
      extraUpdate: val => {
        const monthly = Math.round(val / 12);
        $('#annualExpenses-monthly').text(`(₹${monthly.toLocaleString('en-IN')}/mo)`);
      }
    },
    inflationRate: {
      id: 'inflationRate',
      type: 'percent',
      default: 6.0,
      min: 3.0,
      max: 12.0,
      formatter: val => `${val.toFixed(2)}%`
    },
    expectedReturn: {
      id: 'expectedReturn',
      type: 'percent',
      default: 8.5,
      min: 4.0,
      max: 15.0,
      formatter: val => `${val.toFixed(2)}%`
    },
    milestoneAmount: {
      id: 'milestoneAmount',
      type: 'currency',
      default: 5000000,
      min: 0,
      max: 15000000,
      formatter: val => formatINR(val, false)
    },
    milestoneAge: {
      id: 'milestoneAge',
      type: 'int',
      default: 45,
      min: 36, // starting age + 1 (dynamically computed)
      max: 75,
      formatter: val => `${val} Years`
    },
    sideIncome: {
      id: 'sideIncome',
      type: 'currency',
      default: 0,
      min: 0,
      max: 200000,
      formatter: val => formatINR(val, false),
      extraUpdate: val => {
        const annual = Math.round(val * 12);
        $('#sideIncome-annual').text(`(₹${annual.toLocaleString('en-IN')}/yr)`);
      }
    },
    sideIncomeDuration: {
      id: 'sideIncomeDuration',
      type: 'int',
      default: 5,
      min: 0,
      max: 25,
      formatter: val => `${val} Years`
    }
  };

  // Chart instance holder
  let longevityChart = null;

  // Theme toggle configuration
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
    
    // Redraw chart if initialized to match theme grid/label colors
    if (longevityChart) {
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

  // Initialize all input UI controls
  function initInputs() {
    const urlParams = new URLSearchParams(window.location.search);
    
    Object.keys(inputsConfig).forEach(key => {
      const config = inputsConfig[key];
      const $slider = $(`#${key}-slider`);
      const $input = $(`#${key}-input`);
      
      // Determine value from URL query parameters (highest priority) or defaults
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
    
    // Dynamically compute boundary constraints for Milestone Occurs Age based on Starting Age
    syncMilestoneAgeBounds();
  }

  // Update URL Query parameters with current parameter values, preserving other pages' parameters
  function updateURLQueryParams() {
    const params = new URLSearchParams(window.location.search);
    Object.keys(inputsConfig).forEach(key => {
      const val = parseFloat($(`#${key}-slider`).val());
      params.set(key, val);
    });
    
    // Synchronize initialCorpus and initialLumpsum parameter values
    if (params.has('initialCorpus')) {
      params.set('initialLumpsum', params.get('initialCorpus'));
    } else if (params.has('initialLumpsum')) {
      params.set('initialCorpus', params.get('initialLumpsum'));
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    try {
      window.history.replaceState(null, '', newUrl);
    } catch (e) {
      // Silently catch security exceptions if running locally via file:// protocol
    }
  }

  function syncMilestoneAgeBounds() {
    const startAge = parseInt($('#startAge-slider').val());
    const minMilestoneAge = startAge + 1;
    const maxMilestoneAge = 75;
    
    const $milestoneSlider = $('#milestoneAge-slider');
    const $milestoneInput = $('#milestoneAge-input');
    
    // Read current milestone age value
    let currentMilestone = parseInt($milestoneSlider.val());
    
    // Apply bounds to slider attributes
    $milestoneSlider.attr('min', minMilestoneAge);
    $milestoneSlider.attr('max', maxMilestoneAge);
    
    inputsConfig.milestoneAge.min = minMilestoneAge;
    
    // If current value is invalid or out of range, re-sync to standard offset (+10 years or max)
    if (currentMilestone < minMilestoneAge) {
      currentMilestone = Math.min(maxMilestoneAge, minMilestoneAge + 10);
      $milestoneSlider.val(currentMilestone);
      if (!$milestoneInput.is(':focus')) {
        $milestoneInput.val(inputsConfig.milestoneAge.formatter(currentMilestone));
      }
    }
    
    updateSliderTrack($milestoneSlider);
  }

  // Handlers for Slider changes
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
    
    // If startAge changed, milestone constraints need updating
    if (id === 'startAge') {
      syncMilestoneAgeBounds();
    }
    
    // Rerun model
    calculateAndRender(true); // fastUpdate (no animation during drag)
  });

  // Handlers for Text Input edits
  $('input.text-input').on('focus', function() {
    const id = $(this).attr('data-id');
    const val = parseINRInput($(this).val());
    // Show raw numerical values for direct user editing
    $(this).val(val);
  }).on('blur', function() {
    const id = $(this).attr('data-id');
    const config = inputsConfig[id];
    let val = parseINRInput($(this).val());
    
    // Constrain input value to bounds
    val = Math.max(config.min, Math.min(config.max, val));
    
    // If percentage values, make sure decimals work (e.g. return rates)
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
    
    if (id === 'startAge') {
      syncMilestoneAgeBounds();
    }
    
    calculateAndRender(false); // full redraw on edit end
  }).on('keydown', function(e) {
    if (e.key === 'Enter') {
      $(this).blur();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault(); // prevent default cursor movement or scrolling
      
      const id = $(this).attr('data-id');
      const config = inputsConfig[id];
      const $slider = $(`#${id}-slider`);
      const step = parseFloat($slider.attr('step')) || 1;
      
      let val = parseINRInput($(this).val());
      
      if (e.key === 'ArrowUp') {
        val = Math.min(config.max, val + step);
      } else {
        val = Math.max(config.min, val - step);
      }
      
      // Ensure decimal safety for percentages
      if (config.type === 'percent') {
        val = Math.round(val * 100) / 100;
      }
      
      $(this).val(val);
      $slider.val(val);
      updateSliderTrack($slider);
      
      if (config.extraUpdate) {
        config.extraUpdate(val);
      }
      
      if (id === 'startAge') {
        syncMilestoneAgeBounds();
      }
      
      calculateAndRender(false);
    }
  });

  // Accordion Toggle
  $('#table-toggle').on('click', function() {
    $(this).toggleClass('open');
    $('#table-body').slideToggle(300);
  });

  // Retain URL query parameters when navigating between tools
  $('.nav-link').on('click', function(e) {
    e.preventDefault();
    const href = $(this).attr('href');
    
    // Dynamically build parameters from active slider values to bypass browser file:// limits
    const params = new URLSearchParams(window.location.search);
    Object.keys(inputsConfig).forEach(key => {
      const val = parseFloat($(`#${key}-slider`).val());
      params.set(key, val);
    });
    
    // Sync initialCorpus and initialLumpsum
    if (params.has('initialCorpus')) {
      params.set('initialLumpsum', params.get('initialCorpus'));
    } else if (params.has('initialLumpsum')) {
      params.set('initialCorpus', params.get('initialLumpsum'));
    }
    
    window.location.href = href + '?' + params.toString();
  });

  // Main math engine
  function calculateAndRender(fastUpdate = false) {
    // Collect model parameters
    const startAge = parseInt($('#startAge-slider').val());
    const initialCorpus = parseFloat($('#initialCorpus-slider').val());
    const initialExpense = parseFloat($('#annualExpenses-slider').val());
    const inflationRate = parseFloat($('#inflationRate-slider').val()) / 100;
    const expectedReturn = parseFloat($('#expectedReturn-slider').val()) / 100;
    
    const milestoneAmount = parseFloat($('#milestoneAmount-slider').val());
    const milestoneAge = parseInt($('#milestoneAge-slider').val());
    
    const monthlySideIncome = parseFloat($('#sideIncome-slider').val());
    const incomeDuration = parseInt($('#sideIncomeDuration-slider').val());
    
    // Simulation details
    const maxSimulationAge = 100;
    const yearsToRun = maxSimulationAge - startAge;
    
    let closingBalance = initialCorpus;
    const results = [];
    let depleted = false;
    let depletionAge = null;
    let peakCorpus = initialCorpus;
    let peakAge = startAge;
    
    // Check milestone parameters
    const isMilestoneEnabled = milestoneAmount > 0;
    if (isMilestoneEnabled) {
      $('#chart-milestone-indicator').show();
    } else {
      $('#chart-milestone-indicator').hide();
    }
    
    for (let t = 0; t <= yearsToRun; t++) {
      const age = startAge + t;
      
      let opening = depleted ? 0 : closingBalance;
      
      // Living Expenses inflate compounding every year
      let expenses = depleted ? 0 : initialExpense * Math.pow(1 + inflationRate, t);
      
      // Side income lasts for 'incomeDuration' years
      let sideIncome = 0;
      if (!depleted && t < incomeDuration) {
        sideIncome = monthlySideIncome * 12;
      }
      
      // Base net outflow is expenses offset by side income
      let netBaseOutflow = Math.max(0, expenses - sideIncome);
      
      // Add Milestone lump sum at trigger age
      let milestoneOutflow = 0;
      if (!depleted && age === milestoneAge && isMilestoneEnabled) {
        milestoneOutflow = milestoneAmount;
      }
      
      let totalOutflow = netBaseOutflow + milestoneOutflow;
      
      // Portfolio returns earned during the year
      let returns = 0;
      if (!depleted) {
        returns = opening * expectedReturn;
      }
      
      let closing = 0;
      let firstDepletedYear = false;
      
      if (!depleted) {
        closing = opening + returns - totalOutflow;
        if (closing <= 0) {
          closing = 0;
          depleted = true;
          depletionAge = age;
          firstDepletedYear = true;
        }
      }
      
      closingBalance = closing;
      
      if (closing > peakCorpus) {
        peakCorpus = closing;
        peakAge = age;
      }
      
      results.push({
        yearIndex: t, // 0-based year index
        age: age,
        opening: opening,
        returns: returns,
        expenses: expenses,
        sideIncome: sideIncome,
        milestoneOutflow: milestoneOutflow,
        totalOutflow: totalOutflow,
        closing: closing,
        isDepleted: depleted && !firstDepletedYear,
        isFirstDepletion: firstDepletedYear
      });
    }
    
    // Calculate SWR
    const swr = (initialExpense / initialCorpus) * 100;
    
    // Calculate dynamic line style depending on depletion point
    let themeStatus = 'safe'; // green
    let displayDepletion = 'Lifelong / 100+';
    let displayLongevity = `${yearsToRun}+ Years`;
    
    if (depleted && depletionAge !== null) {
      displayDepletion = `Age ${depletionAge}`;
      displayLongevity = `${depletionAge - startAge} Years`;
      
      if (depletionAge < 70) {
        themeStatus = 'danger'; // red
      } else if (depletionAge >= 70 && depletionAge < 85) {
        themeStatus = 'warning'; // orange
      }
    }
    
    // Update dashboard metrics
    updateMetricsHTML(displayLongevity, displayDepletion, peakCorpus, peakAge, swr, themeStatus);
    
    // Render Schedule Table
    updateTableHTML(results, milestoneAge, isMilestoneEnabled);
    
    // Render Line Chart
    updateChart(results, startAge, depletionAge, milestoneAge, isMilestoneEnabled, themeStatus, fastUpdate);
    
    // Update URL query parameters to reflect the current input states
    updateURLQueryParams();
  }

  function updateMetricsHTML(longevity, depletion, peak, peakAge, swr, status) {
    // Reset card statuses
    $('.metric-card').removeClass('status-safe status-warning status-danger');
    
    // Apply status themes
    $('#metric-longevity, #metric-depletion').addClass(`status-${status}`);
    
    // 1. Runway Longevity
    $('#val-longevity').text(longevity);
    
    // 2. Depletion Age
    $('#val-depletion').text(depletion);
    if (status === 'safe') {
      $('#icon-depletion').attr('data-lucide', 'check-circle').removeClass('text-danger text-warning').addClass('text-safe');
      $('#sub-depletion').text('Corpus is highly sustainable');
    } else if (status === 'warning') {
      $('#icon-depletion').attr('data-lucide', 'alert-circle').removeClass('text-safe text-danger').addClass('text-warning');
      $('#sub-depletion').text('Corpus runs thin at old age');
    } else {
      $('#icon-depletion').attr('data-lucide', 'alert-triangle').removeClass('text-safe text-warning').addClass('text-danger');
      $('#sub-depletion').text('Corpus depletes before Age 70');
    }
    
    // 3. Peak Corpus
    $('#val-peak').text(formatINR(peak, true));
    $('#sub-peak').text(`Reached at Age ${peakAge}`);
    
    // 4. SWR
    $('#val-swr').text(`${swr.toFixed(2)}%`);
    if (swr < 4.0) {
      $('#metric-swr').addClass('status-safe');
      $('#sub-swr').html('<span class="text-safe" style="font-weight:600;">✓ Safe Withdrawal Rate</span>');
    } else if (swr >= 4.0 && swr <= 6.0) {
      $('#metric-swr').addClass('status-warning');
      $('#sub-swr').html('<span class="text-warning" style="font-weight:600;">⚠ Moderate Withdrawal Rate</span>');
    } else {
      $('#metric-swr').addClass('status-danger');
      $('#sub-swr').html('<span class="text-danger" style="font-weight:600;">✗ High Withdrawal Risk</span>');
    }
    
    // Re-draw icons
    lucide.createIcons();
  }

  function updateTableHTML(results, milestoneAge, isMilestoneEnabled) {
    const $tbody = $('#financial-rows');
    $tbody.empty();
    
    for (const r of results) {
      let rowClass = '';
      let milestoneBadge = '';
      
      if (r.isFirstDepletion) {
        rowClass = 'row-depleted-first';
      } else if (r.isDepleted) {
        rowClass = 'row-depleted';
      } else if (isMilestoneEnabled && r.age === milestoneAge) {
        rowClass = 'row-milestone';
        milestoneBadge = ' <span class="milestone-badge">Milestone</span>';
      }
      
      const rowHtml = `
        <tr class="${rowClass}">
          <td class="text-center" style="font-weight: 600;">${r.age}${milestoneBadge}</td>
          <td class="text-center text-muted">${r.yearIndex}</td>
          <td class="num-col">${formatINR(r.opening)}</td>
          <td class="num-col text-safe">+${formatINR(r.returns)}</td>
          <td class="num-col text-danger">-${formatINR(r.expenses)}</td>
          <td class="num-col text-safe">${r.sideIncome > 0 ? `+${formatINR(r.sideIncome)}` : '₹0'}</td>
          <td class="num-col text-accent" style="font-weight: 500;">${r.milestoneOutflow > 0 ? `-${formatINR(r.milestoneOutflow)}` : '₹0'}</td>
          <td class="num-col" style="font-weight: 700;">${formatINR(r.closing)}</td>
        </tr>
      `;
      $tbody.append(rowHtml);
      
      if (r.closing === 0) {
        break;
      }
    }
  }

  function updateChart(results, startAge, depletionAge, milestoneAge, isMilestoneEnabled, status, fastUpdate) {
    // Stop plotting the line chart when it hits ₹0
    chartData = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      chartData.push(r);
      if (r.closing === 0 && r.opening > 0) {
        // First year we hit 0, draw it and stop
        break;
      }
      if (r.opening === 0 && i > 0) {
        // Already hit 0 in previous year, stop plotting
        break;
      }
    }

    const labels = chartData.map(r => `Age ${r.age}`);
    const corpusValues = chartData.map(r => r.closing);
    
    let colorToken = '';
    let fillToken = '';
    
    if (status === 'safe') {
      colorToken = getComputedStyle(document.documentElement).getPropertyValue('--safe-color').trim();
      fillToken = getComputedStyle(document.documentElement).getPropertyValue('--safe-bg').trim() || 'rgba(16, 185, 129, 0.1)';
    } else if (status === 'warning') {
      colorToken = getComputedStyle(document.documentElement).getPropertyValue('--warning-color').trim();
      fillToken = getComputedStyle(document.documentElement).getPropertyValue('--warning-bg').trim() || 'rgba(245, 158, 11, 0.1)';
    } else {
      colorToken = getComputedStyle(document.documentElement).getPropertyValue('--danger-color').trim();
      fillToken = getComputedStyle(document.documentElement).getPropertyValue('--danger-bg').trim() || 'rgba(239, 68, 68, 0.1)';
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const labelColor = isDark ? '#9ca3af' : '#475569';

    // Point configuration to highlight the milestone age
    const pointRadii = chartData.map(r => (isMilestoneEnabled && r.age === milestoneAge) ? 9 : 0);
    const pointHoverRadii = chartData.map(r => (isMilestoneEnabled && r.age === milestoneAge) ? 11 : 6);
    const pointBgColor = chartData.map(r => (isMilestoneEnabled && r.age === milestoneAge) ? '#ffffff' : colorToken);
    const pointBorderColor = chartData.map(r => (isMilestoneEnabled && r.age === milestoneAge) ? '#6366f1' : colorToken);
    const pointBorderWidths = chartData.map(r => (isMilestoneEnabled && r.age === milestoneAge) ? 4 : 1);

    if (longevityChart) {
      // Update data sets
      longevityChart.data.labels = labels;
      longevityChart.data.datasets[0].data = corpusValues;
      longevityChart.data.datasets[0].borderColor = colorToken;
      longevityChart.data.datasets[0].backgroundColor = createGradient(longevityChart.ctx, fillToken);
      longevityChart.data.datasets[0].pointRadius = pointRadii;
      longevityChart.data.datasets[0].pointHoverRadius = pointHoverRadii;
      longevityChart.data.datasets[0].pointBackgroundColor = pointBgColor;
      longevityChart.data.datasets[0].pointBorderColor = pointBorderColor;
      longevityChart.data.datasets[0].pointBorderWidth = pointBorderWidths;
      
      // Update styles
      longevityChart.options.scales.x.grid.color = gridColor;
      longevityChart.options.scales.x.ticks.color = labelColor;
      longevityChart.options.scales.y.grid.color = gridColor;
      longevityChart.options.scales.y.ticks.color = labelColor;

      // Drag updates use fast render mode
      longevityChart.update(fastUpdate ? 'none' : undefined);
    } else {
      // Initialize chart
      const ctx = document.getElementById('longevity-chart').getContext('2d');
      
      longevityChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Closing Balance',
            data: corpusValues,
            borderColor: colorToken,
            backgroundColor: createGradient(ctx, fillToken),
            fill: true,
            borderWidth: 3.5,
            tension: 0.3,
            pointRadius: pointRadii,
            pointHoverRadius: pointHoverRadii,
            pointBackgroundColor: pointBgColor,
            pointBorderColor: pointBorderColor,
            pointBorderWidth: pointBorderWidths,
          }]
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
              display: false
            },
            tooltip: {
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
              titleColor: isDark ? '#ffffff' : '#0f172a',
              bodyColor: isDark ? '#e2e8f0' : '#334155',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)',
              borderWidth: 1,
              padding: 14,
              displayColors: false,
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
                  const r = chartData[index];
                  if (!r) return '';
                  return `Age ${r.age} (Year ${r.yearIndex})`;
                },
                label: function(context) {
                  const index = context.dataIndex;
                  const r = chartData[index];
                  if (!r) return [];
                  
                  const lines = [
                    `Closing Balance: ${formatINR(r.closing)}`,
                    `Opening Corpus: ${formatINR(r.opening)}`,
                    `Returns Earned: +${formatINR(r.returns)}`,
                    `Total Expense: -${formatINR(r.expenses)}`
                  ];
                  
                  if (r.sideIncome > 0) {
                    lines.push(`Side Income: +${formatINR(r.sideIncome)}`);
                  }
                  
                  if (isMilestoneEnabled && r.age === milestoneAge) {
                    lines.push(`★ Milestone Outflow: -${formatINR(r.milestoneOutflow)}`);
                  }
                  
                  return lines;
                }
              }
            }
          }
        }
      });
    }
  }

  function createGradient(ctx, color) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    return gradient;
  }

  function updateChartStyles() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const labelColor = isDark ? '#9ca3af' : '#475569';
    
    if (longevityChart) {
      longevityChart.options.scales.x.grid.color = gridColor;
      longevityChart.options.scales.x.ticks.color = labelColor;
      longevityChart.options.scales.y.grid.color = gridColor;
      longevityChart.options.scales.y.ticks.color = labelColor;
      longevityChart.options.plugins.tooltip.backgroundColor = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)';
      longevityChart.options.plugins.tooltip.titleColor = isDark ? '#ffffff' : '#0f172a';
      longevityChart.options.plugins.tooltip.bodyColor = isDark ? '#e2e8f0' : '#334155';
      longevityChart.options.plugins.tooltip.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)';
      
      longevityChart.update();
    }
  }

  // Initialize app state
  const initialTheme = getStoredTheme();
  applyTheme(initialTheme);
  initInputs();
  calculateAndRender(false);
});
