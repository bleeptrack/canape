import {basicSetup} from "codemirror"
import {EditorView} from "@codemirror/view"
import {javascript} from "@codemirror/lang-javascript"
import {StateEffect, StateField} from "@codemirror/state"
import {Decoration} from "@codemirror/view"

// Effect to mark a word
const markWordEffect = StateEffect.define({
	map: (value, change) => ({word: value.word, from: change.mapPos(value.from), to: change.mapPos(value.to)})
});

// State field to track marked words
const markField = StateField.define({
	create() { return Decoration.none },
	update(marks, tr) {
		marks = marks.map(tr.changes);
		for (let e of tr.effects) {
			if (e.is(markWordEffect)) {
				const mark = Decoration.mark({class: "marked-word"});
				marks = marks.update({
					add: [{from: e.value.from, to: e.value.to, value: mark}]
				});
			}
		}
		return marks;
	},
	provide: f => EditorView.decorations.from(f)
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
					to: selection.main.to
				})
			});
		});
	}

	connectedCallback() {
		paper.install(window)
		
		paper.setup(this.shadow.getElementById('canvas'));

		const code = `new Path.Circle({
	center: view.center,
	radius: 50,
	fillColor: 'orange'
})
var size = 3
`;

		const content = this.shadow.getElementById('content');
		
		this.view = new EditorView({
			doc: code,
			parent: content,
			extensions: [
				basicSetup,
				javascript(),
				markField
			]
		});
	}
}

customElements.define('code-editor', Editor);