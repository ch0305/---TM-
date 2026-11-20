#!/usr/bin/env python3
"""项目一致性自检：给新会话和改完文件后的你一键体检。

用法：python3 tools/check_project.py
退出码 0 = 全部通过；1 = 发现问题（逐条打印）。
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
problems = []


def bad(msg):
    problems.append(msg)


def text(path):
    p = ROOT / path
    return p.read_text(encoding="utf-8") if p.exists() else ""


# 1. 本地链接是否都指向存在的文件
pages = [ROOT / "index.html", *sorted((ROOT / "lessons").glob("*.html"))]
for f in pages:
    for m in re.finditer(r'(?:href|src)="([^"#]+)"', f.read_text(encoding="utf-8")):
        url = m.group(1)
        if url.startswith(("http://", "https://", "mailto:", "data:")):
            continue
        target = (f.parent / url.split("?")[0]).resolve()
        if not target.exists():
            bad(f"断链：{f.relative_to(ROOT)} → {url}")

# 2. 课表口径：功率=第三课、KCL/KVL=第二课（同一行出现旧搭配且没有新课号则报错）
watched = [
    ROOT / "README.md", ROOT / "AGENTS.md",
    ROOT / "lessons/drafts/L1-01-教案.md", ROOT / "书籍/摘录/L1-01.md",
    *sorted((ROOT / "docs").glob("*.md")),
    ROOT / "lessons/一 参考方向决定了欧姆定律的正负号.html",
]
for f in watched:
    if not f.exists():
        continue
    for n, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
        if "L1-02" in line and "功率" in line and "第三课" not in line:
            bad(f"旧课表口径：{f.relative_to(ROOT)}:{n} → {line.strip()[:100]}")
        if "L1-03" in line and ("KCL" in line or "KVL" in line) and "第二课" not in line:
            bad(f"旧课表口径：{f.relative_to(ROOT)}:{n} → {line.strip()[:100]}")

# 3. 疑问笔记与页面标记是否配对
for note in sorted((ROOT / "notes").glob("*.json")):
    page = ROOT / "lessons" / (note.stem + ".html")
    if not page.exists():
        bad(f"笔记没有同名页面：{note.relative_to(ROOT)}")
        continue
    items = json.loads(note.read_text(encoding="utf-8"))
    html = page.read_text(encoding="utf-8")
    if "<!-- QA-INDEX:BEGIN -->" not in html or "<!-- QA-INDEX:END -->" not in html:
        bad(f"页面缺少 QA-INDEX 标记：{page.relative_to(ROOT)}")
    tags = len(re.findall(r'class="q-tag"', html))
    if tags != len(items):
        bad(f"问答标签数不符：{page.name} 有 {tags} 个标签，笔记有 {len(items)} 条（先跑 sync_qa.py）")
    for stage in {it.get("stage", "stage-0") for it in items}:
        if f"<!-- QA:{stage}:BEGIN -->" not in html:
            bad(f"页面缺少环节标记 QA:{stage}：{page.relative_to(ROOT)}")

# 4. 自动加载的基线是否指向真实文件
if "lessons/一 参考方向决定了欧姆定律的正负号.html" not in text("AGENTS.md"):
    bad("AGENTS.md 基线里找不到第一课页面路径")
if "lessons/一 参考方向决定了欧姆定律的正负号.html" not in text("index.html"):
    bad("index.html 里找不到第一课入口")

# 5. 独立审核隔离条款是否还在
if "隔离条款" not in text("AGENTS.md"):
    bad("AGENTS.md 缺少独立审核隔离条款（审核会被基线污染）")

if problems:
    print(f"发现 {len(problems)} 个问题：")
    for p in problems:
        print("  -", p)
    sys.exit(1)
print("项目自检通过：链接、课表口径、问答标记、基线、审核隔离均正常。")
