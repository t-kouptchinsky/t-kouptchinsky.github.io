// Import the ScJs library.
import { SvJs, Gen, Noise } from "../../node_modules/svjs/src/index.js";

// Parent SVG.
const svg =  new SvJs();
const container = document.getElementById('container'); svg.addTo(container);


// Viewport size (1:1 aspect ratio).
const svgSize = window.innerWidth > window.innerHeight ? window.innerHeight : window.innerWidth; 
svg.set({ width: svgSize, height: svgSize, viewBox: '0 0 1000 1000' });

// Background.
svg.create('rect').set({
    x: 0, y: 0, width: 1000, height: 1000, fill: '#202020'
});

//Colour palettes
let palettes = [
    ["#902d41","#32021f","#a04668","#8367c7","#42253b"],
    ["#008148","#0e4749","#3f612d","#e3b505","#f5cc00"],
    ["#f4e8c1","#f5e3e0","#e8b4bc","#fff9a5","#ff8966"],
    ["#336699","#119da4","#6f7d8c","#adf1d2","#77a0a9"],
    ["#653239","#c297b8","#bebfc5","#0b3c49","#2a3439"]
];

//create forest group
let forest = svg.create('g').set({id: 'forest'});

/*  We work with booster of branching chance and flourishing chance (which stop branches short).
*   Branching is a process of birth.
*   Flourishing is a process of death.
*   The branching chance booster is fixed for a tree and built in the parameter "branchModifier".
*   The flourishing chance booster is dynamic, it is decided by the function "tame()". Indeed, we intend to make 
* a high process of flourishing compensate for an increase in the process of branching, in order to keep the population 
* of branches "tamed" (the increase of branches is exponential).   In contrast, flourishing will be unlikely whenever the 
* branch population is scarce.
*
*   The opacity of the drawing is now dynamically decided by the function opacityTame. 
*   The latest reflects the mass of the branch population in an inverted fashion; the more branches, the more ineffable they 
* become, giving an illusion of depth.
*
*   We still have a verticality parameter built-in, and the colouring is still decided by a noise function proper to the tree.
---------------------------------------------------------------------------------------------------------------------------------
* In this latest version
---------------------------------------------------------------------------------------------------------------------------------
*   No more stop-flourish, it has been replace by thinning. Flourishing arises only when all the branch are thin enough.
*   No more verticality parameter, the tree is free to grow wherever it wants, it only return towards its hearth each time he goes 
*   too far from it.
*   The hitboxes and circles are not displayed anymore.
*   The rest of the changes are visual. The tree can birth.
*/

