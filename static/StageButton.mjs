class StageButton extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                canvas {
                    width: 30vw;
                    height: 20vw;
                }
                h2 {
                    margin: 0;
                }
            </style>
            <div id="stage-button">
                <canvas id="canvas"></canvas>
                <h2 id="title"></h2>
            </div>
        `;

        //this.shadow.appendChild(container.content.cloneNode(true));
    }

    async connectedCallback() {
        paper.install(window)
        this.filename = this.getAttribute('filename');
        this.shadow.getElementById('title').textContent = this.filename.toUpperCase();
        this.canvas = this.shadow.getElementById('canvas');
        this.canvas.id = `canvas-${this.filename}`;
		
        const paperScope1 = new paper.PaperScope();
		paperScope1.setup(this.canvas);
        const { info, code, buttonZoom } = await import(`./sample-codes/${this.filename}.js`);
        paperScope1.PaperScript.execute(code, paperScope1);
        paperScope1.project.view.zoom = buttonZoom;


        this.shadowRoot.querySelector('#stage-button').addEventListener('click', () => {
            window.location.href = `/code?filename=${this.filename}`;
        });

        this.shadowRoot.querySelector('#stage-button').addEventListener('mouseover', () => {
            paperScope1.project.clear();
            paperScope1.PaperScript.execute(code, paperScope1);
        });

        
    }

    disconnectedCallback() {
        this.shadowRoot.querySelector('#stage-button').removeEventListener('click', this);
    }
}

customElements.define('stage-button', StageButton);
