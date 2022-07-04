//Holds all the classes and functions relating to them
let {cons, auto, reset, Stack, fileStack, Loc, curLoc, getCol, getRow, setCol, setRow} = require("./util")
let process = require("process");
const { exit } = require("process");



/**@enum {number} */
var Tokens = {
    err:        -1,
    word:       auto(),
    string:     auto(),
    number:     auto(),
    bool:       auto(),
    intrinsic:  auto(),
    var:        auto(),
    if:         auto(),
    end:        auto(),
    count:      reset()
}
Object.freeze(Tokens);
exports.Tokens = Tokens;
/**
 * Throws an error if the number of tokens is not equal to this value
 * Used to help with refactoring
 * @param {number} len 
 */
function tokenLen(len){
    if(exports.Tokens.count !== len){
        throw new Error("Runtime eval of number of tokens");
    }
}
exports.tokenLen = tokenLen;

function tokenTypeToName(/** @type {exports.Tokens} */ token){
    exports.tokenLen(8);
    switch(token){
        case -1:                        return "Error"
        case exports.Tokens.word:       return "Word"
        case exports.Tokens.string:     return "String"
        case exports.Tokens.bool:       return "Boolean"
        case exports.Tokens.number:     return "Number"
        case exports.Tokens.intrinsic:  return "Intrins"
        case exports.Tokens.var:        return "Variable"
        case exports.Tokens.end:        return "Variable"
        case exports.Tokens.if:         return "If"
        default:                        return "Invalid"
    }
}
exports.tokenTypeToName = tokenTypeToName;


class Token {
    /**
     * @param {Tokens} type
     * @param {any} value
     * @param {Loc} loc
     */
    constructor(type, value = null, loc = null){
        /**@type {Tokens} */
        this.type = type;
        /**@type {any} */
        this.value = value;
        /**@type {{[x:string]:any}} */
        this.meta = null;
        /**@type {Loc} */
        this.loc = loc;
    }
    toString(){
        return cons.cyan(`Token[${exports.tokenTypeToName(this.type)}:\t${cons.green(this.value)+cons.cyan()},\tMeta:${this.meta},\tLoc: ${this.loc.toString()}]`,true);
    }
}
exports.Token = Token;

/**Holds data values for running 
 * @type {Stack.<Token>} 
 */
var dataStack = new Stack();
exports.dataStack = dataStack;



/** @type {Map<string, Intrinsic>} */
let intrinsics = new Map()

exports.intrinsics = intrinsics;
class Intrinsic {
    /**
     * @param {string} symbol
     * @param {Loc} loc
     * @param {function(...any):Token[]} func 
     */
    constructor(symbol, loc, func){
        this.symbol = symbol;
        this.func = func;
        this.loc = loc;
        this.isUser = false;
    }
    get nParams(){
        return this.func.length;
    }
    /**
     * 
     * @param {Stack.<Token>} tokens 
     */
    run(tokens){
        
        let params = [];
        if(tokens.length < this.nParams){
            console.log(cons.red(`Function ${this.symbol} requires ${this.nParams} but got only ${tokens.length}`,true));
            process.exit(1);
        }
        for(let i=0;i<this.nParams;i++){
            params.push(tokens.pop());
        }
        //Any return tokens get pushed back to the stack
        this.func(...params.reverse())?.forEach(t=>{
            tokens.push(t);
        });
    }
}
exports.Intrinsic = Intrinsic;

//@todo include function definition location?
//@todo define intrinsic functions
/**
 * Adds a function to the object
 * @param {string} name 
 * @param {Loc} loc 
 * @param {function(...Token):Token[]} func 
 */
function defineIntrinsic(name, loc, func){
    checkNameExists(name);
    intrinsics.set(name, new Intrinsic(name, loc, func))
}
exports.defineIntrinsic = defineIntrinsic;
/**@param {string} name */
function hasIntrinsic(name){
    return intrinsics.has(name);
}
exports.hasIntrinsic = hasIntrinsic;

/**
 * 
 * @param {Token} token 
 * @param {Tokens} type 
 */
function requireType(token, type){
    if(token.type !== type){
        cons.err(`Token ${token.value} should be of type ${tokenTypeToName(type)} but got ${tokenTypeToName(token.type)} instead`)
        exit(1);
    }
}
exports.requireType = requireType;

/**Checks if the name exists anywhere already */
function checkNameExists(name){
    if(intrinsics.has(name)){
        console.log(cons.red(`${name} is a defined Intrinsic already defined`));
        if(!intrinsics.get(name).loc.isGeneric()){
            console.log(`NOTE: It is defined here ${intrinsics.get(name).loc.toString()}`)
        }
        process.exit(1);
    }
    if(hasVar(name)){
        console.log(cons.red(`${name} defined variable already`));
        if(!vars.get(name).loc.isGeneric()){
            console.log(`NOTE: It is defined here ${vars.get(name).loc.toString()}`)
        }
        process.exit(1);
    }
}

