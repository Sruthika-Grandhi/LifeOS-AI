# ⚡ LifeOS AI

> **Cognitive Performance Dashboard & Burnout Prevention System**
> Built as a self-hosted dashboard to monitor, analyze, and optimize human performance using daily behavioral data and AI-driven insights.

---

## 🚀 Key Features

* **🎭 Onboarding Wizard**: Guided setup to define optimization goals, specify balance thresholds (sleep/work targets), and assemble custom habit checklists.
* **📊 Visual Performance Correlations**: Interactive, dark-themed charts correlating work hours, sleep targets, and subjective mood ratings over time.
* **🧠 Personalized AI Coach Reports**: Real-time evaluation of streaks, sleep debt cycles, and stress patterns using **Gemini 1.5 Flash** or **Claude 3.5 Sonnet**. Includes a fallback heuristic engine if no API keys are configured.
* **🔒 Profile Isolation**: Local, secure JSON database supporting multi-user registration, cryptographically hashed passwords (PBKDF2), and JWT session tokens.
* **🐳 Dockerized Out-of-the-Box**: Production-ready, multi-stage Docker build with compose services and health-check diagnostics.

---

## 🛠️ Tech Stack

* **Frontend**: HTML5, Vanilla CSS (harmonious, modern dark UI with neon accents, blur backdrops, and responsive grids), Vanilla JS.
* **Backend**: Node.js & Express.js.
* **Database**: Lightweight JSON-based local database (`data.json`) with auto-seeding.
* **Visualizations & Assets**: Chart.js for correlation graphing, Lucide Icons for icons, Google Fonts (Outfit).

---

## 📦 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v18+) or [Docker](https://www.docker.com/) installed on your machine.

---

### Method A: Running Locally with Node.js

1. **Clone the Repository:**
   ```bash
   git clone <your-repository-url>
   cd lifeos-ai
   ```

2. **Configure Environment Variables:**
   Copy the example environment file to create your own:
   ```bash
   cp .env.example .env
   ```
   *(By default, this sets the port to `9008` and configures a default JWT secret key)*

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Start the Server:**
   ```bash
   npm run dev
   ```
   * The terminal will print: `🚀 LifeOS AI server is running on port 9008`
   * Open your browser and navigate to: **[http://localhost:9008](http://localhost:9008)**

5. **Access the Hackathon Demo Account:**
   * **Username**: `demo`
   * **Password**: `password123`
   * *(Logging in with this account will automatically load a rich 7-day historical dataset showing progressive burnout indicators followed by recovery states)*

---

### Method B: Running with Docker Compose

Running with Docker compose isolates the application and ensures it persists user data in a local `./data` volume.

1. **Start the Containers:**
   ```bash
   docker compose up --build -d
   ```

2. **Verify Server Health:**
   The Docker container runs an active health check. Verify its status using:
   ```bash
   docker compose ps
   ```

3. **Access the Dashboard:**
   Open **[http://localhost:9008](http://localhost:9008)** in your browser.

---

## 🔌 Integrating Real AI Engines (Optional)

By default, LifeOS AI runs a sophisticated rule-based heuristic recommendation simulator to generate coaching reports locally. If you wish to use real large language models:

1. Open your `.env` file in the root directory.
2. Add your API key(s):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   # OR
   CLAUDE_API_KEY=your_claude_api_key_here
   ```
3. Restart your server. The application will automatically detect the keys and route cognitive health analyses to the LLM.
