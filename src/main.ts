import {moore} from 'moore';
import * as fs from 'fs';
import {Parser} from 'json2csv';

enum states {Susceptible, Infected};
enum neighbours {North = 0, NorthEast, East, SouthEast, South, SouthWest, West, NorthWest};

interface GridCell {
    id: number;
    value: states;
    y: number;
    x: number;
}

/**
 * Performs a move for cell: array[y][x]
 * y - the vertical co-ordinate
 * x - the horizontal co-ordinate
 */
function doMove(array:Array<Array<states>>, y:number, x: number): Array<[number, number]> {
    //For the cell, loop through it's neighbours and determine if there is movement
    //probbility if movement is 1/8 times 0.25 (i.e. 25% a cells population will move, somewhere)
    //return list of infected cells
    const cell:states = array[y][x];
    const newinfected: Array<[number, number]> = new Array();
    
    if (cell == states.Infected) {
        for (let i = 0; i < 8 /*number of neghbours*/; i++) {
            const rand = Math.random();
            if (rand < 0.03) {// 0.25 * 0.125
                try {
                    const infectedNeighbour: [number, number] = neighbourCoords(i, y, x);
                    if (array[y][x] != states.Infected) {
                        newinfected.push(infectedNeighbour);
                    }
                }
                catch(error) {
                    console.log(error);
                    console.log(`Unable to infect ${y}, ${x} neighbour ${neighbours[i]}`);
                }
            }
        }
    }
    
    return newinfected;
}

/**
 * Determine the co-ordinates of a neighbour, given the origin co-ords and neighbour direction.
 */
function neighbourCoords(direction:neighbours, y:number, x:number): [number, number] {
    let coords:[number, number];
    switch (direction) {
            case neighbours.North: {
                coords = [y-1,x];
                break;
            }
            case neighbours.East: {
                coords = [y, x+1];
                break;
            }
            case neighbours.South: {
                coords = [y+1, x];
                break;
            }
            case neighbours.West: {
                coords = [y, x-1];
                break;
            }
            case neighbours.NorthEast: {
                coords = [y-1, x+1];
                break;
            }
            case neighbours.SouthEast: {
                coords = [y+1, x+1];
                break;
            }
            case neighbours.NorthWest: {
                coords = [y-1, x-1];
                break;
            }
            case neighbours.SouthWest: {
                coords = [y+1, x-1];
                break;
            }
    }
    
    if ((typeof coords == "undefined") || (coords[0] < 0) || (coords[1] < 0)) {
        throw "Invalid co-ordinates created"
    }
    else {
        return coords;
    }
}

function movementPhase(array:Array<Array<states>>, height: number, width: number): Array<[number, number]> {
    //Go through all the cells, picking them at random.
    //For each cell perform a move
    //return list of infected cells
    let newinfected: Array<[number, number]> = new Array();
    
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            newinfected = newinfected.concat(doMove(array, i, j));
        }
    }
    
    return newinfected;
}

function calculateNoInfectedNeighbours(array:Array<Array<states>>, y:number, x:number, n:number): number {
    //Calculate the number of infected cells for an extended moore neighbourhood 
    
    const mooreneighbours: Array<[number, number]> = moore(n,2);
    const neighbours = mooreneighbours.map((elem) => [y+elem[0], x+elem[1]]);
    const infectedCells: number = neighbours.reduce((sum, elem) => {
        try {
            const cell = array[elem[0]][elem[1]];
            if (cell == states.Infected) {
                return sum+1;
            }
        } catch (error) {
            console.log(`Unable to get cell ${elem[0]}, ${elem[1]}`);
        }
        return sum;
    }, 0);
    
    return infectedCells;
}

function infectionIndex(array:Array<Array<states>>, y:number, x:number, n:number): number {
    //Calculate the infection index up to a neighbourhood of size n
    /* The infection index is the sum of infecteds within a cells extended moore neighbourhood, where the distance from the cell is used to give closer infecteds more influence. The distance is the neigbourhoods range */
    let infectionIndex = 0;
    let nminus1Infecteds = 0;
    
    for (let i = 1; i <= n; i++) {
        const infecteds = calculateNoInfectedNeighbours(array, y, x, i);
        const newInfecteds = infecteds-nminus1Infecteds;
        nminus1Infecteds = infecteds;
        infectionIndex += newInfecteds / i;
    }
    
    return infectionIndex;
}

function doInfection(array:Array<Array<states>>, y:number, x: number): boolean {
    //Calculate infection index from cells up to 10th degree of neighbour
    //Compute random infetion threshold, between 0 and 25
    //If index > threshold, cell is infected
    //return boolean
    const index = infectionIndex(array, y, x, 10);
    const threshold = Math.floor((Math.random() * 25));
    
    return (index >= threshold) ? true : false;
}

