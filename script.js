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
        const repoUrl = repoUrlInput.value.trim();
        const token = tokenInput.value.trim();

        if (!repoUrl) {
            showError('Please enter a GitHub repository URL.');
            return;
        }

        if (!repoUrl.includes('github.com/')) {
            showError('Please enter a valid GitHub repository URL.');
            return;
        }

        // UI Reset
        hideError();
        resultsSection.classList.add('hidden');
        loadingDiv.classList.remove('hidden');
        analyzeBtn.disabled = true;

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repo_url: repoUrl,
                    token: token || null
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to analyze repository');
            }

            const data = await response.json();
            displayResults(data);
            
            // Re-initialize Lucide icons for any dynamic elements
            if (window.lucide) {
                lucide.createIcons();
            }
            
            // Smooth scroll to results
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
