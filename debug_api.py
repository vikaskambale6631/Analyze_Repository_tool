from repo_stats import get_repo_stats
import json

url = "https://github.com/nextcloud/server"
stats = get_repo_stats(url)
print(json.dumps(stats, indent=2))
