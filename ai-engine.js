const https = require('https');

// Helper to make HTTPS requests without external dependencies
function makeRequest(url, options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Generate recommendations using real Gemini API
async function queryGemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800
    }
  });

  const response = await makeRequest(url, options, body);
  const json = JSON.parse(response);
  return json.candidates[0].content.parts[0].text;
}

// Generate recommendations using real Claude API
async function queryClaude(apiKey, prompt) {
  const url = 'https://api.anthropic.com/v1/messages';
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  };
  const body = JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 800,
    messages: [
      { role: 'user', content: prompt }
    ]
  });

  const response = await makeRequest(url, options, body);
  const json = JSON.parse(response);
  return json.content[0].text;
}

// Heuristic fallback recommendation engine (runs locally without API keys)
function generateLocalHeuristicAI(logs, profile) {
  if (!logs || logs.length === 0) {
    return {
      insight: "Welcome to LifeOS AI! To generate your first AI Insight Report, please log your mood, energy levels, sleep, and habits for today.",
      burnoutRisk: "low",
      burnoutScore: 10,
      recoveryActions: [
        "Complete your profile setup onboarding wizard.",
        "Add at least 3 daily tasks to your schedule.",
        "Log your first habit completion checklist."
      ],
      predictions: "Insufficient data to formulate sleep-debt and productivity trend forecasts."
    };
  }

  // Sort logs by date ascending
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
  const recentLogs = sortedLogs.slice(-5); // Get last 5 entries
  const latestLog = recentLogs[recentLogs.length - 1];

  let totalSleep = 0;
  let totalWork = 0;
  let totalMood = 0;
  let totalEnergy = 0;
  let totalHabitsCompleted = 0;
  let totalHabitsPossible = 0;

  recentLogs.forEach(log => {
    totalSleep += log.sleepHours;
    totalWork += log.workHours;
    totalMood += log.moodScore;
    totalEnergy += log.energyScore;

    if (log.habitsLogged) {
      Object.keys(log.habitsLogged).forEach(k => {
        totalHabitsPossible++;
        if (log.habitsLogged[k]) totalHabitsCompleted++;
      });
    }
  });

  const count = recentLogs.length;
  const avgSleep = totalSleep / count;
  const avgWork = totalWork / count;
  const avgMood = totalMood / count;
  const avgEnergy = totalEnergy / count;
  const habitCompletionRate = totalHabitsPossible > 0 ? (totalHabitsCompleted / totalHabitsPossible) * 100 : 50;

  const targetSleep = profile ? profile.sleepTarget : 8.0;
  const targetWork = profile ? profile.workHoursTarget : 8.0;

  // Evaluate Burnout Score (0 - 100)
  let burnoutScore = 20; // baseline
  let burnoutReasons = [];

  // Work Hours spikes
  if (latestLog.workHours > 10) {
    burnoutScore += 25;
    burnoutReasons.push(`Logged high work hours (${latestLog.workHours}h) today`);
  } else if (avgWork > targetWork + 1) {
    burnoutScore += 15;
    burnoutReasons.push(`Averaging higher work hours (${avgWork.toFixed(1)}h/day) than target`);
  }

  // Sleep drops
  if (latestLog.sleepHours < 6) {
    burnoutScore += 25;
    burnoutReasons.push(`Severe sleep shortage (${latestLog.sleepHours}h) logged`);
  } else if (avgSleep < targetSleep - 1) {
    burnoutScore += 15;
    burnoutReasons.push(`Averaging insufficient sleep (${avgSleep.toFixed(1)}h/day)`);
  }

  // Low mood/energy
  if (latestLog.energyScore <= 2) {
    burnoutScore += 15;
    burnoutReasons.push("Energy level is critically low");
  }
  if (latestLog.moodScore <= 2) {
    burnoutScore += 15;
    burnoutReasons.push("Mood index indicates emotional strain");
  }

  // Habit consistency discount
  if (habitCompletionRate > 80) {
    burnoutScore -= 10; // consistency shields burnout
  } else if (habitCompletionRate < 30) {
    burnoutScore += 10; // breaking habits increases vulnerability
  }

  burnoutScore = Math.max(0, Math.min(100, burnoutScore));

  let burnoutRisk = 'low';
  if (burnoutScore > 70) burnoutRisk = 'critical';
  else if (burnoutScore > 40) burnoutRisk = 'moderate';

  // Formulate Recovery Actions
  const recoveryActions = [];
  if (latestLog.sleepHours < targetSleep) {
    recoveryActions.push(`Go to bed 30 mins earlier tonight to offset a sleep debt of ${(targetSleep - latestLog.sleepHours).toFixed(1)} hours.`);
  }
  if (latestLog.workHours > targetWork) {
    recoveryActions.push("Set a hard stop time for work today. Schedule an evening offline decompression period.");
  }
  if (latestLog.energyScore <= 3) {
    recoveryActions.push("Schedule micro-breaks: step away from your workstation for 5 minutes every 60-90 minutes of focused work.");
  }
  if (latestLog.moodScore <= 3) {
    recoveryActions.push("Increase oxygen flow and decrease stress hormones: complete a 10-minute stretching or breathing routine.");
  }
  if (!latestLog.habitsLogged || Object.values(latestLog.habitsLogged).filter(v => v).length < 2) {
    recoveryActions.push("Prioritize logging at least one habit checklist task today (like drinking water) to re-establish behavioral control.");
  }

  // Add default general tips if we need more
  if (recoveryActions.length < 3) {
    recoveryActions.push("Engage in a 15-minute physical walk outdoors to help shift cognitive context.");
    recoveryActions.push("Hydrate immediately: dehydration mimics physical fatigue and impairs focus.");
  }

  // Formulate Insight text
  let insight = '';
  if (burnoutRisk === 'critical') {
    insight = `🚨 LifeOS Alert: We've detected high-risk stress patterns. Your work hours have spiked to ${latestLog.workHours}h while sleep has dropped below sustainable levels. Average energy is at ${avgEnergy.toFixed(1)}/5. This trajectory typically leads to exhaustion within 48-72 hours. You must initiate immediate recovery actions.`;
  } else if (burnoutRisk === 'moderate') {
    insight = `⚠️ Balance Warning: You are carrying a minor sleep debt (averaging ${avgSleep.toFixed(1)}h vs target of ${targetSleep}h) coupled with elevated cognitive load. While your habit consistency (${habitCompletionRate.toFixed(0)}%) is currently buffering stress, you should rebalance your workflow before exhaustion sets in.`;
  } else {
    insight = `🟢 Optimal Flow: Your work-life indicators are balanced. Sleep is averaging a healthy ${avgSleep.toFixed(1)}h, and work load is within target boundaries (${avgWork.toFixed(1)}h). Your mood and energy remain stable at ${avgMood.toFixed(1)}/5. Keep up this sustainable performance baseline!`;
  }

  // Predict future outcome
  let predictions = '';
  if (burnoutRisk === 'critical') {
    predictions = `If current trends continue: 1) Energy levels will likely fall to 1/5 tomorrow, 2) Focus and task completion rates are predicted to drop by 45%, and 3) Physical susceptibility to fatigue will double.`;
  } else if (burnoutRisk === 'moderate') {
    predictions = `Predictive Analysis: Continuing this pattern will accumulate a ${((targetSleep - avgSleep) * 7).toFixed(1)}h sleep debt by end-of-week, leading to a productivity dip of 20% by Thursday afternoon.`;
  } else {
    predictions = `Predictive Analysis: With current habit streaks maintained, your energy levels are predicted to remain high (+12% relative to your baseline) throughout the coming work days.`;
  }

  return {
    insight,
    burnoutRisk,
    burnoutScore,
    recoveryActions: recoveryActions.slice(0, 3),
    predictions
  };
}

