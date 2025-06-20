export const info = [
{
	anzahl: "Diese Variable bestimmt die Anzahl der Rechtecke. Versuche sie mal zu ändern! Was passiert wenn du sie auf 2 oder 20 änderst?",
	groesse: "Diese Variable bestimmt die Größe der Rechtecke.",
    hintergrundFarbe: "Diese Variable bestimmt die Farbe des Hintergrunds. Du kannst alle möglichen englischen Farbnamen verwenden, z.B. 'red', 'green', 'blue', 'yellow', 'purple'.",
    farbeInnen: "Diese Variable bestimmt die Füllfarbe der Rechtecke.",
    farbeAussen: "Diese Variable bestimmt die Linienfarbe der Rechtecke.",
    linienDicke: "Diese Variable bestimmt die Dicke der Linien der Rechtecke.",
    transparenz: "Diese Variable bestimmt die Transparenz der Rechtecke. Sie kann zwischen 0.0 und 1.0 liegen.",
},
{
    drehGeschwindigkeit: "Lass und eine richtige Animation aus deinem Bild machen! Versuche die Drehgeschwindigkeit zu ändern. Was passiert wenn du sie auf 0.1 oder 0.5 änderst?",
    farbwechselZeit: "Wir können die Farben der Rechtecke wechseln lassen! Diese Variable gibt die Zeit in Millisekunden an, die zwischen zwei Farbwechseln vergeht. Probiere doch mal 500!",
    skalierung: "Jetzt wird es wild! Versuche die Skalierung der Rechtecke zu ändern. Was passiert wenn du sie auf 0.5 oder 2.0 änderst?",
},
{
    amplitudeMax: "Wie stark sollen die Rechtecke schwingen? Versuche die Amplitude zu ändern. Was passiert wenn du sie auf 1 oder 10 änderst?",
    versatz: "Du willst mehr Chaos? Probiere dich einfach mal an dieser Variable aus!",
    versatzGravitation: "Du willst mehr Chaos? Probiere dich einfach mal an dieser Variable aus!",
}
]

export const buttonZoom = 0.5;
export const code = `var anzahl = 10
var groesse = 200
var hintergrundFarbe = 'black'
var farbeInnen = 'red'
var farbeAussen = 'white'
var linienDicke = 4
var transparenz = 0.3

var drehGeschwindigkeit = 0.0
var farbwechselZeit = 0
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
