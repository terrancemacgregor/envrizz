#!/bin/bash

# Run tests with JSON output, generate branded HTML report, open in browser

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPORT_PATH="$PROJECT_DIR/docs/test-reports/test-report.html"

cd "$PROJECT_DIR"

# Run jest with JSON reporter
echo "Running tests..."
TEST_JSON=$(npx jest --json --passWithNoTests 2>/dev/null)

# Generate the report
python3 << 'PYTHON_EOF'
import json
import os
import sys
import sqlite3
import base64
import subprocess
from datetime import datetime

project_dir = os.environ.get("PROJECT_DIR", os.getcwd())
report_path = os.environ.get("REPORT_PATH", "docs/test-reports/test-report.html")
test_json_str = r'''JEST_JSON_PLACEHOLDER'''

# Parse test results
try:
    test_json_str = sys.stdin.read() if not test_json_str.strip() else test_json_str
except:
    pass

# Read from file if stdin didn't work
json_path = os.path.join(project_dir, ".test-results.json")

# Run jest ourselves to get JSON
import subprocess as sp
result = sp.run(["npx", "jest", "--json", "--passWithNoTests"],
                capture_output=True, text=True, cwd=project_dir)
test_json_str = result.stdout

try:
    data = json.loads(test_json_str)
except json.JSONDecodeError:
    # Try to find JSON in the output
    for line in test_json_str.split("\n"):
        line = line.strip()
        if line.startswith("{"):
            try:
                data = json.loads(line)
                break
            except:
                continue
    else:
        print("Failed to parse test output")
        sys.exit(1)

# Get branding
db = sqlite3.connect(os.path.expanduser("~/.claude/skills/new-report/project-icons.db"))
row = db.execute("SELECT display_name, tagline, project_path, logo_path, favicon_path FROM projects WHERE project_name = ?", ("envrizz",)).fetchone()
display_name, tagline, project_path, logo_path, favicon_path = row

# Resize logo to 64px
logo_full = os.path.join(project_path, logo_path)
logo_small = "/tmp/envrizz-logo-64.png"
subprocess.run(["sips", "-Z", "64", logo_full, "--out", logo_small], capture_output=True)

with open(logo_small, "rb") as f:
    logo_uri = f"data:image/png;base64,{base64.b64encode(f.read()).decode()}"

favicon_full = os.path.join(project_path, favicon_path)
favicon_small = "/tmp/envrizz-favicon-32.png"
subprocess.run(["sips", "-Z", "32", favicon_full, "--out", favicon_small], capture_output=True)

with open(favicon_small, "rb") as f:
    favicon_uri = f"data:image/png;base64,{base64.b64encode(f.read()).decode()}"

# Extract test data
num_suites = data.get("numTotalTestSuites", 0)
num_passed_suites = data.get("numPassedTestSuites", 0)
num_failed_suites = data.get("numFailedTestSuites", 0)
num_tests = data.get("numTotalTests", 0)
num_passed = data.get("numPassedTests", 0)
num_failed = data.get("numFailedTests", 0)
duration_ms = data.get("testResults", [{}])[-1].get("endTime", 0) - data.get("startTime", 0) if data.get("testResults") else 0
duration_s = duration_ms / 1000 if duration_ms > 0 else 0
success = data.get("success", False)
timestamp = datetime.now().strftime("%B %d, %Y at %I:%M %p")

# Build stat cards
overall_pill = '<span class="pill pill-pass">PASS</span>' if success else '<span class="pill pill-fail">FAIL</span>'

# Build suite rows
suite_rows = ""
for suite in data.get("testResults", []):
    name = os.path.basename(suite.get("name", "unknown"))
    status = "pass" if suite.get("status") == "passed" else "fail"
    pill = f'<span class="pill pill-{status}">{"PASS" if status == "pass" else "FAIL"}</span>'
    suite_duration = (suite.get("endTime", 0) - suite.get("startTime", 0)) / 1000
    test_count = len(suite.get("assertionResults", []))
    passed = len([t for t in suite.get("assertionResults", []) if t.get("status") == "passed"])
    suite_rows += f'<tr><td><code>{name}</code></td><td>{pill}</td><td>{passed}/{test_count}</td><td>{suite_duration:.2f}s</td></tr>\n'

