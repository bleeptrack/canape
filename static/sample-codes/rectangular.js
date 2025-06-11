export const info = {
	anzahl: "try changing the size",
	groesse: "try changing the color"
}
export const code = `		
var anzahl = 10
var groesse = 200
var hintergrundFarbe = 'black'
var farbeInnen = 'red'
var farbeAussen = 'white'
var linienDicke = 4
var transparenz = 0.3

var drehGeschwindigkeit = 0.1
var farbwechselZeit = 500
var skalierung = 1


var amplitudeMax = 0
var versatz = Math.PI * 2 / anzahl
var versatzGravitation = 4




function onFrame(event){
    view.rotate(drehGeschwindigkeit)
    var children = project.activeLayer.children;
    for(var i = 0; i < children.length; i++){
        var rechteck = children[i];
        
        rechteck.scaling += Math.cos(event.time + versatz*i) * 0.01 * skalierung

        var amp = Math.sin(event.time + versatz/versatzGravitation*i)*amplitudeMax
        rechteck.position = view.center + [Math.sin(event.time + versatz*i)*amp, Math.cos(event.time + versatz*i)*amp]
    }
    
}

function farbwechsel(){
    var children = project.activeLayer.children;
    for(var i = 0; i < children.length; i++){
        var rechteck = children[i];
        if(i == 0){
            rechteck.tweenTo({fillColor: Color.random()}, farbwechselZeit, {
                onComplete: function() {
                    farbwechsel();
                }
            });
        }else{
            rechteck.tweenTo({fillColor: Color.random()}, farbwechselZeit);
        }
    }
}


document.body.style.backgroundColor =  hintergrundFarbe
var rechtecke = []
for(var i = 0; i < anzahl; i++){
    var rechteck = new Path.Rectangle([0,0], [groesse, groesse])
    rechteck.position = view.center
    rechteck.fillColor = farbeInnen
    rechteck.strokeWidth = linienDicke
    rechteck.strokeColor = farbeAussen
    rechteck.opacity = transparenz
    rechteck.rotate(360/anzahl*i)
    rechteck.applyMatrix = false
}
if(farbwechselZeit > 0){
    farbwechsel()
}
`
