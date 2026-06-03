const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = process.env.DATABASE_PATH || path.join(__dirname, 'data.json');

// Helper to hash password securely with PBKDF2 (no external C++ modules)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, storedHash) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === storedHash;
}

// Read database from file
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialDB = {
        users: [],
        profiles: [],
        daily_logs: [],
        tasks: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), 'utf8');
      return initialDB;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file:', err);
    return { users: [], profiles: [], daily_logs: [], tasks: [] };
  }
}

// Write database to file
function writeDB(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing database file:', err);
    return false;
  }
}

// Seed realistic 7-day demo data for the hackathon
function seedDemoData() {
  const db = readDB();
  
  // Check if a demo user already exists
  const demoUserExists = db.users.find(u => u.username === 'demo');
  if (demoUserExists) return;

  console.log('Seeding mock data for hackathon demo user...');

  // Create demo user
  const { salt, hash } = hashPassword('password123');
  const demoUserId = 'demo-user-id-' + crypto.randomBytes(4).toString('hex');
  
  db.users.push({
    id: demoUserId,
    username: 'demo',
    passwordHash: hash,
    salt: salt,
    createdAt: new Date().toISOString()
  });

  // Profile setup
  db.profiles.push({
    userId: demoUserId,
    goals: ['Improve sleep quality', 'Avoid burnout', 'Exercise daily'],
    routines: {
      morning: 'Drink water, stretch, meditate',
      evening: 'Read book, turn off screens 1hr before bed'
    },
    habitsList: [
      { id: 'h1', name: 'Exercise', icon: 'activity' },
      { id: 'h2', name: '8 Glasses of Water', icon: 'droplet' },
      { id: 'h3', name: 'Meditation', icon: 'compass' },
      { id: 'h4', name: 'No Screens 1h before Sleep', icon: 'eye-off' },
      { id: 'h5', name: 'Read a Book', icon: 'book-open' }
    ],
    sleepTarget: 8.0,
    workHoursTarget: 8.0
  });

  // Calculate past 7 days dates
  const today = new Date();
  const getPastDateStr = (daysAgo) => {
    const d = new Date(today);
    d.setDate(today.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  // Log entries showing progressive burnout (high work hours, low sleep) followed by recovery
  const demoLogs = [
    {
      id: 'log-1',
      userId: demoUserId,
      date: getPastDateStr(6),
      sleepHours: 7.8,
      workHours: 8.0,
      moodScore: 4,
      energyScore: 4,
      habitsLogged: { h1: true, h2: true, h3: false, h4: true, h5: true }
    },
    {
      id: 'log-2',
      userId: demoUserId,
      date: getPastDateStr(5),
      sleepHours: 8.0,
      workHours: 7.5,
      moodScore: 5,
      energyScore: 4,
      habitsLogged: { h1: true, h2: true, h3: true, h4: true, h5: true }
    },
    {
      id: 'log-3',
      userId: demoUserId,
      date: getPastDateStr(4),
      sleepHours: 6.5,
      workHours: 9.5,
      moodScore: 3,
      energyScore: 3,
      habitsLogged: { h1: false, h2: true, h3: false, h4: false, h5: true }
    },
    {
      id: 'log-4',
      userId: demoUserId,
      date: getPastDateStr(3),
      sleepHours: 5.5,
      workHours: 11.2,
      moodScore: 2,
      energyScore: 2,
      habitsLogged: { h1: false, h2: false, h3: false, h4: false, h5: false }
    },
    {
      id: 'log-5',
      userId: demoUserId,
      date: getPastDateStr(2),
      sleepHours: 5.0,
      workHours: 12.0,
      moodScore: 1,
      energyScore: 1,
      habitsLogged: { h1: false, h2: false, h3: false, h4: false, h5: false } // Severe stress signal
    },
    {
      id: 'log-6',
      userId: demoUserId,
      date: getPastDateStr(1),
      sleepHours: 7.2,
      workHours: 5.0, // Forced break / crash
      moodScore: 3,
      energyScore: 2,
      habitsLogged: { h1: false, h2: true, h3: true, h4: false, h5: false }
    },
    {
      id: 'log-7',
      userId: demoUserId,
      date: today.toISOString().split('T')[0],
      sleepHours: 8.2,
      workHours: 2.0, // Recovery weekend/day off
      moodScore: 4,
      energyScore: 4,
      habitsLogged: { h1: true, h2: true, h3: true, h4: true, h5: false }
    }
  ];

  db.daily_logs.push(...demoLogs);

  // Mock Tasks
  db.tasks.push(
    { id: 't1', userId: demoUserId, title: 'Draft LifeOS AI pitch deck', date: getPastDateStr(2), priority: 'high', completed: true, category: 'work' },
    { id: 't2', userId: demoUserId, title: 'Drink 2L of water', date: getPastDateStr(0), priority: 'medium', completed: true, category: 'health' },
    { id: 't3', userId: demoUserId, title: 'Go for a evening recovery run', date: getPastDateStr(0), priority: 'high', completed: false, category: 'health' },
    { id: 't4', userId: demoUserId, title: 'Write backend unit tests', date: getPastDateStr(0), priority: 'medium', completed: false, category: 'work' },
    { id: 't5', userId: demoUserId, title: 'Prepare demonstration script', date: getPastDateStr(0), priority: 'low', completed: false, category: 'personal' }
  );

  writeDB(db);
  console.log('Seed data successfully loaded.');
}

// Initialize and Seed
const initialDB = readDB();
seedDemoData();

module.exports = {
  // Users APIs
  registerUser: (username, password) => {
    const db = readDB();
    const existing = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existing) return { error: 'Username already exists' };

    const { salt, hash } = hashPassword(password);
    const id = 'user-' + crypto.randomBytes(8).toString('hex');
    const newUser = {
      id,
      username,
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    
    // Create default profile configuration for user
    const defaultProfile = {
      userId: id,
      goals: [],
      routines: { morning: '', evening: '' },
      habitsList: [
        { id: 'h1', name: 'Exercise', icon: 'activity' },
        { id: 'h2', name: 'Drink Water', icon: 'droplet' },
        { id: 'h3', name: 'Meditation', icon: 'compass' },
        { id: 'h4', name: 'Screen break', icon: 'eye-off' }
      ],
      sleepTarget: 8.0,
      workHoursTarget: 8.0
    };
    db.profiles.push(defaultProfile);
    
    writeDB(db);
    return { user: { id: newUser.id, username: newUser.username } };
  },

  authenticateUser: (username, password) => {
    const db = readDB();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return { error: 'Invalid username or password' };

    const valid = verifyPassword(password, user.salt, user.passwordHash);
    if (!valid) return { error: 'Invalid username or password' };

    return { user: { id: user.id, username: user.username } };
  },

  updateUserPassword: (userId, currentPassword, newPassword) => {
    const db = readDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return { error: 'User not found' };

    const valid = verifyPassword(currentPassword, user.salt, user.passwordHash);
    if (!valid) return { error: 'Incorrect current password' };

    const { salt, hash } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.salt = salt;

    writeDB(db);
    return { success: true };
  },

  // Profiles APIs
  getProfile: (userId) => {
    const db = readDB();
    return db.profiles.find(p => p.userId === userId) || null;
  },

  updateProfile: (userId, profileData) => {
    const db = readDB();
    const index = db.profiles.findIndex(p => p.userId === userId);
    const updatedProfile = {
      userId,
      goals: profileData.goals || [],
      routines: profileData.routines || { morning: '', evening: '' },
      habitsList: profileData.habitsList || [
        { id: 'h1', name: 'Exercise', icon: 'activity' },
        { id: 'h2', name: 'Drink Water', icon: 'droplet' }
      ],
      sleepTarget: parseFloat(profileData.sleepTarget) || 8.0,
      workHoursTarget: parseFloat(profileData.workHoursTarget) || 8.0
    };

    if (index !== -1) {
      db.profiles[index] = updatedProfile;
    } else {
      db.profiles.push(updatedProfile);
    }
    writeDB(db);
    return updatedProfile;
  },

  // Logs APIs
  getLogs: (userId) => {
    const db = readDB();
    return db.daily_logs.filter(l => l.userId === userId);
  },

  saveLog: (userId, logData) => {
    const db = readDB();
    const date = logData.date || new Date().toISOString().split('T')[0];
    
    // Look for existing log on this date
    const index = db.daily_logs.findIndex(l => l.userId === userId && l.date === date);
    
    const newLog = {
      id: index !== -1 ? db.daily_logs[index].id : 'log-' + crypto.randomBytes(8).toString('hex'),
      userId,
      date,
      sleepHours: parseFloat(logData.sleepHours) || 0,
      workHours: parseFloat(logData.workHours) || 0,
      moodScore: parseInt(logData.moodScore) || 3,
      energyScore: parseInt(logData.energyScore) || 3,
      habitsLogged: logData.habitsLogged || {}
    };

    if (index !== -1) {
      db.daily_logs[index] = newLog;
    } else {
      db.daily_logs.push(newLog);
    }
    
    writeDB(db);
    return newLog;
  },

  // Tasks APIs
  getTasks: (userId) => {
    const db = readDB();
    return db.tasks.filter(t => t.userId === userId);
  },

  addTask: (userId, taskData) => {
    const db = readDB();
    const newTask = {
      id: 'task-' + crypto.randomBytes(8).toString('hex'),
      userId,
      title: taskData.title,
      date: taskData.date || new Date().toISOString().split('T')[0],
      priority: taskData.priority || 'medium',
      completed: false,
      category: taskData.category || 'personal'
    };
    db.tasks.push(newTask);
    writeDB(db);
    return newTask;
  },

  toggleTask: (userId, taskId) => {
    const db = readDB();
    const task = db.tasks.find(t => t.id === taskId && t.userId === userId);
    if (!task) return { error: 'Task not found' };
    task.completed = !task.completed;
    writeDB(db);
    return task;
  },

  deleteTask: (userId, taskId) => {
    const db = readDB();
    const initialLength = db.tasks.length;
    db.tasks = db.tasks.filter(t => !(t.id === taskId && t.userId === userId));
    writeDB(db);
    return db.tasks.length < initialLength;
  }
};
