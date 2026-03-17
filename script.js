/**
 * RepoInsights | Premium Dashboard Logic
 * Powered by Tailwind & Chart.js
 */

document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyze-btn');
    const repoUrlInput = document.getElementById('repo-url');
    const tokenInput = document.getElementById('github-token');
    const loadingOverlay = document.getElementById('loading');
    const resultsPanel = document.getElementById('results');
    const errorBox = document.getElementById('error-message');
    
    // Charts instances
    let langChart = null;
    let activityChart = null;

    analyzeBtn.addEventListener('click', async () => {
        let repoUrl = repoUrlInput.value.trim();
        const token = tokenInput.value.trim();

        if (!repoUrl) {
            showError('Please enter a GitHub repository URL.');
            return;
        }

        // Reset UI
        hideError();
        loadingOverlay.classList.remove('hidden');
        resultsPanel.classList.add('hidden');
        analyzeBtn.disabled = true;

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo_url: repoUrl, token: token })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze repository');
            }

            displayResults(data);
            
            // Re-init icons for new content if needed
            if (window.lucide) lucide.createIcons();
            
            // Scroll to results
            resultsPanel.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            showError(error.message);
        } finally {
            loadingOverlay.classList.add('hidden');
            analyzeBtn.disabled = false;
        }
    });

    function displayResults(data) {
        // 1. Basic Info & Header
        document.getElementById('res-name-title').textContent = data.repo_name || 'Repository';
        
        // Update Initial or Image
        const initialEl = document.getElementById('res-repo-initial');
        const imgEl = document.getElementById('res-repo-img');
        const repoName = data.repo_name || 'R';
        initialEl.textContent = repoName.split('/')[1] ? repoName.split('/')[1][0].toUpperCase() : repoName[0].toUpperCase();
        
        // 2. Stats Counters
        animateCounter('res-loc', data.loc || 0);
        animateCounter('res-commits', data.commits || 0);
        animateCounter('res-prs', data.prs || 0);
        animateCounter('res-issues', data.issues || 0);

        // 3. Status Badge
        const badge = document.getElementById('decision-badge');
        badge.textContent = data.accepted ? 'Accepted' : 'Rejected';
        badge.className = `inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-1 badge ${data.accepted ? 'accepted' : 'rejected'}`;

        // 4. Detailed Metrics List
        document.getElementById('res-cicd').textContent = data.ci_cd || 'Not Detected';
        document.getElementById('res-test-quality').textContent = data.test_quality || '0%';
        document.getElementById('res-pr-diversity').textContent = data.pr_diversity || '0';
        document.getElementById('res-f2p').textContent = data.f2p_validation || 'Pending';

        // 5. FIXED: Project Structure Cloud
        const structureContainer = document.getElementById('res-structure');
        structureContainer.innerHTML = '';
        if (data.structure && data.structure.length > 0) {
            data.structure.forEach((item, index) => {
                const tag = document.createElement('span');
                tag.textContent = item;
                tag.className = 'opacity-0 animate-fade-in';
                tag.style.animationDelay = `${index * 50}ms`;
                structureContainer.appendChild(tag);
            });
        } else {
            structureContainer.innerHTML = '<p class="text-sm text-slate-600">No structure data available.</p>';
        }

        // 6. Language Doughnut Chart
        initLanguageChart(data.languages || []);

        // 7. Activity Chart (Mocking data based on totals for visual impact)
        initActivityChart(data);

        // 8. Health Score Gauge
        updateHealthScore(data.score || 0);

        // 9. Strategic Suggestions
        const suggestionsBox = document.getElementById('res-suggestions');
        suggestionsBox.innerHTML = '';
        if (data.suggestions && data.suggestions.length > 0) {
            data.suggestions.forEach((s) => {
                const div = document.createElement('div');
                div.className = 'suggestion-card opacity-0 animate-fade-in';
                div.innerHTML = `<p>${s}</p>`;
                suggestionsBox.appendChild(div);
            });
        } else {
            suggestionsBox.innerHTML = '<div class="suggestion-card bg-green-500/5 border-green-500/20 text-green-400">Excellent metrics: No critical improvements required.</div>';
        }

        resultsPanel.classList.remove('hidden');
        
        // Add 3D Tilt Effect to cards
        initTiltEffect();
    }

    function animateCounter(id, target) {
        const el = document.getElementById(id);
        const start = 0;
        const duration = 2000;
        let startTimestamp = null;
        
        target = parseInt(target) || 0;

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const current = Math.floor(progress * target);
            el.textContent = current.toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    function updateHealthScore(score) {
        const scoreVal = Math.round(score);
        const scoreEl = document.getElementById('res-score');
        const circle = document.getElementById('score-circle-fill');
        
        // 2 * PI * r = 2 * 3.14 * 42 = 263.8
        const circumference = 264; 
        const offset = circumference - (scoreVal / 100) * circumference;
        
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = offset;
        
        animateCounter('res-score', scoreVal);
    }

    function initLanguageChart(langs) {
        const ctx = document.getElementById('languages-chart').getContext('2d');
        
        if (langChart) langChart.destroy();
        
        const labels = langs.map(l => l.name);
        const values = langs.map(l => l.percentage);
        
        langChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#6C63FF', '#9F7AEA', '#00C2FF', '#10b981', '#f59e0b'
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                cutout: '75%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94a3b8',
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 10, weight: '600' }
                        }
                    }
                }
            }
        });
    }

    function initActivityChart(data) {
        const ctx = document.getElementById('activity-chart').getContext('2d');
        if (activityChart) activityChart.destroy();

        // Simulated activity data for visual impact (since we only have totals)
        const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
        const commitData = [
            data.commits * 0.1, 
            data.commits * 0.15, 
            data.commits * 0.12, 
            data.commits * 0.2, 
            data.commits * 0.18, 
            data.commits * 0.1, 
            data.commits * 0.15
        ];

        activityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Commits',
                    data: commitData,
                    borderColor: '#6C63FF',
                    backgroundColor: 'rgba(108, 99, 255, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#475569' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false }, ticks: { color: '#475569' } }
                }
            }
        });
    }

    function initTiltEffect() {
        const cards = document.querySelectorAll('.metric-card, .glass-card');
        cards.forEach(card => {
            card.addEventListener('mousemove', e => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 20;
                const rotateY = (centerX - x) / 20;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
            });
        });
    }

    function showError(message) {
        errorBox.textContent = message;
        errorBox.classList.remove('hidden');
    }

    function hideError() {
        errorBox.classList.add('hidden');
        errorBox.textContent = '';
    }
});
