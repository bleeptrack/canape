export var info = [{}, {}, {}]
export var buttonZoom = 0.9;

export var code = `
//based on https://www.kaspar.wtf/code-poems/differential-growth 

strichDicke = 0;
strichFarbe = 'black';
strichFüllfarbe = 'orange';

var farbwechsel = 0;
var schweiflaenge = 0;
var schweifTransparenz = 0.01;

var ecken = 5;
var durchmesser = 5;
var maxDist = 30;
var maxVelocity = 0.3;
var forceCoef = 0.001;


var line = new Path.RegularPolygon(view.center, ecken,durchmesser);
line.strokeWidth = strichDicke;
line.strokeColor = strichFarbe;
line.closed = true;
line.fillColor = strichFüllfarbe;

initVelocity();

function onFrame(e){
    line.fillColor.hue += farbwechsel;
    addNodes();
    repulsion();
    move();
    
    var line2 = line.clone();
    line2.opacity = schweifTransparenz;

    for(var i = schweiflaenge; i < project.activeLayer.children.length; i++){
        var child = project.activeLayer.children[i];
        if(child === line){
            child.strokeWidth = 0;
        } else {
            child.remove();
        }
    }
    
}

function initVelocity(){
    for (var i = 0; i < line.segments.length; i++) {
        line.segments[i].vel = new Point(0,0);
    }
}

function addNodes(){
    for(var i = 0; i<line.segments.length-1; i++){
        var pA = line.segments[i].point;
        var pB = line.segments[i+1].point;
        if( pA.getDistance(pB) > maxDist){
            line.insert(i+1, pA + (pB-pA)/2 );
            line.segments[i+1].vel = new Point(0,0);
            i++;
        }
    }
    var pA = line.segments[line.segments.length-1].point;
    var pB = line.segments[0].point;
    if( pA.getDistance(pB) > maxDist){
        line.insert(0, pA + (pB-pA)/2 );
        line.segments[0].vel = new Point(0,0);
    }
}

function move(){
    for (var i = 0; i < line.segments.length; i++) {
        var seg = line.segments[i];
        seg.point += seg.vel;
    }
}

function repulsion(){
    for(var i = 0; i < line.segments.length; i++){
        var node = line.segments[i];
        var seek = new Point(0,0);
        for(var j = 0; j < line.segments.length; j++){
          var other = line.segments[j];
          if (node != other  && node.point.getDistance(other.point) < maxDist*2) { 
            
            var distance = node.point.getDistance(other.point);
            var diff = node.point - other.point;
            diff *= Math.exp(maxDist - distance); 
    
            seek += diff;
          }
        }
    
        node.vel += seek*forceCoef;
        if(node.vel.length > maxVelocity){
            node.vel = node.vel.normalize(maxVelocity);
        }
    }
}
`