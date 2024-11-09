// Import the ScJs library.
import { SvJs } from "./test/index.js";

// Parent SVG.
const svg =  new SvJs();
const container = document.getElementById('container'); svg.addTo(container);

// Viewport size (1:1 aspect ratio).
const svgSize = window.innerWidth > window.innerHeight ? window.innerHeight : window.innerWidth; 
svg.set({ width: svgSize, height: svgSize, viewBox: '0 0 1000 1000' });

// Background.
svg.create('rect').set({
    x: 0, y: 0, width: 1000, height: 1000, fill: '#181818'
});

//Colour palettes
let palettes = [
    ["#902d41","#32021f","#a04668","#8367c7","#42253b"],
    ["#008148","#0e4749","#3f612d","#e3b505","#f5cc00"],
    ["#f4e8c1","#f5e3e0","#e8b4bc","#fff9a5","#ff8966"],
    ["#336699","#119da4","#6f7d8c","#adf1d2","#77a0a9"],
];

//pick random hue
let hue = random(0,360);

//pick random palette
/*let pick = random(0,3)
let pickedPalette = palettes[pick];
*/
//Create grid container group.
let grid = svg.create('g');

//Setting grid variables. Division of grid in rectangles.
let gridSizeX = random(100,1000);
let gridSizeY = random(100,1000);
let rowsX = random(1, Math.floor(gridSizeX/10));
let rowsY = random(1, Math.floor(gridSizeY/10));
//let rowsX= 5;
//let rowsY=4;
let spacingX =random(10,50);   //expressed in percentage of division result
let spacingY = random(10,50);

let incrementX = Math.floor(gridSizeX/rowsX);                   //max int value of a row
let cropGridSizeX = incrementX*rowsX;                           //reshape the grid to be divisible by the number of rows 
let cellSizeX = Math.abs(((100-spacingX)/100)*incrementX);      
let incrementY = Math.floor(gridSizeY/rowsY);
let cropGridSizeY = incrementY*rowsY
let cellSizeY = Math.abs(((100-spacingY)/100)*incrementY);

//Nested loop to visualise the grid.
for (let y=0; y  < cropGridSizeY; y += incrementY) {

    // Increment the hue
    hue = (hue >= 360) ? (hue - 360) + (120 / rowsY) : hue + (120/rowsY); 
    for (let x=0; x < cropGridSizeX; x+=incrementX) {
        //create clip path with unique id
        let clip = svg.create('clipPath').set({ id: `${x}${y}` });
        //create clip path shape
        clip.create('rect').set({
            x: x, y: y, width: cellSizeX, height: cellSizeY}); 
        //define four corner positions
        /*let positions = [
            [x, y],             //bottom left
            [x+ cellSizeX, y],  //bottom right
            [x+ cellSizeX, y + cellSizeY],  //top right
            [x, y + cellSizeY], //bottom right
        ];
        //Pick a random position
        let pos= random(0,3);
        let pickedPosition = positions[pos];
        //create ellipse group
        let ellipses = grid.create('g');
        //create ellipses
        for(let i = 0; i < 5; i += 1){
            ellipses.create('ellipse').set({
                cx: pickedPosition[0],
                cy: pickedPosition[1],
                rx: cellSizeX - (i * (cellSizeX / 5)),
                ry: cellSizeY - (i * (cellSizeY / 5)),
                fill: pickedPalette[i]
            });
        }
        //apply clip to circle group /!\ here we are taming chaos
        ellipses.set({
            clip_path: `url(#${clip.get('id')})`
        });
        */
        //run a loop based on CHANCE
        if (chance(60)) {
            for (let i = 0; i < (cellSizeX + cellSizeY)/2; i+=1) {
            grid.create('line').set({
                x1: random(x, x+ cellSizeX),
                y1: random(y, y + cellSizeY),
                x2: random(x, x+ cellSizeX),
                y2: random(y, y + cellSizeY),
                stroke: `hsl(${hue} 80% 80% / 0.33)`
            });
            }
        }
        //create a square to frame
        /*grid.create('rect').set({
            x: x, y:y, width: cellSizeX, height:cellSizeY, fill: 'none', stroke: '#eee',
        });
        */
        
    }
}

//Nested loop to visualise the palettes.
/**for (let y=0; y  < rowsY; y += 1) {
    let posY = y*incrementY; 
    for (let x=0; x < rowsX; x+= 1) {
        let posX = x*incrementX;
        grid.create('rect').set({
            x: posX, y: posY, width: cellSizeX, height: cellSizeY, fill:palettes[y][x], stroke:'#eee'
        });
    }
}*/

//Center the grid within the ViewBox.
grid.moveTo(500,500);

/**
 * Gets a random number between a minimum and a maximum value.
 */

function random(min, max, integer = true) {
    let random = Math.random() * (max - min) + min;
    let number = integer ? Math.floor(random) : random;
    return number;
}

/**
 * return true or false if pass the test
 */

function chance(pourcent){
    let test= random(0,100);
    return (test<=pourcent)
}
