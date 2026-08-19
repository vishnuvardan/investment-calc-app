// FIRE & Wealth Tools: SIP Wealth Builder calculation logic

// Formats number to Indian Standard Currency representation (Rupees)
function formatINR(value, isCompact = false) {
  if (value === null || isNaN(value)) return '₹0';
  
  if (isCompact) {
    if (value >= 10000000) { // 1 Crore
      return '₹' + (value / 10000000).toFixed(2) + ' Cr';
    } else if (value >= 100000) { // 1 Lakh
      return '₹' + (value / 100000).toFixed(2) + ' L';
    } else if (value >= 1000) { // 1 Thousand
      return '₹' + (value / 1000).toFixed(1) + ' K';
    }
    return '₹' + value.toLocaleString('en-IN');
  }
  
  return '₹' + Math.round(value).toLocaleString('en-IN');
}

// Parses string representation of currency (INR) containing lakhs/crores back to numbers
function parseINRInput(str) {
  let clean = str.replace(/[₹,\s]/g, '').trim().toLowerCase();
  
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
  let sipChart = null;

  // Initialize Lucide Icons
  lucide.createIcons();

  // Definition of parameters configuration
  const inputsConfig = {
    initialLumpsum: {
      id: 'initialLumpsum',
      type: 'currency',
      default: 10000000,
      min: 0,
      max: 50000000,
      formatter: val => formatINR(val, false)
    },
    monthlySip: {
      id: 'monthlySip',
      type: 'currency',
      default: 100000,
      min: 1000,
      max: 1000000,
      formatter: val => formatINR(val, false)
    },
    stepUpRate: {
      id: 'stepUpRate',
      type: 'percent',
      default: 5,
      min: 0,
      max: 30,
      formatter: val => `${val}%`
    },
    expectedReturn: {
      id: 'expectedReturn',
      type: 'percent',
      default: 9.0,
      min: 4.0,
      max: 25.0,
      formatter: val => `${val.toFixed(2)}%`,
      urlParamName: 'sipExpectedReturn'
    },
    investmentYears: {
      id: 'investmentYears',
      type: 'int',
      default: 15,
      min: 1,
      max: 40,
      formatter: val => `${val} Years`
    },
    inflationRate: {
      id: 'inflationRate',
      type: 'percent',
      default: 6.0,
      min: 0,
      max: 12,
      formatter: val => `${val.toFixed(2)}%`,
      urlParamName: 'sipInflationRate'
    }
  };

  // Helper to adjust the background fill of range slider tracks (accent color on the left)
  function updateSliderTrack($slider) {
    const min = parseFloat($slider.attr('min'));
    const max = parseFloat($slider.attr('max'));
    const val = parseFloat($slider.val());
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
      const paramName = config.urlParamName || key;
      
      // Determine value from URL query parameters (highest priority) or defaults
      let val = config.default;
      
      if (urlParams.has(paramName)) {
        const parsed = parseFloat(urlParams.get(paramName));
        if (!isNaN(parsed)) {
          val = Math.max(config.min, Math.min(config.max, parsed));
        }
      }
      
      $slider.val(val);
      $input.val(config.formatter(val));
      
      updateSliderTrack($slider);
    });
  }

  // Update URL Query parameters with current parameter values, preserving other pages' parameters
  function updateURLQueryParams() {
    const params = new URLSearchParams(window.location.search);
    Object.keys(inputsConfig).forEach(key => {
      const config = inputsConfig[key];
      const paramName = config.urlParamName || key;
      const val = parseFloat($(`#${key}-slider`).val());
      params.set(paramName, val);
    });
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    try {
      window.history.replaceState(null, '', newUrl);
    } catch (e) {
      // Silently catch security exceptions if running locally via file:// protocol
    }
  }

  // Handlers for Slider changes
  $('input[type="range"]').on('input', function() {
    const id = $(this).attr('data-id');
    const val = parseFloat($(this).val());
    const config = inputsConfig[id];
    
    // Update numerical badge text box (while user is sliding)
    $(`#${id}-input`).val(config.formatter(val));
    updateSliderTrack($(this));
    
    // Update dashboard calculations with fast render (disable animation lag)
    calculateAndRender(true);
  }).on('change', function() {
    // Full animated updates on sliding end
    calculateAndRender(false);
  });

  // Handlers for numerical input box edits
  $('.text-input').on('focus', function() {
    const id = $(this).attr('data-id');
    const val = parseFloat($(`#${id}-slider`).val());
    // Display unformatted numeric value on focus
    $(this).val(val);
  }).on('blur', function() {
    const id = $(this).attr('data-id');
    const config = inputsConfig[id];
    let val = parseINRInput($(this).val());
    
    // Constrain input value to bounds
    val = Math.max(config.min, Math.min(config.max, val));
    
    // If percentage values, round to 2 decimals
    if (config.type === 'percent') {
      val = Math.round(val * 100) / 100;
    }
    
    const $slider = $(`#${id}-slider`);
    $slider.val(val);
    updateSliderTrack($slider);
    
    $(this).val(config.formatter(val));
    
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
      const config = inputsConfig[key];
      const paramName = config.urlParamName || key;
      const val = parseFloat($(`#${key}-slider`).val());
      params.set(paramName, val);
    });
    
    window.location.href = href + '?' + params.toString();
  });

  // Main math calculation and rendering engine
  function calculateAndRender(fastUpdate = false) {
    // Collect model parameters
    const initialLumpsum = parseFloat($('#initialLumpsum-slider').val());
    const monthlySip = parseFloat($('#monthlySip-slider').val());
    const stepUpRate = parseFloat($('#stepUpRate-slider').val()) / 100;
    const expectedReturn = parseFloat($('#expectedReturn-slider').val()) / 100;
    const investmentYears = parseInt($('#investmentYears-slider').val());
    const inflationRate = parseFloat($('#inflationRate-slider').val()) / 100;

    let results = [];
    let balance = initialLumpsum;
    let totalInvested = initialLumpsum;
    let r = expectedReturn / 12; // monthly rate

    // Month-by-month projection
    for (let y = 1; y <= investmentYears; y++) {
      let yearlyContribution = 0;
      // SIP amount for this year (adjusted for Step-Up compound rate)
      const monthlySipAmount = monthlySip * Math.pow(1 + stepUpRate, y - 1);

      for (let m = 1; m <= 12; m++) {
        balance = (balance + monthlySipAmount) * (1 + r);
        totalInvested += monthlySipAmount;
        yearlyContribution += monthlySipAmount;
      }

      const totalValue = balance;
      const wealthGained = totalValue - totalInvested;
      
      // Calculate inflation-adjusted real value
      const realValue = totalValue / Math.pow(1 + inflationRate, y);

      results.push({
        year: y,
        monthlySip: monthlySipAmount,
        yearlyContribution: yearlyContribution,
        totalInvested: totalInvested,
        wealthGained: wealthGained,
        totalValue: totalValue,
        realValue: realValue
      });
    }

    // Capture the last values for summary metrics
    const finalYear = results[results.length - 1];
    
    // Update summary metrics cards
    $('#val-totalInvested').text(formatINR(finalYear.totalInvested, true));
    $('#val-wealthGained').text(formatINR(finalYear.wealthGained, true));
    $('#val-nominalCorpus').text(formatINR(finalYear.totalValue, false));
    $('#val-realCorpus').text(formatINR(finalYear.realValue, true));
    
    const pctGrowth = ((finalYear.totalValue - finalYear.totalInvested) / finalYear.totalInvested * 100).toFixed(0);
    $('#metric-growth .metric-subtitle').text(`+${pctGrowth}% gain on principal`);
    $('#sub-realCorpus').text(`Equivalent purchasing power (at ${$('#inflationRate-slider').val()}% inflation)`);

    // Render year-by-year schedule progression table
    updateTableHTML(results);

    // Update Chart visual layers
    updateChart(results, fastUpdate);

    // Sync state values to URL search params
    updateURLQueryParams();
  }

  function updateTableHTML(results) {
    const $tbody = $('#financial-rows');
    $tbody.empty();

    for (const r of results) {
      const rowHtml = `
        <tr>
          <td class="text-center" style="font-weight: 600;">Year ${r.year}</td>
          <td class="text-center text-muted">${formatINR(r.monthlySip)}</td>
          <td class="num-col">${formatINR(r.yearlyContribution)}</td>
          <td class="num-col text-accent">${formatINR(r.totalInvested)}</td>
          <td class="num-col text-safe">+${formatINR(r.wealthGained)}</td>
          <td class="num-col" style="font-weight: 700;">${formatINR(r.totalValue)}</td>
          <td class="num-col text-warning" style="font-weight: 500;">${formatINR(r.realValue)}</td>
        </tr>
      `;
      $tbody.append(rowHtml);
    }
  }

  function updateChart(results, fastUpdate) {
    chartData = results;

    const labels = results.map(r => `Year ${r.year}`);
    const investedValues = results.map(r => r.totalInvested);
    const returnsValues = results.map(r => r.wealthGained);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const labelColor = isDark ? '#9ca3af' : '#475569';

    // Color theme variables matching system
    const investedColor = isDark ? '#3b82f6' : '#2563eb'; // blue
    const returnsColor = isDark ? '#10b981' : '#059669'; // emerald

    if (sipChart) {
      // Update existing chart instance
      sipChart.data.labels = labels;
      sipChart.data.datasets[0].data = investedValues;
      sipChart.data.datasets[0].borderColor = investedColor;
      sipChart.data.datasets[0].backgroundColor = isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.1)';
      
      sipChart.data.datasets[1].data = returnsValues;
      sipChart.data.datasets[1].borderColor = returnsColor;
      sipChart.data.datasets[1].backgroundColor = isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(5, 150, 105, 0.15)';

      sipChart.options.scales.x.grid.color = gridColor;
      sipChart.options.scales.x.ticks.color = labelColor;
      sipChart.options.scales.y.grid.color = gridColor;
      sipChart.options.scales.y.ticks.color = labelColor;

      sipChart.update(fastUpdate ? 'none' : undefined);
    } else {
      // Create a fresh Chart.js canvas
      const ctx = document.getElementById('sip-chart').getContext('2d');
      
      sipChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Invested Capital',
              data: investedValues,
              borderColor: investedColor,
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.1)',
              fill: true,
              borderWidth: 2,
              tension: 0.25,
              pointRadius: 0,
              pointHoverRadius: 5
            },
            {
              label: 'Wealth Gained',
              data: returnsValues,
              borderColor: returnsColor,
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(5, 150, 105, 0.15)',
              fill: true,
              borderWidth: 2,
              tension: 0.25,
              pointRadius: 0,
              pointHoverRadius: 5,
              stacked: true
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
                  family: 'Inter',
                  size: 11
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
                  return tooltipItems[0].label;
                },
                label: function(context) {
                  const index = context.dataIndex;
                  const r = chartData[index];
                  if (!r) return '';
                  
                  const isReturns = context.datasetIndex === 1;
                  if (isReturns) {
                    return `Wealth Gained: +${formatINR(r.wealthGained)}`;
                  } else {
                    return `Invested Capital: ${formatINR(r.totalInvested)}`;
                  }
                },
                footer: function(tooltipItems) {
                  const index = tooltipItems[0].dataIndex;
                  const r = chartData[index];
                  if (!r) return '';
                  
                  return [
                    `----------------------------`,
                    `Total Wealth: ${formatINR(r.totalValue)}`,
                    `Real Purchasing Power: ${formatINR(r.realValue)}`,
                    `Yearly SIP Contribution: ${formatINR(r.monthlySip * 12)}/yr`
                  ].join('\n');
                }
              }
            }
          }
        }
      });
    }
  }

  // Light/Dark Theme toggle logic
  const toggleBtn = $('#theme-toggle');
  const themeText = $('#theme-text');
  const lightIcon = $('#theme-icon-light');
  const darkIcon = $('#theme-icon-dark');

  // Check saved user theme preference from localStorage
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);

  toggleBtn.on('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Refresh chart to update grid line colors
    if (sipChart) {
      updateChartStyles();
    }
  });

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    if (theme === 'dark') {
      lightIcon.hide();
      darkIcon.show();
      themeText.text('Dark Mode');
    } else {
      darkIcon.hide();
      lightIcon.show();
      themeText.text('Light Mode');
    }
  }

  function updateChartStyles() {
    if (!sipChart) return;
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const labelColor = isDark ? '#9ca3af' : '#475569';
    
    // Color theme variables
    const investedColor = isDark ? '#3b82f6' : '#2563eb';
    const returnsColor = isDark ? '#10b981' : '#059669';

    // Update lines and ticks colors
    sipChart.options.scales.x.grid.color = gridColor;
    sipChart.options.scales.x.ticks.color = labelColor;
    sipChart.options.scales.y.grid.color = gridColor;
    sipChart.options.scales.y.ticks.color = labelColor;
    
    // Update legend font colors
    sipChart.options.plugins.legend.labels.color = labelColor;

    // Update datasets colors
    sipChart.data.datasets[0].borderColor = investedColor;
    sipChart.data.datasets[0].backgroundColor = isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.1)';
    
    sipChart.data.datasets[1].borderColor = returnsColor;
    sipChart.data.datasets[1].backgroundColor = isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(5, 150, 105, 0.15)';

    // Update tooltip theme options
    sipChart.options.plugins.tooltip.backgroundColor = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)';
    sipChart.options.plugins.tooltip.titleColor = isDark ? '#ffffff' : '#0f172a';
    sipChart.options.plugins.tooltip.bodyColor = isDark ? '#e2e8f0' : '#334155';
    sipChart.options.plugins.tooltip.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)';

    sipChart.update();
  }

  // Run the initialization routines
  initInputs();
  calculateAndRender(false);
});