//create tree object
class Tree {
    constructor(rootX, rootY, rootAngle, lStick, lTrunc, lFoliage, palette, palettePick) {
        //functional properties (for construction)
        //------------------------------------------------------------------------------------------------------------------------------
        this.root = [rootX, rootY];

        //determine initial and threshold thickness
        this.truncThickness = Gen.gaussian(7.5, 1);
        this.twigBound = Gen.gaussian(this.truncThickness/2, 0.5);
        this.maxRank = 0;
        this.maxGenRank = this.truncThickness;

        //list displaying only the data of the previous level of lineage and the rank of the concerned branch so far, gets updated with the index
        this.budsData = [[this.root, rootAngle, this.truncThickness]];     

        //in construction, data will contain [x2,y2], angle and branch rank; lines will contain corresponding svg's stored by branches
        this.branchLines = [[]];

        // !!! branchLines and budsData should ALWAYS correspond index-wise

        //indicate progression (when ended, it is equal to BranchNumber)
        this.sproutIndex = 0;
        //indicate which generation we are building (future greatest lineage index name)
        this.currentGen = 1;   

        //number of branches in "budsData" list (here we could keep track of the geometry)
        this.branchNumber = 1;                   

        //archive of levels 
        this.lineage = {0 : [this.budsData, [[]] ] };        //here lineage 0:[1] is empty because no svg elements concerned
        //note: the later list (0:[1]) must be list of current branches, which last element is the top bud corresponding to the information in budsData.

        //-----------------------------------------------------------------------------------------------------------------------------
        //create tree group as forest subgroup and ID corresponding to the root
        this.group = forest.create('g').set({id: `tree${this.root}`});
        //keep track of the tree BBox
        this.treeBounds = [rootY, rootY, rootX, rootX];     //(up, down, left, right)

        //size  properties of the tree
        this.lStick = lStick;
        this.lFoliage = lFoliage;
        this.lTrunc = lTrunc;
        this.diam = lFoliage + lTrunc;

        //color parameters
        this.color = palettes[palette][palettePick];

        let gradientLeaf = [];
        for(let i = 0; i < palettes[palette].length; i ++){
            let j = (i + palettePick) % (palettes[palette].length);
            gradientLeaf.push(palettes[palette][j]); 
        };
        this.leafGradient = svg.createGradient(`gradLeaf${this.root}`, 'linear', gradientLeaf, 90); 

        this.noise = new Noise();                   
        this.nX= Gen.random(0.001,0.1,true);
        this.nY= Gen.random(0.001,0.1,true);
        this.noiseSpeed = Gen.random(0.001, 0.01);   

        //geometric properties of the tree
        this.verticality = Gen.random(1,9); //determine how vertical the tree will be
        this.degree = 1;                    //degree of the bezier interpolation

        //stochastic properties of the tree
        this.branchModifier = Gen.gaussian(3,0.5);
        this.branchUpperRate = 0.5;
        this.leafUpperRate = 0.2;
        this.testRadius = lStick;            
    }

    //method to update the generation if needed 
    update(){
        if(this.sproutIndex == this.branchNumber){
            //update branching number in case things have been created in the end
            this.branchNumber = this.budsData.length;

            //archive grown buds list
            this.lineage[this.currentGen] = [this.budsData, this.branchLines];
            
            //update gen
            this.currentGen += 1;
            //update noise y coordinate
            this.nY += this.noiseSpeed;
            //reset index
            this.sproutIndex = 0;

            this.maxGenRank = Math.min(this.maxGenRank, this.maxRank);
            this.maxRank = 0;     
        }
    }

    //method to decide of orientation
    orient(branch = false){
        //extract constants
        let i = this.sproutIndex;
        let buds = this.budsData;

        //rename elements of budsData
        let deviation = buds[i][1];
        let x1 = buds[i][0][0];
        let y1 = buds[i][0][1];

        //check how far we are from center (and if we are going out of trajectory)
        let centerX = this.root[0];
        let centerY = this.root[1] - this.diam/2;
        let orbit = Math.hypot(x1-centerX, y1-centerY);
        let disaster = (orbit > this.diam/2);

        //calculate direction towards the center
        let correction = (Math.acos((centerX - x1)/orbit)); 
        if(centerY > y1) correction = - correction;

        //gives orientation (normalized)
        let orientation = (disaster ? 3*(Gen.gaussian((3*deviation + correction)/4, Math.PI/12) + correction)/4 : Gen.gaussian( deviation, Math.PI/6));
        
        //gives orientation (for branch; in particular not normalized)
        if(branch){
            orientation = (disaster ? 3*(Gen.gaussian((3*deviation + correction)/4, Math.PI/12) + correction)/4 : Gen.gaussian( deviation, Math.PI/12));
        }
        
        return(orientation);
    }

