export var info = [
{
    linienDicke: "Wie dick sollen die Linien sein? Probiere Werte wie 1 oder 10 und schau, wie sich das Bild verändert!",
    linienTransparenz: "Wie durchsichtig sollen die Linien sein? Werte zwischen 0.0 (unsichtbar) und 1.0 (voll sichtbar) machen Spaß!",
    basisFarbe: "Welche Grundfarbe sollen die Linien haben? Du kannst englische Farbnamen wie 'teal', 'red' oder 'blue' verwenden."
    
},
{
    farbVariation: "Wie bunt sollen die Linien werden? 0 ist einfarbig, 1 ist ganz bunt!",
    zeichnungsGeschwindigkeit: "Wie schnell werden die Linien gezeichnet? Die Zahl gibt an, wie viele Millisekunden die Animation dauert. 1000 ist also eine Sekunde!",
    anzahlLinien: "Wie viele Linien sollen gezeichnet werden? 10 ist wenig, 300 ist ganz viel!",
},
{
    segmentLaenge: "Wie lang ist jedes Stück der Linie? Kleine Werte machen die Linien geschmeidig, große Werte machen sie chaotisch. Probiere mal 5 oder 100!",
    skalierung: "Wie wild bewegen sich die Linien? Kleine Werte machen das Muster chaotischer, große Werte machen es ruhiger. Versuche mal 100 oder 500!",
}
]
export var buttonZoom = 1;

export var code = `
document.body.style.backgroundColor = 'black';

var linienDicke = 5;
var linienTransparenz = 0.5;
var basisFarbe = 'teal';

var farbVariation = 0;
var zeichnungsGeschwindigkeit = 10000;
var anzahlLinien = 200;

var segmentLaenge = 20;
var skalierung = 300;



///// PERLIN NOISE FROM https://github.com/joeiddon/perlin
var perlin = {
    rand_vect: function(){
        var theta = Math.random() * 2 * Math.PI;
        return {x: Math.cos(theta), y: Math.sin(theta)};
    },
    dot_prod_grid: function(x, y, vx, vy){
        var g_vect;
        var d_vect = {x: x - vx, y: y - vy};
        if (this.gradients[[vx,vy]]){
            g_vect = this.gradients[[vx,vy]];
        } else {
            g_vect = this.rand_vect();
            this.gradients[[vx, vy]] = g_vect;
        }
        return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
    },
    smootherstep: function(x){
        return 6*Math.pow(x,5) - 15*Math.pow(x,4) + 10*Math.pow(x,3);
    },
    interp: function(x, a, b){
        return a + this.smootherstep(x) * (b-a);
    },
    seed: function(){
        this.gradients = {};
        this.memory = {};
    },
    get: function(x, y) {
        if (this.memory.hasOwnProperty([x,y]))
            return this.memory[[x,y]];
        var xf = Math.floor(x);
        var yf = Math.floor(y);
        //interpolate
        var tl = this.dot_prod_grid(x, y, xf,   yf);
        var tr = this.dot_prod_grid(x, y, xf+1, yf);
        var bl = this.dot_prod_grid(x, y, xf,   yf+1);
        var br = this.dot_prod_grid(x, y, xf+1, yf+1);
        var xt = this.interp(x-xf, tl, tr);
        var xb = this.interp(x-xf, bl, br);
        var v = this.interp(y-yf, xt, xb);
        this.memory[[x,y]] = v;
        return v;
    }
}
perlin.seed();
////// PERLIN NOISE END

function generateFlow(x,y){
        //line style
        var line = new Path();
        line.strokeColor = new Color(basisFarbe) + Color.random()*farbVariation
        line.strokeWidth = linienDicke;
        line.strokeCap = 'round';
        line.opacity = linienTransparenz;
        var startPoint = new Point(x,y)
        line.addSegment(startPoint)
        
        //here is the interesting part :)
        while(view.bounds.contains(line.lastSegment.point)){
            //get an angle from the perlin noise depending on where the line end currently is
            var dir = perlin.get(line.lastSegment.point.x / skalierung, line.lastSegment.point.y / skalierung) * 360
            //make it into an vector of a certain length
            var vec = new Point(0,1).rotate(dir).multiply(segmentLaenge);
            //add vector to and of your line
            line.lineBy(vec)
        }
        line.smooth();
        
        //drawing animation
        line.dashArray = [line.length, line.length];
        line.dashOffset = line.length;
        line.tweenTo({dashOffset: 0}, zeichnungsGeschwindigkeit);
    }

for(var i = 0; i < anzahlLinien; i++){
    generateFlow(Point.random() * view.bounds.size);
}

`