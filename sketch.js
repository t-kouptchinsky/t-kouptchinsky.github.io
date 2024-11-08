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

//Create grid container group.
let grid = svg.create('g');

//Setting grid variables. Division of grid in rectangles.
let gridSizeX = random(100,1000);
let gridSizeY = random(100,800);
let rowsX = random(1, Math.floor(gridSizeX/10));
let rowsY = random(1, Math.floor(gridSizeY/10));
let spacingX =random(0,100);   //expressed in percentage of division result
let spacingY = random(0,100);

let incrementX = Math.floor(gridSizeX/rowsX);                   //max int value of a row
let cropGridSizeX = incrementX*rowsX;                           //reshape the grid to be divisible by the number of rows 
let cellSizeX = Math.abs(((100-spacingX)/100)*incrementX);      
let incrementY = Math.floor(gridSizeY/rowsY);
let cropGridSizeY = incrementY*rowsY
let cellSizeY = Math.abs(((100-spacingY)/100)*incrementY);

//Nested loop to visualise the grid.
for (let y=0; y  < cropGridSizeY; y += incrementY) {
    for (let x=0; x < cropGridSizeX; x+=incrementX) {
        grid.create('rect').set({
            x: x, y: y, width: cellSizeX, height: cellSizeY, fill:'none', stroke:'#eee'
        });
    }
}

//Center the grid within the ViewBox.
grid.moveTo(500,400);

/**
 * Gets a random number between a minimum and a maximum value.
 */

function random(min, max, integer = true) {
    let random = Math.random() * (max - min) + min;
    let number = integer ? Math.floor(random) : random;
    return number;
}
