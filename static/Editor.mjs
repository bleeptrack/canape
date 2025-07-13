import {basicSetup} from "codemirror"
import {EditorView, showTooltip, hoverTooltip} from "@codemirror/view"
import {javascript} from "@codemirror/lang-javascript"
import {StateEffect, StateField} from "@codemirror/state"
import {Decoration} from "@codemirror/view"
import {foldAll, foldGutter, foldState} from "@codemirror/language"
import {syntaxHighlighting, HighlightStyle} from "@codemirror/language"
import {tags} from "@lezer/highlight"

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
		return marks;const myHighlightStyle = HighlightStyle.define([
			{tag: tags.keyword, color: "#fc6"},
			{tag: tags.comment, color: "#f5d", fontStyle: "italic"}
		  ])
	},
	provide: f => EditorView.decorations.from(f)
});

const myHighlightStyle = HighlightStyle.define([
	{tag: tags.keyword, color: "#fc6"},
	{tag: tags.comment, color: "#f5d", fontStyle: "italic"}
  ])

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
				
				/* CodeMirror Theme Customization */
				.cm-editor {
					background-color: var(--background-color, #272620);
					color: var(--text-color, #fff);
					font-family: var(--font-family, Arial, sans-serif);
				}
				
				/* Editor content area */
				.cm-content {
					background-color: var(--background-color, #272620);
					color: var(--text-color, #fff);
				}
				
				/* Line numbers */
				.cm-gutters {
					background-color: var(--background-color, #272620);
					border-right: 1px solid var(--secondary-color, #00ffd0);
					color: var(--secondary-color, #00ffd0);
				}
				
				/* Active line highlighting */
				.cm-activeLine {
					background-color: rgba(255, 0, 85, 0.1);
				}
				
				/* Selection */
				.cm-selectionBackground {
					background-color: rgba(0, 255, 208, 0.3);
				}
				
				/* Syntax highlighting */
				.cm-keyword {
					color: var(--primary-color, #ff0055);
					font-weight: bold;
				}
				
				.cm-string {
					color: var(--secondary-color, #00ffd0);
				}
				
				.cm-number {
					color: var(--secondary-color, #00ffd0);
				}
				
				.cm-comment {
					color: #888;
					font-style: italic;
				}
				
				.cm-operator {
					color: var(--primary-color, #ff0055);
				}
				
				.cm-variable {
					color: var(--text-color, #fff);
				}
				
				.cm-variable-2 {
					color: var(--text-color, #fff);
				}
				
				.cm-property {
					color: var(--secondary-color, #00ffd0);
				}
				
				.cm-definition {
					color: var(--primary-color, #ff0055);
				}
				
				.cm-function {
					color: var(--primary-color, #ff0055);
				}
				
				.cm-builtin {
					color: var(--primary-color, #ff0055);
				}
				
				/* Cursor */
				.cm-cursor {
					border-left-color: var(--primary-color, #ff0055);
				}
				
				/* Scrollbar */
				.cm-scroller::-webkit-scrollbar {
					width: 8px;
				}
				
				.cm-scroller::-webkit-scrollbar-track {
					background: var(--background-color, #272620);
				}
				
				.cm-scroller::-webkit-scrollbar-thumb {
					background: var(--secondary-color, #00ffd0);
					border-radius: 4px;
				}
				
				.cm-scroller::-webkit-scrollbar-thumb:hover {
					background: var(--primary-color, #ff0055);
				}
				
				.marked-word {
					background-color: var(--primary-color, #ff0055);
					color: var(--background-color, #272620);
					border-radius: 2px;
					cursor: help;
					font-weight: bold;
				}
				.cm-tooltip {
					background-color: var(--primary-color, #ff0055) !important;
					color: var(--background-color, #272620);
					padding: 8px 12px;
					border-radius: 6px;
					font-size: 14px;
					box-shadow: 0 2px 4px rgba(0,0,0,0.2);
					max-width: 200px;
					text-align: center;
					font-weight: bold;
				}
				.cm-tooltip .cm-tooltip-arrow:before,
				.cm-tooltip .cm-tooltip-arrow:after {
					border-bottom-color: var(--primary-color, #ff0055) !important;
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
				#level-selector {
					display: flex;
					gap: 1vh;
					margin-bottom: 1vh;
				}
				#level-selector button {
					flex: 1;
					padding: 0.5em;
					background: var(--background-color);
					color: var(--primary-color);
					border: 2px solid var(--primary-color);
					border-radius: var(--border-radius);
					cursor: pointer;
					font-family: var(--header-font-family);
					box-shadow: 2px 2px 0 var(--secondary-color), 4px 4px 0 #0002;
					transition: var(--transition);
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 0.5em;
					font-size: 0.9em;
				}
				#level-selector button:hover {
					background: var(--secondary-color);
					color: #fff;
					border-color: var(--secondary-color);
					transform: translate(-2px, -2px);
					box-shadow: 4px 4px 0 var(--primary-color), 8px 8px 0 #0003;
				}
				#level-selector button.active {
					background: var(--primary-color);
					color: #fff;
					box-shadow: 2px 2px 0 var(--secondary-color), 4px 4px 0 #0002;
				}
				.star-icon {
					font-size: 1.2em;
					line-height: 1;
				}
				#actions button {
					background: var(--background-color);
					color: var(--primary-color);
					border: 2px solid var(--primary-color);
					border-radius: var(--border-radius);
					padding: 0.5em;
					cursor: pointer;
					font-family: var(--header-font-family);
					box-shadow: 2px 2px 0 var(--secondary-color), 4px 4px 0 #0002;
					transition: var(--transition);
					font-size: 0.9em;
				}
				#actions button:hover {
					background: var(--secondary-color);
					color: #fff;
					border-color: var(--secondary-color);
					transform: translate(-2px, -2px);
					box-shadow: 4px 4px 0 var(--primary-color), 8px 8px 0 #0003;
				}
				#submit {
					background: var(--background-color);
					color: var(--primary-color);
					border: 2px solid var(--primary-color);
					border-radius: var(--border-radius);
					padding: 0.5em 1em;
					cursor: pointer;
					font-family: var(--header-font-family);
					box-shadow: 2px 2px 0 var(--secondary-color), 4px 4px 0 #0002;
					transition: var(--transition);
				}
				#submit:hover {
					background: var(--secondary-color);
					color: #fff;
					border-color: var(--secondary-color);
					transform: translate(-2px, -2px);
					box-shadow: 4px 4px 0 var(--primary-color), 8px 8px 0 #0003;
				}
			</style>
			<main>
				<div id="code-editor">
				<div id="level-selector">
					<button id="level1"><span class="star-icon">★</span>Level 1</button>
					<button id="level2"><span class="star-icon">★★</span>Level 2</button>
					<button id="level3"><span class="star-icon">★★★</span>Level 3</button>
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
		
		// Update active button styling
		const levelButtons = ['level1', 'level2', 'level3'];
		levelButtons.forEach((buttonId, index) => {
			const button = this.shadow.getElementById(buttonId);
			if (index === level) {
				button.classList.add('active');
			} else {
				button.classList.remove('active');
			}
		});
		
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
		this.shadow.getElementById('run').click();
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
				syntaxHighlighting(myHighlightStyle),
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