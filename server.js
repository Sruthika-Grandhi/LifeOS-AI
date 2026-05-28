require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./database');
const ai = require('./ai-engine');

const app = express();
const PORT = process.env.PORT || 9008;
const JWT_SECRET = process.env.JWT_SECRET || 'lifeos_ai_secret_key_change_me_in_production';

// Middlewares
app.use(cors());
app.use(express.json());
// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

// DevOps Healthcheck endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Middleware to verify JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  });
}

// Auth Routes
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Username must be >= 3 characters and password >= 6 characters' });
  }

  const result = db.registerUser(username, password);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  const token = jwt.sign({ userId: result.user.id, username: result.user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: result.user });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const result = db.authenticateUser(username, password);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  const token = jwt.sign({ userId: result.user.id, username: result.user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.status(200).json({ token, user: result.user });
});

// Profiles API
app.get('/api/profile', authenticateToken, (req, res) => {
  const profile = db.getProfile(req.userId);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.status(200).json(profile);
});

app.post('/api/profile', authenticateToken, (req, res) => {
  const updated = db.updateProfile(req.userId, req.body);
  res.status(200).json(updated);
});

// Daily Logs API
app.get('/api/logs', authenticateToken, (req, res) => {
  const logs = db.getLogs(req.userId);
  res.status(200).json(logs);
});

app.post('/api/logs', authenticateToken, (req, res) => {
  const saved = db.saveLog(req.userId, req.body);
  res.status(200).json(saved);
});

// Tasks API
app.get('/api/tasks', authenticateToken, (req, res) => {
  const tasks = db.getTasks(req.userId);
  res.status(200).json(tasks);
});

app.post('/api/tasks', authenticateToken, (req, res) => {
  if (!req.body.title) {
    return res.status(400).json({ error: 'Task title is required' });
  }
  const task = db.addTask(req.userId, req.body);
  res.status(201).json(task);
});

app.post('/api/tasks/:id/toggle', authenticateToken, (req, res) => {
  const task = db.toggleTask(req.userId, req.params.id);
  if (task.error) {
    return res.status(404).json({ error: task.error });
  }
  res.status(200).json(task);
});

app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  const success = db.deleteTask(req.userId, req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Task not found or unauthorized' });
  }
  res.status(200).json({ message: 'Task deleted successfully' });
});

// Dashboard Summary & Analytics Engine
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const profile = db.getProfile(req.userId);
    const logs = db.getLogs(req.userId);
    const tasks = db.getTasks(req.userId);

    // Filter logs of the past 7 days to keep charts dynamic
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const recentLogs = sortedLogs.slice(-7);

    // Calculate streaks
    let streak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Check if user completed at least 1 habit in consecutive logs
    const completedDays = new Set(
      logs
        .filter(l => l.habitsLogged && Object.values(l.habitsLogged).some(val => val === true))
        .map(l => l.date)
    );

    // Walk backward in time to count streak
    let currentCheck = new Date();
    while (true) {
      const dateStr = currentCheck.toISOString().split('T')[0];
      if (completedDays.has(dateStr)) {
        streak++;
        currentCheck.setDate(currentCheck.getDate() - 1);
      } else {
        // If they logged today but haven't checked habits yet, check yesterday to continue the streak
        if (dateStr === todayStr && completedDays.has(yesterdayStr)) {
          currentCheck.setDate(currentCheck.getDate() - 1);
          continue;
        }
        break;
      }
    }

    // Calculate productivity index (overall score out of 100)
    let productivityScore = 0;
    if (recentLogs.length > 0) {
      const latestLog = recentLogs[recentLogs.length - 1];
      const targetSleep = profile ? profile.sleepTarget : 8.0;
      const targetWork = profile ? profile.workHoursTarget : 8.0;

      // 1. Sleep compliance score (max 20 pts)
      const sleepDelta = Math.abs(latestLog.sleepHours - targetSleep);
      const sleepScore = Math.max(0, 20 - (sleepDelta * 4));

      // 2. Work compliance score (max 20 pts)
      const workDelta = Math.abs(latestLog.workHours - targetWork);
      const workScore = Math.max(0, 20 - (workDelta * 3));

      // 3. Mood score (max 20 pts)
      const moodScore = (latestLog.moodScore / 5) * 20;

      // 4. Energy score (max 20 pts)
      const energyScore = (latestLog.energyScore / 5) * 20;

      // 5. Habit completion rate (max 20 pts)
      let habitScore = 0;
      if (latestLog.habitsLogged && Object.keys(latestLog.habitsLogged).length > 0) {
        const habitsList = Object.values(latestLog.habitsLogged);
        const doneCount = habitsList.filter(v => v === true).length;
        habitScore = (doneCount / habitsList.length) * 20;
      }

      productivityScore = Math.round(sleepScore + workScore + moodScore + energyScore + habitScore);
    } else {
      productivityScore = 0;
    }

    // Call AI Analyzer
    const aiReport = await ai.getAIRecommendations(logs, profile);

    res.status(200).json({
      productivityScore,
      streak,
      recentLogs,
      tasks: tasks.filter(t => !t.completed || t.date === todayStr), // only show pending or completed today
      aiReport,
      profile: {
        sleepTarget: profile?.sleepTarget || 8.0,
        workHoursTarget: profile?.workHoursTarget || 8.0,
        habitsList: profile?.habitsList || []
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ error: 'Internal server error occurred while calculating analytics' });
  }
});

// Fallback: serve index.html for single page router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 LifeOS AI server is running on port ${PORT}`);
  console.log(`🔗 Interface available: http://localhost:${PORT}`);
  console.log(`===================================================`);
});