    //method to grow one more step 
    grows(){
        //extract constants
        let i = this.sproutIndex;
        let buds = this.budsData;
        let l = this.lStick;
        let noise = this.noise;
        let nX = this.nX;
        let nY = this.nY;

        //rename elements of budsData
        let x1 = buds[i][0][0];
        let y1 = buds[i][0][1];
        let rank = buds[i][2];

        //get orientation
        let orientation = this.orient();

        //get hue
        let noiseValue = noise.get(nX,nY);
        let hue = Gen.map(noiseValue, -1, 1, 0, 360);

        //if rank close enough from twig, grow two twigs and each side
        if(rank <= this.twigBound){
            let symmetricVar = Gen.gaussian(3*Math.PI/8, Math.PI/12);

            //left twig
            let orientationLeftTwig = buds[i][1] + symmetricVar;
            let lengthLeftTwig = Gen.gaussian(this.lStick/2, this.lStick/10);
            let xLeftTwig2 = x1 + (Math.cos(orientationLeftTwig)*lengthLeftTwig);
            let yLeftTwig2 = y1 - (Math.sin(orientationLeftTwig)*lengthLeftTwig);
            let rankLeftTwig = 1; //Gen.gaussian(rank/2, rank/12);

            let leftTwig = this.group.create('line').set({
                x1: x1,
                y1: y1,
                x2: xLeftTwig2,
                y2: yLeftTwig2,
                stroke: `hsl(${hue} 80% 80% / 0.8)`,
                stroke_width: rankLeftTwig,
                stroke_opacity: 1 - opacityTame(this.branchNumber)
            });
            
            //update data
            this.budsData.push([[xLeftTwig2, yLeftTwig2] , orientationLeftTwig, rankLeftTwig]);
            this.branchLines.push([leftTwig]);
            this.nX += this.noiseSpeed;
            noiseValue = noise.get(this.nX,nY);
            hue = Gen.map(noiseValue, -1, 1, 0, 360);

            //right twig
            let orientationRightTwig = buds[i][1] - symmetricVar;
            let lengthRightTwig = Gen.gaussian(this.lStick/2,this.lStick/10);
            let xRightTwig2 = x1 + (Math.cos(orientationRightTwig)*lengthRightTwig);
            let yRightTwig2 = y1 - (Math.sin(orientationRightTwig)*lengthRightTwig);
            let rankRightTwig = 1; //Gen.gaussian(rank/2, rank/12);

            let rightTwig = this.group.create('line').set({
                x1: x1,
                y1: y1,
                x2: xRightTwig2,
                y2: yRightTwig2,
                stroke: `hsl(${hue} 80% 80% / 0.8)`,
                stroke_width: rankRightTwig,
                stroke_opacity: 1 - opacityTame(this.branchNumber)
            });

            //update data
            this.budsData.push([[xRightTwig2, yRightTwig2] , orientationRightTwig, rankRightTwig]);
            this.branchLines.push([rightTwig]);
            this.maxRank = Math.max(this.maxRank, rankLeftTwig, rankRightTwig);
            this.nX += this.noiseSpeed;
            noiseValue = noise.get(this.nX,nY);
            hue = Gen.map(noiseValue, -1, 1, 0, 360);
        }

        //decide if we should thin
        let thinning = this.thinningChance();
        if(thinning){

            //redraw preceding branch
            redraw(this.branchLines[i], rank, this.degree, this.branchNumber, this.color, this.group);
            rank = Gen.gaussian(3*rank/4, rank/12);

            //reinit the branchLines container
            this.branchLines[i] = [];
        }

        //traces the new sprout
        let length = Gen.gaussian(l,l/10);
        let x2 = x1 + (Math.cos(orientation)*length);
        let y2 = y1 - (Math.sin(orientation)*length);
        let sprout = this.group.create('line').set({
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            stroke: `hsl(${hue} 80% 80% / 0.8)`,
            stroke_opacity: 1 - opacityTame(this.branchNumber)
        });

        //update data
        this.sproutIndex += 1;
        this.budsData[i] = [[x2, y2] , orientation, rank];
        this.branchLines[i].push(sprout);
        this.maxRank = Math.max(this.maxRank, rank);
        this.nX += this.noiseSpeed;

        //update bounds
        let [up, down, left, right] = this.treeBounds;
        up = Math.min(up, y2);
        down = Math.max(down, y2);
        left = Math.min(left, x2);
        right = Math.max(right, x2);
        this.treeBounds = [up, down, left, right]; 
        
        //update if necessary
        this.update();
    }

