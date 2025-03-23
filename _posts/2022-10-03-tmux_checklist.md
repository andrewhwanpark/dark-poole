---
layout: post
title: Tmux checklist
---

Cool tmux checklist with examples to become really fast with organized terminal navigation
## Checklist

Prefix key is default ctrl+b

| Command | Description | Example |
|---|---|---|
| tmux new -s (name) | Create a new session |  |
| (prefix key) c | Add a window |  |
| (prefix key) (window number)| Switch to another window (numbers are on the bottom of terminal |  |
| tmux ls | List running tmux sessions |  |
| tmux attach -t (session name) | Attach to a running tmux session |  |
| (prefix key) d | Detach from a session |  |
| (prefix key) , | Rename a window |  |
| (prefix key) % : Vertical Split window<br /> (prefix key) " : Horizontal Split window |  Splitting windows |  |
| (prefix key) (arrow keys) | Move across windows |  |
| (prefix key) z | Zoom in and out of window (fullscreen) |  |
| (prefix key) { : Move window left<br /> (prefix key) } : Move window right | Moving windows |  |
| (prefix key) spacebar | Change window layout |  |
| (prefix key) :source-file ~/.tmux.conf | To reset tmux configs from tmux |  |
| (prefix key) x | To kill tmux session |  |
| Ctrl + d | To kill tmux window |  |
| (prefix key) [ | Copy mode |  |