// Main API interface
async function getAIRecommendations(logs, profile) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const claudeKey = process.env.CLAUDE_API_KEY;

  // If no API keys are present, use the advanced local heuristic system
  if (!geminiKey && !claudeKey) {
    console.log('No LLM API keys found. Utilizing Heuristic Recommendation Engine.');
    return generateLocalHeuristicAI(logs, profile);
  }

  // Format context for the LLM
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
  const recentLogs = sortedLogs.slice(-7);
  const profileDetails = profile ? JSON.stringify(profile) : 'Not configured yet';
  
  const formattedLogs = recentLogs.map(log => 
    `Date: ${log.date}, Sleep: ${log.sleepHours}h (Target: ${profile?.sleepTarget || 8}h), Work: ${log.workHours}h (Target: ${profile?.workHoursTarget || 8}h), Mood: ${log.moodScore}/5, Energy: ${log.energyScore}/5, Habits: ${JSON.stringify(log.habitsLogged)}`
  ).join('\n');

  const prompt = `
You are LifeOS AI, an elite productivity coach and behavioral scientist.
Analyze the user's weekly metrics below and compile a personalized insight report.

--- USER PROFILE SETTINGS ---
${profileDetails}

--- RECENT DAILY LOGS (LAST 7 DAYS) ---
${formattedLogs}

--- INSTRUCTIONS ---
You must output a valid JSON block EXACTLY matching this structure:
{
  "insight": "A professional, personalized paragraph analyzing their productivity-recovery patterns, sleep debt, and focus quality. Speak directly to them.",
  "burnoutRisk": "low" | "moderate" | "critical",
  "burnoutScore": 0-100 integer representing current exhaustion probability,
  "recoveryActions": [
    "Specific actionable physical action 1",
    "Specific actionable physical action 2",
    "Specific actionable physical action 3"
  ],
  "predictions": "A forward-looking sentence predicting their energy/productivity outcomes if current habits persist."
}

DO NOT include any explanation or markdown formatting in your response outside of the raw JSON. Just return the JSON object.
`;

  try {
    let aiText = '';
    if (claudeKey) {
      console.log('Sending context to Claude API...');
      aiText = await queryClaude(claudeKey, prompt);
    } else {
      console.log('Sending context to Gemini API...');
      aiText = await queryGemini(geminiKey, prompt);
    }

    // Clean response markup if any (e.g. ```json ... ```)
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not parse JSON response from LLM");
    }
  } catch (err) {
    console.error('LLM API request failed, falling back to local engine:', err.message);
    return generateLocalHeuristicAI(logs, profile);
  }
}

module.exports = {
  getAIRecommendations
};