    //calculate chance to branch at our current position and decide
    branchingChance(){   

        //extract parameters (situates active bud)
        let i = this.sproutIndex;
        let buds = this.budsData;
        
        let x1 = buds[i][0][0];
        let y1 = buds[i][0][1];
        let start = this.root;

        //check if the trunc is finished (must have gone out of a "trunc radius", centered in root and of radius lTrunc)
        let rootOrbit = Math.hypot(x1 - start[0], y1 - start[1]);
        let outOfTruncZone = (rootOrbit > this.lTrunc); 

        //initiate branch
        let branch = false;

        //run our pareto "density" function (if our of trunc zone)
        if(outOfTruncZone){
            let branchingChance = chancePareto(rootOrbit, this.lTrunc, this.diam, this.testRadius, this.branchModifier, this.branchUpperRate);
            branch = Gen.chance(branchingChance);
        }

        return branch;
    }

    //calculate chance to shrink branch rank, accelerating its twig transition and decide (!! this will be only thrown in "grow" phase)
    thinningChance(){

        //extract parameters (situates active bud)
        let i = this.sproutIndex;
        let buds = this.budsData;
        let x1 = buds[i][0][0];
        let y1 = buds[i][0][1];
        let start = this.root;
        let rootOrbit = Math.hypot(x1 - start[0], y1 - start[1]);

        //boost (or not the thinning phenomenon)
        let coeff = tame(this.branchNumber);

        //run our pareto "density" function
        let thinningChance = chancePareto(rootOrbit, this.diam, 0, this.testRadius, coeff, this.leafUpperRate);
        let thinning = Gen.chance(thinningChance);

        return thinning;
    }

    //method to grow one more step and branch
    branches(){
        //extract constants
        let i = this.sproutIndex;
        let buds = this.budsData;
        let l = this.lStick;
        let noise = this.noise;
        let nX = this.nX;
        let nY = this.nY;

        //rename elements of budsData
        let x1 = buds[i][0][0];
        let y1 = buds[i][0][1];
        let rank = buds[i][2]; 

        //redraw the preceding branch
        redraw(this.branchLines[i], rank, this.degree, this.branchNumber, this.color, this.group);

        //get the orientation of the bisectrice
        let orientation = this.orient(true);
        
        //calculate general sprouts properties
        let lengthLeft = Gen.gaussian(l,l/10);
        let lengthRight = Gen.gaussian(l,l/10);
        let sproutAngle = Gen.gaussian(Math.PI/4, Math.PI/12);  //decide the angle between the two sprouts

        //traces left sprout 
        let orientationLeft = orientation + sproutAngle/2;
        let xLeft2 = x1 + (Math.cos(orientationLeft)*lengthLeft);
        let yLeft2 = y1 - (Math.sin(orientationLeft)*lengthLeft);
        let noiseValueLeft = noise.get(nX,nY);
        let hueLeft = Gen.map(noiseValueLeft, -1, 1, 0, 360);
        let leftSprout = this.group.create('line').set({
            x1: x1,
            y1: y1,
            x2: xLeft2,
            y2: yLeft2,
            stroke: `hsl(${hueLeft} 80% 80% / 0.8)`,
            stroke_opacity: 1 - opacityTame(this.branchNumber)
        });

        //decide left sprout width
        let rankLeft = Gen.gaussian(3*rank/4, rank/12);

        //update data for left sprout
        this.budsData[i] = [[xLeft2, yLeft2] , orientationLeft, rankLeft];
        this.branchLines[i] = [leftSprout]; 
        
        //traces right sprout
        let orientationRight = orientation - sproutAngle/2; 
        let xRight2 = x1 + (Math.cos(orientationRight)*lengthRight);
        let yRight2 = y1 - (Math.sin(orientationRight)*lengthRight);
        let noiseValueRight = noise.get(nX + this.noiseSpeed,nY);
        let hueRight = Gen.map(noiseValueRight, -1, 1, 0, 360);
        let rightSprout = this.group.create('line').set({
            x1: x1,
            y1: y1,
            x2: xRight2,
            y2: yRight2,
            stroke: `hsl(${hueRight} 80% 80% / 0.8)`,
            stroke_opacity: 1 - opacityTame(this.branchNumber)
        });

        //decide left sprout width
        let rankRight = Gen.gaussian(3*rank/4, rank/12);

        //update data for right sprout
        this.budsData.push([[xRight2, yRight2] , orientationRight, rankRight]);
        this.branchLines.push([rightSprout]);
        this.maxRank = Math.max(this.maxRank, rankLeft, rankRight);

        //update bounds
        let [up, down, left, right] = this.treeBounds;
        up = Math.min(up, yLeft2, yRight2);
        down = Math.max(down, yLeft2, yRight2);
        left = Math.min(left, xLeft2, xRight2);
        right = Math.max(right, xLeft2, xRight2);
        this.treeBounds = [up, down, left, right]; 

        //update index (and nX)
        this.sproutIndex += 1;
        this.nX += 2*this.noiseSpeed;

        //update if necessary
        this.update();
    }

