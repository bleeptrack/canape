import {basicSetup} from "codemirror"
import {EditorView, showTooltip, hoverTooltip} from "@codemirror/view"
import {javascript} from "@codemirror/lang-javascript"
import {StateEffect, StateField} from "@codemirror/state"
import {Decoration} from "@codemirror/view"
import {foldAll, foldGutter, foldState} from "@codemirror/language"

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
				if (e.value.clear) {
					return Decoration.none;
				}
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
					width: calc(100% - 2vh);
					height: calc(100% - 2vh);
					margin: 1vh;
					
				}
				.cm-editor {
					height: 100%;
					width: 100%;
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
				canvas {
					width: 100%;
					height: 100%;
				}
				main {
					display: flex;
					flex-direction: row;
					height: 100%;
				}
				#code-editor {	
					max-width: 45vw;
					flex: 1;
					background-color: #f0f0f0;
				}
				#canvas-container {
					flex: 1;
					max-width: 50vw;
					position: relative;
				}
				#submission {
					position: absolute;
					bottom: 0;
					right: 0;
					width: calc(100% - 2vh);
					background-color: #f0f0f0;
					padding: 1vh;
					align-items: center;
					justify-content: center;
				}
				#submission {
					display: flex;
					gap: 1vh;
				}
				#submission input {
					flex: 1;
				}
				#actions {
					display: flex;
					flex-direction: column;
					justify-content: center;
					gap: 1vh;
					max-width: 5vw;
				}
			</style>
			<main>
				<div id="code-editor">
				<div id="level-selector">
					<button id="level1">Level 1</button>
					<button id="level2">Level 2</button>
					<button id="level3">Level 3</button>
				</div>
				<div id="content"></div>
				</div>
				
				<div id="actions">
					<button id="run">Run</button>
					<button id="undo">Undo</button>	
				</div>

				<div id="canvas-container">
					<canvas id="canvas"></canvas>
					<div id="submission">
						<input type="text" id="author" />
						<button id="submit">submit</button>
					</div>
				</div>
			</main>
		`;

		this.shadow.appendChild(container.content.cloneNode(true));

		this.shadow.getElementById('run').addEventListener('click', () => {
			paper.project.clear();
			
			paper.PaperScript.execute(this.view.state.doc.toString(), paper);
		});

		this.shadow.getElementById('undo').addEventListener('click', () => {
			
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

		this.shadow.getElementById('level1').addEventListener('click', () => {
			this.selectLevel(0);
		});

		this.shadow.getElementById('level2').addEventListener('click', () => {
			this.selectLevel(1);
		});

		this.shadow.getElementById('level3').addEventListener('click', () => {
			this.selectLevel(2);
		});
	}

	removeAllMarks() {
		this.view.dispatch({
			effects: markWordEffect.of({
				clear: true
			})
		});
	}

	selectLevel(level) {
		this.removeAllMarks();
		// Mark values assigned to keys from the info object
		const doc = this.view.state.doc.toString();
		console.log(this.info[level]);
		console.log(this.info);
		for (const key of Object.keys(this.info[level])) {
			// Look for patterns like key: value or key = value, capturing everything after the equals sign
			const regex = new RegExp(`${key}\\s*[:=]\\s*(.+)$`, 'gm');
			let match;
			while ((match = regex.exec(doc)) !== null) {
				const valueStart = match.index + match[0].indexOf(match[1]);
				const valueEnd = valueStart + match[1].length;
				
				// Trim whitespace
				while (doc[valueStart] === ' ') valueStart++;
				while (doc[valueEnd - 1] === ' ') valueEnd--;
				
				this.view.dispatch({
					effects: markWordEffect.of({
						word: match[1],
						from: valueStart,
						to: valueEnd,
						tooltip: this.info[level][key]
					})
				});
			}
		}
	}

	async loadStage(stage) {
		console.log("loading stage", stage);
		const { info, code } = await import(`./sample-codes/${stage}.js`);
		this.info = info;
		this.code = code;
		this.view.dispatch({
			changes: {
				from: 0,
				to: this.view.state.doc.length,
				insert: this.code
			}
		});
		this.selectLevel(0);
		foldAll(this.view);
	}

	async connectedCallback() {
		paper.install(window)
		
		paper.setup(this.shadow.getElementById('canvas'));

		const content = this.shadow.getElementById('content');
		
		this.view = new EditorView({
			doc: "",
			parent: content,
			extensions: [
				basicSetup,
				javascript(),
				markField,
				tooltipField,
				hoverTooltipExtension,
				foldGutter(),
				foldState
			]
		});

		const filename = this.getAttribute('filename') || 'rectangular';
		this.loadStage(filename);
	}
}

customElements.define('code-editor', Editor);