class Var{
    constructor(name, value, loc = Loc.generic()){
        this.name = name;
        this.value = value;
        //Placeholder
        this.type = Tokens.number;
        this.loc = loc;
    }
}
exports.Var = Var;

/**
 * 
 * @param {string} name 
 * @param {any} val 
 */
function defineVar(name, val) {
    checkNameExists(name);
    vars.set(name,new Var(name, val));
}
exports.defineVar = defineVar;

/**
 * 
 * @param {string} str 
 * @param {Loc} loc 
 */
exports.errLoc = function errLoc(str, loc){
    console.log((cons.red(`${loc.toString()} Error: ${str}`,true))+"\n");
    process.exit(1);
}
/**
 * 
 * @param {string} word 
 * @returns {Tokens}
 */
function determineType(word){
    tokenLen(8);
    if(/^\"([^\"\\]|\\.)*\"$/.test(word)) {
        //String
        return Tokens.string;
    }else if(/^(true|false)$/.test(word)){ 
        //Bool
        return Tokens.bool;
    } else if(/^\-?[0-9]+(\.[0-9]+)?$/.test(word)){
        //Decimal
        return Tokens.number;
    } else if(/^\-?0x[0-9a-fA-F]+$/.test(word)){ 
        //Hex
        return Tokens.number;
    } else if(/^\-?0o[0-8]+$/.test(word)){ 
        //Octal
        return Tokens.number;
    } else if(/^\-?0b[01]+$/.test(word)){ 
        //Binary
        return Tokens.number;
    } else if(
        ((word.startsWith('0r') && word[2]) || (word.startsWith('-0r') && word[3])) 
            && /(?<=^)M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})(?=$)/.test(word.slice((word.startsWith('-')?3:2)).toUpperCase())){ 
        //Roman Numberals
        //console.log("Numeral")
        return Tokens.number;
    } else if(hasIntrinsic(word)){
        return Tokens.intrinsic;
    } else if(hasVar(word)) {
        return Tokens.var;
    } else if(/^if$/.test(word)){
        return Tokens.if;
    } else if(/^end$/.test(word)){ 
        return Tokens.end;
    }else if(/^[A-z\?][A-z0-9\-\_\?]*$/.test(word)) {
        //Word
        return Tokens.word;
    } else {
        //Err
        return Tokens.err;
    }
}
exports.determineType = determineType;



class Func {
    /**
     * 
     * @param {number} nparams The number of input parameters
     * @param {Token[]} tokens The tokens ran when calling the function 
     */
    constructor(nparams, tokens){
        this.nparams = nparams;
        this.tokens = tokens;
        this.isUser = true;
    }
    /**
     * 
     * @param {Token[]} allTokens 
     */
    call(allTokens){
        //Gets parameters
        let input = [];
        for(let i=0;i<this.nparams;i++){
            input.push(allTokens.pop());
        }
        input.push(...this.tokens);
    }
}
/**@type {Map<string,Func>} */
var funcs = new Map();
exports.funcs = funcs;

/**@type {Map<string,Var>}} */
var vars = new Map()
exports.vars = vars;
/**
 * 
 * @param {Token} token 
 */
 function expandIfVariable(token){
    if(token.type == Tokens.var){
        if(!hasVar(token.value)){
            cons.err("Token is var but there is no variable of that name");
            return new Token(Tokens.err, token.value, curLoc())
        } 
        let v = vars.get(token.value);
        return new Token(v.type, v.value, v.loc);
    }
    return token;
}
exports.expandIfVariable = expandIfVariable

function hasVar(name){
    return vars.has(name);
}
exports.hasVar = hasVar;

/**
 * @param {Token[]} tokens 
 */
 function runTokens(tokens){
    let len = tokens.length;
    for(let i=0;i<len;i++){
        let token = tokens[i];
        if(token.type == Tokens.word){
            if(token.value == "???"){
                if(dataStack.length > 0){
                    dataStack.forEach(v=>console.log(v.toString()))
                } else {
                    console.log(("[Datastack is empty]"));
                }
                exit(0);
            }else {
                dataStack.push(token);
            }
        } else if(token.type == Tokens.intrinsic) {
            if(!hasIntrinsic(token.value)){
                cons.err(`Token is Intrinsic, but function is not defined. Likely parsing error`);
                exit(1);
            }
            intrinsics.get(token.value).run(dataStack);
        } else {
            dataStack.push(token);
        }
    }
}
exports.runTokens = runTokens;


class Block {
    /**@type {Token[]} */
    #tokens = [];
    /**@param {Token[]} tokens */
    constructor(tokens){
        this.#tokens = tokens;
    }
    run(){
        runTokens(this.#tokens);
    }
}

/**
 * 
 * @param {Token[]} tokens 
 * @param {Tokens} endType
 * @param {Tokens[]} requiredAfterStart
 */
function parseScope(tokens, endType, ...requiredAfterStart){
    //First token is not the name
    if(tokens.length < requiredAfterStart.length + 1){
        //Not enough tokens for the scope
        cons.err("Not enough tokens for block");
    }
    for(let i=0; i < requiredAfterStart.length; i++){

    }
}