    //method to grow a leaf and stop progression of the concerned branch
    flourishes(){
        //extract constants
        let i = this.sproutIndex;
        let buds = this.budsData;
        let l = this.lStick;

        //rename elements of budsData
        let deviation = buds[i][1];
        let x1 = buds[i][0][0];
        let y1 = buds[i][0][1];
        let rank = buds[i][2];

        //redraw the preceding branch
        redraw(this.branchLines[i], rank, this.degree, this.branchNumber, this.color, this.group);

        //determine properties
        let length = Gen.gaussian(3*l/4,l/8);
        let x2 = x1 + (Math.cos(deviation)*length);
        let y2 = y1 - (Math.sin(deviation)*length);
        let centerX = (x1+x2)/2;
        let centerY = (y1+y2)/2;

        let leaf = this.group.create('ellipse').set({
            cx: centerX,
            cy: centerY,
            rx: length/4,
            ry: length/2,
            fill: `url(#gradLeaf${this.root})`,
            stroke: `none`,
            fill_opacity: 1 - opacityTame(this.branchNumber)/2,
            transform: `rotate(${90 - ((deviation*180)/(Math.PI))} ${centerX} ${centerY})`, 
        });

        //update date
        //we have to delete budsData AND the corresponding branchLines list !!! dont update the index here BUT decrease branchNumber
        this.budsData.splice(i, 1);
        this.branchLines.splice(i, 1);
        this.branchNumber -= 1;

        //update bounds
        let [up, down, left, right] = this.treeBounds;
        up = Math.min(up, y2);
        down = Math.max(down, y2);
        left = Math.min(left, x2);
        right = Math.max(right, x2);
        this.treeBounds = [up, down, left, right]; 

        //update if necessary
        this.update();
    }

    //method to make a tree grow a trunc, and then a foliage with a dynamic pareto branching and stopping chance, and then thrive 
    thrives(time = 0){
        let rank = this.budsData[this.sproutIndex][2];
        let [x,y] = this.budsData[this.sproutIndex][0];
        let [rootX, rootY] = this.root;
        if(this.maxRank > 1){ 
            let branch = this.branchingChance();
            let stop = this.stoppingChance();
            if(branch && Math.hypot(x - rootX, y - rootY) >= this.lTrunc && rank > 1){
                this.branches();
            } else if(rank > 1){
                this.grows();  
            } else { this.sproutIndex += 1;}
        } else {
        //now we thrive (might take two iterations if started in the middle of a generation)
        if(this.branchNumber > 0){ this.flourishes(); } }

        if(this.branchNumber > 0){ 
            setTimeout(this.thrives, this.stickDrawTime); }
    }
}

