/**@typedef {(str:string)=>string} ColFunc */

let cons = {
    reset: "\x1b[0m",
    blink:   (str="", reset=false) => `\x1b[5m${ str}${(reset)?cons.reset:""}`,
    black:   (str="", reset=false) => `\x1b[30m${str}${(reset)?cons.reset:""}`,
    red:     (str="", reset=false) => `\x1b[31m${str}${(reset)?cons.reset:""}`,
    green:   (str="", reset=false) => `\x1b[32m${str}${(reset)?cons.reset:""}`,
    yellow:  (str="", reset=false) => `\x1b[33m${str}${(reset)?cons.reset:""}`,
    blue:    (str="", reset=false) => `\x1b[34m${str}${(reset)?cons.reset:""}`,
    magenta: (str="", reset=false) => `\x1b[35m${str}${(reset)?cons.reset:""}`,
    cyan:    (str="", reset=false) => `\x1b[36m${str}${(reset)?cons.reset:""}`,
    white:   (str="", reset=false) => `\x1b[37m${str}${(reset)?cons.reset:""}`,
    err:     (str="")              => console.log(cons.red(`Error: ${str}`,true))
};
exports.cons = cons;

var autoId = 0;
exports.auto = function auto(by = 1){
    return (autoId += by) - by;
}
exports.reset = function reset(){
    return autoId + (autoId = 0);
}

/**
 * While I can just use arrays as stacks, I use it like this to keep myself true to it 
 * @template StackVal
 */
 class Stack {
    /**@type {any[]} */
    #values = [];
    constructor(){
        /**@type {StackVal[]} */
        this.#values = [];
    }
    /**@param {StackVal} val */
    push(val){
        this.#values.push(val);
    }
    /**@returns {StackVal} */
    peek(){
        //@ts-ignore
        return this.#values.at(-1);
    }
    /**@returns {StackVal} */
    pop(){
        return this.#values.pop();
    }
    get length(){
        return this.#values.length;
    }
    /**@param {function(StackVal):any} cb */
    forEach(cb){
        this.#values.forEach(v=>cb(v));
    }
    [Symbol.iterator](){
        let n = -1;
        let done = false;
        return {
            next:()=>{
                n++;
                if(n==this.#values.length) done = true;
                return {value:this.#values[n], done:done};
            },
        }
    }
}

exports.Stack = Stack;

/**
 * Has the current files that are open. Used as a stack to allow calling a file as a source 
 * @type {Stack.<string>} 
 */
exports.fileStack = new Stack();



class Loc {
    /**
     * Used for error reporting
     * @param {string} file 
     * @param {number} row 
     * @param {number} col 
     */
    constructor(file, row, col){
        this.file = file;
        this.row = row;
        this.col = col;
    }
    toString() {
        if(this.isGeneric()){
            return "intrinsic"
        }
        if(this.file == "shell"){
            return `shell:${this.col}`
        }
        return `${(this.file.startsWith("/")?"":"./")}${this.file}:${this.row}:${this.col}`;
    }
    static generic(){
        return new exports.Loc("",0,0);
    }
    isGeneric(){
        return (this.file == "" && this.row == 0 && this.col == 0) || this.file == "console"
    }
}
exports.Loc = Loc;

/**Current File Row */
var row = 1;
/**
 * 
 * @param {number} val 
 */
exports.setRow = function setRow(val){
    row = val;
}
exports.getRow = function getRow(){
    return row;
}
/**Current File Col */
var col = 1;
/**
 * @param {number} val 
 */
exports.setCol = function setRow(val){
    col = val;
}
exports.getCol = function getRow(){
    return col;
}

function curLoc(){
    return new Loc(exports.fileStack.peek(), row, col);
}
exports.curLoc = curLoc;