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
					font-size: 16px;
				}
				
				/* Editor content area */
				.cm-content {
					background-color: var(--background-color, #272620);
					color: var(--text-color, #fff);
					font-size: 16px;
				}
				
				/* Line numbers */
				.cm-gutters {
					background-color: var(--secondary-color, #00ffd0) !important;
					border-right: 1px solid var(--secondary-color, #00ffd0) !important;
					color: var(--background-color, #272620) !important;
				}
				.cm-lineNumbers {
					background-color: var(--secondary-color, #00ffd0) !important;
					color: var(--background-color, #272620) !important;
				}
				.cm-gutterElement {
					background-color: var(--secondary-color, #00ffd0) !important;
					color: var(--background-color, #272620) !important;
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
					padding: 12px 16px;
					border-radius: 8px;
					font-size: 42px;
					box-shadow: 0 4px 8px rgba(0,0,0,0.3);
					max-width: 400px;
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
					height: 100%;
					display: flex;
					flex-direction: column;
					overflow: hidden;
				}
				#content {
					flex: 1;
					overflow: hidden;
					min-height: 0;
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
					font-size: 1.1em;
					padding: 1em;
					font-family: var(--font-family);
					background: var(--background-color);
					color: var(--text-color);
					border: 2px solid var(--primary-color);
					border-radius: var(--border-radius);
					height: 100%;
					box-sizing: border-box;
				}
				#submission input::placeholder {
					color: var(--secondary-color, #00ffd0);
					opacity: 0.8;
					font-family: var(--font-family);
				}
				#actions {
					display: flex;
					flex-direction: column;
					justify-content: center;
					gap: 3vh;
					max-width: 9vw;
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
					font-size: 1.1em;
					letter-spacing: 1px;
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
					font-size: 1.4em;
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
					width: 6vw;
					height: 6vw;
					display: flex;
					align-items: center;
					justify-content: center;
					margin: 1vh;
				}
				#actions button svg {
					width: 80%;
					height: 80%;
					fill: currentColor;
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
					padding: 1em;
					cursor: pointer;
					font-family: var(--header-font-family);
					box-shadow: 2px 2px 0 var(--secondary-color), 4px 4px 0 #0002;
					transition: var(--transition);
					display: flex;
					align-items: center;
					justify-content: center;
				}
				#submit svg {
					width: 2em;
					height: 2em;
					fill: currentColor;
				}
				#submit:hover {
					background: var(--secondary-color);
					color: #fff;
					border-color: var(--secondary-color);
					transform: translate(-2px, -2px);
					box-shadow: 4px 4px 0 var(--primary-color), 8px 8px 0 #0003;
				}
				
				/* Popover Styling */
				#popover {
					position: fixed;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					background: var(--background-color);
					border: 3px solid var(--primary-color);
					border-radius: var(--border-radius);
					box-shadow: 4px 4px 0 var(--secondary-color), 8px 8px 0 #0003;
					padding: 0;
					min-width: 300px;
					max-width: 500px;
					z-index: 1000;
				}
				
				#popover-content {
					display: flex;
					flex-direction: column;
					gap: 1em;
					padding: 2em;
					position: relative;
				}
				
				#popover-message {
					color: var(--text-color);
					font-size: 1.2em;
					text-align: center;
					line-height: 1.4;
					font-weight: bold;
				}
				
				#popover-message #email {
					width: 100%;
					padding: 1em;
					font-size: 1.2em;
					background: var(--background-color);
					color: var(--text-color);
					border: 2px solid var(--primary-color);
					border-radius: var(--border-radius);
					margin: 1em 0;
					box-sizing: border-box;
					box-shadow: 2px 2px 0 var(--secondary-color), 4px 4px 0 #0002;
				}
				
				#popover-message #email::placeholder {
					color: var(--secondary-color);
					opacity: 0.8;
				}
				
				#popover-message button {
					background: var(--background-color);
					color: var(--primary-color);
					border: 2px solid var(--primary-color);
					border-radius: var(--border-radius);
					padding: 1em 2em;
					cursor: pointer;
					font-size: 1.2em;
					font-weight: bold;
					box-shadow: 2px 2px 0 var(--secondary-color), 4px 4px 0 #0002;
					transition: var(--transition);
					margin: 1em 0;
				}
				
				#popover-message button:hover {
					background: var(--secondary-color);
					color: #fff;
					border-color: var(--secondary-color);
					transform: translate(-2px, -2px);
					box-shadow: 4px 4px 0 var(--primary-color), 8px 8px 0 #0003;
				}
				
				#email-success {
					text-align: center;
				}
				
				#email-success button {
					margin: 0 0.5em;
					background: var(--background-color);
					color: var(--primary-color);
					border: 2px solid var(--primary-color);
					border-radius: var(--border-radius);
					padding: 0.8em 1.5em;
					cursor: pointer;
					font-size: 1em;
					font-weight: bold;
					box-shadow: 2px 2px 0 var(--secondary-color), 4px 4px 0 #0002;
					transition: var(--transition);
					margin-bottom: 1vh;
				}
				
				#email-success button:hover {
					background: var(--secondary-color);
					color: #fff;
					border-color: var(--secondary-color);
					transform: translate(-2px, -2px);
					box-shadow: 4px 4px 0 var(--primary-color), 8px 8px 0 #0003;
				}
				
				#popover-close {
					position: absolute;
					top: 0.5em;
					right: 0.5em;
					background: var(--primary-color);
					color: var(--background-color);
					border: none;
					border-radius: 50%;
					width: 2em;
					height: 2em;
					cursor: pointer;
					font-size: 1.2em;
					font-weight: bold;
					display: flex;
					align-items: center;
					justify-content: center;
					box-shadow: 2px 2px 0 var(--secondary-color);
					transition: var(--transition);
				}
				
				#popover-close:hover {
					background: var(--secondary-color);
					transform: translate(-1px, -1px);
					box-shadow: 3px 3px 0 var(--primary-color);
				}
				
				/* Success state */
				#popover.success {
					border-color: var(--secondary-color);
					box-shadow: 4px 4px 0 var(--primary-color), 8px 8px 0 #0003;
				}
				
				#popover.success #popover-close {
					background: var(--secondary-color);
				}
				
				/* Error state */
				#popover.error {
					border-color: #ff4444;
					box-shadow: 4px 4px 0 #ff8888, 8px 8px 0 #0003;
				}
				
				#popover.error #popover-close {
					background: #ff4444;
				}
			</style>
			<main>
				<div id="code-editor">
				<div id="level-selector">
					<button id="level1"><span class="star-icon">★</span></button>
					<button id="level2"><span class="star-icon">★★</span></button>
					<button id="level3"><span class="star-icon">★★★</span></button>
				</div>
				<div id="content"></div>
				</div>
				
				<div id="actions">
					<button id="run" title="Run Code">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8 5v14l11-7z"/>
						</svg>
					</button>
				</div>

				<div id="canvas-container">
					<canvas id="canvas"></canvas>
					<div id="submission">
						<input type="text" id="author" placeholder="DEIN NAME" />
						<button id="submit" title="Send Code">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
								<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
							</svg>
						</button>
					</div>
				</div>
				
				<div id="popover" popover>
					<div id="popover-content">
						<div id="popover-message">
							Dein Code wurde an den Beamer gesendet!
							<br>
							<br>
							Möchtest du ein Andenken behalten? Trage hier deine E-Mail-Adresse ein, um eine E-Mail mit dem Code zu erhalten!
							<br>
							<br>
							<input type="email" id="email" placeholder="Deine E-Mail-Adresse" />
							<button id="email-submit">Absenden</button>
							<br>
							<br>
							<div id="email-success" style="display: none;">
								E-Mail wurde erfolgreich gesendet!
								<br>
								<br>
								Was möchtest du jetzt machen?
								<br>
								<br>
								<button id="continue-coding">Weiter coden</button>
								<button id="go-back">Zurück zum Start</button>
							</div>
						
						</div>
						<button id="popover-close">✕</button>
					</div>
				</div>
			</main>
		`;

		this.shadow.appendChild(container.content.cloneNode(true));

		this.shadow.getElementById('run').addEventListener('click', () => {
			paper.project.clear();
			
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
					throw new Error('Oops, da ist was schiefgelaufen. Bitte versuche es erneut.');
				}
				this.showPopover();
			})
			.catch(error => {
				console.error('Error:', error);
				alert('Oops, da ist was schiefgelaufen. Bitte versuche es erneut.');
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

		// Popover close button event listener
		this.shadow.getElementById('popover-close').addEventListener('click', () => {
			this.hidePopover();
		});

		// Email submit button event listener
		this.shadow.getElementById('email-submit').addEventListener('click', () => {
			this.sendEmail();
		});

		// Continue coding button event listener
		this.shadow.getElementById('continue-coding').addEventListener('click', () => {
			this.hidePopover();
		});

		// Go back button event listener
		this.shadow.getElementById('go-back').addEventListener('click', () => {
			window.location.href = '/';
		});
	}

	showPopover() {
		const popover = this.shadow.getElementById('popover');
		popover.showPopover();
		
	}

	hidePopover() {
		const popover = this.shadow.getElementById('popover');
		popover.hidePopover();
	}

	async sendEmail() {
		const email = this.shadow.getElementById('email').value;
		const author = this.shadow.getElementById('author').value;
		const code = this.view.state.doc.toString();

		if (!email) {
			alert('Bitte gib eine E-Mail-Adresse ein!');
			return;
		}

		// Show success options immediately
		this.shadow.getElementById('email').style.display = 'none';
		this.shadow.getElementById('email-submit').style.display = 'none';
		this.shadow.getElementById('email-success').style.display = 'block';

		// Send email in background (don't wait for response)
		try {
			const response = await fetch('/send-email', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: email,
					code: code,
					author: author
				})
			});

			const result = await response.json();
			
			if (!result.success) {
				console.error('Email error:', result.error);
			}
		} catch (error) {
			console.error('Email error:', error);
		}
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

		console.log(this.shadow.querySelector('.marked-word'))

		introJs().setOptions({
			nextLabel: '→',      // Customize as you like
			prevLabel: '←',      // Customize as you like
			doneLabel: 'Fertig!',
			showBullets: false,
			steps: [
			  {
				element: this.shadow.querySelector('.marked-word'),
				intro: "Suche dir eine markierte Stelle im Code und halte den Mauszeiger darüber. Dort findest du Tipps zu Dingen, die du im Code ändern kannst!"
			  },
			  {
				element: this.shadow.getElementById('level-selector'),
				intro: "Die Tipps waren zu einfach? Dann kannst du die Schwierigkeit erhöhen!"
			  },
			  {
				element: this.shadow.getElementById('run'),
				intro: 'Wenn du eine Änderung am Code vorgenommen hast, dann klicke hier um ihn auszuführen!'
			  },
			  {
				element: this.shadow.getElementById('submit'),
				intro: "Dir gefällt deine Animation? Gib deinen Namen ein und ab geht's damit auf den Beamer!"
			  }
			]
		  }).start();
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