class Forest {
    constructor(treeNumber){
        this.trees = [];
        this.hitBoxes = [];  //will contain center and "radius" of the squares
        this.squares = [];  //visualizes the hitBoxes
        this.circles = [];  //visualizes tree diameters
        
        this.arcsBounds = [1000, 0, 1000, 0]; //up; down; left; right : bounds of the circles
        this.treesBounds = [1000, 0, 1000, 0]; //similar: bounds of the trees

        this.branchNumberLowerBound = 1;

        //construct our Forest
        for(let i = 0; i < treeNumber; i++){
            let diam = Gen.constrain(Gen.pareto(100), 100, 500)/(treeNumber/5);
            let hitBoxRadius = boxRadius(diam);
            let lStick = diam/25;
            let lFoliage = Gen.gaussian((4*diam)/5, (2*diam)/25);
            let lTrunc = Gen.gaussian(diam/5, diam/50);

            let center = popXY(this.hitBoxes, hitBoxRadius);
            let x = center[0];  
            let y = center[1] + diam/2;

            let palette = Gen.random(0, palettes.length - 1, false);
            let palettePick = Gen.random(0, palettes[palette].length - 1, false);
            
            //add a tree to the forest
            let tree = new Tree(x,y, Math.PI/2, lStick, lTrunc, lFoliage, palette, palettePick);
            this.trees.push(tree);   

            //hitBox part
            //--------------------------------------------------------------------------------------------------------------------------
            let trimmedBoxRadius =  Math.min(hitBoxRadius, 166);

            //update hitBoxes
            this.hitBoxes.push([center, trimmedBoxRadius]);  //166 = 500/(2*1.5) = 500/3

            let square = tree.group.create('rect').set({
                x: center[0] - trimmedBoxRadius,
                y: center[1] - trimmedBoxRadius,
                width:  2*trimmedBoxRadius,
                height:  2*trimmedBoxRadius,
                stroke: `hsl(${Gen.random(150,270)} 80% 80% / 0.8)`,
                stroke_width: 1,
                fill: 'none',
                display: 'none'
            });

            //update squares
            this.squares.push(square);

            let circle = tree.group.create('circle').set({
                cx: center[0],
                cy: center[1],
                r: diam/2,
                stroke: `hsl(${Gen.random(150,270)} 80% 80% / 0.8)`,
                stroke_width: 1,
                fill: 'none',
                display: 'none'
            })

            //update circles
            this.circles.push(circle);

            //update circle bounds
            let [cUp, cDown, cLeft, cRight] = this.arcsBounds;
            cUp = Math.min(cUp, center[1] - diam/2);
            cDown = Math.max(cDown, center[1] + diam/2);
            cLeft = Math.min(cLeft, center[0] - diam/2);
            cRight = Math.max(cRight, center[0] + diam/2);
            this.arcsBounds = [cUp, cDown, cLeft, cRight];
            //--------------------------------------------------------------------------------------------------------------------------

            //update bounds
            let [up, down, left, right] = this.treesBounds;
            up = Math.min(up, y);
            down = Math.max(down, y);
            left = Math.min(left, x);
            right = Math.max(right, x);
            this.treesBounds = [up, down, left, right];  
        }
    }

