export class AnimationPresenter extends HTMLElement {
	constructor() {
		super();
		this.shadow = this.attachShadow({ mode: 'open' });

		const container = document.createElement('template');

		// creating the inner HTML of the editable list element
		container.innerHTML = `
			<style>
				canvas {
					width: 100%;
					height: 100%;
				}
                #author {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 100px;
                    background-color: rgba(0, 0, 0, 0.5);
                    color: white;
                    padding: 10px;
                    font-size: 12px;
                    text-align: center;
                }
			</style>
			
			<div id="author"></div>
			<canvas id="canvas"></canvas>
		`;

		this.shadow.appendChild(container.content.cloneNode(true));

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
        this.loadSnippets().then(snippets => {
            console.log(snippets);
            const newestSnippet = snippets.sort((a, b) => new Date(b.updated) - new Date(a.updated))[0];
            console.log('Newest snippet:', newestSnippet);

            this.loadSnippet(newestSnippet.name).then(code => {
                console.log(code);
                paper.PaperScript.execute(code, paper);
                this.shadow.getElementById('author').innerHTML = newestSnippet.name.split('.')[0];
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