function infectionPhase(array:Array<Array<states>>, height: number, width: number): Array<[number, number]> {
    //Loop through cells, and determine if any get infected.
    //return list of infected cells
    let newinfected: Array<[number, number]> = new Array();
    
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            if (array[i][j] != states.Infected) {
                if (doInfection(array, i, j)) {
                    newinfected.push([i, j]);
                }
            }
        }
    }
    
    return newinfected;
}

function cellPhase(array:Array<Array<states>>, height: number, width: number): Array<Array<states>> {
    //build up list of infected cells
    //update theWorld array of cells
    let newWorld = JSON.parse(JSON.stringify(array));
    let newinfected: Array<[number, number]> = new Array();
    
    newinfected = newinfected.concat(movementPhase(array, height, width));
    newinfected = newinfected.concat(infectionPhase(array, height, width));
    
    for (let i in newinfected) {
        const y = newinfected[i][0];
        const x = newinfected[i][1];
        
        try {
            newWorld[y][x] = states.Infected;
        }
        catch (error) {
            console.log(`Unable to update cell ${y}, ${x}`);
        }
    }
    
    return newWorld;
}

function createWorld(worldHeight: number, worldWidth: number): Array<Array<states>> {
    let theWorld: Array<Array<states>> = new Array();
    
    for(let i = 0; i < worldHeight; i++) {
        let row: Array<states> = new Array();
        for(let j = 0; j < worldWidth; j++) {
            let cell = states.Susceptible;
            row.push(cell);
        }
        theWorld.push(row);
    }
    
    return theWorld;
}

function seed(array:Array<Array<states>>): Array<Array<states>> {
    /* Starting Cells IDs (31 values pre -5500):
    1559, 1714, 1767, 1768, 1834, 1926, 1930, 1965, 2061, 2111, 2122, 2168, 2193, 2252, 2260, 2330, 2452, 2518, 2588, 2649, 2790, 2858, 2859, 2930, 2931, 2933, 2992, 2994, 2998, 3062, 3128*/
    
    /*ys  
         0-68 = 0
         69-136= 1
        136-204= 2
        
      xs (x % 68) - 1
         0,69,136,.. = 0
         1,70,137,.. = 1
         2,71,138,... = 2
    */
    const source: Array<[number, number]> = new Array();
    source.push([22,41]);
    source.push([24,58]);
    source.push([25,42]);
    source.push([25,43]);
    source.push([26,40]);
    source.push([27,63]);
    source.push([27,67]);
    source.push([28,33]);
    source.push([29,60]);
    source.push([30,41]);
    source.push([30,52]);
    source.push([31,29]);
    source.push([31,54]);
    source.push([32,44]);
    source.push([32,52]);
    source.push([33,53]);
    source.push([35,37]);
    source.push([36,34]);
    source.push([37,35]);
    source.push([38,27]);
    source.push([40,30]);
    source.push([41,29]);
    source.push([41,30]);
    source.push([42,32]);
    source.push([42,33]);
    source.push([42,35]);
    source.push([43,25]);
    source.push([43,27]);
    source.push([43,31]);
    source.push([44,26]);
    source.push([45,23]);
    
    for (let i in source) {
        const y = source[i][0];
        const x = source[i][1];
        
        try {
            array[y][x] = states.Infected;
        }
        catch (error) {
            console.log(`Unable to seed cell ${y}, ${x}`);
        }
    }
    
    return array;
}

function convertToGrid(world: Array<Array<states>>, worldHeight: number, worldWidth: number): Array<GridCell> {
    const grid: Array<GridCell> = new Array();
    
    for (let i = 0, id = 0; i < worldHeight; i++) {
        for (let j = 0; j < worldWidth; j++, id++) {
            grid.push({id: id, value: world[i][j], y: i, x: j});
        }
    }
    
    return grid;
}

function runModel(runs: number) {
    //perform n runs of cell phase
    //transform theWorld array into csv
    //write csv file to disk
    const worldHeight = 46;
    const worldWidth = 69;
    
    let theWorld: Array<Array<states>> = createWorld(worldHeight, worldWidth);
    theWorld = seed(theWorld);
    
    for (let i = 0; i < runs; i++) {
        theWorld = cellPhase(theWorld, worldHeight, worldWidth)
    }
    
    const values = convertToGrid(theWorld, worldHeight, worldWidth);
    
    const json2csv = new Parser();
    const csv = json2csv.parse(values);
    fs.writeFile('./data/modeloutput.csv', csv, { encoding: 'utf8' }, (err) => {
        if (err) throw err;
        console.log("file written");
    });
}

runModel(0);