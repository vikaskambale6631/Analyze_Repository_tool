import requests
import sys
import base64
import os

def get_repo_stats(repo_url, token=None):
    repo_path = repo_url.replace("https://github.com/", "").strip("/")
    if ".git" in repo_path:
        repo_path = repo_path.replace(".git", "")

    headers = {"Accept": "application/vnd.github.v3+json"}
    
    # Use provided token or fallback to environment variable
    effective_token = token or os.environ.get("GITHUB_TOKEN")
    if effective_token:
        headers["Authorization"] = f"token {effective_token}"

    base_api = f"https://api.github.com/repos/{repo_path}"

    try:
        # Basic Repo Info
        repo_info = requests.get(base_api, headers=headers).json()
        if "message" in repo_info and repo_info["message"] == "Not Found":
            return {"error": "Repository not found"}

        # 1. Languages & LOC
        lang_response = requests.get(f"{base_api}/languages", headers=headers)
        lang_data = lang_response.json()
        
        if "message" in lang_data:
            return {"error": f"GitHub API error: {lang_data['message']}"}

        total_bytes = sum(lang_data.values())
        
        # Refined Heuristic: Language-specific character-per-line (CPL)
        # PHP ~35, JS/TS ~32, HTML/CSS ~45, Others ~40
        loc = 0
        cpl_map = {
            "PHP": 35,
            "JavaScript": 32,
            "TypeScript": 32,
            "Vue": 32,
            "HTML": 45,
            "CSS": 45,
            "SCSS": 45,
            "Python": 38,
            "Go": 40,
            "Rust": 42
        }
        
        for lang, bytes_count in lang_data.items():
            cpl = cpl_map.get(lang, 40)
            loc += bytes_count // cpl

        languages = []
        if total_bytes > 0:
            sorted_langs = sorted(lang_data.items(), key=lambda item: item[1], reverse=True)[:5]
            for lang, b in sorted_langs:
                pct = round((b / total_bytes) * 100, 1)
                languages.append({"name": lang, "percentage": pct})

        # 2. PRs & PR Diversity
        pr_data = requests.get(
            f"https://api.github.com/search/issues?q=repo:{repo_path}+type:pr",
            headers=headers
        ).json()
        prs = pr_data.get("total_count", 0)

        # PR Diversity (approximation from recent PRs)
        recent_prs = requests.get(f"{base_api}/pulls?state=all&per_page=100", headers=headers).json()
        if isinstance(recent_prs, list):
            unique_authors = len(set(pr["user"]["login"] for pr in recent_prs if "user" in pr))
        else:
            unique_authors = 0

        # 3. Issues
        issue_data = requests.get(
            f"https://api.github.com/search/issues?q=repo:{repo_path}+type:issue",
            headers=headers
        ).json()
        issues = issue_data.get("total_count", 0)

        # 4. Commits
        commits_url = f"{base_api}/commits?per_page=1"
        r = requests.get(commits_url, headers=headers)
        if "link" in r.headers:
            link = r.headers["link"]
            commits_str = link.split("page=")[-1].split(">")[0]
            commits = int(commits_str)
        else:
            commits = len(r.json()) if isinstance(r.json(), list) else 0

        # 5. Repo Structure & CI/CD
        contents = requests.get(f"{base_api}/contents", headers=headers).json()
        structure = []
        ci_cd_found = False
        test_dir_found = False
        if isinstance(contents, list):
            for item in contents:
                structure.append(item["name"])
                if item["name"].lower() in [".github", "travis.yml", "circleci", "jenkinsfile"]:
                    ci_cd_found = True
                if "test" in item["name"].lower():
                    test_dir_found = True

        # 6. Test Quality & Coverage (Approximation)
        test_quality_score = 70 if test_dir_found else 30
        if ci_cd_found: test_quality_score += 20
        test_quality_score = min(test_quality_score, 100)

        # 7. Final Decision Constraints
        is_accepted = (
            loc >= 100000 and 
            prs >= 200 and 
            commits >= 500 and 
            issues >= 100
        )

        # Improvement Suggestions
        suggestions = []
        if loc < 100000: suggestions.append("Increase codebase size (aim for 100k+ LOC)")
        if prs < 200: suggestions.append("Encourage more Pull Requests for better collaboration")
        if commits < 500: suggestions.append("Increase commit frequency and project activity")
        if issues < 100: suggestions.append("Track more issues and community feedback")
        if not ci_cd_found: suggestions.append("Implement CI/CD workflows (e.g., GitHub Actions)")
        if not test_dir_found: suggestions.append("Add automated tests and a dedicated test directory")

        # Final Score (Simple weighted average)
        score = (min(loc/100000, 1) * 30 + 
                 min(prs/200, 1) * 20 + 
                 min(commits/500, 1) * 20 + 
                 min(issues/100, 1) * 10 + 
                 (10 if ci_cd_found else 0) + 
                 (10 if test_dir_found else 0))
        score = round(min(score, 100), 1)

        return {
            "repo_name": repo_path,
            "loc": loc,
            "prs": prs,
            "commits": commits,
            "issues": issues,
            "languages": languages,
            "ci_cd": "Detected" if ci_cd_found else "Not Found",
            "test_quality": f"{test_quality_score}%",
            "pr_diversity": unique_authors,
            "structure": structure[:10], # Top 10 files/dirs
            "accepted": is_accepted,
            "score": score,
            "suggestions": suggestions,
            "f2p_validation": "Verified (Heuristic)" if test_dir_found and prs > 50 else "Pending"
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python repo_stats.py <repo_url> [github_token]")
        sys.exit(1)

    repo_url = sys.argv[1]
    token = sys.argv[2] if len(sys.argv) > 2 else None

    stats = get_repo_stats(repo_url, token)
    if "error" in stats:
        print(f"Error: {stats['error']}")
    else:
        print("\n===== Repository Stats =====")
        print("Repository :", stats["repo_name"])
        print("Lines of Code (approx):", stats["loc"])
        print("Pull Requests:", stats["prs"])
        print("Commits:", stats["commits"])
        print("Issues:", stats["issues"])
        print("Accepted:", "YES" if stats["accepted"] else "NO")
        print("Final Score:", stats["score"])
        print("============================\n")

