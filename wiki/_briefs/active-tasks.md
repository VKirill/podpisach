## Brief: active-tasks.md

Focus: In-flight pipeline tasks — snapshot from the task board.

Files to read first:
- `wiki/_active-tasks.json` (pre-fetched from pipeline_tasks DB table)

Group by status (planning / approved / in_work / questions / blocked). If the file is empty, write "No active pipeline tasks at snapshot time (<today>)." and stop.

Target: 3-8 KB.
