export var info = [{}, {}, {}]
export var buttonZoom = 1;

export var code = `
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

document.body.style.backgroundColor = 'black';

var SEGMENT_LENGTH = 20;
var SCALING = 300;
var DRAW_SPEED = 5000;

function generateFlow(x,y){
        //line style
        var line = new Path();
        line.strokeColor = new Color('teal') + Color.random()*0.6
        line.strokeWidth = 5;
        line.strokeCap = 'round';
        line.opacity = 0.5;
        var startPoint = new Point(x,y)
        line.addSegment(startPoint)
        
        //here is the interesting part :)
        while(view.bounds.contains(line.lastSegment.point)){
            //get an angle from the perlin noise depending on where the line end currently is
            var dir = perlin.get(line.lastSegment.point.x / SCALING, line.lastSegment.point.y / SCALING) * 360
            //make it into an vector of a certain length
            var vec = new Point(0,1).rotate(dir).multiply(SEGMENT_LENGTH);
            //add vector to and of your line
            line.lineBy(vec)
        }
        line.smooth();
        
        //drawing animation
        line.dashArray = [line.length, line.length];
        line.dashOffset = line.length;
        line.tweenTo({dashOffset: 0}, DRAW_SPEED);
    }

for(var i = 0; i < 300; i++){
    generateFlow(Point.random() * view.bounds.size);
}

`