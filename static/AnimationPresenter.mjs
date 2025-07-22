export class AnimationPresenter extends HTMLElement {
	constructor() {
		super();
		this.shadow = this.attachShadow({ mode: 'open' });

		const container = document.createElement('template');

		// creating the inner HTML of the editable list element
		container.innerHTML = `
			<style>
                 @import url('/static/style.css');
				canvas {
					width: 100% !important;
					height: 100% !important;
				}
                #author {
                    position: absolute;
                    bottom: 0;
                    right: 2vh;
                    width: 100%;
                    height: 100px;
                }
			</style>
			
			<h1 id="author"></h1>
			<canvas id="canvas"></canvas>
		`;

		this.shadow.appendChild(container.content.cloneNode(true));
        this.loadedSnippets = [];
        this.currentPointer = 0;

	}

    async loadSnippets() {
        const response = await fetch('/snippets');
        const files = await response.json();
        return files;
        
    }

    async loadSnippet(snippet) {
        const response = await fetch(`/snippets/${snippet}`);
        const code = await response.text();
        return code;
    }

    runAnimation() {
        paper.project.clear();
        paper.project.view.onFrame = () => {}
        this.loadSnippets().then(snippets => {
            console.log(snippets);

            let allSnippets = snippets.sort((a, b) => new Date(b.updated) - new Date(a.updated)).slice(0, 10);
            for(let snippet of allSnippets) {
                if(this.loadedSnippets.find(s => s.name === snippet.name)) {
                    console.log("skipping", snippet.name);
                    continue;
                }
                this.loadedSnippets.unshift(snippet);
                if(this.loadedSnippets.length > 10) {
                    this.loadedSnippets.pop();
                }
                this.currentPointer = this.loadedSnippets.length - 1;
            }

            console.log("loadedSnippets", this.loadedSnippets.map(snippet => snippet.name));
            this.loadSnippet(this.loadedSnippets[this.currentPointer].name).then(code => {
                console.log("pointer", this.currentPointer);
                paper.PaperScript.execute(code, paper);
                this.shadow.getElementById('author').innerHTML = this.loadedSnippets[this.currentPointer].name.split('.')[0];
                this.currentPointer = (this.currentPointer + 1) % this.loadedSnippets.length;
            });
        });
    };

	connectedCallback() {
		paper.install(window)
		paper.setup(this.shadow.getElementById('canvas'));

        // Run immediately and then every 10 seconds
        this.runAnimation();
        setInterval(() => this.runAnimation(), 10000);
	}
}

customElements.define('animation-presenter', AnimationPresenter);