    abounds(){
        for(let i = 0; i < this.trees.length; i++){
            let tree = this.trees[i];
            let branchNumber = tree.branchNumber;
            let gen = tree.currentGen;
            while(tree.currentGen == gen){
                let rank = tree.budsData[tree.sproutIndex][2];
                let [x,y] = tree.budsData[tree.sproutIndex][0];
                let [rootX, rootY] = tree.root;
                if(tree.maxGenRank > 1){ 
                    if(rank > 1){
                        let branch = tree.branchingChance();
                        if(branch && Math.hypot(x - rootX, y - rootY) >= tree.lTrunc && rank > 1){
                            tree.branches();
                        } else if(rank > 1){
                            tree.grows();  
                        }
                    } 
                    if(rank <= 1){
                        tree.sproutIndex += 1; tree.update();
                    }
                } else {
                //now we thrive (might take two generations if started in the middle of a generation)
                if(tree.branchNumber > 0){ 
                    tree.flourishes(); 
                    } 
                }
            
                //update bounds
                let [up, down, left, right] = this.treesBounds; 
                let [up2, down2, left2, right2] = tree.treeBounds;
                up = Math.min(up, up2);
                down = Math.max(down, down2);
                left = Math.min(left, left2);
                right = Math.max(right, right2);
                this.treesBounds = [up, down, left, right];  

            }

            if(i == 0){
                this.branchNumberLowerBound = branchNumber;
            } else {
                this.branchNumberLowerBound = Math.min(this.branchNumberLowerBound, branchNumber);
            }
            if(tree.branchNumber == 0){  
                this.trees.splice(i,1); i += 1;
            }
        }
    }

    frame(){
        let [up, down, left, right] = this.treesBounds;
        let [up2, down2, left2, right2] = this.arcsBounds;
        
        let width = Math.max(right, right2 + 50) - Math.min(left, left2 - 50);
        let height = Math.max(down, down2 + 50) - Math.min(up, up2 - 50);

        forest.moveTo(500,500);
        let sx = 1000/width;
        let sy = 1000/height;

        forest.scale(Math.min(sx,sy));
    }
}

//--------------------------------------------------------------------------------------------------------------------------------------
//functions

/*  
*   coeff is an artificial chance improver to augment the chance of events to occur
*   testRadius is the radius of the balls that will partitions the domain of the continuous probability distribution to make it discrete 
*   the function is giving a chance percentage corresponding to how likely x can appear between often and rare, following the principle of a pareto distribution 80-20
*/

function chancePareto(x, often, rare, testRadius, coeff = 1, threshold = 1){
    let min = often;
    let max = rare;

    //the often input must be the value towards which the 80% value is concentrated, thus if it is bigger than the rare value, we swap them so that: 
    //min always plays the role of often and; 
    //max always plays the role of rare.
    //Thus, we must also report the distance of x from the often input to rare, which will be our next min.
    if( rare < often ) {
        let dist = (often - x);
        x = rare + dist;    
        //x is as far from the lowest number as it was of the biggest number, which swaps the roles of rare and often
        min = rare;         
        max = often;
    }
    // we thus convert the input    often > x > rare    with dist(often,x) = (often - x)     as,
    // min(=rare) < x'(=rare + (often-x)) < max(=often),    with dist(min,x) = (often-x).

    //return uniform probability (this ofc violates classical pareto distribution)
    if( x - testRadius < min ) return 100*Math.min(coeff*(2*testRadius/(max - min)), threshold); 

    //bound the downfall of the probability (same remark as above)
    if( x > max) x = max;

    let proportion = (max-min)/5;
    // we use a Pareto distribution from proportion (simple translation [min,max] -> [proportion,max+proportion ... and beyond) in order to avoid min = 0 or too small)  
    // we situate 20 percent of the interval [proportion,max+proportion]
    // fifth = proportion*2;
    // we want to chose alpha so that (P(X <= fifth)) = [1 - (proportion / fifth)^alpha] = 0.8 so alpha = log_{1/2}(0.2)
    let alpha = Math.log(0.2)/Math.log(0.5);  //(we changed base)

    //now we calculate P(x - testRadius < X <= x + testRadius) = P(X <= x + testRadius) - P(X <= x - testRadius)
    //                                                          = 1 - ...(x+test) - ( 1 - ...(x-test) ) = ...(x-test) - ...(x+test)
    let prob = Math.pow(proportion/(x - testRadius), alpha) - Math.pow(proportion/(x + testRadius), alpha);

    return 100*Math.min(prob*coeff, threshold);
};

