// The leaderboard, in a <dialog> over the play screen. Opened after a win it first submits that
// run (asking once for a nickname, saved on this device), then shows the top 50. Opened from
// the daily bar it only shows the board.

import { checkNickname } from '../../core';
import type { NicknameError } from '../../core';
import type { Board, SubmitReply } from './api';
import { fetchBoard, submitRun } from './api';
import { messages } from './messages';

// What to say after a submission, in plain words (never the error code).
export function submitMessage(reply: SubmitReply): string {
  if (reply.ok) return messages.boardSaved(reply.rank, reply.best < reply.score);
  return messages.boardErrors[reply.error] ?? messages.boardErrors['offline']!;
}

export function nicknameHint(error: NicknameError | undefined): string {
  return error === undefined ? '' : messages.nicknameErrors[error];
}

export interface BoardRow {
  rank: string;
  nickname: string;
  score: string;
  equation: string; // or the "hidden until the day ends" note
  mine: boolean;
}

// The rows to show: the top entries, plus your own place under them when you're further down.
export function rowsOf(board: Board, nickname: string | undefined): BoardRow[] {
  const rows = board.entries.map((e) => ({
    rank: String(e.rank),
    nickname: e.nickname,
    score: String(e.score),
    equation: e.equation ?? messages.boardHidden,
    mine: e.nickname === nickname,
  }));
  const you = board.you;
  if (you && nickname && !rows.some((r) => r.mine)) {
    rows.push({
      rank: String(you.rank),
      nickname,
      score: String(you.score),
      equation: '',
      mine: true,
    });
  }
  return rows;
}

export interface BoardOptions {
  boardId: string; // "c03" or "daily:42"
  title: string;
  run?: string; // the winning equation to submit first
  nickname: () => string | undefined;
  saveNickname: (nickname: string) => void;
}

export function openLeaderboard(options: BoardOptions): void {
  const dialog = document.createElement('dialog');
  dialog.className = 'board';
  dialog.dataset.testid = 'leaderboard';
  dialog.setAttribute('aria-labelledby', 'board-title');

  const head = document.createElement('div');
  head.className = 'board-head';
  const title = document.createElement('h2');
  title.id = 'board-title';
  title.textContent = options.title;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'board-close';
  close.dataset.testid = 'leaderboard-close';
  close.setAttribute('aria-label', messages.close);
  close.textContent = '✕';
  close.addEventListener('click', () => dialog.close());
  head.append(title, close);

  const body = document.createElement('div');
  body.className = 'board-body';
  const status = document.createElement('p');
  status.className = 'board-status';
  status.dataset.testid = 'leaderboard-status';
  status.setAttribute('aria-live', 'polite');
  dialog.append(head, status, body);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();

  const name = options.nickname();
  if (options.run !== undefined && name === undefined) askNickname();
  else void load(name);

  // Asked once: the nickname is saved on this device and used for every board after.
  function askNickname(): void {
    const form = document.createElement('form');
    form.className = 'board-name';
    const label = document.createElement('label');
    label.htmlFor = 'board-nickname';
    label.textContent = messages.nicknameLabel;
    const input = document.createElement('input');
    input.id = 'board-nickname';
    input.className = 'eq-input';
    input.dataset.testid = 'nickname-input';
    input.maxLength = 16;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    const hint = document.createElement('p');
    hint.className = 'board-hint';
    hint.dataset.testid = 'nickname-hint';
    hint.textContent = messages.nicknameRules;
    const save = document.createElement('button');
    save.type = 'submit';
    save.className = 'ride-btn';
    save.dataset.testid = 'nickname-save';
    save.textContent = messages.nicknameSave;
    input.addEventListener('input', () => {
      hint.textContent =
        input.value === ''
          ? messages.nicknameRules
          : nicknameHint(checkNickname(input.value)) || messages.nicknameOk;
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const error = checkNickname(input.value);
      if (error) {
        hint.textContent = nicknameHint(error);
        input.focus();
        return;
      }
      options.saveNickname(input.value);
      form.remove();
      void load(input.value);
    });
    form.append(label, input, hint, save);
    body.replaceChildren(form);
    input.focus();
  }

  async function load(nickname: string | undefined): Promise<void> {
    status.textContent = messages.boardLoading;
    if (options.run !== undefined && nickname !== undefined) {
      const reply = await submitRun(options.boardId, options.run, nickname);
      status.textContent = submitMessage(reply);
    } else {
      status.textContent = '';
    }
    const board = await fetchBoard(options.boardId, nickname);
    if (!board) {
      status.textContent = messages.boardErrors['offline']!;
      return;
    }
    body.replaceChildren(table(rowsOf(board, nickname)));
  }

  function table(rows: BoardRow[]): HTMLElement {
    if (rows.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'board-hint';
      empty.textContent = messages.boardEmpty;
      return empty;
    }
    const list = document.createElement('ol');
    list.className = 'board-list';
    list.dataset.testid = 'leaderboard-rows';
    for (const r of rows) {
      const li = document.createElement('li');
      if (r.mine) li.dataset.mine = '';
      for (const [cls, text] of [
        ['board-rank', r.rank],
        ['board-nick', r.nickname],
        ['board-score', r.score],
        ['board-eq', r.equation],
      ] as const) {
        const span = document.createElement('span');
        span.className = cls;
        span.textContent = text;
        li.append(span);
      }
      list.append(li);
    }
    return list;
  }
}
