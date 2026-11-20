#!/usr/bin/env python3
"""把 notes/*.json 里的问答渲染进课程页面的锚点区。

用法（笔记与页面同名，路径含空格请加引号）：
    python3 tools/sync_qa.py "notes/一 参考方向决定了欧姆定律的正负号.json" "lessons/一 参考方向决定了欧姆定律的正负号.html"

页面里需要预先放好成对的标记：
    <!-- QA-INDEX:BEGIN --> ... <!-- QA-INDEX:END -->
    <!-- QA:stage-2:BEGIN --> ... <!-- QA:stage-2:END -->

问答条目格式：
    {
      "id": "q-neg-voltage",
      "stage": "stage-2",
      "short": "负电压是不是算错了？",
      "question": "Q：...",
      "answer": "A：...",
      "viz": "可选的小可视化文字"
    }
"""
import html
import json
import re
import sys
from pathlib import Path


def esc(s):
    return html.escape(str(s), quote=False).replace("\n", "<br>")


def render_tag(item, seq):
    qid = item["id"]
    viz = ""
    if item.get("viz"):
        viz = f'<div class="mini-viz"><strong>小可视化：</strong>{esc(item["viz"])}</div>'
    return (
        f'<span class="anchor" data-qa-anchor="{esc(qid)}">'
        f'<button class="q-tag" data-qa-id="{esc(qid)}" onclick="flashQA(\'{esc(qid)}\')" '
        f'aria-label="疑问">疑问</button>'
        f'<span class="popover" role="dialog">'
        f'<button class="close" onclick="closePop(this)">×</button>'
        f'<div class="pq">{seq}. {esc(item["short"])}</div>'
        f'<div class="pq">{esc(item["question"])}</div>'
        f'<div class="pa">{esc(item["answer"])}</div>'
        f'{viz}</span></span>'
    )


def render_index(item, seq):
    qid = item["id"]
    return (
        f'<a onclick="flashQA(\'{esc(qid)}\')" data-qa-link="{esc(qid)}">'
        f'{seq}. {esc(item["short"])}</a>'
    )


def inject(text, marker, content):
    begin = f"<!-- {marker}:BEGIN -->"
    end = f"<!-- {marker}:END -->"
    pattern = re.compile(
        re.escape(begin) + r".*?" + re.escape(end), re.S
    )
    if not pattern.search(text):
        raise SystemExit(f"页面缺少标记：{begin} / {end}")
    return pattern.sub(lambda m: begin + "\n" + content + "\n" + end, text, count=1)


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    notes_path = Path(sys.argv[1])
    page_path = Path(sys.argv[2])
    items = json.loads(notes_path.read_text(encoding="utf-8"))

    text = page_path.read_text(encoding="utf-8")
    by_stage = {}
    seq_of = {}
    for i, item in enumerate(items, 1):
        seq_of[item["id"]] = i
        by_stage.setdefault(item.get("stage", "stage-0"), []).append(item)

    # 侧栏疑问索引
    index_html = "\n        ".join(render_index(it, seq_of[it["id"]]) for it in items)
    text = inject(text, "QA-INDEX", index_html)

    # 各环节的锚点标签
    for stage, group in by_stage.items():
        body = "\n        ".join(render_tag(it, seq_of[it["id"]]) for it in group)
        text = inject(text, f"QA:{stage}", body)

    page_path.write_text(text, encoding="utf-8")
    print(f"已同步 {len(items)} 条问答到 {page_path}")


if __name__ == "__main__":
    main()
