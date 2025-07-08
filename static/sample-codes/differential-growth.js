export var info = [
{
    strichDicke: "Wie dick soll die Linie sein? Mit 1 ist sie ganz dünn, mit 10 richtig fett!",
    strichFarbe: "Welche Farbe soll die Linie haben? Probiere englische Farbnamen wie 'black', 'red' oder 'blue'!",
    strichFüllfarbe: "Welche Farbe soll die Fläche in der Mitte haben? Auch hier kannst du englische Farbnamen ausprobieren!",
},
{
    farbwechsel: "Wie schnell sollen die Farben wechseln? 0 bleibt gleich, höhere Werte machen die Farben lebendig und bunt!",
    schweiflaenge: "Wie viele bunte Spuren hinterlässt die Linie? 0 ist keine, 100 ist ganz viel!",
    schweifTransparenz: "Wie durchsichtig sind die Spuren? 0.0 ist unsichtbar, 1.0 ist ganz sichtbar!",
},
{
    ecken: "Mit wie vielen Ecken startet die Form? 3 ist ein Dreieck, 5 ein Stern, 10 ein Kreis!",
    durchmesser: "Wie groß ist die Startform? Zum Beispiel 5 ist winzig, 20 ist mittel, 50 ist riesig!",
    abstand: "Wie glatt oder zackig wird die Linie? 10 ist ganz weich, 30 ist normal, 100 ist super wild!",
    bewegung: "Wie schnell verändert sich die Form? 0.1 ist langsam, 0.5 ist normal, 1.0 ist richtig schnell!",
    wachstum: "Wie stark wächst und tanzt die Linie? 0.001 ist ruhig, 0.01 ist lebendig, 0.1 ist total verrückt!",
}
]
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
var abstand = 30;
var bewegung = 0.3;
var wachstum = 0.001;


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
        if( pA.getDistance(pB) > abstand){
            line.insert(i+1, pA + (pB-pA)/2 );
            line.segments[i+1].vel = new Point(0,0);
            i++;
        }
    }
    var pA = line.segments[line.segments.length-1].point;
    var pB = line.segments[0].point;
    if( pA.getDistance(pB) > abstand){
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
          if (node != other  && node.point.getDistance(other.point) < abstand*2) { 
            
            var distance = node.point.getDistance(other.point);
            var diff = node.point - other.point;
            diff *= Math.exp(abstand - distance); 
    
            seek += diff;
          }
        }
    
        node.vel += seek*wachstum;
        if(node.vel.length > bewegung){
            node.vel = node.vel.normalize(bewegung);
        }
    }
}
`