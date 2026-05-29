// ==========================================================================
// LifeOS AI App Orchestration & UI Controller
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Global States
  let currentProfile = null;
  let dashboardData = null;
  let activeView = 'dashboard';
  
  // Default list of habits for onboarding
  const DEFAULT_HABITS = [
    { id: 'h1', name: 'Exercise', icon: 'flame' },
    { id: 'h2', name: '8 Glasses of Water', icon: 'droplet' },
    { id: 'h3', name: 'Meditation', icon: 'compass' },
    { id: 'h4', name: 'No Screens 1h before Sleep', icon: 'eye-off' },
    { id: 'h5', name: 'Read a Book', icon: 'book-open' }
  ];

  // Selected habits list during onboarding wizard
  let wizardSelectedHabits = [...DEFAULT_HABITS];

  // Initialize UI Elements
  const authSection = document.getElementById('auth-section');
  const onboardingSection = document.getElementById('onboarding-section');
  const appContainer = document.getElementById('app-container');

  // ==================== TOAST NOTIFICATION ENGINE ==================== */
  function showToast(message, type = 'info', duration = 6000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'warning') iconName = 'alert-triangle';
    if (type === 'danger') iconName = 'shield-alert';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons(); // Initialize the icon in new toast

    // Dismiss toast after duration
    setTimeout(() => {
      toast.classList.add('dismissing');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, duration);
  }

  // Intercept authentication errors
  window.addEventListener('auth-expired', () => {
    showToast('Your session has expired. Please log in again.', 'warning');
    renderAuthView();
  });

  // Periodical custom notifications to demonstrate active recommendations
  const activeNudges = [
    { text: "💧 Hydration Nudge: It's been 60 mins. Drink a glass of water to maintain focus.", type: "info" },
    { text: "🧘 Focus Alert: You've been coding for a while. Take a 2-minute posture stretch.", type: "success" },
    { text: "👁️ Eye Protection: Use the 20-20-20 rule. Look at something 20 feet away for 20 seconds.", type: "warning" },
    { text: "🚨 LifeOS Tip: High work density detected. Take a 5-minute screen-free breather.", type: "danger" }
  ];

  let nudgeIndex = 0;
  setInterval(() => {
    if (API.isAuthenticated()) {
      const nudge = activeNudges[nudgeIndex];
      showToast(nudge.text, nudge.type, 7000);
      nudgeIndex = (nudgeIndex + 1) % activeNudges.length;
    }
  }, 45000); // Send notification tips every 45 seconds for active presentation

  // ==================== ROUTING & VIEW CONTROLLER ==================== */
  function switchView(viewName) {
    activeView = viewName;
    
    // Toggle active link states
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Toggle viewport sections
    document.querySelectorAll('.workspace-view').forEach(view => {
      if (view.id === `view-${viewName}`) {
        view.classList.remove('hidden');
      } else {
        view.classList.add('hidden');
      }
    });

    // Update Header title
    const viewTitles = {
      dashboard: 'Cognitive Control Dashboard',
      tasks: 'Schedule & Focus Checklist',
      habits: 'Habit Matrix Vault',
      profile: 'Core Profile Configuration'
    };
    document.getElementById('view-title').innerText = viewTitles[viewName] || 'LifeOS AI';

    // Trigger specific view setups
    if (viewName === 'dashboard') {
      loadDashboard();
    } else if (viewName === 'tasks') {
      loadTasksPage();
    } else if (viewName === 'habits') {
      loadHabitsVault();
    } else if (viewName === 'profile') {
      loadProfilePage();
    }
  }

  // Bind navigation links
  document.querySelectorAll('.nav-link[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-view');
      switchView(target);
    });
  });

  // ==================== AUTHENTICATION ACTIONS ==================== */
  // Toggle registration and login panels
  document.getElementById('go-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form-container').classList.add('hidden');
    document.getElementById('register-form-container').classList.remove('hidden');
  });

  document.getElementById('go-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form-container').classList.add('hidden');
    document.getElementById('login-form-container').classList.remove('hidden');
  });

  // Login handler
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userEl = document.getElementById('login-username');
    const passEl = document.getElementById('login-password');
    
    try {
      await API.login(userEl.value.trim(), passEl.value);
      showToast('Session initiated successfully!', 'success');
      userEl.value = '';
      passEl.value = '';
      checkSessionState();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Registration handler
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userEl = document.getElementById('register-username');
    const passEl = document.getElementById('register-password');

    try {
      await API.register(userEl.value.trim(), passEl.value);
      showToast('Registration complete. Profile created!', 'success');
      userEl.value = '';
      passEl.value = '';
      checkSessionState();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Logout handler
  document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    API.logout();
    showToast('Terminal session terminated.', 'info');
    renderAuthView();
  });

  // Determine viewport layout based on authentication
  function renderAuthView() {
    authSection.classList.remove('hidden');
    onboardingSection.classList.add('hidden');
    appContainer.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  async function checkSessionState() {
    if (!API.isAuthenticated()) {
      renderAuthView();
      return;
    }

    const user = API.getCurrentUser();
    document.getElementById('display-username').innerText = user.username;
    document.getElementById('user-avatar-initial').innerText = user.username[0].toUpperCase();

    try {
      currentProfile = await API.getProfile();
      
      // If goals array is empty, force onboarding wizard flow
      if (!currentProfile || !currentProfile.goals || currentProfile.goals.length === 0) {
        showOnboardingWizard();
      } else {
        authSection.classList.add('hidden');
        onboardingSection.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        // Initialize dashboard viewport
        switchView('dashboard');
      }
    } catch (err) {
      showToast('Failed to pull profile preferences', 'danger');
    }
  }

  // ==================== ONBOARDING WIZARD FLOW ==================== */
  let wizardStep = 1;

  function showOnboardingWizard() {
    authSection.classList.add('hidden');
    appContainer.classList.add('hidden');
    onboardingSection.classList.remove('hidden');
    wizardStep = 1;
    updateWizardStepUI();
    populateOnboardingHabits();
  }

  function updateWizardStepUI() {
    document.getElementById('current-step-num').innerText = wizardStep;
    document.getElementById('wizard-progress').style.width = `${(wizardStep / 3) * 100}%`;

    // Toggle steps visual views
    for (let i = 1; i <= 3; i++) {
      const el = document.getElementById(`step-${i}`);
      if (i === wizardStep) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }

    // Toggle back button
    const backBtn = document.getElementById('prev-step-btn');
    if (wizardStep === 1) {
      backBtn.classList.add('hidden');
    } else {
      backBtn.classList.remove('hidden');
    }

    // Update next/finish button label
    const nextBtn = document.getElementById('next-step-btn');
    if (wizardStep === 3) {
      nextBtn.innerHTML = `<span>Finish Configuration</span> <i data-lucide="check"></i>`;
    } else {
      nextBtn.innerHTML = `<span>Continue</span> <i data-lucide="arrow-right"></i>`;
    }
    lucide.createIcons();
  }

  // Step 2 Value changes display
  document.getElementById('onboard-sleep-target').addEventListener('input', (e) => {
    document.getElementById('sleep-target-val').innerText = `${parseFloat(e.target.value).toFixed(1)} hrs`;
  });
  document.getElementById('onboard-work-target').addEventListener('input', (e) => {
    document.getElementById('work-target-val').innerText = `${parseFloat(e.target.value).toFixed(1)} hrs`;
  });

  // Populate checklist choices in onboarding Step 3
  function populateOnboardingHabits() {
    const listEl = document.getElementById('habits-selection-list');
    listEl.innerHTML = '';

    wizardSelectedHabits.forEach((habit) => {
      const card = document.createElement('div');
      card.className = 'habit-selection-card';
      card.innerHTML = `
        <label>
          <input type="checkbox" data-id="${habit.id}" checked>
          <i data-lucide="${habit.icon}" class="text-indigo"></i>
          <span>${habit.name}</span>
        </label>
        <button type="button" class="btn-remove-habit" data-id="${habit.id}">
          <i data-lucide="trash-2" class="icon-tiny"></i>
        </button>
      `;
      listEl.appendChild(card);
    });

    // Bind remove button listeners
    listEl.querySelectorAll('.btn-remove-habit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        wizardSelectedHabits = wizardSelectedHabits.filter(h => h.id !== id);
        populateOnboardingHabits();
      });
    });

    lucide.createIcons();
  }

  // Add custom habits during wizard
  document.getElementById('add-custom-habit-btn').addEventListener('click', () => {
    const input = document.getElementById('new-habit-name');
    const name = input.value.trim();
    if (!name) return;

    const id = 'custom-h-' + Math.random().toString(36).substr(2, 5);
    wizardSelectedHabits.push({ id, name, icon: 'activity' });
    input.value = '';
    populateOnboardingHabits();
    showToast(`Added custom habit: ${name}`, 'success');
  });

  // Navigation handlers within Wizard
  document.getElementById('prev-step-btn').addEventListener('click', () => {
    if (wizardStep > 1) {
      wizardStep--;
      updateWizardStepUI();
    }
  });

  document.getElementById('next-step-btn').addEventListener('click', async () => {
    if (wizardStep < 3) {
      wizardStep++;
      updateWizardStepUI();
    } else {
      // Step 3 Finish submit: Collect all fields
      const goals = Array.from(document.querySelectorAll('input[name="goals"]:checked')).map(el => el.value);
      const sleepTarget = parseFloat(document.getElementById('onboard-sleep-target').value);
      const workHoursTarget = parseFloat(document.getElementById('onboard-work-target').value);

      // Collect checked habits from the list
      const checkedHabitIds = Array.from(document.querySelectorAll('#habits-selection-list input[type="checkbox"]:checked'))
        .map(el => el.getAttribute('data-id'));
      
      const habitsList = wizardSelectedHabits.filter(h => checkedHabitIds.includes(h.id));

      const profilePayload = {
        goals,
        routines: { morning: 'Stretch & Hydrate', evening: 'Decompress & Read' },
        habitsList,
        sleepTarget,
        workHoursTarget
      };

      try {
        await API.updateProfile(profilePayload);
        showToast('Onboarding complete! Welcome to LifeOS AI.', 'success');
        checkSessionState(); // Reload session configurations
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  });

  // ==================== VIEW: DASHBOARD LOADING & STATS ==================== */
  async function loadDashboard() {
    try {
      dashboardData = await API.getDashboardSummary();
      
      // Update stats cards text
      document.getElementById('dashboard-productivity-score').innerText = `${dashboardData.productivityScore}%`;
      document.getElementById('score-mini-progress').style.width = `${dashboardData.productivityScore}%`;
      document.getElementById('dashboard-habit-streak').innerText = `${dashboardData.streak} Days`;
      
      // Calculate sleep target offset
      const recentLogs = dashboardData.recentLogs;
      if (recentLogs.length > 0) {
        const latest = recentLogs[recentLogs.length - 1];
        const sleepDelta = latest.sleepHours - dashboardData.profile.sleepTarget;
        const sleepSign = sleepDelta >= 0 ? '+' : '';
        document.getElementById('dashboard-sleep-delta').innerText = `${sleepSign}${sleepDelta.toFixed(1)} hrs`;
        
        const descEl = document.getElementById('sleep-deficit-desc');
        if (sleepDelta < -1.5) {
          descEl.innerText = '🚨 High sleep deficit logged';
          descEl.className = 'stat-extra text-red';
        } else if (sleepDelta < 0) {
          descEl.innerText = '⚠️ Minor sleep debt';
          descEl.className = 'stat-extra text-yellow';
        } else {
          descEl.innerText = '🟢 Target sleep achieved';
          descEl.className = 'stat-extra text-green';
        }
      } else {
        document.getElementById('dashboard-sleep-delta').innerText = '0.0 hrs';
      }

      // Update Burnout risk card details
      const aiReport = dashboardData.aiReport;
      const riskCard = document.getElementById('burnout-status-card');
      const riskText = document.getElementById('dashboard-burnout-risk');
      const riskScore = document.getElementById('dashboard-burnout-score');
      const riskExtra = document.getElementById('burnout-card-extra');
      const headerAlert = document.getElementById('burnout-header-alert');

      riskText.innerText = aiReport.burnoutRisk.toUpperCase();
      riskScore.innerText = `Index Score: ${aiReport.burnoutScore}/100`;
      
      // Reset card border classes
      riskCard.className = 'stat-card glass-card';
      
      if (aiReport.burnoutRisk === 'critical') {
        riskCard.classList.add('border-glow-red');
        riskExtra.innerHTML = '<span class="danger-dot"></span> Action Required Now';
        riskExtra.className = 'stat-extra text-red';
        headerAlert.classList.remove('hidden');
      } else if (aiReport.burnoutRisk === 'moderate') {
        riskCard.classList.add('border-glow-yellow');
        riskExtra.innerText = '⚠️ Balance work and rest';
        riskExtra.className = 'stat-extra text-yellow';
        headerAlert.classList.add('hidden');
      } else {
        riskCard.classList.add('border-glow-green');
        riskExtra.innerText = '🟢 Performance levels optimal';
        riskExtra.className = 'stat-extra text-green';
        headerAlert.classList.add('hidden');
      }

      // Populate AI Report Section
      document.getElementById('ai-insight-text').innerText = aiReport.insight;
      document.getElementById('ai-predictions-text').innerText = aiReport.predictions;

      const recommendationsUl = document.getElementById('ai-recommendations-ul');
      recommendationsUl.innerHTML = '';
      aiReport.recoveryActions.forEach(act => {
        const li = document.createElement('li');
        li.innerText = act;
        recommendationsUl.appendChild(li);
      });

      // Render Habits Checklist Widget
      renderDashboardHabits();

      // Render Tasks List Widget
      renderDashboardTasks();

      // Populate Date display
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      document.getElementById('current-date-display').innerText = new Date().toLocaleDateString(undefined, options);

      // Redraw Dynamic Chart
      initPerformanceChart('performanceChart');
      updatePerformanceChart(recentLogs);

      lucide.createIcons();
    } catch (err) {
      showToast('Error syncing dashboard elements', 'danger');
    }
  }

  // Dashboard Habits Widget
  function renderDashboardHabits() {
    const container = document.getElementById('dashboard-habits-list');
    container.innerHTML = '';

    const habitsList = dashboardData.profile.habitsList || [];
    const recentLogs = dashboardData.recentLogs;
    
    // Find today's log entries to mark checkboxes
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLog = recentLogs.find(l => l.date === todayStr);
    const habitsLogged = todayLog ? todayLog.habitsLogged : {};

    let completedCount = 0;
    
    if (habitsList.length === 0) {
      container.innerHTML = `<p class="text-dark text-center mt-4">No habits configured. Go to Profile Settings.</p>`;
      document.getElementById('habits-progress-badge').innerText = '0%';
      document.getElementById('habits-progress-bar').style.width = '0%';
      return;
    }

    habitsList.forEach(habit => {
      const completed = !!habitsLogged[habit.id];
      if (completed) completedCount++;

      const row = document.createElement('div');
      row.className = `habit-row ${completed ? 'completed' : ''}`;
      row.innerHTML = `
        <div class="habit-info">
          <div class="habit-icon-wrap active-${habit.id}">
            <i data-lucide="${habit.icon || 'activity'}"></i>
          </div>
          <span>${habit.name}</span>
        </div>
        <div class="habit-checkbox" data-id="${habit.id}">
          <i data-lucide="check"></i>
        </div>
      `;

      // Click to toggle habit check
      row.querySelector('.habit-checkbox').addEventListener('click', async () => {
        // Toggle in-memory log
        const logPayload = todayLog ? { ...todayLog } : {
          date: todayStr,
          sleepHours: dashboardData.profile.sleepTarget,
          workHours: 0,
          moodScore: 3,
          energyScore: 3,
          habitsLogged: {}
        };

        if (!logPayload.habitsLogged) logPayload.habitsLogged = {};
        logPayload.habitsLogged[habit.id] = !logPayload.habitsLogged[habit.id];

        try {
          await API.saveLog(logPayload);
          loadDashboard(); // reload stats and score
          showToast(`Logged status for habit: ${habit.name}`, 'success');
        } catch (err) {
          showToast(err.message, 'danger');
        }
      });

      container.appendChild(row);
    });

    // Update Habit Progress Bar
    const rate = Math.round((completedCount / habitsList.length) * 100);
    document.getElementById('habits-progress-badge').innerText = `${rate}% Complete`;
    document.getElementById('habits-progress-bar').style.width = `${rate}%`;
  }

  // Dashboard Tasks Widget
  function renderDashboardTasks() {
    const container = document.getElementById('dashboard-tasks-list');
    container.innerHTML = '';

    const tasks = dashboardData.tasks || [];
    if (tasks.length === 0) {
      container.innerHTML = `<p class="text-dark text-center mt-4">Focus checklist empty. Add tasks to proceed.</p>`;
      return;
    }

    tasks.forEach(task => {
      const row = document.createElement('div');
      row.className = `task-row ${task.completed ? 'completed' : ''}`;
      row.innerHTML = `
        <div class="task-left">
          <div class="task-checkbox" data-id="${task.id}">
            <i data-lucide="check"></i>
          </div>
          <div>
            <span class="task-title-text">${task.title}</span>
            <div class="task-tags">
              <span class="task-tag tag-${task.priority}">${task.priority}</span>
              <span class="task-tag" style="background:rgba(255,255,255,0.03);color:#94a3b8">${task.category}</span>
            </div>
          </div>
        </div>
        <button class="btn-delete-task" data-id="${task.id}">
          <i data-lucide="trash-2" class="icon-tiny"></i>
        </button>
      `;

      // Check off listener
      row.querySelector('.task-checkbox').addEventListener('click', async () => {
        try {
          await API.toggleTask(task.id);
          loadDashboard();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      });

      // Delete listener
      row.querySelector('.btn-delete-task').addEventListener('click', async () => {
        try {
          await API.deleteTask(task.id);
          showToast('Task removed from agenda', 'info');
          loadDashboard();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      });

      container.appendChild(row);
    });
  }

  // ==================== DAILY LOGGER MODAL OPERATIONS ==================== */
  const logModal = document.getElementById('log-modal');
  
  // Show Daily Log Modal
  document.getElementById('quick-log-btn').addEventListener('click', () => {
    // Reset date input to today
    const dateInput = document.getElementById('log-date');
    const todayStr = new Date().toISOString().split('T')[0];
    dateInput.value = todayStr;

    // Load values if already logged today
    const logs = dashboardData ? dashboardData.recentLogs : [];
    const todayLog = logs.find(l => l.date === todayStr);

    const sleepSlider = document.getElementById('log-sleep-hours');
    const workSlider = document.getElementById('log-work-hours');

    if (todayLog) {
      sleepSlider.value = todayLog.sleepHours;
      workSlider.value = todayLog.workHours;
      
      // Select energy radio
      const energyRadio = document.querySelector(`input[name="energyScore"][value="${todayLog.energyScore}"]`);
      if (energyRadio) energyRadio.checked = true;

      // Select mood radio
      const moodRadio = document.querySelector(`input[name="moodScore"][value="${todayLog.moodScore}"]`);
      if (moodRadio) moodRadio.checked = true;
    } else {
      sleepSlider.value = dashboardData ? dashboardData.profile.sleepTarget : 8.0;
      workSlider.value = dashboardData ? dashboardData.profile.workHoursTarget : 8.0;
    }

    document.getElementById('log-sleep-val').innerText = `${parseFloat(sleepSlider.value).toFixed(1)} hrs`;
    document.getElementById('log-work-val').innerText = `${parseFloat(workSlider.value).toFixed(1)} hrs`;

    // Render modal habits grid
    renderModalHabits(todayLog ? todayLog.habitsLogged : {});

    logModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  });

  // Handle modal slider label updates
  document.getElementById('log-sleep-hours').addEventListener('input', (e) => {
    document.getElementById('log-sleep-val').innerText = `${parseFloat(e.target.value).toFixed(1)} hrs`;
  });
  document.getElementById('log-work-hours').addEventListener('input', (e) => {
    document.getElementById('log-work-val').innerText = `${parseFloat(e.target.value).toFixed(1)} hrs`;
  });

  // Render habits grid checkboxes in modal
  function renderModalHabits(habitsLogged = {}) {
    const grid = document.getElementById('modal-habits-grid');
    grid.innerHTML = '';

    const habitsList = dashboardData ? dashboardData.profile.habitsList : DEFAULT_HABITS;

    habitsList.forEach(habit => {
      const checked = !!habitsLogged[habit.id];
      const label = document.createElement('label');
      label.className = 'modal-habit-checkbox-label';
      label.innerHTML = `
        <input type="checkbox" name="modal-habits" value="${habit.id}" ${checked ? 'checked' : ''}>
        <span>${habit.name}</span>
      `;
      grid.appendChild(label);
    });
  }

  // Close modals handlers
  function closeLogModal() {
    logModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }
  document.getElementById('log-modal-close-btn').addEventListener('click', closeLogModal);
  document.getElementById('log-modal-cancel-btn').addEventListener('click', closeLogModal);

  // Submit Daily Log
  document.getElementById('daily-log-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('log-date').value;
    const sleepHours = parseFloat(document.getElementById('log-sleep-hours').value);
    const workHours = parseFloat(document.getElementById('log-work-hours').value);
    const energyScore = parseInt(document.querySelector('input[name="energyScore"]:checked').value);
    const moodScore = parseInt(document.querySelector('input[name="moodScore"]:checked').value);

    // Map checked habits
    const habitsLogged = {};
    document.querySelectorAll('input[name="modal-habits"]').forEach(chk => {
      habitsLogged[chk.value] = chk.checked;
    });

    const payload = {
      date,
      sleepHours,
      workHours,
      energyScore,
      moodScore,
      habitsLogged
    };

    try {
      await API.saveLog(payload);
      showToast('Daily stats stored in database!', 'success');
      closeLogModal();
      loadDashboard();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // ==================== VIEW: TASKS VIEW SETUP ==================== */
  document.getElementById('btn-add-task-dash').addEventListener('click', () => {
    switchView('tasks');
    document.getElementById('task-title').focus();
  });

  async function loadTasksPage() {
    try {
      const tasks = await API.getTasks();
      
      const activeList = document.getElementById('kanban-active-list');
      const completedList = document.getElementById('kanban-completed-list');

      activeList.innerHTML = '';
      completedList.innerHTML = '';

      let activeCount = 0;
      let completedCount = 0;

      tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-row ${task.completed ? 'completed' : ''}`;
        card.innerHTML = `
          <div class="task-left">
            <div class="task-checkbox" data-id="${task.id}">
              <i data-lucide="check"></i>
            </div>
            <div>
              <span class="task-title-text">${task.title}</span>
              <div class="task-tags">
                <span class="task-tag tag-${task.priority}">${task.priority}</span>
                <span class="task-tag" style="background:rgba(255,255,255,0.03);color:#94a3b8">${task.category}</span>
              </div>
            </div>
          </div>
          <button class="btn-delete-task" data-id="${task.id}">
            <i data-lucide="trash-2" class="icon-tiny"></i>
          </button>
        `;

        // Check off
        card.querySelector('.task-checkbox').addEventListener('click', async () => {
          try {
            await API.toggleTask(task.id);
            loadTasksPage();
          } catch (err) {
            showToast(err.message, 'danger');
          }
        });

        // Delete
        card.querySelector('.btn-delete-task').addEventListener('click', async () => {
          try {
            await API.deleteTask(task.id);
            showToast('Focus item deleted', 'info');
            loadTasksPage();
          } catch (err) {
            showToast(err.message, 'danger');
          }
        });

        if (task.completed) {
          completedCount++;
          completedList.appendChild(card);
        } else {
          activeCount++;
          activeList.appendChild(card);
        }
      });

      // Update indicators
      document.getElementById('active-tasks-count').innerText = activeCount;
      document.getElementById('completed-tasks-count').innerText = completedCount;
      lucide.createIcons();
    } catch (err) {
      showToast('Error displaying schedule lists', 'danger');
    }
  }

  // Create new task listener
  document.getElementById('task-creator-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleEl = document.getElementById('task-title');
    const priorityEl = document.getElementById('task-priority');
    const categoryEl = document.getElementById('task-category');

    const payload = {
      title: titleEl.value.trim(),
      priority: priorityEl.value,
      category: categoryEl.value,
      date: new Date().toISOString().split('T')[0]
    };

    try {
      await API.addTask(payload);
      showToast('New focus item scheduled', 'success');
      titleEl.value = '';
      loadTasksPage();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // ==================== VIEW: HABITS VAULT SETUP ==================== */
  async function loadHabitsVault() {
    try {
      const logs = await API.getLogs();
      const profile = await API.getProfile();
      const habitsList = profile.habitsList || [];

      const grid = document.getElementById('habits-vault-grid');
      grid.innerHTML = '';

      if (habitsList.length === 0) {
        grid.innerHTML = `<p class="text-dark text-center w-100 mt-4">No habits initialized in profile setup. Go to Profile configurations.</p>`;
        return;
      }

      // Sort logs by date ascending to map calendar checks
      const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
      const past7Logs = sortedLogs.slice(-7);

      // Generate 7 past days dates arrays
      const past7Days = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        past7Days.push(d.toISOString().split('T')[0]);
      }

      habitsList.forEach(habit => {
        let completionCount = 0;
        
        // Count completions from log history
        logs.forEach(l => {
          if (l.habitsLogged && l.habitsLogged[habit.id]) completionCount++;
        });

        const rate = logs.length > 0 ? Math.round((completionCount / logs.length) * 100) : 0;

        const card = document.createElement('div');
        card.className = 'habit-vault-card glass-card border-glow-blue';
        
        // Generate daily checklist items
        let weekDotsHtml = '';
        const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        past7Days.forEach(dateStr => {
          const log = past7Logs.find(l => l.date === dateStr);
          const checked = log && log.habitsLogged && log.habitsLogged[habit.id];
          const missed = log && (!log.habitsLogged || !log.habitsLogged[habit.id]);
          
          let dayClass = '';
          if (checked) dayClass = 'checked';
          else if (missed) dayClass = 'missed';

          const dObj = new Date(dateStr);
          const label = dayLetters[dObj.getDay()];

          weekDotsHtml += `
            <div class="weekly-day-box">
              <span class="day-label">${label}</span>
              <div class="day-dot ${dayClass}">
                <i data-lucide="check"></i>
              </div>
            </div>
          `;
        });

        card.innerHTML = `
          <div class="vault-card-header">
            <span class="vault-card-title">
              <i data-lucide="${habit.icon || 'activity'}" class="text-indigo"></i>
              <span>${habit.name}</span>
            </span>
            <span class="badge badge-indigo">${rate}% consistency</span>
          </div>

          <div class="habit-vault-stats">
            <div class="vault-stat-box">
              <div class="vault-stat-num">${completionCount}</div>
              <div class="vault-stat-label">Completions</div>
            </div>
            <div class="vault-stat-box border-left" style="border-left: 1px solid var(--border-light)">
              <div class="vault-stat-num">${rate}%</div>
              <div class="vault-stat-label">Efficiency</div>
            </div>
          </div>

          <div>
            <span class="vault-stat-label" style="display:block; margin-bottom: 0.5rem">Recent 7 Days</span>
            <div class="weekly-grid-tracker">
              ${weekDotsHtml}
            </div>
          </div>
        `;

        grid.appendChild(card);
      });

      lucide.createIcons();
    } catch (err) {
      showToast('Error syncing habits logs vault', 'danger');
    }
  }

  // ==================== VIEW: PROFILE PAGE SETUP ==================== */
  function loadProfilePage() {
    if (!currentProfile) return;

    // Load inputs
    document.getElementById('settings-sleep-target').value = currentProfile.sleepTarget;
    document.getElementById('settings-sleep-target-val').innerText = `${currentProfile.sleepTarget.toFixed(1)} hrs`;
    document.getElementById('settings-work-target').value = currentProfile.workHoursTarget;
    document.getElementById('settings-work-target-val').innerText = `${currentProfile.workHoursTarget.toFixed(1)} hrs`;

    document.getElementById('settings-morning-routine').value = currentProfile.routines.morning || '';
    document.getElementById('settings-evening-routine').value = currentProfile.routines.evening || '';

    // Check goals
    document.querySelectorAll('input[name="settings-goals"]').forEach(chk => {
      chk.checked = currentProfile.goals.includes(chk.value);
    });

    // Populate habits configurations column
    renderProfileHabitsConfig();
  }

  // Profile slider label listeners
  document.getElementById('settings-sleep-target').addEventListener('input', (e) => {
    document.getElementById('settings-sleep-target-val').innerText = `${parseFloat(e.target.value).toFixed(1)} hrs`;
  });
  document.getElementById('settings-work-target').addEventListener('input', (e) => {
    document.getElementById('settings-work-target-val').innerText = `${parseFloat(e.target.value).toFixed(1)} hrs`;
  });

  function renderProfileHabitsConfig() {
    const container = document.getElementById('profile-habits-config-list');
    container.innerHTML = '';

    const habits = currentProfile.habitsList || [];
    habits.forEach(habit => {
      const row = document.createElement('div');
      row.className = 'habit-config-row';
      row.innerHTML = `
        <div class="habit-config-left">
          <i data-lucide="${habit.icon || 'activity'}"></i>
          <span>${habit.name}</span>
        </div>
        <button class="btn-remove-habit" data-id="${habit.id}">
          <i data-lucide="trash-2" class="icon-tiny"></i>
        </button>
      `;

      // Remove habit listener
      row.querySelector('.btn-remove-habit').addEventListener('click', async () => {
        const updatedHabits = currentProfile.habitsList.filter(h => h.id !== habit.id);
        const payload = {
          ...currentProfile,
          habitsList: updatedHabits
        };
        try {
          currentProfile = await API.updateProfile(payload);
          renderProfileHabitsConfig();
          showToast(`Habit "${habit.name}" removed from agenda`, 'info');
        } catch (err) {
          showToast(err.message, 'danger');
        }
      });

      container.appendChild(row);
    });

    lucide.createIcons();
  }

  // Profile settings submit
  document.getElementById('profile-settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sleepTarget = parseFloat(document.getElementById('settings-sleep-target').value);
    const workHoursTarget = parseFloat(document.getElementById('settings-work-target').value);
    const morning = document.getElementById('settings-morning-routine').value.trim();
    const evening = document.getElementById('settings-evening-routine').value.trim();

    const goals = Array.from(document.querySelectorAll('input[name="settings-goals"]:checked')).map(el => el.value);

    const payload = {
      ...currentProfile,
      sleepTarget,
      workHoursTarget,
      routines: { morning, evening },
      goals
    };

    try {
      currentProfile = await API.updateProfile(payload);
      showToast('Configurations successfully stored!', 'success');
      switchView('dashboard');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Profile Add new habit
  document.getElementById('add-profile-habit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('profile-new-habit-name');
    const iconEl = document.getElementById('profile-new-habit-icon');

    const name = nameEl.value.trim();
    const icon = iconEl.value;

    const id = 'custom-h-' + Math.random().toString(36).substr(2, 5);

    const updatedHabits = [...(currentProfile.habitsList || [])];
    updatedHabits.push({ id, name, icon });

    const payload = {
      ...currentProfile,
      habitsList: updatedHabits
    };

    try {
      currentProfile = await API.updateProfile(payload);
      nameEl.value = '';
      renderProfileHabitsConfig();
      showToast(`Registered custom habit: ${name}`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // ==================== APP BOOTSTRAP ==================== */
  // Register Service Worker for PWA Offline & Install capabilities
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker: Registered successfully', reg.scope))
        .catch(err => console.error('Service Worker: Registration failed', err));
    });
  }

  // Run initial state verify
  checkSessionState();
});
