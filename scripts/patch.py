#!/usr/bin/env python3
"""NutriPlan — Patch di ristrutturazione (one-shot).

Divide index.html in asset modulari e pulisce i commenti superflui.
Al termine rimuove se stesso e il workflow che lo ha invocato.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "index.html"
CSS_DIR = ROOT / "assets" / "css"
JS_DIR = ROOT / "assets" / "js"
WORKFLOW = ROOT / ".github" / "workflows" / "patch.yml"
PATCH_SCRIPT = ROOT / "scripts" / "patch.py"
SCRIPTS_DIR = ROOT / "scripts"
README = ROOT / "README.md"


def log(msg: str) -> None:
    print(f"[patch] {msg}")


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def write(p: Path, content: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    log(f"scritto {p.relative_to(ROOT)}")


def is_patched(html: str) -> bool:
    return "<style>" not in html and 'id="nutriplan-premium-visual"' not in html


def clean_css(css: str, title: str) -> str:
    # Rimuove header decorativi (/* ==== ... ==== */)
    css = re.sub(r"/\*\s*={5,}[\s\S]*?\*/", "", css)
    css = css.replace("\r\n", "\n").strip()
    css = re.sub(r"\n{3,}", "\n\n", css)
    header = (
        "/* ============================================\n"
        f"   NutriPlan — {title}\n"
        "   ============================================ */\n\n"
    )
    return header + css + "\n"


def strip_script(block: str) -> str:
    m = re.match(r"<script[^>]*>(.*)</script>", block, re.DOTALL)
    return (m.group(1).strip() if m else block) + "\n"


def clean_html(html: str) -> str:
    # Bug: </br> non è valido
    html = html.replace("</br>", "")
    # Rimuove i marker del vecchio sistema premium
    html = re.sub(r"<!--\s*(?:BEGIN|END) NUTRIPLAN PREMIUM[^>]*?-->", "", html)
    # Sostituisce commenti verbosi con versioni brevi
    mapping = {
        "<!-- POPUP SCHERMO INTERO (stile NutriPlan) -->": "<!-- Popup fullscreen -->",
        "<!-- PULSANTE FLOTTANTE PER RIATTIVARE (nascosto di default) -->": "<!-- Pulsante flottante fullscreen -->",
        "<!-- SCRIPT SCHERMO INTERO -->": "",
        "<!-- TOP NAVIGATION -->": "<!-- Navigazione -->",
        "<!-- MAIN CONTAINER -->": "<!-- Contenuto principale -->",
        "<!-- HEADER / SUMMARY HERO -->": "<!-- Riepilogo -->",
        "<!-- HYDRATION GUIDANCE TILE -->": "<!-- Idratazione -->",
        "<!-- WEEKDAY MEALS SECTION -->": "<!-- Pasti feriali -->",
        "<!-- COLAZIONE - NOCI PECAN -->": "",
        "<!-- PRANZO - VERDURE GRIGLIATE -->": "",
        "<!-- CENA - CARNE E VERDURE -->": "",
        "<!-- WEEKEND SECTION (Intestazione visibile, il resto nascosto in stampa) -->": "<!-- Weekend -->",
        "<!-- SABATO TILE (Nascosto in stampa) -->": "",
        "<!-- DOMENICA INTERACTIVE TOGGLE CARD (Nascosto in stampa) -->": "",
        "<!-- OPTION A PANEL -->": "",
        "<!-- OPTION B PANEL (ALL YOU CAN EAT) -->": "",
        "<!-- CHARTS SECTION (Nascosto in stampa) -->": "<!-- Grafici -->",
        "<!-- FOOTER (Nascosto in stampa) -->": "<!-- Footer -->",
    }
    for old, new in mapping.items():
        html = html.replace(old, new)
    html = re.sub(r"\n{4,}", "\n\n", html)
    return html


def main() -> int:
    if not HTML.exists():
        log("index.html non trovato.")
        return 0

    html = read(HTML)
    if is_patched(html):
        log("Progetto già ristrutturato. Nessuna azione.")
        return 0

    # --- CSS base ---
    base_m = re.search(r"<style>\s*(.*?)\s*</style>", html, re.DOTALL)
    if not base_m:
        log("CSS base non trovato.")
        return 1
    write(CSS_DIR / "base.css", clean_css(base_m.group(1), "Base + Stampa"))
    html = html.replace(
        base_m.group(0),
        '<link rel="stylesheet" href="assets/css/base.css">',
        1,
    )

    # --- CSS premium ---
    prem_m = re.search(
        r'<style id="nutriplan-premium-visual"[^>]*>\s*(.*?)\s*</style>',
        html,
        re.DOTALL,
    )
    if not prem_m:
        log("CSS premium non trovato.")
        return 1
    write(CSS_DIR / "premium.css", clean_css(prem_m.group(1), "Premium (screen)"))
    html = html.replace(
        prem_m.group(0),
        '<link rel="stylesheet" href="assets/css/premium.css" media="screen">',
        1,
    )

    # --- JS fullscreen ---
    fs_m = re.search(
        r"<script>\s*\(function \(\) \{\s*'use strict';\s*var el = document\.documentElement;.*?</script>",
        html,
        re.DOTALL,
    )
    if fs_m:
        write(JS_DIR / "fullscreen.js", strip_script(fs_m.group(0)))
        html = html.replace(
            fs_m.group(0),
            '<script src="assets/js/fullscreen.js"></script>',
            1,
        )

    # --- JS effetti premium ---
    fx_m = re.search(
        r'<script id="nutriplan-premium-effects">\s*(.*?)\s*</script>',
        html,
        re.DOTALL,
    )
    if fx_m:
        write(JS_DIR / "premium-effects.js", fx_m.group(1).strip() + "\n")
        html = html.replace(
            fx_m.group(0),
            '<script src="assets/js/premium-effects.js"></script>',
            1,
        )

    # --- JS principale (toggle + grafici) ---
    main_m = re.search(
        r"<script>\s*/\* ========== REVEAL ON SCROLL ==========.*?</script>",
        html,
        re.DOTALL,
    )
    if main_m:
        write(JS_DIR / "main.js", strip_script(main_m.group(0)))
        html = html.replace(
            main_m.group(0),
            '<script src="assets/js/main.js"></script>',
            1,
        )

    # --- Pulizia HTML ---
    html = clean_html(html)
    html = html.replace(
        "<!DOCTYPE html>",
        "<!DOCTYPE html>\n<!-- NutriPlan — struttura modulare. Asset in /assets. -->",
        1,
    )
    write(HTML, html)

    # --- README ---
    write(
        README,
        "# NutriPlan\n\n"
        "Piano alimentare settimanale — struttura modulare.\n\n"
        "## Struttura\n\n"
        "```\n"
        "index.html                    markup della pagina\n"
        "assets/css/base.css           stili base + regole di stampa\n"
        "assets/css/premium.css        stili premium (solo schermo)\n"
        "assets/js/fullscreen.js       gestione API fullscreen\n"
        "assets/js/main.js             toggle e grafici (Chart.js)\n"
        "assets/js/premium-effects.js  animazioni e riflessi progressivi\n"
        "```\n\n"
        "## Sviluppo\n\n"
        "Aprire `index.html` in un browser. Nessun build step richiesto.\n",
    )

    # --- Auto-disattivazione ---
    if WORKFLOW.exists():
        WORKFLOW.unlink()
        log("workflow rimosso")
    if PATCH_SCRIPT.exists():
        PATCH_SCRIPT.unlink()
        log("patch.py rimosso")
    if SCRIPTS_DIR.exists() and not any(SCRIPTS_DIR.iterdir()):
        SCRIPTS_DIR.rmdir()
        log("cartella scripts rimossa")

    log("Ristrutturazione completata.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
