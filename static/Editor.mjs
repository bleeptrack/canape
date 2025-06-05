import {basicSetup} from "codemirror"
import {EditorView} from "@codemirror/view"


export class Editor extends HTMLElement {
	constructor() {
		super();
		this.shadow = this.attachShadow({ mode: 'open' });

		const container = document.createElement('template');

		// creating the inner HTML of the editable list element
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
			</style>
			
			<div id="content"></div>
			
			<button id="run">Run</button>
			<input type="text" id="author" />
			<button id="submit">submit</button>
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
	}

	connectedCallback() {
		paper.install(window)
		
		paper.setup(this.shadow.getElementById('canvas'));

		
		const code = `new Path.Circle({
	center: view.center,
	radius: 50,
	fillColor: 'orange'
})
`;

		const content = this.shadow.getElementById('content');
		
		this.view = new EditorView({
			doc: code,
			parent: content,
			extensions: [basicSetup]
		});
		console.log(this.view.state.doc.toString());
		
		
		
		
	}
}

customElements.define('code-editor', Editor);