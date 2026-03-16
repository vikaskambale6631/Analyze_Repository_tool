document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyze-btn');
    const repoUrlInput = document.getElementById('repo-url');
    const tokenInput = document.getElementById('github-token');
    const loadingDiv = document.getElementById('loading');
    const resultsSection = document.getElementById('results');
    const errorBox = document.getElementById('error-message');
    const languagesContainer = document.getElementById('languages-container');

    const resNameTitle = document.getElementById('res-name-title');
    const resLoc = document.getElementById('res-loc');
    const resPrs = document.getElementById('res-prs');
    const resCommits = document.getElementById('res-commits');
    const resIssues = document.getElementById('res-issues');

    analyzeBtn.addEventListener('click', async () => {
        let repoUrl = repoUrlInput.value.trim();
        const token = tokenInput.value.trim();

        if (!repoUrl) {
            showError('Please enter a GitHub repository URL.');
            return;
        }

        // Extract repo path (username/repo)
        let repoPath = '';
        try {
            const urlObj = new URL(repoUrl);
            if (urlObj.hostname !== 'github.com') throw new Error();
            repoPath = urlObj.pathname.split('/').slice(1, 3).join('/');
            if (repoPath.split('/').length < 2) throw new Error();
        } catch (e) {
            showError('Please enter a valid GitHub repository URL (e.g., https://github.com/facebook/react).');
            return;
        }

        // UI Reset
        hideError();
        resultsSection.classList.add('hidden');
        loadingDiv.classList.remove('hidden');
        analyzeBtn.disabled = true;

        const headers = {};
        if (token) {
            headers["Authorization"] = `token ${token}`;
        }

        const baseApi = `https://api.github.com/repos/${repoPath}`;

        try {
            // 1. Languages
            const langRes = await fetch(`${baseApi}/languages`, { headers });
            if (!langRes.ok) throw new Error('Repository not found or API limit reached');
            const langData = await langRes.json();
            
            const totalBytes = Object.values(langData).reduce((a, b) => a + b, 0);
            const loc = Math.floor(totalBytes / 40);

            // 2. PRs
            const prsRes = await fetch(`https://api.github.com/search/issues?q=repo:${repoPath}+type:pr`, { headers });
            const prsData = await prsRes.json();
            const prs = prsData.total_count || 0;

            // 3. Issues
            const issuesRes = await fetch(`https://api.github.com/search/issues?q=repo:${repoPath}+type:issue`, { headers });
            const issuesData = await issuesRes.json();
            const issues = issuesData.total_count || 0;

            // 4. Commits (estimate from Link header or simple fetch)
            const commitsRes = await fetch(`${baseApi}/commits?per_page=1`, { headers });
            let commits = 0;
            const linkHeader = commitsRes.headers.get('link');
            if (linkHeader) {
                const match = linkHeader.match(/page=(\d+)>; rel="last"/);
                commits = match ? parseInt(match[1]) : 0;
            } else {
                const commitsData = await commitsRes.json();
                commits = Array.isArray(commitsData) ? commitsData.length : 0;
            }

            // 5. Language Breakdown
            const languages = [];
            if (totalBytes > 0) {
                const sortedLangs = Object.entries(langData)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5);
                
                sortedLangs.forEach(([name, bytes]) => {
                    languages.push({
                        name,
                        percentage: ((bytes / totalBytes) * 100).toFixed(1)
                    });
                });
            }

            displayResults({
                repo_name: repoPath,
                loc,
                prs,
                commits,
                issues,
                languages
            });
            
            if (window.lucide) lucide.createIcons();
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            showError(error.message);
        } finally {
            loadingDiv.classList.add('hidden');
            analyzeBtn.disabled = false;
        }
    });

    function displayResults(data) {
        resNameTitle.textContent = data.repo_name || 'Repository';
        
        // Use animated counter for numbers
        animateValue(resLoc, 0, data.loc || 0, 1000);
        animateValue(resCommits, 0, data.commits || 0, 1000);
        animateValue(resPrs, 0, data.prs || 0, 1000);
        animateValue(resIssues, 0, data.issues || 0, 1000);

        // Language Breakdown
        languagesContainer.innerHTML = '';
        if (data.languages && data.languages.length > 0) {
            data.languages.forEach(lang => {
                const langItem = document.createElement('div');
                langItem.className = 'lang-item';
                langItem.innerHTML = `
                    <div class="lang-info">
                        <span>${lang.name}</span>
                        <span>${lang.percentage}%</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: 0%"></div>
                    </div>
                `;
                languagesContainer.appendChild(langItem);

                // Trigger progress bar animation
                setTimeout(() => {
                    langItem.querySelector('.progress-bar-fill').style.width = `${lang.percentage}%`;
                }, 100);
            });
        } else {
            languagesContainer.innerHTML = '<p class="text-muted">No language data available.</p>';
        }

        resultsSection.classList.remove('hidden');
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
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
