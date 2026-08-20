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
  // Initialize Lucide Icons
  lucide.createIcons();

  // Active frequency state
  let activeFreq = 'monthly';
  
  // Chart instance holder
  let antiEmiChart = null;
  
  // Keep arrays for tooltip data
  let chartDataBalance = [];
  let chartDataOutofpocket = [];
  let chartDataInterest = [];
  let chartLabels = [];

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
    if (antiEmiChart) {
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
    targetCost: {
      id: 'targetCost',
      type: 'currency',
      default: 7000,
      min: 500,
      max: 50000000,
      formatter: val => formatINR(val, false)
    },
    targetDuration: {
      id: 'targetDuration',
      type: 'int',
      default: 4,
      min: 1,
      max: 120,
      formatter: val => {
        if (val < 12) {
          return `${val} Month${val > 1 ? 's' : ''}`;
        } else {
          const yrs = val / 12;
          const formattedYrs = yrs % 1 === 0 ? yrs.toFixed(0) : yrs.toFixed(2).replace(/\.00$/, '');
          return `${val} Months (${formattedYrs} Yr${yrs > 1 ? 's' : ''})`;
        }
      }
    },
    expectedRoi: {
      id: 'expectedRoi',
      type: 'percent',
      default: 8.00,
      min: 0.00,
      max: 15.00,
      formatter: val => `${val.toFixed(2)}%`
    }
  };

  // Helper date formatter (kept for display if needed)
  function formatDateYYYYMMDD(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Set default values from URL params or fallback to config defaults
  function initInputs() {
    const urlParams = new URLSearchParams(window.location.search);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    Object.keys(inputsConfig).forEach(key => {
      const config = inputsConfig[key];
      const $slider = $(`#${key}-slider`);
      const $input = $(`#${key}-input`);
      
      let val = config.default;
      
      // Backward compatibility: convert targetDate to duration in months
      if (key === 'targetDuration' && urlParams.has('targetDate')) {
        const paramDate = new Date(urlParams.get('targetDate'));
        if (!isNaN(paramDate.getTime()) && paramDate > today) {
          const diffTime = paramDate.getTime() - today.getTime();
          const months = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24 * 30.4375)));
          val = Math.max(config.min, Math.min(config.max, months));
        }
      } else if (urlParams.has(key)) {
        const parsed = parseFloat(urlParams.get(key));
        if (!isNaN(parsed)) {
          val = Math.max(config.min, Math.min(config.max, parsed));
        }
      }
      
      $slider.val(val);
      $input.val(config.formatter(val));
      updateSliderTrack($slider);
    });
  }

  // Retain parameters when navigating back to Master Planner
  $('header .nav-link').on('click', function(e) {
    e.preventDefault();
    const href = $(this).attr('href');
    const params = new URLSearchParams(window.location.search);
    
    params.set('targetCost', $('#targetCost-slider').val());
    params.set('targetDuration', $('#targetDuration-slider').val());
    params.set('expectedRoi', $('#expectedRoi-slider').val());
    
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
      calculateAndRender(false);
    }
  });

  // Frequency Tab clicks
  $('.freq-tab').on('click', function() {
    if ($(this).attr('disabled')) return;
    $('.freq-tab').removeClass('active');
    $(this).addClass('active');
    activeFreq = $(this).attr('data-freq');
    calculateAndRender(false);
  });

  function calculateAndRender(fastUpdate = false) {
    const targetCost = parseFloat($('#targetCost-slider').val());
    const targetDuration = parseInt($('#targetDuration-slider').val());
    const roi = parseFloat($('#expectedRoi-slider').val());
    const roiRate = roi / 100;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    // Calculate virtual target date by adding targetDuration months to today
    const targetDate = new Date(todayDate);
    targetDate.setMonth(todayDate.getMonth() + targetDuration);

    const diffTime = targetDate.getTime() - todayDate.getTime();
    // Total days (exact count)
    const D = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    const W = D / 7;
    const M = targetDuration;
    const Y = D / 365.25;

    // Format target date for display
    const formattedTargetDate = targetDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // Check disable Yearly tab
    if (D < 365) {
      $('.freq-tab[data-freq="yearly"]').attr('disabled', true);
      if (activeFreq === 'yearly') {
        activeFreq = 'monthly';
        $('.freq-tab').removeClass('active');
        $('.freq-tab[data-freq="monthly"]').addClass('active');
      }
    } else {
      $('.freq-tab[data-freq="yearly"]').removeAttr('disabled');
    }

    // Determine parameters based on active tab frequency
    let periods = 0;
    let i = 0;
    let freqLabel = '';
    let periodName = '';

    if (activeFreq === 'daily') {
      periods = D;
      i = Math.pow(1 + roiRate, 1 / 365) - 1;
      freqLabel = 'day';
      periodName = 'day';
    } else if (activeFreq === 'weekly') {
      periods = Math.max(1, Math.round(W));
      i = Math.pow(1 + roiRate, 1 / 52) - 1;
      freqLabel = 'week';
      periodName = 'week';
    } else if (activeFreq === 'monthly') {
      periods = Math.max(1, Math.round(M));
      i = Math.pow(1 + roiRate, 1 / 12) - 1;
      freqLabel = 'month';
      periodName = 'month';
    } else { // yearly
      periods = Math.max(1, Math.round(Y));
      i = roiRate;
      freqLabel = 'year';
      periodName = 'year';
    }

    // Deposit amount calculation
    let deposit = 0;
    if (roiRate === 0) {
      deposit = targetCost / periods;
    } else {
      deposit = (targetCost * i) / (Math.pow(1 + i, periods) - 1);
    }

    const totalOutOfPocket = deposit * periods;
    const interestEarned = Math.max(0, targetCost - totalOutOfPocket);

    // Update Hero Cards
    $('#deposit-card-title').text(`Reverse EMI (${activeFreq.charAt(0).toUpperCase() + activeFreq.slice(1)})`);
    $('#val-deposit').html(formatINR(deposit) + ' <span style="font-size: 1.25rem; font-weight: 500; color: var(--text-secondary);">/ ' + freqLabel + '</span>');
    $('#sub-deposit').html('For the next <strong>' + periods + ' ' + periodName + (periods > 1 ? 's' : '') + '</strong> until <strong>' + formattedTargetDate + '</strong>');

    // Update KPI Badges
    $('#val-time').text(`${D} Days`);
    $('#sub-time').text(`${Math.round(W)} Weeks / ${Math.round(M)} Months`);

    $('#val-bonus').text(formatINR(interestEarned));
    $('#sub-bonus').text('Gained from return yields');

    // Dynamic Credit Card trap details
    const ccMonths = Math.max(1, Math.round(M));
    const ccRate = 0.16; // 16% p.a.
    const ccMonthlyRate = ccRate / 12;

    const ccEmi = (targetCost * ccMonthlyRate * Math.pow(1 + ccMonthlyRate, ccMonths)) / (Math.pow(1 + ccMonthlyRate, ccMonths) - 1);
    const totalCcEmi = ccEmi * ccMonths;
    const ccInterest = totalCcEmi - targetCost;
    const ccInterestGst = ccInterest * 0.18;
    
    // CC Processing fee: 1.5% of purchase cost (min ₹149) + 18% GST
    const ccProcessingFee = Math.max(149, targetCost * 0.015);
    const ccProcessingGst = ccProcessingFee * 0.18;

    const ccTotalPaid = totalCcEmi + ccInterestGst + ccProcessingFee + ccProcessingGst;
    const ccExtra = ccTotalPaid - targetCost;

    $('#cc-total-paid').text(formatINR(ccTotalPaid));
    $('#cc-bank-earned').text(formatINR(ccExtra));

    $('#compounding-rate-label').text(`${roi.toFixed(2)}%`);
    $('#anti-total-paid').text(formatINR(totalOutOfPocket));
    $('#anti-saved-bonus').text(`-${formatINR(interestEarned)}`);

    const netWin = ccTotalPaid - totalOutOfPocket;
    $('#val-win').html('You save ~<strong>' + formatINR(netWin) + '</strong> just by planning ahead!');

    // Update URL Query parameters
    updateURLQueryParams(targetCost, targetDuration, roi);

    // Refresh Lucide Icons
    lucide.createIcons();

    // Prepare chart data points
    prepareChartDataPoints(targetCost, periods, i, roiRate, deposit, activeFreq);

    // Update Chart.js visualization
    renderChart(targetCost, fastUpdate);
  }

  function updateURLQueryParams(targetCost, targetDuration, roi) {
    const params = new URLSearchParams(window.location.search);
    params.set('targetCost', targetCost);
    params.set('targetDuration', targetDuration);
    params.delete('targetDate');
    params.set('expectedRoi', roi);
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    try {
      window.history.replaceState(null, '', newUrl);
    } catch (e) {
      // Silently catch exceptions when running via file://
    }
  }

  function prepareChartDataPoints(targetCost, periods, i, roiRate, deposit, activeFreq) {
    chartDataBalance = [];
    chartDataOutofpocket = [];
    chartDataInterest = [];
    chartLabels = [];

    // Sample points for high performance if periods are large
    const maxPoints = 80;
    let pointsToRender = [];
    
    if (periods <= maxPoints) {
      for (let t = 0; t <= periods; t++) {
        pointsToRender.push(t);
      }
    } else {
      pointsToRender.push(0);
      const step = periods / maxPoints;
      for (let idx = 1; idx < maxPoints; idx++) {
        pointsToRender.push(Math.round(idx * step));
      }
      pointsToRender.push(periods);
    }

    // De-duplicate
    pointsToRender = [...new Set(pointsToRender)];

    pointsToRender.forEach(t => {
      let balance = 0;
      let outOfPocket = deposit * t;
      
      if (t > 0) {
        if (roiRate === 0) {
          balance = deposit * t;
        } else {
          balance = deposit * ((Math.pow(1 + i, t) - 1) / i);
        }
      }

      if (t === periods) {
        balance = targetCost;
      }

      const interest = Math.max(0, balance - outOfPocket);

      chartDataBalance.push(balance);
      chartDataOutofpocket.push(outOfPocket);
      chartDataInterest.push(interest);

      const freqNameCap = activeFreq.charAt(0).toUpperCase() + activeFreq.slice(1, -2);
      if (activeFreq === 'daily') {
        chartLabels.push(`Day ${t}`);
      } else if (activeFreq === 'weekly') {
        chartLabels.push(`Week ${t}`);
      } else if (activeFreq === 'monthly') {
        chartLabels.push(`Month ${t}`);
      } else {
        chartLabels.push(`Year ${t}`);
      }
    });
  }

  function renderChart(targetCost, fastUpdate) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const labelColor = isDark ? '#9ca3af' : '#475569';
    
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#6366f1';
    const safeColor = getComputedStyle(document.documentElement).getPropertyValue('--safe-color').trim() || '#10b981';
    const safeBg = getComputedStyle(document.documentElement).getPropertyValue('--safe-bg').trim() || 'rgba(16, 185, 129, 0.1)';

    // Benchmark line representing target cost (constant value dataset)
    const benchmarkData = Array(chartLabels.length).fill(targetCost);

    if (antiEmiChart) {
      antiEmiChart.data.labels = chartLabels;
      
      // Dataset 1: Accumulated Balance
      antiEmiChart.data.datasets[0].data = chartDataBalance;
      antiEmiChart.data.datasets[0].borderColor = safeColor;
      antiEmiChart.data.datasets[0].backgroundColor = createGradient(antiEmiChart.ctx, safeBg);
      
      // Dataset 2: Target Cost Benchmark
      antiEmiChart.data.datasets[1].data = benchmarkData;
      antiEmiChart.data.datasets[1].borderColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)';

      antiEmiChart.options.scales.x.grid.color = gridColor;
      antiEmiChart.options.scales.x.ticks.color = labelColor;
      antiEmiChart.options.scales.y.grid.color = gridColor;
      antiEmiChart.options.scales.y.ticks.color = labelColor;

      antiEmiChart.update(fastUpdate ? 'none' : undefined);
    } else {
      const ctx = document.getElementById('anti-emi-chart').getContext('2d');
      antiEmiChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: 'Accumulated Fund',
              data: chartDataBalance,
              borderColor: safeColor,
              backgroundColor: createGradient(ctx, safeBg),
              fill: true,
              borderWidth: 3.5,
              tension: 0.35,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointBackgroundColor: safeColor,
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2
            },
            {
              label: 'Target Cost (Goal)',
              data: benchmarkData,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)',
              borderWidth: 2,
              borderDash: [6, 6],
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 0
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
                label: function(context) {
                  const idx = context.dataIndex;
                  const datasetIdx = context.datasetIndex;

                  if (datasetIdx === 1) {
                    return `Target Cost Goal: ${formatINR(context.raw)}`;
                  }

                  const bal = chartDataBalance[idx];
                  const oop = chartDataOutofpocket[idx];
                  const intr = chartDataInterest[idx];

                  return [
                    `Total Accumulated Fund: ${formatINR(bal)}`,
                    `Out-of-Pocket Savings: ${formatINR(oop)}`,
                    `Compounding Interest Earned: ${formatINR(intr)}`
                  ];
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
    
    if (antiEmiChart) {
      antiEmiChart.options.scales.x.grid.color = gridColor;
      antiEmiChart.options.scales.x.ticks.color = labelColor;
      antiEmiChart.options.scales.y.grid.color = gridColor;
      antiEmiChart.options.scales.y.ticks.color = labelColor;
      
      antiEmiChart.options.plugins.legend.labels.color = labelColor;
      antiEmiChart.options.plugins.tooltip.backgroundColor = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)';
      antiEmiChart.options.plugins.tooltip.titleColor = isDark ? '#ffffff' : '#0f172a';
      antiEmiChart.options.plugins.tooltip.bodyColor = isDark ? '#e2e8f0' : '#334155';
      antiEmiChart.options.plugins.tooltip.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)';
      
      antiEmiChart.data.datasets[1].borderColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)';

      antiEmiChart.update();
    }
  }

  // Initial Theme load
  const initialTheme = getStoredTheme();
  applyTheme(initialTheme);
  
  // Start inputs and calculations
  initInputs();
  calculateAndRender(false);
});
