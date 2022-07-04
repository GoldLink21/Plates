//Holds all the global variables like the data stack and the file stack
let { Token } = require("./classes");
let { Stack } = require("./util");



/**@type {Stack.<Token>} */
exports.scopeStack = new Stack();

var isAShell = false;
exports.isShell = function isShell() {
    return isAShell;
};
/**
 * @param {boolean} val 
 */
exports.setShell = function setShell(val){
    isAShell = val;
}

/**@type {Token[]} */
exports.currentTokens = [];