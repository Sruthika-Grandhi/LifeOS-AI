let performanceChartInstance = null;

function initPerformanceChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  // Clear existing instance if it exists
  if (performanceChartInstance) {
    performanceChartInstance.destroy();
  }

  // Set default configurations for a dark, sleek look
  Chart.defaults.color = '#94a3b8'; // text-muted
  Chart.defaults.font.family = "'Outfit', sans-serif";
  Chart.defaults.font.size = 11;

  performanceChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Work Hours',
          data: [],
          backgroundColor: 'rgba(99, 102, 241, 0.35)', // indigo
          borderColor: '#6366f1',
          borderWidth: 2,
          borderRadius: 6,
          yAxisID: 'yHours',
          order: 2
        },
        {
          label: 'Sleep Hours',
          data: [],
          backgroundColor: 'rgba(234, 179, 8, 0.35)', // amber
          borderColor: '#eab308',
          borderWidth: 2,
          borderRadius: 6,
          yAxisID: 'yHours',
          order: 3
        },
        {
          label: 'Mood Index',
          data: [],
          borderColor: '#06b6d4', // cyan
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          pointBackgroundColor: '#06b6d4',
          borderWidth: 3,
          type: 'line',
          tension: 0.35,
          yAxisID: 'yMood',
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // We use our custom HTML legend
        },
        tooltip: {
          backgroundColor: '#0f1322',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          usePointStyle: true
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.03)',
            drawTicks: false
          },
          ticks: {
            padding: 8
          }
        },
        yHours: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Hours (Sleep / Work)',
            color: '#94a3b8'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawTicks: false
          },
          min: 0,
          max: 16,
          ticks: {
            stepSize: 2,
            padding: 8
          }
        },
        yMood: {
          type: 'linear',
          position: 'right',
          title: {
            display: true,
            text: 'Mood rating (1 - 5)',
            color: '#94a3b8'
          },
          grid: {
            drawOnChartArea: false // hides duplicate horizontal grids
          },
          min: 1,
          max: 5,
          ticks: {
            stepSize: 1,
            padding: 8
          }
        }
      }
    }
  });

  return performanceChartInstance;
}

function updatePerformanceChart(logs) {
  if (!performanceChartInstance || !logs || logs.length === 0) return;

  // Format date labels from 'YYYY-MM-DD' to short format (e.g. 'May 21')
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const labels = logs.map(log => {
    try {
      const parts = log.date.split('-');
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      return `${monthNames[date.getMonth()]} ${date.getDate()}`;
    } catch (e) {
      return log.date;
    }
  });

  const workData = logs.map(log => log.workHours);
  const sleepData = logs.map(log => log.sleepHours);
  const moodData = logs.map(log => log.moodScore);

  // Load datasets
  performanceChartInstance.data.labels = labels;
  performanceChartInstance.data.datasets[0].data = workData;
  performanceChartInstance.data.datasets[1].data = sleepData;
  performanceChartInstance.data.datasets[2].data = moodData;

  performanceChartInstance.update();
}
