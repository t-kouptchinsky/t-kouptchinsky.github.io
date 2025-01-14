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
//pick random chance
let luck = random(10,70);

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

let matchBoxes = []; //will be a matrix of the size of the grid, each entry containing the svg line elements, if the cell is alive
let densityGrid = []; //same but the entry just tells the numbers of lines if the cell is alive, or 0 if it is dead, the density will be negative if the actual state is dead but the previous one is alive with the corresponding density
let hueGrid = [];
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

let matchSup = cellSizeX + cellSizeY; // maximum number of matches in a case of the current grid

//Nested loop to visualise the grid.
let currentY = 0;
for (let y=0; y  < cropGridSizeY; y += incrementY) {
    //create a now line to both matrixes 
    matchBoxes.push([]);
    densityGrid.push([]);
    hueGrid.push([]);
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
        if (chance(luck)) {
            fill(x,y,hue);
        } else {
            matchBoxes[currentY].push([]);
            densityGrid[currentY].push(0);
        }
        hueGrid[currentY].push([hue]);
        //create a square to frame
        /*grid.create('rect').set({
            x: x, y:y, width: cellSizeX, height:cellSizeY, fill: 'none', stroke: '#eee',
        });
        */
    //update the index x
    }
    //update the index y
    currentY += 1;
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

function fill(x,y,hue){
    let density = random(matchSup/10, matchSup);
    densityGrid[currentY].push(density);
    
    let matchBox = [];
        for (let i = 0; i < density; i+=1) {
            let line = grid.create('line').set({
                x1: random(x, x+ cellSizeX),
                y1: random(y, y + cellSizeY),
                x2: random(x, x+ cellSizeX),
                y2: random(y, y + cellSizeY),
                stroke: `hsl(${hue} 80% 80% / 0.33)`
            });
            matchBox.push(line);
        }
    matchBoxes[currentY].push(matchBox);
}

let indices = JSON.parse(JSON.stringify(densityGrid)); //copy NOT by reference
update();   

 function oneDayOfLife(time=0) {
    let isEqual = true;
    for(let y=0; y < rowsY; y++){
        for(let x = 0; x < rowsX; x++){
            let density = densityGrid[y][x];
            let index = indices[y][x];
            if(density < 0) {
                let line = matchBoxes[y][x][0];
                line.set({stroke: 'none'});
                matchBoxes[y][x].splice(0,1);
                densityGrid[y][x] = density + 1;
            }
            if(density > index) { //!!\\ we will have to put the index at the level of density to make the persistent cell steady
                let posX = x*incrementX;
                let posY = y*incrementY;
                let hue = hueGrid[y][x];
                let line = grid.create('line').set({
                    x1: random(posX, posX+ cellSizeX),
                    y1: random(posY, posY + cellSizeY),
                    x2: random(posX, posX+ cellSizeX),
                    y2: random(posY, posY + cellSizeY),
                    stroke: `hsl(${hue} 80% 80% / 0.33)`
                });
                matchBoxes[y][x].push(line);
                indices[y][x] = index + 1;
            }
            if(!(indices[y][x] == Math.abs(densityGrid[y][x]))) { isEqual = false};
        }
    }
    if(isEqual){
        update();
    }
    requestAnimationFrame(oneDayOfLife);
};

oneDayOfLife();

function update(){   //could also be called "new morning"
    let oldGrid = JSON.parse(JSON.stringify(densityGrid)); //copy NOT by reference
    let oldIndices = JSON.parse(JSON.stringify(indices));
    for(let y = 0; y < rowsY; y ++){
        for(let x = 0; x < rowsX; x ++){
            oldIndices[y][x] = 0;  //reset index
            let neighbourNum = neighbourNumber(oldGrid, x, y);
            
            if(densityGrid[y][x] < 0) { 
                densityGrid[y][x] = 0; 
            } //if died last day, take act of the death, replace index to 0

            let density = densityGrid[y][x];

            if((3 < neighbourNum || neighbourNum < 2) && density > 0) { 
                densityGrid[y][x] = -density;
            } //if alive here, dies of loneliness of overpopulation (index stays 0)

            if( (2 == neighbourNum || 3 == neighbourNum) && density > 0) {
                oldIndices[y][x] = density;
            } //if alive, remain alive, set the index at the density

            if(3 == neighbourNum && density == 0) {
                density = random(matchSup/10, matchSup);
                densityGrid[y][x] = density;
            } //if dead, birth by reproduction
        }
    }
    indices = oldIndices;
    
}

function neighbourNumber(densityGrid, x, y){
    let neighbourNum = 0;
    for(let i = -1; i < 2; i++){
        for(let j = -1; j < 2; j++){
            if( x + i >= 0 && x + i < rowsX && y + j >= 0 && y + j < rowsY && !(i == j && i== 0)){
                if( densityGrid[y+j][x+i] > 0){
                    neighbourNum += 1;
                }
            }
        }
    }    
    return neighbourNum;
}