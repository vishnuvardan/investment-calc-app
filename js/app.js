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
    retirementAge: {
      id: 'retirementAge',
      type: 'int',
      default: 55,
      min: 21,
      max: 80,
      formatter: val => `${val} Years`
    },
    initialCorpus: {
      id: 'initialCorpus',
      type: 'currency',
      default: 10000000,
      min: 0,
      max: 100000000,
      formatter: val => formatINR(val, false)
    },
    monthlySip: {
      id: 'monthlySip',
      type: 'currency',
      default: 100000,
      min: 0,
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
      default: 12.0,
      min: 4.0,
      max: 25.0,
      formatter: val => `${val.toFixed(2)}%`
    },
    annualExpenses: {
      id: 'annualExpenses',
      type: 'currency',
      default: 1000000,
      min: 200000,
      max: 5000000,
      formatter: val => formatINR(val, false),
      extraUpdate: val => {
        const monthly = Math.round(val / 12);
        $('#annualExpenses-monthly').text(`(₹${monthly.toLocaleString('en-IN')}/mo)`);
      }
    },
    swpDuration: {
      id: 'swpDuration',
      type: 'int',
      default: 35,
      min: 1,
      max: 70,
      formatter: val => `${val} Years`
    },
    postExpectedReturn: {
      id: 'postExpectedReturn',
      type: 'percent',
      default: 8.5,
      min: 4.0,
      max: 15.0,
      formatter: val => `${val.toFixed(2)}%`
    },
    inflationRate: {
      id: 'inflationRate',
      type: 'percent',
      default: 6.0,
      min: 0.0,
      max: 12.0,
      formatter: val => `${val.toFixed(2)}%`
    },
    sideIncome: {
      id: 'sideIncome',
      type: 'currency',
      default: 0,
      min: 0,
      max: 500000,
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
    },
    milestoneAmount: {
      id: 'milestoneAmount',
      type: 'currency',
      default: 0,
      min: 0,
      max: 50000000,
      formatter: val => formatINR(val, false)
    },
    milestoneAge: {
      id: 'milestoneAge',
      type: 'int',
      default: 45,
      min: 21,
      max: 90,
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
    
    // Dynamically compute initial boundary constraints
    syncRetirementAgeBounds();
    syncSWPDurationBounds();
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

  function syncRetirementAgeBounds() {
    const startAge = parseInt($('#startAge-slider').val());
    const minRetirementAge = startAge + 1;
    const maxRetirementAge = 80;
    
    const $retirementSlider = $('#retirementAge-slider');
    const $retirementInput = $('#retirementAge-input');
    
    let currentRetirement = parseInt($retirementSlider.val());
    
    $retirementSlider.attr('min', minRetirementAge);
    $retirementSlider.attr('max', maxRetirementAge);
    inputsConfig.retirementAge.min = minRetirementAge;
    
    if (currentRetirement < minRetirementAge) {
      currentRetirement = Math.min(maxRetirementAge, startAge + 20);
      $retirementSlider.val(currentRetirement);
      if (!$retirementInput.is(':focus')) {
        $retirementInput.val(inputsConfig.retirementAge.formatter(currentRetirement));
      }
    }
    
    updateSliderTrack($retirementSlider);
  }

  function syncSWPDurationBounds() {
    const retirementAge = parseInt($('#retirementAge-slider').val());
    const maxDuration = Math.max(1, 90 - retirementAge);
    const $durationSlider = $('#swpDuration-slider');
    const $durationInput = $('#swpDuration-input');
    
    let currentDuration = parseInt($durationSlider.val());
    
    $durationSlider.attr('max', maxDuration);
    inputsConfig.swpDuration.max = maxDuration;
    
    if (currentDuration > maxDuration) {
      currentDuration = maxDuration;
      $durationSlider.val(currentDuration);
      if (!$durationInput.is(':focus')) {
        $durationInput.val(inputsConfig.swpDuration.formatter(currentDuration));
      }
    }
    
    updateSliderTrack($durationSlider);
  }

  function syncMilestoneAgeBounds() {
    const startAge = parseInt($('#startAge-slider').val());
    const minMilestoneAge = startAge + 1;
    const maxMilestoneAge = 90;
    
    const $milestoneSlider = $('#milestoneAge-slider');
    const $milestoneInput = $('#milestoneAge-input');
    
    let currentMilestone = parseInt($milestoneSlider.val());
    
    $milestoneSlider.attr('min', minMilestoneAge);
    $milestoneSlider.attr('max', maxMilestoneAge);
    inputsConfig.milestoneAge.min = minMilestoneAge;
    
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
    
    if (id === 'startAge') {
      syncRetirementAgeBounds();
      syncSWPDurationBounds();
      syncMilestoneAgeBounds();
    } else if (id === 'retirementAge') {
      syncSWPDurationBounds();
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
      syncRetirementAgeBounds();
      syncSWPDurationBounds();
      syncMilestoneAgeBounds();
    } else if (id === 'retirementAge') {
      syncSWPDurationBounds();
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
        syncRetirementAgeBounds();
        syncSWPDurationBounds();
        syncMilestoneAgeBounds();
      } else if (id === 'retirementAge') {
        syncSWPDurationBounds();
      }
      
      calculateAndRender(false);
    }
  });

  // Accordion Toggle
  $('.accordion-header').on('click', function() {
    $(this).toggleClass('open');
    $(this).next('.accordion-body').slideToggle(300);
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
  // Main math calculation and rendering engine
  function calculateAndRender(fastUpdate = false) {
    // Collect model parameters
    const startAge = parseInt($('#startAge-slider').val());
    const retirementAge = parseInt($('#retirementAge-slider').val());
    const initialCorpus = parseFloat($('#initialCorpus-slider').val());
    const monthlySip = parseFloat($('#monthlySip-slider').val());
    const stepUpRate = parseFloat($('#stepUpRate-slider').val()) / 100;
    const expectedReturn = parseFloat($('#expectedReturn-slider').val()) / 100;
    const annualExpenses = parseFloat($('#annualExpenses-slider').val());
    const swpDuration = parseInt($('#swpDuration-slider').val());
    const postExpectedReturn = parseFloat($('#postExpectedReturn-slider').val()) / 100;
    const inflationRate = parseFloat($('#inflationRate-slider').val()) / 100;
    const sideIncome = parseFloat($('#sideIncome-slider').val());
    const sideIncomeDuration = parseInt($('#sideIncomeDuration-slider').val());
    const milestoneAmount = parseFloat($('#milestoneAmount-slider').val());
    const milestoneAge = parseInt($('#milestoneAge-slider').val());

    let results = [];
    let balance = initialCorpus;
    let totalInvested = initialCorpus;
    let depleted = false;
    let depletionAge = null;
    let peakCorpus = initialCorpus;
    let peakAge = startAge;
    
    // Project until age 90
    const maxAge = 90;
    const totalYears = Math.max(1, maxAge - startAge);
    
    const isMilestoneEnabled = milestoneAmount > 0;
    if (isMilestoneEnabled) {
      $('#chart-milestone-indicator').show();
    } else {
      $('#chart-milestone-indicator').hide();
    }

    // Add starting age year 0 row
    results.push({
      year: 0,
      age: startAge,
      phase: 'Start',
      monthlySip: 0,
      yearlyContribution: 0,
      yearlyWithdrawal: 0,
      milestoneOutflow: 0,
      returns: 0,
      totalInvested: totalInvested,
      totalValue: initialCorpus,
      realValue: initialCorpus
    });

    // Month-by-month projection loop
    for (let y = 1; y <= totalYears; y++) {
      const age = startAge + y;
      let opening = balance;
      let yearlyContribution = 0;
      let yearlyWithdrawal = 0;
      let yearlyReturns = 0;
      let yearlySideIncome = 0;
      let milestoneOutflow = 0;
      let phase = age <= retirementAge ? 'Accumulation' : 'Withdrawal';
      
      if (phase === 'Accumulation') {
        const currentReturn = expectedReturn / 12;
        const monthlySipAmount = monthlySip * Math.pow(1 + stepUpRate, y - 1);
        
        for (let m = 1; m <= 12; m++) {
          const prevBalance = balance;
          balance = (balance + monthlySipAmount) * (1 + currentReturn);
          totalInvested += monthlySipAmount;
          yearlyContribution += monthlySipAmount;
          yearlyReturns += (balance - prevBalance - monthlySipAmount);
        }
      } else {
        // Decumulation (SWP) Phase
        const currentReturn = postExpectedReturn / 12;
        
        // Living Expenses
        let annualExpensesAmount = 0;
        if (age - retirementAge <= swpDuration) {
          annualExpensesAmount = annualExpenses * Math.pow(1 + inflationRate, (age - 1) - retirementAge);
        }
        const monthlySWPAmount = annualExpensesAmount / 12;
        
        // Side Income
        let monthlySideIncomeAmount = 0;
        if (age - retirementAge <= sideIncomeDuration) {
          monthlySideIncomeAmount = sideIncome;
        }
        
        for (let m = 1; m <= 12; m++) {
          const prevBalance = balance;
          const netMonthlyOutflow = Math.max(0, monthlySWPAmount - monthlySideIncomeAmount);
          
          if (balance >= netMonthlyOutflow) {
            balance = (balance - netMonthlyOutflow) * (1 + currentReturn);
            yearlyWithdrawal += netMonthlyOutflow;
            yearlySideIncome += Math.min(monthlySWPAmount, monthlySideIncomeAmount);
            yearlyReturns += (balance - prevBalance + netMonthlyOutflow);
          } else {
            // Depleted!
            yearlyWithdrawal += balance;
            yearlyReturns += (0 - prevBalance + balance);
            balance = 0;
            depleted = true;
            depletionAge = age;
            break; // exit monthly loop
          }
        }
      }
      
      // Milestone trigger at year end
      if (!depleted && age === milestoneAge && isMilestoneEnabled) {
        if (balance >= milestoneAmount) {
          balance -= milestoneAmount;
          milestoneOutflow = milestoneAmount;
        } else {
          milestoneOutflow = balance;
          balance = 0;
          depleted = true;
          depletionAge = age;
        }
      }

      const totalValue = balance;
      const realValue = totalValue / Math.pow(1 + inflationRate, y);
      
      if (totalValue > peakCorpus) {
        peakCorpus = totalValue;
        peakAge = age;
      }

      results.push({
        year: y,
        age: age,
        phase: phase,
        monthlySip: phase === 'Accumulation' ? monthlySip * Math.pow(1 + stepUpRate, y - 1) : 0,
        yearlyContribution: yearlyContribution,
        yearlyWithdrawal: yearlyWithdrawal,
        milestoneOutflow: milestoneOutflow,
        returns: yearlyReturns,
        totalInvested: totalInvested,
        totalValue: totalValue,
        realValue: realValue
      });

      if (depleted) {
        break; // stop projecting years if depleted
      }
    }

    const finalYear = results[results.length - 1];

    let themeStatus = 'safe'; // green
    let displayDepletion = 'Safe at 90+';
    let displayLongevity = `${totalYears}+ Years`;
    
    if (depleted && depletionAge !== null) {
      displayDepletion = `Age ${depletionAge}`;
      displayLongevity = `${depletionAge - startAge} Years`;
      
      if (depletionAge < 60) {
        themeStatus = 'danger'; // red
      } else if (depletionAge >= 60 && depletionAge < 75) {
        themeStatus = 'warning'; // orange
      }
    }

    // Dynamic Real Value at 90
    const realValueAt90 = finalYear.age >= 90 ? finalYear.realValue : 0;

    // Update metrics HTML
    updateMetricsHTML(peakCorpus, peakAge, displayDepletion, displayLongevity, totalInvested, realValueAt90, themeStatus);

    // Update Year-by-Year Table
    updateTableHTML(results, milestoneAge, isMilestoneEnabled);

    // Update Chart
    updateChart(results, startAge, depletionAge, milestoneAge, isMilestoneEnabled, themeStatus, fastUpdate);

    // Sync query parameters
    updateURLQueryParams();
  }

  function updateMetricsHTML(peak, peakAge, depletion, longevity, totalInvested, realCorpus, status) {
    // Reset card statuses
    $('.metric-card').removeClass('status-safe status-warning status-danger');
    
    // Apply status themes
    $('#metric-depletion').addClass(`status-${status}`);
    
    // 1. Peak Corpus
    $('#val-peak').text(formatINR(peak, false));
    $('#sub-peak').text(`Reached at Age ${peakAge}`);
    
    // 2. Depletion Age
    $('#val-depletion').text(depletion);
    $('#sub-depletion').text(`Active funded years: ${longevity}`);
    if (status === 'safe') {
      $('#icon-depletion').attr('data-lucide', 'check-circle').removeClass('text-danger text-warning').addClass('text-safe');
    } else if (status === 'warning') {
      $('#icon-depletion').attr('data-lucide', 'alert-circle').removeClass('text-safe text-danger').addClass('text-warning');
    } else {
      $('#icon-depletion').attr('data-lucide', 'alert-triangle').removeClass('text-safe text-warning').addClass('text-danger');
    }
    
    // 3. Total Invested (SIP)
    $('#val-totalInvested').text(formatINR(totalInvested, true));
    
    // 4. Real Value at Age 90
    $('#val-realCorpus').text(formatINR(realCorpus, true));
    $('#sub-realCorpus').text(`Equivalent today's ₹ (${$('#inflationRate-slider').val()}% inflation)`);
    
    // Re-draw icons
    lucide.createIcons();
  }

  function updateTableHTML(results, milestoneAge, isMilestoneEnabled) {
    const $tbody = $('#financial-rows');
    $tbody.empty();
    
    for (const r of results) {
      if (r.year === 0) continue; // skip start state in table
      
      let rowClass = '';
      let milestoneBadge = '';
      
      if (r.totalValue === 0) {
        rowClass = 'row-depleted-first';
      } else if (isMilestoneEnabled && r.age === milestoneAge) {
        rowClass = 'row-milestone';
        milestoneBadge = ' <span class="milestone-badge">Milestone</span>';
      }
      
      const sipCell = r.phase === 'Accumulation' && r.monthlySip > 0 
        ? formatINR(r.monthlySip) 
        : '<span style="opacity: 0.6; font-style: italic;">Stopped</span>';
        
      const swpCell = r.phase === 'Withdrawal' && r.yearlyWithdrawal > 0 
        ? `-${formatINR(r.yearlyWithdrawal)}` 
        : '<span style="opacity: 0.6; font-style: italic;">Stopped</span>';
        
      const returnCell = r.returns > 0 
        ? `+${formatINR(r.returns)}` 
        : '₹0';
        
      const rowHtml = `
        <tr class="${rowClass}">
          <td class="text-center" style="font-weight: 600;">Age ${r.age} (Year ${r.year})${milestoneBadge}</td>
          <td class="text-center text-muted">${r.phase}</td>
          <td class="num-col">${sipCell}</td>
          <td class="num-col text-danger">${swpCell}</td>
          <td class="num-col text-safe">${returnCell}</td>
          <td class="num-col" style="font-weight: 700;">${formatINR(r.totalValue)}</td>
          <td class="num-col text-warning" style="font-weight: 500;">${formatINR(r.realValue)}</td>
        </tr>
      `;
      $tbody.append(rowHtml);
    }
  }

  const phaseBackgroundsPlugin = {
    id: 'phaseBackgrounds',
    beforeDraw: (chart) => {
      const { ctx, chartArea: { top, bottom, left, right }, scales: { x, y } } = chart;
      const startAge = parseInt($('#startAge-slider').val());
      const retirementAge = parseInt($('#retirementAge-slider').val());
      
      const xStart = x.getPixelForValue(`Age ${startAge}`);
      const xRetire = x.getPixelForValue(`Age ${retirementAge}`);
      
      if (isNaN(xStart) || isNaN(xRetire)) return;
      
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      
      // Shaded blue for Accumulation phase
      ctx.fillStyle = isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(37, 99, 235, 0.03)';
      ctx.fillRect(left, top, Math.min(xRetire, right) - left, bottom - top);
      
      // Shaded amber for Decumulation phase
      if (xRetire < right) {
        ctx.fillStyle = isDark ? 'rgba(245, 158, 11, 0.05)' : 'rgba(217, 119, 6, 0.03)';
        ctx.fillRect(Math.max(xRetire, left), top, right - Math.max(xRetire, left), bottom - top);
      }
      
      // Draw text headings for phases
      ctx.font = '600 11px Outfit';
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.25)';
      ctx.textAlign = 'center';
      
      const sipCenter = left + (Math.min(xRetire, right) - left) / 2;
      if (sipCenter > left + 40) {
        ctx.fillText('ACCUMULATION (SIP)', sipCenter, top + 20);
      }
      
      if (xRetire < right) {
        const swpCenter = Math.max(xRetire, left) + (right - Math.max(xRetire, left)) / 2;
        if (swpCenter < right - 40) {
          ctx.fillText('RETIREMENT (SWP)', swpCenter, top + 20);
        }
      }
    }
  };

  function updateChart(results, startAge, depletionAge, milestoneAge, isMilestoneEnabled, status, fastUpdate) {
    chartData = results;

    const labels = chartData.map(r => `Age ${r.age}`);
    const corpusValues = chartData.map(r => r.totalValue);
    
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
                  return r.year === 0 ? `Age ${r.age} (Start)` : `Age ${r.age} (Year ${r.year})`;
                },
                label: function(context) {
                  const index = context.dataIndex;
                  const r = chartData[index];
                  if (!r) return [];
                  
                  if (r.phase === 'Start') {
                    return [
                      `Phase: Initial Start`,
                      `Corpus Balance: ${formatINR(r.totalValue)}`
                    ];
                  }
                  
                  const lines = [
                    `Phase: ${r.phase === 'Accumulation' ? 'Accumulation (SIP)' : 'Retirement (SWP)'}`
                  ];
                  
                  if (r.phase === 'Accumulation') {
                    lines.push(`Monthly SIP: ${formatINR(r.monthlySip)}`);
                    lines.push(`Yearly Contribution: +${formatINR(r.yearlyContribution)}`);
                  } else {
                    if (r.yearlyWithdrawal > 0) {
                      lines.push(`SWP Outflow: -${formatINR(r.yearlyWithdrawal)}`);
                    } else {
                      lines.push(`SWP Outflow: Stopped`);
                    }
                  }
                  
                  lines.push(`Returns Earned: +${formatINR(r.returns)}`);
                  
                  if (r.milestoneOutflow > 0) {
                    lines.push(`★ Milestone Outflow: -${formatINR(r.milestoneOutflow)}`);
                  }
                  
                  lines.push(`Ending Balance: ${formatINR(r.totalValue)}`);
                  lines.push(`Real Value (Today's ₹): ${formatINR(r.realValue)}`);
                  
                  return lines;
                }
              }
            }
          }
        },
        plugins: [phaseBackgroundsPlugin]
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
