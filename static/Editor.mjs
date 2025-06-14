import {basicSetup} from "codemirror"
import {EditorView, showTooltip, hoverTooltip} from "@codemirror/view"
import {javascript} from "@codemirror/lang-javascript"
import {StateEffect, StateField} from "@codemirror/state"
import {Decoration} from "@codemirror/view"

// Effect to mark a word
const markWordEffect = StateEffect.define({
	map: (value, change) => ({word: value.word, from: change.mapPos(value.from), to: change.mapPos(value.to), tooltip: value.tooltip})
});

// State field to track marked words
const markField = StateField.define({
	create() { return Decoration.none },
	update(marks, tr) {
		marks = marks.map(tr.changes);
		for (let e of tr.effects) {
			if (e.is(markWordEffect)) {
				const mark = Decoration.mark({
					class: "marked-word"
				});
				marks = marks.update({
					add: [{from: e.value.from, to: e.value.to, value: mark}]
				});
			}
		}
		return marks;
	},
	provide: f => EditorView.decorations.from(f)
});

// State field to track tooltips
const tooltipField = StateField.define({
	create() { return new Map() },
	update(tooltips, tr) {
		tooltips = new Map(tooltips);
		
		// Remove tooltips for positions that were changed
		tr.changes.iterChanges((fromA, toA, fromB, toB) => {
			for (let [from] of tooltips) {
				if (from >= fromA && from <= toA) {
					tooltips.delete(from);
				}
			}
		});
		
		// Add new tooltips from effects
		for (let e of tr.effects) {
			if (e.is(markWordEffect)) {
				tooltips.set(e.value.from, e.value.tooltip);
			}
		}
		
		return tooltips;
	}
});

// Hover tooltip extension
const hoverTooltipExtension = hoverTooltip((view, pos) => {
	const tooltips = view.state.field(tooltipField);
	for (let [from, tooltip] of tooltips) {
		if (pos >= from && pos <= from + 10) { // Check if we're near the start of a marked word
			return {
				pos: from,
				above: true,
				arrow: true,
				create: () => {
					const dom = document.createElement("div");
					dom.textContent = tooltip;
					return {dom};
				}
			};
		}
	}
	return null;
});

export class Editor extends HTMLElement {
	constructor() {
		super();
		this.shadow = this.attachShadow({ mode: 'open' });

		const container = document.createElement('template');

		container.innerHTML = `
			<style>
				:host {
					display: block;
					width: 100%;
					height: 100%;
				}
				.cm-editor {
					height: 100%;
				}
				.marked-word {
					background-color: #ffeb3b;
					border-radius: 2px;
					cursor: help;
				}
				.cm-tooltip {
					background-color: blue !important;
					color: white;
					padding: 8px 12px;
					border-radius: 6px;
					font-size: 14px;
					box-shadow: 0 2px 4px rgba(0,0,0,0.2);
					max-width: 200px;
					text-align: center;
				}
				.cm-tooltip .cm-tooltip-arrow:before,
				.cm-tooltip .cm-tooltip-arrow:after {
					border-bottom-color: blue !important;
				}
			</style>
			
			<div id="content"></div>
			
			<button id="run">Run</button>
			<input type="text" id="author" />
			<button id="submit">submit</button>
			<button id="mark">Mark Word</button>
			<canvas id="canvas"></canvas>
		`;

		this.shadow.appendChild(container.content.cloneNode(true));

		this.shadow.getElementById('run').addEventListener('click', () => {
			paper.PaperScript.execute(this.view.state.doc.toString(), paper);
		});

		this.shadow.getElementById('submit').addEventListener('click', () => {
			const code = this.view.state.doc.toString();
			const author = this.shadow.getElementById('author').value;
			if (!author) {
				alert('Please enter an author name');
				return;
			}
			fetch('/code', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: `code=${encodeURIComponent(code)}&author=${encodeURIComponent(author)}`
			})
			.then(response => {
				if (!response.ok) {
					throw new Error('Network response was not ok');
				}
				alert('Code saved successfully!');
			})
			.catch(error => {
				console.error('Error:', error);
				alert('Error saving code. Please try again.');
			});
		});

		this.shadow.getElementById('mark').addEventListener('click', () => {
			const selection = this.view.state.selection;
			if (selection.main.empty) {
				alert('Please select a word to mark');
				return;
			}
			const word = this.view.state.sliceDoc(selection.main.from, selection.main.to);
			this.view.dispatch({
				effects: markWordEffect.of({
					word: word,
					from: selection.main.from,
					to: selection.main.to,
					tooltip: ""
				})
			});
		});
	}

	async connectedCallback() {
		paper.install(window)
		
		paper.setup(this.shadow.getElementById('canvas'));

		const { info, code } = await import('./sample-codes/rectangular.js');
		

		const content = this.shadow.getElementById('content');
		
		this.view = new EditorView({
			doc: code,
			parent: content,
			extensions: [
				basicSetup,
				javascript(),
				markField,
				tooltipField,
				hoverTooltipExtension
			]
		});

		// Mark values assigned to keys from the info object
		const doc = this.view.state.doc.toString();
		for (const key of Object.keys(info)) {
			// Look for patterns like key: value or key = value, handling both strings and numbers
			const regex = new RegExp(`${key}\\s*[:=]\\s*(['"]([^'"]+)['"]|(\\d+))`, 'g');
			let match;
			while ((match = regex.exec(doc)) !== null) {
				let valueStart, valueEnd;
				if (match[2]) { // String value
					valueStart = match.index + match[0].indexOf("'") + 1;
					valueEnd = match.index + match[0].lastIndexOf("'");
				} else { // Number value
					valueStart = match.index + match[0].lastIndexOf("=") + 1;
					valueEnd = match.index + match[0].length;
				}
				// Trim whitespace
				while (doc[valueStart] === ' ') valueStart++;
				while (doc[valueEnd - 1] === ' ') valueEnd--;
				
				this.view.dispatch({
					effects: markWordEffect.of({
						word: match[2] || match[3],
						from: valueStart,
						to: valueEnd,
						tooltip: info[key]
					})
				});
			}
		}
	}
}

customElements.define('code-editor', Editor);