//function to tame the flourishing if not enough branch and excite it if too much branches
// f(1) = 0, f(10) =+- 1, f(infinity) = 5;

function tame(leafNumber){
    let x = leafNumber;
    let y = ((5 - 5*Math.E*Math.pow(Math.E,(-x)))/(((40)/(x)) + 1));
    return y;
};

//function to tame the opacity if too much branches
// f(1) = 0, f(10) =+- 0.5, f(infinity) = 1;

function opacityTame(leafNumber){
    let x = leafNumber;
    let y = ((1 - 1*Math.E*Math.pow(Math.E,(-x)))/(((10)/(x)) + 1));
    return y;
};

//if we want to avoid that one tree grows inside the square included in the circle of another, we need a half-diagonal of 
//tree.radius, which means a half side of x, where 2.x² = tree.radius² ; leading to x = tree.radius / V(2).
// we relax that requirement by setting the hald side to tree.radius / 1.5 ~ 2

//let us create the function determining the 'hit box' of a tree (it takes its diameter as argument)
function boxRadius(diam){
    let factor = Gen.random(1.5,2, true);
    return (diam)/(2*factor);
}

//this function check if a given some hitBox centered in [x,y] with 'radius' hitBoxRadius overlap with a list of hitBoxes
function checkHitBoxCollision(hitBoxes, hitBoxRadius, x, y){
    let i = hitBoxes.length;
    let hitBoxCollision = false;
    for(let j = 0; j < i; j++){
        let hitBox1 = hitBoxes[j];
        let x1 = hitBox1[0][0];
        let y1 = hitBox1[0][1];
        let r = hitBox1[1];
        if(Math.abs(x-x1) < r + hitBoxRadius && Math.abs(y - y1) < r + hitBoxRadius){
            hitBoxCollision = true;
            break;
        }
    }
    return hitBoxCollision;
}

//this function generate new coordinate for a centered hitBox (if fails after 100 attempts, give up)
function popXY(hitBoxes, hitBoxRadius){
    let x = Gen.random(0,1000);
    let y = Gen.random(0,1000);
    let hitBoxCollision = checkHitBoxCollision(hitBoxes, hitBoxRadius, x, y);
    let i = 0;
    while(hitBoxCollision == true && i < 100){
        x = Gen.random(0,1000);
        y = Gen.random(0,1000);
        hitBoxCollision = checkHitBoxCollision(hitBoxes, hitBoxRadius, x, y);
        i++;
    }
    return [x,y];
}

//function to set the opacity of a set "container" of svgs (lines) to 0 while constructing an interpolation of its constitutive nodes with width "rank" and degree "degree"

function redraw(container, rank, degree, leafNumber, color, group){
    let firstLine = container[0];
    let x1 = Number(firstLine.get('x1'));
    let y1 = Number(firstLine.get('y1'));
    let nodes = [[x1,y1]];

    container.forEach(line => {
        let x2 = Number(line.get('x2'));
        let y2 = Number(line.get('y2'));
        nodes.push([x2,y2]);

        line.set({display: 'none'});
    });
    group.createCurve(nodes, degree).set({
        stroke_opacity: 1 - opacityTame(leafNumber)/2,
        stroke: color,
        stroke_width: rank,
    });
};

//--------------------------------------------------------------------------------------------------------------------------------------

// create a forest

let treeNumber = Math.min(((Gen.pareto(2, false))/2)**2,101);

let grove = new Forest(treeNumber);

function draw(time = 0){
    grove.abounds();
    if(grove.trees.length > 0){
        setTimeout(draw, 100); 
    } else {
        grove.frame();
    }
}

draw();