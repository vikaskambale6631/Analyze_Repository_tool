import requests
import sys

def get_repo_stats(repo_url, token=None):
    repo_path = repo_url.replace("https://github.com/", "").strip("/")

    headers = {}
    if token:
        headers["Authorization"] = f"token {token}"

    base_api = f"https://api.github.com/repos/{repo_path}"

    try:
        # Languages (GitHub returns BYTES)
        lang_response = requests.get(f"{base_api}/languages", headers=headers)
        if lang_response.status_code != 200:
            return {"error": "Repository not found or API limit reached"}
        
        lang_data = lang_response.json()
        total_bytes = sum(lang_data.values())
        loc = total_bytes // 40  # approx LOC

        # Language Breakdown (Percentages)
        languages = []
        if total_bytes > 0:
            # Get top 5 languages
            sorted_langs = sorted(lang_data.items(), key=lambda item: item[1], reverse=True)[:5]
            for lang, b in sorted_langs:
                pct = round((b / total_bytes) * 100, 1)
                languages.append({"name": lang, "percentage": pct})

        # Pull Requests
        pr_data = requests.get(
            f"https://api.github.com/search/issues?q=repo:{repo_path}+type:pr",
            headers=headers
        ).json()
        prs = pr_data.get("total_count", 0)

        # Issues
        issue_data = requests.get(
            f"https://api.github.com/search/issues?q=repo:{repo_path}+type:issue",
            headers=headers
        ).json()
        issues = issue_data.get("total_count", 0)

        # Commits (approx)
        commits_url = f"{base_api}/commits?per_page=1"
        r = requests.get(commits_url, headers=headers)

        if "link" in r.headers:
            link = r.headers["link"]
            commits_str = link.split("page=")[-1].split(">")[0]
            commits = int(commits_str)
        else:
            commits = len(r.json())

        return {
            "repo_name": repo_path,
            "loc": loc,
            "prs": prs,
            "commits": commits,
            "issues": issues,
            "languages": languages
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
        print("============================\n")