# Build individual test rows
test_rows = ""
for suite in data.get("testResults", []):
    suite_name = os.path.basename(suite.get("name", "unknown"))
    for test in suite.get("assertionResults", []):
        status = "pass" if test.get("status") == "passed" else "fail"
        pill = f'<span class="pill pill-{status}">{"PASS" if status == "pass" else "FAIL"}</span>'
        title = " > ".join(test.get("ancestorTitles", [])) + " > " + test.get("title", "")
        title = title.strip(" > ")
        duration = test.get("duration", 0)
        duration_str = f"{duration}ms" if duration else "<1ms"
        test_rows += f'<tr><td>{pill}</td><td>{title}</td><td style="white-space:nowrap;">{duration_str}</td></tr>\n'

# Build failure details
failure_section = ""
has_failures = False
for suite in data.get("testResults", []):
    for test in suite.get("assertionResults", []):
        if test.get("status") == "failed":
            has_failures = True
            title = " > ".join(test.get("ancestorTitles", [])) + " > " + test.get("title", "")
            messages = "\n".join(test.get("failureMessages", []))
            failure_section += f'''
  <div class="section">
    <h2><span class="pill pill-fail">FAIL</span> {title}</h2>
    <div class="code-block">{messages}</div>
  </div>'''

if not has_failures:
    failure_section = ""

# ── Run scenarios against real temp dirs ──────────────────────────────────────

import tempfile, shutil

scenarios = []

def run_scenario(dir_path, file_defs):
    """Run a scenario: create files, run diff + generate-example, build matrix, return results."""
    for fname, fcontent in file_defs:
        with open(os.path.join(dir_path, fname), "w") as f:
            f.write(fcontent)

    # Parse keys per file
    file_keys = {}
    for fname, fcontent in file_defs:
        keys = []
        for line in fcontent.strip().split("\n"):
            if "=" in line and not line.startswith("#"):
                keys.append(line.split("=", 1)[0])
        file_keys[fname] = set(keys)

    # All unique keys
    all_keys = []
    seen = set()
    for fname, _ in file_defs:
        for k in file_keys[fname]:
            if k not in seen:
                all_keys.append(k)
                seen.add(k)

    filenames = [f[0] for f in file_defs]

    # Build matrix
    common_count = sum(1 for k in all_keys if all(k in file_keys[f] for f in filenames))
    gap_count = sum(1 for k in all_keys if not all(k in file_keys[f] for f in filenames))
    missing_count = sum(1 for k in all_keys for f in filenames if k not in file_keys[f])

    matrix_header = "<tr><th>Key</th>" + "".join(f"<th>{f}</th>" for f in filenames) + "</tr>\n"
    matrix_rows = ""
    for k in all_keys:
        in_all = all(k in file_keys[f] for f in filenames)
        row_class = ' class="row-pass"' if in_all else ' class="row-warn"'
        cells = ""
        for f in filenames:
            if k in file_keys[f]:
                cells += '<td class="check">&#10003;</td>'
            else:
                cells += '<td class="miss">&#10007;</td>'
        matrix_rows += f"<tr{row_class}><td><code>{k}</code></td>{cells}</tr>\n"

    # Run generate-example
    cli = os.path.join(project_dir, "dist", "cli.js")
    sp.run(["node", cli, "generate-example"], capture_output=True, text=True, cwd=dir_path)
    example_content = ""
    example_path = os.path.join(dir_path, ".env.example")
    if os.path.exists(example_path):
        with open(example_path) as f:
            example_content = f.read()

    shutil.rmtree(dir_path)

    return {
        "matrix_header": matrix_header,
        "matrix_rows": matrix_rows,
        "common_count": common_count,
        "gap_count": gap_count,
        "missing_count": missing_count,
        "example_output": example_content,
    }

# Scenario 1: Dev + Test with overlapping keys
s1_files = [
    (".env", "# The port the server listens on\nPORT=3000\n\n# PostgreSQL connection string\nDATABASE_URL=postgres://localhost/mydb\n\n# API authentication key\nAPI_KEY=dev_secret_123"),
    (".env.test", "# The port the test server listens on\nPORT=5000\n\n# Test database connection\nDATABASE_URL=postgres://localhost/testdb\n\n# Test API key\nAPI_KEY=test_secret_456\n\n# Test runner timeout in ms\nTEST_TIMEOUT=5000"),
]
s1 = run_scenario(tempfile.mkdtemp(prefix="envrizz-scenario-"), s1_files)
scenarios.append({
    "title": "Dev + Test: 3 shared keys, 1 unique",
    "description": "A developer has a <code>.env</code> for local development and a <code>.env.test</code> for running tests. Three variables are shared, one is test-only.",
    "files": s1_files,
    **s1,
})

