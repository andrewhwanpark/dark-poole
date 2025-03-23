---
layout: post
title: Vim checklist
---

This is a easy access vim checklist that has examples along with the commands and description.

## Normal Mode

When entering into vim, you enter normal mode. Command mode is where most of the commands in vim will be used.

| Command | Description | Example |
|---|---|---|
| Esc | Entering normal mode (if not already in) |  |
| :w : write to the file<br />:q : quit the file if nothing written<br />:q! : force quit even with written text<br /> | quitting/writing to vim |  |
| :!<command> | Running shell commands from vim |  |
| :set number : normal line numbers<>:set relativenumber : line numbers are relative | Make vim have line numbers |  |
| Ex: 5<arrow key down> (goes 5 lines down) | Typing a number x before a vim command makes you do that command x many times |  |
| h : move left<br />j : move down<br />k : move up<br />l : move right | Moving around (arrow keys also works) |  |
| u : undo (undoes whatever you just did in the last insert mode only)<br />Ctrl + r : redo | undo/redo previous actions |  |
| dd : delete entire line<br />Shift + d : delete the rest of the line from where cursor is | Deleting text |  |
| yy/Shift + y | Copy entire line |  |
| cc : Change the line (delete but also puts you in insert mode after)<br />Shift + c : Changes the rest of the line (changes from where cursor is to the end of the line) | Changing in vim (like delete but leaves you in insert mode after) |  |
| r | Replace character cursor is on |  |
| p : paste text<br />Shift + p : paste text on line above cursor position | Pasting text |  |
| w : move forward a word (this consideres a word separated by hyphens or other searators as well besides spaces)<br />Shift + w : move forward a word (only delimiter is a space)<br />b : move backward a word (same conditions as moving forward)<br />Shift + b : move backward a word (same conditions as moving forward)<br />e : jump to the end of the current word<br />0 : go to the beginning of the line (without entering insert mode)<br />$ : go to the end of line (without entering insert mode) | Moving across text |  |
| dw : deletes a word in front of cursor position<br />(number x)dw : deletes x many words in front<br />d0 : delete everything until the start of line<br />d$ : delete everything until end of line | Combining vim commands examples |  |
| These all can be ci<something>, di<something, yi<something> diw : deletes the word<br />ciw : changes the word<br />yiw : copy the word you are inside of<br />di" : deletes everything inside two quotation marks<br />ci" : changes everything inside two quotation marks<br />yi" : copy everything inside quotes | Options when inside a word (cursor is like in the l part of hello) |  |
| % : go back and forth across a pair of chars (() [] {}) <br /> Only in current line<br />&emsp;&emsp;t : jump to the right before the char in the line <br />&emsp;&emsp;f : jump to on the char in the line<br />&emsp;&emsp;Shift + t : same as t but backwards<br />&emsp;&emsp;Shift + f : same as f but backwards<br /> gg : jump to beginning of file<br /> Shift + g : jump to end of file<br /> <line number> + Shift + g : jump to line number | Jumping/Finding text |  |
| >> : Shift text to the right<br /><< : Shift text to the left<br />If in visual mode and selecting text then only have to do once (> or <)<br />== : indent line correctly (good for programming)<br />gg=Shift + g : If the entire file is badly indented | Indeting/Shifting |  |
| /(search term) : jumps to next occurrence of (search term) from where cursor is at<br />?(search term) : jumpts to previous occurrence of (search term) from where cursor is at<br />n : jumps to next occurrence of (search term)<br />Shift + n : jumpts to previous occurrence of (search term)<br />Selected text in visual mode<br /># : goes to previous term of the highlighted text<br />* : goes to next term of the highlighted text | Searching/Replacing |  |
| m(character) : creates a waypoint to that line<br />'(character) : goes to that waypoint<br />:marks : view all waypoints | Vim waypoints (like a portal back to a certain registered waypoint) (can also be through different files) |  |
| zz | Center line to the middle of screen |  |
| . : execute command that was last run | Repeat command |  |
| :reg : pull up the list of all the saved content<br />"(char)p : paste a certain text from register or (name)p because the Name is the title of it<br />(name)(command) : does some command to that line in the register | Vim registers |  |

## Insert Mode

Insert mode will be used to do all the typing/programming. 

| Command | Description | Example |
|---|---|---|
| i : type before where the highlighted cursor<br />a : type after the highlighted cursor<br />o : create a new line below and enter insert mode<br />Shift + i : go to beginning of current line and enter insert mode<br />Shift + a : go to end of current line and enter insert mode<br />Shift + o : create a new line above and enter insert mode | Entering Insert Mode |  |
  
## Visual Mode

Visual mode will be used to do different things to characters/lines of text.

| Command | Description | Example |
|---|---|---|
| v | Enter Visual Mode |  |
| Arrow keys | Select text |  |
| d | Delete selected text |  |
| c | Deletes selected text and enters insert mode where cursor is |  }
| y : yank/copy the text<br />p (in normal mode) : paste the text | Copy/Paste selected text |  |
| Shift + v | Visual Line mode (only select lines) |  |
| Ctrl + v | Visual Block mode (select by columns) |  |


## Other Useful Vim tricks

These are some other random useful tricks that you might want to know when using vim.

| Trick | Description | Example |
|---|---|---|
| ~/.vimrc | Vim config file so you don't have to type configs everytime |  |
