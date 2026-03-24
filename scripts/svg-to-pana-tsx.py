#!/usr/bin/env python3
"""Flatten SVG <g> groups and emit React TSX with style objects."""

from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET


def localname(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag


def parse_style(s: str | None) -> dict[str, float | str]:
    if not s:
        return {}
    out: dict[str, float | str] = {}
    for part in s.split(";"):
        part = part.strip()
        if not part or ":" not in part:
            continue
        k, v = part.split(":", 1)
        k, v = k.strip(), v.strip()
        if k == "opacity":
            out[k] = float(v)
        else:
            out[k] = v
    return out


def merge_styles(
    parent: dict[str, float | str], child: dict[str, float | str]
) -> dict[str, float | str]:
    result = dict(parent)
    for k, v in child.items():
        if k == "opacity" and k in result and isinstance(result[k], float) and isinstance(v, float):
            result[k] = float(result[k]) * float(v)
        else:
            result[k] = v
    return result


def flatten_element(
    elem: ET.Element, inherited: dict[str, float | str]
) -> list[tuple[ET.Element, dict[str, float | str]]]:
    ln = localname(elem.tag)
    if ln == "g":
        st = parse_style(elem.get("style"))
        merged_inh = merge_styles(inherited, st)
        out: list[tuple[ET.Element, dict[str, float | str]]] = []
        for ch in elem:
            out.extend(flatten_element(ch, merged_inh))
        return out
    st = parse_style(elem.get("style"))
    merged = merge_styles(inherited, st)
    return [(elem, merged)]


def react_style_obj(s: dict[str, float | str]) -> str:
    if not s:
        return ""
    parts: list[str] = []
    for k in sorted(s.keys(), key=lambda x: (x != "fill", x)):
        v = s[k]
        if k == "opacity":
            parts.append(f"{k}: {v}")
        else:
            parts.append(f'{k}: "{v}"')
    return " style={{" + ", ".join(parts) + " }}"


def escape_jsx_text(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;")


def attrs_to_jsx(elem: ET.Element, merged_style: dict[str, float | str]) -> str:
    ln = localname(elem.tag)
    parts: list[str] = []

    skip = {"style"}
    for k, v in elem.attrib.items():
        if k == "style":
            continue
        if k.startswith("{"):
            continue
        # xmlns
        if k in ("xmlns",):
            continue
        # XML namespace in tag
        if "}" in k:
            k = k.split("}")[-1]
        if k == "class":
            parts.append(f'className="{escape_jsx_text(v)}"')
        else:
            # camelCase for hyphenated SVG attrs
            rk = re.sub(r"-([a-z])", lambda m: m.group(1).upper(), k)
            parts.append(f'{rk}="{escape_jsx_text(v)}"')

    if merged_style:
        parts.append(react_style_obj(merged_style).strip())

    return " ".join(parts)


def element_to_jsx(elem: ET.Element, merged_style: dict[str, float | str], indent: str) -> str:
    ln = localname(elem.tag)
    attr_str = attrs_to_jsx(elem, merged_style)
    open_tag = f"{indent}<{ln}"
    if attr_str:
        open_tag += f" {attr_str}"
    children = list(elem)
    if not children:
        return f"{open_tag} />"
    lines = [f"{open_tag}>"]
    for ch in children:
        ln_ch = localname(ch.tag)
        if ln_ch == "g":
            raise RuntimeError("unexpected g after flatten")
        st = parse_style(ch.get("style"))
        lines.append(element_to_jsx(ch, st, indent + "  "))
    lines.append(f"{indent}</{ln}>")
    return "\n".join(lines)


def main() -> None:
    raw = sys.stdin.read()
    # ElementTree needs default namespace handling
    root = ET.fromstring(raw)
    if localname(root.tag) != "svg":
        raise SystemExit("root must be svg")

    ns = ""
    if root.tag.startswith("{"):
        ns = root.tag.split("}")[0][1:]

    flattened: list[tuple[ET.Element, dict[str, float | str]]] = []
    for ch in root:
        flattened.extend(flatten_element(ch, {}))

    vb = root.get("viewBox") or ""
    xmlns = root.get("xmlns") or "http://www.w3.org/2000/svg"

    lines = [
        "import type { ComponentProps } from 'react'",
        "",
        "type PanaNoTransactionsProps = ComponentProps<'svg'>",
        'const PANA_NO_TRANSACTIONS_TITLE = "No transactions illustration"',
        "",
        "export default function PanaNoTransactions({ className, ...props }: PanaNoTransactionsProps) {",
        "  return (",
        "    <svg",
        f'      xmlns="{xmlns}"',
        f'      viewBox="{vb}"',
        "      className={className}",
        "      {...props}",
        "    >",
        f"      <title>{{PANA_NO_TRANSACTIONS_TITLE}}</title>",
    ]

    for el, mst in flattened:
        jsx = element_to_jsx(el, mst, "      ")
        lines.append(jsx)

    lines.extend(
        [
            "    </svg>",
            "  )",
            "}",
            "",
        ]
    )
    sys.stdout.write("\n".join(lines))


if __name__ == "__main__":
    main()