# Scenario 2: Dev + Staging + Production, some drift
s2_files = [
    (".env", "# The port the server listens on\nPORT=3000\n\n# PostgreSQL connection string\nDATABASE_URL=postgres://localhost/app\n\n# Redis cache URL\nREDIS_URL=redis://localhost\n\n# Enable debug mode\nDEBUG=true"),
    (".env.staging", "# Staging server port\nPORT=8080\n\n# Staging database\nDATABASE_URL=postgres://staging-db/app\n\n# Staging Redis\nREDIS_URL=redis://staging-redis\n\n# Sentry error tracking DSN\nSENTRY_DSN=https://sentry.io/staging"),
    (".env.production", "# Production port\nPORT=80\n\n# Production database\nDATABASE_URL=postgres://prod-db/app\n\n# Production Redis\nREDIS_URL=redis://prod-redis\n\n# Sentry error tracking DSN\nSENTRY_DSN=https://sentry.io/prod\n\n# CDN base URL for static assets\nCDN_URL=https://cdn.example.com"),
]
s2 = run_scenario(tempfile.mkdtemp(prefix="envrizz-scenario-"), s2_files)
scenarios.append({
    "title": "Dev + Staging + Production: environment drift",
    "description": "Three environments with shared core variables but each has extras the others don't. This is the classic drift problem EnvRizz catches.",
    "files": s2_files,
    **s2,
})

# Scenario 3: Perfectly synced files
s3_files = [
    (".env", "# The port the server listens on\nPORT=3000\n\n# API authentication key\nAPI_KEY=local_key"),
    (".env.local", "# Local port override\nPORT=3001\n\n# Local API key override\nAPI_KEY=my_override"),
]
s3 = run_scenario(tempfile.mkdtemp(prefix="envrizz-scenario-"), s3_files)
scenarios.append({
    "title": "Perfectly synced: all keys match",
    "description": "Two files with identical keys but different values. This is the ideal state — everything is aligned.",
    "files": s3_files,
    **s3,
})

# Scenario 4: Four environments, realistic project
s4_files = [
    (".env", "# The port the server listens on\nPORT=3000\n\n# PostgreSQL connection string\nDATABASE_URL=postgres://localhost/app\n\n# Redis cache URL\nREDIS_URL=redis://localhost\n\n# Secret key for signing JWTs\nJWT_SECRET=dev_secret\n\n# Logging verbosity\nLOG_LEVEL=debug"),
    (".env.test", "# Test server port\nPORT=5000\n\n# Test database\nDATABASE_URL=postgres://localhost/app_test\n\n# Test Redis\nREDIS_URL=redis://localhost\n\n# Test JWT secret\nJWT_SECRET=test_secret\n\n# Test runner timeout in ms\nTEST_TIMEOUT=10000\n\n# Running in CI\nCI=true"),
    (".env.staging", "# Staging server port\nPORT=8080\n\n# Staging database\nDATABASE_URL=postgres://staging-rds/app\n\n# Staging Redis\nREDIS_URL=redis://staging-cache\n\n# Staging JWT secret\nJWT_SECRET=stg_secret\n\n# Sentry error tracking DSN\nSENTRY_DSN=https://sentry.io/stg\n\n# S3 bucket for uploaded assets\nS3_BUCKET=app-staging-assets"),
    (".env.production", "# Production port (HTTPS)\nPORT=443\n\n# Production database\nDATABASE_URL=postgres://prod-rds/app\n\n# Production Redis\nREDIS_URL=redis://prod-cache\n\n# Production JWT secret\nJWT_SECRET=prod_secret\n\n# Sentry error tracking DSN\nSENTRY_DSN=https://sentry.io/prod\n\n# S3 bucket for uploaded assets\nS3_BUCKET=app-prod-assets\n\n# CDN base URL for static assets\nCDN_URL=https://cdn.example.com"),
]
s4 = run_scenario(tempfile.mkdtemp(prefix="envrizz-scenario-"), s4_files)
scenarios.append({
    "title": "Full stack: Dev + Test + Staging + Production",
    "description": "A realistic project with four environments. Core variables are shared, but each environment picks up extras as it moves toward production. The matrix shows exactly where the gaps are.",
    "files": s4_files,
    **s4,
})

