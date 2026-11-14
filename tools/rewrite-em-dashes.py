#!/usr/bin/env python3
"""Rewrite em dashes in user-facing string literals across the client apps.

The script walks each file with a small scanner so it only touches text
inside a string literal or JSX text, never a code comment. The rule:

  "X — Y"  ->  "X. Y"   when Y starts with a capital letter
           ->  "X: Y"   when Y starts with an article (an appositive)
           ->  "X, Y"   otherwise (an aside)

A lone em dash is a placeholder for a missing value, so it is left
alone.

Usage: python3 tools/rewrite-em-dashes.py <paths...>
"""

import io
import re
import sys

DASH = "\u2014"


def is_capital(ch: str) -> bool:
    return ch.isalpha() and ch.upper() == ch and ch.lower() != ch


def next_nonspace(text: str, idx: int) -> str:
    """First non-space character at or after idx, crossing newlines."""
    i = idx
    while i < len(text) and text[i] in " \t\r\n":
        i += 1
    return text[i] if i < len(text) else ""


def rewrite(text: str, dash_pos: int) -> str:
    """Rewrite the dash at `dash_pos` in `text`."""
    after = next_nonspace(text, dash_pos + 1)
    before = text[:dash_pos].rstrip()
    if not before:
        # A leading dash: drop it and the following space.
        return text[:dash_pos] + text[dash_pos + 1 :].lstrip()
    if after and is_capital(after):
        # A new sentence: close the first one and start the next.
        return text[:dash_pos].rstrip() + ". " + text[dash_pos + 1 :].lstrip()
    rest = text[dash_pos + 1 :].lstrip()
    if re.match(r"(?:an?|the)\s", rest, re.IGNORECASE):
        # An appositive or a list introduced by a noun: a colon fits.
        return text[:dash_pos].rstrip() + ": " + rest
    # An aside: a comma carries it.
    return text[:dash_pos].rstrip() + ", " + rest


def string_spans(source: str):
    """Yield (start, end) ranges of string literals in `source`."""
    i = 0
    n = len(source)
    while i < n:
        ch = source[i]
        if ch == "/" and i + 1 < n and source[i + 1] == "/":
            j = source.find("\n", i)
            i = n if j == -1 else j
            continue
        if ch == "/" and i + 1 < n and source[i + 1] == "*":
            j = source.find("*/", i + 2)
            i = n if j == -1 else j + 2
            continue
        if ch in "\"'":
            j = i + 1
            while j < n:
                if source[j] == "\\":
                    j += 2
                    continue
                if source[j] == ch:
                    break
                j += 1
            yield (i, j)
            i = j + 1
            continue
        if ch == "`":
            j = i + 1
            while j < n:
                if source[j] == "\\":
                    j += 2
                    continue
                if source[j] == "$" and j + 1 < n and source[j + 1] == "{":
                    depth = 1
                    k = j + 2
                    while k < n and depth:
                        if source[k] == "{":
                            depth += 1
                        elif source[k] == "}":
                            depth -= 1
                        k += 1
                    j = k
                    continue
                if source[j] == "`":
                    break
                j += 1
            yield (i, j)
            i = j + 1
            continue
        i += 1


def comment_spans(source: str):
    """Yield (start, end) ranges of comments in `source`."""
    i = 0
    n = len(source)
    while i < n:
        ch = source[i]
        if ch == "/" and i + 1 < n and source[i + 1] == "/":
            j = source.find("\n", i)
            j = n if j == -1 else j
            yield (i, j)
            i = j
            continue
        if ch == "/" and i + 1 < n and source[i + 1] == "*":
            j = source.find("*/", i + 2)
            j = n if j == -1 else j + 2
            yield (i, j)
            i = j
            continue
        if ch in "\"'`":
            # Skip over string literals so a "//" inside one is not read
            # as a comment.
            j = i + 1
            while j < n:
                if source[j] == "\\":
                    j += 2
                    continue
                if source[j] == ch:
                    break
                j += 1
            i = j + 1
            continue
        i += 1


def in_spans(spans, pos: int) -> bool:
    for start, end in spans:
        if start <= pos <= end:
            return True
        if start > pos:
            break
    return False


def process(source: str, jsx_text: bool) -> str:
    """Rewrite the dashes inside string literals, then the JSX text."""
    text = rewrite_strings(source)
    if jsx_text:
        text = rewrite_jsx_text(text)
    return text


def rewrite_strings(source: str) -> str:
    """Rewrite every dash that sits inside a string literal."""
    spans = list(string_spans(source))
    result = []
    last = 0
    for start, end in spans:
        if start < last:
            continue
        result.append(source[last:start])
        result.append(rewrite_body(source[start : end + 1]))
        last = end + 1
    result.append(source[last:])
    return "".join(result)


def rewrite_jsx_text(source: str) -> str:
    """Rewrite the dashes that sit in JSX text (outside any literal)."""
    spans = list(string_spans(source))
    comments = list(comment_spans(source))
    out = []
    i = 0
    n = len(source)
    while i < n:
        ch = source[i]
        if ch == DASH and not in_spans(spans, i) and not in_spans(comments, i):
            rest = source[i + 1 :]
            after = next_nonspace(rest, 0)
            stripped = rest.lstrip()
            # Drop the whitespace that sat in front of the dash.
            while out and out[-1] in " \t\n":
                out.pop()
            if after and is_capital(after):
                # A new sentence: close the first one and start the next.
                out.append(". ")
            elif re.match(r"(?:an?|the)\s", stripped, re.IGNORECASE):
                # An appositive or a list introduced by a noun.
                out.append(": ")
            else:
                # An aside: a comma carries it.
                out.append(", ")
            i = i + 1 + (len(rest) - len(stripped))
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def rewrite_body(body: str) -> str:
    """Rewrite the dashes inside one string literal (quotes included)."""
    if len(body) < 2:
        return body
    quote = body[0]
    inner = body[1:-1] if body[-1] == quote else body[1:]
    # A lone em dash is a placeholder for a missing value.
    if inner.strip() == DASH:
        return body
    while True:
        pos = inner.find(DASH)
        if pos == -1:
            break
        inner = rewrite(inner, pos)
    return quote + inner + (quote if body[-1] == quote else "")


def main() -> None:
    changed = 0
    for path in sys.argv[1:]:
        with io.open(path, encoding="utf-8", newline="") as fh:
            source = fh.read()
        if DASH not in source:
            continue
        result = process(source, jsx_text=path.endswith((".tsx", ".jsx")))
        if result != source:
            with io.open(path, "w", encoding="utf-8", newline="") as fh:
                fh.write(result)
            changed += 1
            print("rewrote", path)
    print(f"{changed} file(s) changed")


if __name__ == "__main__":
    main()