# ── Comment Scenarios ─────────────────────────────────────────────────────────
# These demonstrate how the comment selection algorithm works

comment_scenarios = []

# Comment Scenario 1: Base file (.env) has comment, others don't
cs1 = {
    "title": "Base file has the comment",
    "description": "Only <code>.env</code> has a comment for PORT. The other files don't. The algorithm uses the base file's comment.",
    "files": [
        (".env", "# The port the server listens on\nPORT=3000"),
        (".env.staging", "PORT=8080"),
        (".env.production", "PORT=443"),
    ],
    "expected_comment": "# The port the server listens on",
    "rule": "Rule 1: .env comment wins",
}
comment_scenarios.append(cs1)

# Comment Scenario 2: Base file has no comment, but others agree
cs2 = {
    "title": "Other files agree, base file is blank",
    "description": "<code>.env</code> has no comment, but staging and production both have the same comment. The algorithm uses the agreed-upon comment.",
    "files": [
        (".env", "PORT=3000"),
        (".env.staging", "# Server listening port\nPORT=8080"),
        (".env.production", "# Server listening port\nPORT=443"),
    ],
    "expected_comment": "# Server listening port",
    "rule": "Rule 2: Other files agree",
}
comment_scenarios.append(cs2)

# Comment Scenario 3: Files have different comments
cs3 = {
    "title": "Files disagree on the comment",
    "description": "Each file describes PORT differently. The algorithm picks the longest comment because it's the most descriptive.",
    "files": [
        (".env", "# Port\nPORT=3000"),
        (".env.staging", "# Staging port\nPORT=8080"),
        (".env.production", "# The port the production server listens on (HTTPS)\nPORT=443"),
    ],
    "expected_comment": "# The port the production server listens on (HTTPS)",
    "rule": "Rule 3: Longest comment wins",
}
comment_scenarios.append(cs3)

# Comment Scenario 4: No files have comments
cs4 = {
    "title": "No comments anywhere",
    "description": "None of the files have a comment for DATABASE_URL. The algorithm generates a TODO placeholder so the developer knows to document it.",
    "files": [
        (".env", "DATABASE_URL=postgres://localhost/mydb"),
        (".env.staging", "DATABASE_URL=postgres://staging/mydb"),
        (".env.production", "DATABASE_URL=postgres://prod/mydb"),
    ],
    "expected_comment": "# TODO: describe DATABASE_URL",
    "rule": "Rule 4: No comment found, add TODO",
}
comment_scenarios.append(cs4)

# Comment Scenario 5: Mix — some keys commented, some not
cs5 = {
    "title": "Mixed: some keys documented, some not",
    "description": "A realistic file where PORT is documented everywhere, DATABASE_URL only in production, and API_KEY nowhere. Shows all rules in action.",
    "files": [
        (".env", "# The port the server listens on\nPORT=3000\nDATABASE_URL=postgres://localhost/mydb\nAPI_KEY=dev_key"),
        (".env.staging", "# The port the server listens on\nPORT=8080\nDATABASE_URL=postgres://staging/mydb\nAPI_KEY=stg_key"),
        (".env.production", "# The port the server listens on\nPORT=443\n# PostgreSQL connection string\nDATABASE_URL=postgres://prod/mydb\nAPI_KEY=prod_key"),
    ],
    "expected_comment": "PORT: Rule 1 (.env comment)\nDATABASE_URL: Rule 2 (production has it)\nAPI_KEY: Rule 4 (TODO placeholder)",
    "rule": "Multiple rules in one file",
}
comment_scenarios.append(cs5)

# Build comment scenarios HTML with sub-tabs
cs_tab_buttons = ""
cs_tab_contents = ""
for i, cs in enumerate(comment_scenarios):
    active = " active" if i == 0 else ""
    cs_tab_buttons += f'<button class="sub-tab{active}" onclick="switchCommentTab({i})" data-cstab="{i}">Scenario {i+1}</button>\n'

    files_html = ""
    for fname, fcontent in cs["files"]:
        files_html += f'<div style="margin-bottom:12px;"><div style="font-size:11px;font-weight:600;color:#475569;margin-bottom:4px;">{fname}</div><div class="code-block" style="max-height:none;">{fcontent}</div></div>\n'

    # Build the expected output visualization
    expected_lines = cs["expected_comment"].split("\\n") if "\\n" in cs["expected_comment"] else [cs["expected_comment"]]

    cs_tab_contents += f'''
    <div id="cs-{i}" class="sub-content{active}">
      <div class="section">
        <h2>{cs["title"]}</h2>
        <p style="font-size:13px;color:#64748b;margin-bottom:16px;">{cs["description"]}</p>

        <h3 style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px;">Input Files</h3>
        {files_html}

        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:16px;">
          <div style="flex:1;min-width:250px;">
            <h3 style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px;">Expected Comment in .env.example</h3>
            <div class="code-block" style="max-height:none;">{cs["expected_comment"]}</div>
          </div>
          <div style="flex:1;min-width:250px;">
            <h3 style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px;">Rule Applied</h3>
            <div style="padding:12px 16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;font-size:13px;color:#0c4a6e;font-weight:500;">
              {cs["rule"]}
            </div>
          </div>
        </div>
      </div>
    </div>'''

comment_scenarios_html = f'''
    <div class="sub-tabs">
      {cs_tab_buttons}
    </div>
    {cs_tab_contents}'''

# Build scenarios HTML with sub-tabs
sub_tab_buttons = ""
sub_tab_contents = ""
for i, s in enumerate(scenarios):
    active = " active" if i == 0 else ""
    sub_tab_buttons += f'<button class="sub-tab{active}" onclick="switchSubTab({i})" data-subtab="{i}">Scenario {i+1}</button>\n'

    files_html = ""
    for fname, fcontent in s["files"]:
        files_html += f'<div style="margin-bottom:12px;"><div style="font-size:11px;font-weight:600;color:#475569;margin-bottom:4px;">{fname}</div><div class="code-block" style="max-height:none;">{fcontent}</div></div>\n'

    sub_tab_contents += f'''
    <div id="scenario-{i}" class="sub-content{active}">
      <div class="section">
        <h2>{s["title"]}</h2>
        <p style="font-size:13px;color:#64748b;margin-bottom:16px;">{s["description"]}</p>

        <h3 style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px;">Key Matrix</h3>
        <div class="summary-bar">
          <div class="summary-item"><div class="dot dot-green"></div> {s["common_count"]} common</div>
          <div class="summary-item"><div class="dot dot-yellow"></div> {s["gap_count"]} with gaps</div>
          <div class="summary-item"><div class="dot dot-red"></div> {s["missing_count"]} total missing</div>
        </div>
        <table style="margin-bottom:20px;">
          {s["matrix_header"]}
          {s["matrix_rows"]}
        </table>

        <h3 style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px;">Generated .env.example</h3>
        <div class="code-block" style="margin-bottom:20px;">{s["example_output"] if s["example_output"] else "(no common keys — no file generated)"}</div>

        <h3 style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px;">Input Files</h3>
        {files_html}
      </div>
    </div>'''

scenarios_html = f'''
    <div class="sub-tabs">
      {sub_tab_buttons}
    </div>
    {sub_tab_contents}'''

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/png" href="{favicon_uri}">
<title>Test Report — {display_name}</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #fff; color: #1e293b; line-height: 1.6;
  }}
  .container {{ max-width: 960px; margin: 0 auto; padding: 40px 24px; }}
  .report-header {{
    display: flex; align-items: center; gap: 16px; margin-bottom: 12px;
  }}
  .report-header img {{ height: 36px; width: auto; }}
  .report-header h1 {{ font-size: 24px; font-weight: 700; color: #0f172a; }}
  .report-header .spacer {{ flex: 1; }}
  .report-subtitle {{ font-size: 14px; color: #64748b; margin-bottom: 4px; }}
  .report-timestamp {{ font-size: 13px; color: #94a3b8; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }}
  .btn-copy {{
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 6px; border: 1px solid #e2e8f0;
    background: #f8fafc; color: #475569; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all 0.15s;
  }}
  .btn-copy:hover {{ background: #f1f5f9; border-color: #cbd5e1; }}
  .copy-modal-overlay {{
    display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5);
    z-index: 1000; align-items: center; justify-content: center;
  }}
  .copy-modal-overlay.visible {{ display: flex; }}
  .copy-modal {{
    background: #fff; border-radius: 12px; box-shadow: 0 25px 50px rgba(0,0,0,0.15);
    width: 90%; max-width: 640px; max-height: 80vh; display: flex; flex-direction: column;
  }}
  .copy-modal-header {{
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid #e2e8f0;
  }}
  .copy-modal-header h3 {{ font-size: 15px; font-weight: 600; color: #0f172a; }}
  .copy-modal-close {{
    background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 20px; line-height: 1;
  }}
  .copy-modal-close:hover {{ color: #475569; }}
  .copy-modal-body {{
    padding: 20px; overflow-y: auto; flex: 1;
    font-family: 'SF Mono', 'Fira Code', 'Menlo', monospace;
    font-size: 13px; line-height: 1.7; color: #334155;
    white-space: pre-wrap; word-wrap: break-word;
    background: #f8fafc; border-bottom: 1px solid #e2e8f0;
  }}
  .copy-modal-footer {{
    display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 14px 20px;
  }}
  .btn-modal-cancel {{
    padding: 7px 16px; border-radius: 6px; border: 1px solid #e2e8f0;
    background: #fff; color: #475569; font-size: 13px; font-weight: 500; cursor: pointer;
  }}
  .btn-modal-cancel:hover {{ background: #f8fafc; }}
  .btn-modal-copy {{
    padding: 7px 16px; border-radius: 6px; border: 1px solid #2563eb;
    background: #2563eb; color: #fff; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all 0.15s;
  }}
  .btn-modal-copy:hover {{ background: #1d4ed8; }}
  .btn-modal-copy.copied {{ background: #166534; border-color: #166534; }}
  .section {{ margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }}
  .section h2 {{
    font-size: 16px; font-weight: 700; color: #0f172a;
    margin-bottom: 14px; display: flex; align-items: center; gap: 10px;
  }}
  .section h2 .num {{
    background: #334155; color: #fff; width: 26px; height: 26px;
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 12px; flex-shrink: 0;
  }}
  .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }}
  .stat-card {{ border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; }}
  .stat-card .label {{ font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px; }}
  .stat-card .value {{ font-size: 20px; font-weight: 700; color: #0f172a; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
  th {{ text-align: left; padding: 10px 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }}
  td {{ padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }}
  tr:hover td {{ background: #f8fafc; }}
  code {{ font-family: 'SF Mono', 'Fira Code', 'Menlo', monospace; font-size: 12px; background: #f1f5f9; padding: 2px 6px; border-radius: 3px; }}
  .pill {{ display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }}
  .pill-pass {{ background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }}
  .pill-fail {{ background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }}
  .pill-warn {{ background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }}
  .pill-info {{ background: #f0f9ff; color: #0c4a6e; border: 1px solid #bae6fd; }}
  .code-block {{
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;
    padding: 16px; font-family: 'SF Mono', 'Fira Code', 'Menlo', monospace;
    font-size: 12px; line-height: 1.7; color: #475569;
    white-space: pre-wrap; word-wrap: break-word; max-height: 400px; overflow-y: auto;
  }}
  .report-footer {{ text-align: center; margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }}

  /* ---- Tabs ---- */
  .tabs {{ display: flex; gap: 0; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; }}
  .tab {{
    padding: 10px 20px; font-size: 14px; font-weight: 600; color: #94a3b8;
    cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px;
    transition: all 0.15s; background: none; border-top: none; border-left: none; border-right: none;
  }}
  .tab:hover {{ color: #475569; }}
  .tab.active {{ color: #0f172a; border-bottom-color: #0f172a; }}
  .tab-content {{ display: none; }}
  .tab-content.active {{ display: block; }}

  /* ---- Sub-tabs ---- */
  .sub-tabs {{ display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }}
  .sub-tab {{
    padding: 8px 16px; font-size: 13px; font-weight: 500; color: #64748b;
    cursor: pointer; border-radius: 8px; border: 1px solid #e2e8f0;
    background: #fff; transition: all 0.15s;
  }}
  .sub-tab:hover {{ background: #f8fafc; border-color: #cbd5e1; }}
  .sub-tab.active {{ background: #0f172a; color: #fff; border-color: #0f172a; }}
  .sub-content {{ display: none; }}
  .sub-content.active {{ display: block; }}

  /* ---- Matrix ---- */
  .check {{ color: #166534; font-weight: 700; text-align: center; }}
  .miss {{ color: #dc2626; font-weight: 700; text-align: center; }}
  .row-pass {{ background: #f0fdf4; }}
  .row-warn {{ background: #fffbeb; }}
  .summary-bar {{ display: flex; gap: 16px; margin-bottom: 12px; font-size: 13px; }}
  .summary-item {{ display: flex; align-items: center; gap: 6px; }}
  .dot {{ width: 10px; height: 10px; border-radius: 50%; }}
  .dot-green {{ background: #22c55e; }}
  .dot-yellow {{ background: #f59e0b; }}
  .dot-red {{ background: #ef4444; }}
</style>
</head>
<body>
<div class="container">
  <div class="report-header">
    <img src="{logo_uri}" alt="{display_name}">
    <h1>Test Report</h1>
    <div class="spacer"></div>
    <button class="btn-copy" onclick="openModal('llm')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      Copy to LLM
    </button>
  </div>
  <div class="report-subtitle">{tagline}</div>
  <div class="report-timestamp">{timestamp}</div>

  <!-- Tabs -->
  <div class="tabs">
    <button class="tab active" onclick="switchTab('tests')">Test Results</button>
    <button class="tab" onclick="switchTab('scenarios')">Scenarios</button>
    <button class="tab" onclick="switchTab('comments')">Comment Scenarios</button>
  </div>

  <!-- Tab: Test Results -->
  <div id="tab-tests" class="tab-content active">

    <!-- Summary -->
    <div class="section">
      <h2><span class="num">1</span> Summary</h2>
      <div class="stats">
        <div class="stat-card"><div class="label">Result</div><div class="value">{overall_pill}</div></div>
        <div class="stat-card"><div class="label">Tests</div><div class="value">{num_passed}/{num_tests}</div></div>
        <div class="stat-card"><div class="label">Suites</div><div class="value">{num_passed_suites}/{num_suites}</div></div>
        <div class="stat-card"><div class="label">Duration</div><div class="value">{duration_s:.1f}s</div></div>
      </div>
    </div>

    <!-- Test Suites -->
    <div class="section">
      <h2><span class="num">2</span> Test Suites</h2>
      <table>
        <tr><th>Suite</th><th>Status</th><th>Tests</th><th>Duration</th></tr>
        {suite_rows}
      </table>
    </div>

    <!-- All Tests -->
    <div class="section">
      <h2><span class="num">3</span> All Tests</h2>
      <table>
        <tr><th style="width:60px;">Status</th><th>Test</th><th>Duration</th></tr>
        {test_rows}
      </table>
    </div>

    {failure_section}

  </div>

  <!-- Tab: Scenarios -->
  <div id="tab-scenarios" class="tab-content">
    <p style="font-size:13px;color:#64748b;margin-bottom:20px;">Real-world scenarios showing how <code>envrizz diff</code> and <code>envrizz generate-example</code> behave with different .env file configurations.</p>
    {scenarios_html}
  </div>

  <!-- Tab: Comment Scenarios -->
  <div id="tab-comments" class="tab-content">
    <p style="font-size:13px;color:#64748b;margin-bottom:12px;">How does envrizz decide which comment to use in <code>.env.example</code> when multiple files have different comments for the same key?</p>

    <div class="section" style="margin-bottom:20px;background:#f8fafc;">
      <h2>Algorithm</h2>
      <table>
        <tr><th style="width:60px;">Priority</th><th>Rule</th><th>When it applies</th></tr>
        <tr><td><span class="pill pill-pass">1</span></td><td><strong>.env comment wins</strong></td><td>The base <code>.env</code> file has a comment above the key</td></tr>
        <tr><td><span class="pill pill-info">2</span></td><td><strong>Other files agree</strong></td><td><code>.env</code> has no comment, but other files share the same comment</td></tr>
        <tr><td><span class="pill pill-warn">3</span></td><td><strong>Longest comment wins</strong></td><td>Files have different comments — the most descriptive one is chosen</td></tr>
        <tr><td><span class="pill pill-fail">4</span></td><td><strong>TODO placeholder</strong></td><td>No file has a comment — outputs <code># TODO: describe KEY_NAME</code></td></tr>
      </table>
    </div>

    {comment_scenarios_html}
  </div>

  <div class="report-footer">{display_name} &mdash; Generated {timestamp}</div>
</div>

<!-- Copy Preview Modal -->
<div class="copy-modal-overlay" id="copyModal">
  <div class="copy-modal">
    <div class="copy-modal-header">
      <h3 id="modalTitle">Preview &mdash; Copy to LLM</h3>
      <button class="copy-modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="copy-modal-body" id="copyModalBody"></div>
    <div class="copy-modal-footer">
      <button class="btn-modal-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn-modal-copy" id="modalCopyBtn" onclick="copyFromModal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        Copy
      </button>
    </div>
  </div>
</div>

<script>
function buildLlmText() {{
  const container = document.querySelector('.container');
  const lines = [];
  const h1 = container.querySelector('h1');
  if (h1) lines.push(h1.textContent.trim(), '');
  const sub = container.querySelector('.report-subtitle');
  const ts = container.querySelector('.report-timestamp');
  if (sub) lines.push(sub.textContent.trim());
  if (ts) lines.push(ts.textContent.trim(), '');
  container.querySelectorAll('.section').forEach(el => {{
    const heading = el.querySelector('h2');
    if (heading) lines.push(heading.textContent.trim());
    el.querySelectorAll('.stat-card').forEach(card => {{
      const label = card.querySelector('.label');
      const value = card.querySelector('.value');
      if (label && value) lines.push('  ' + label.textContent.trim() + ': ' + value.textContent.trim());
    }});
    el.querySelectorAll('tr').forEach(tr => {{
      const cells = [...tr.querySelectorAll('th, td')].map(c => c.textContent.trim());
      if (cells.length) lines.push(cells.join(' | '));
    }});
    lines.push('');
  }});
  return lines.join('\\n').replace(/\\n{{3,}}/g, '\\n\\n').trim();
}}

function openModal() {{
  document.getElementById('modalTitle').textContent = 'Preview \\u2014 Copy to LLM';
  document.getElementById('copyModalBody').textContent = buildLlmText();
  document.getElementById('copyModal').classList.add('visible');
}}

function closeModal() {{
  document.getElementById('copyModal').classList.remove('visible');
}}

function copyFromModal() {{
  const text = document.getElementById('copyModalBody').textContent;
  navigator.clipboard.writeText(text).then(() => {{
    const btn = document.getElementById('modalCopyBtn');
    btn.classList.add('copied');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Copied';
    setTimeout(() => {{
      btn.classList.remove('copied');
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy';
      closeModal();
    }}, 1200);
  }});
}}

document.getElementById('copyModal').addEventListener('click', (e) => {{
  if (e.target === e.currentTarget) closeModal();
}});
document.addEventListener('keydown', (e) => {{
  if (e.key === 'Escape') closeModal();
}});

function switchTab(tab) {{
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  event.target.classList.add('active');
}}

function switchSubTab(idx) {{
  document.querySelectorAll('#tab-scenarios .sub-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#tab-scenarios .sub-tab').forEach(el => el.classList.remove('active'));
  document.getElementById('scenario-' + idx).classList.add('active');
  document.querySelector('[data-subtab="' + idx + '"]').classList.add('active');
}}

function switchCommentTab(idx) {{
  document.querySelectorAll('#tab-comments .sub-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#tab-comments .sub-tab').forEach(el => el.classList.remove('active'));
  document.getElementById('cs-' + idx).classList.add('active');
  document.querySelector('[data-cstab="' + idx + '"]').classList.add('active');
}}
</script>
</body>
</html>'''

os.makedirs(os.path.dirname(report_path), exist_ok=True)
with open(report_path, "w") as f:
    f.write(html)

print(f"Report saved to: {report_path}")
PYTHON_EOF

# Open in browser
open "$REPORT_PATH"
