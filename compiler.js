#!/home/goldlink/.nvm/versions/node/v16.14.2/bin/node
/** @typedef {{succ:boolean, token:Token?, remain:string}} Parsed The output from a parser function. Has a succ value because the token could be null but still successfully parsed */
/**@typedef {function(string):Parsed} Parser A function that takes an input and returns the token it parsed */
let process = require("process");
const { exit } = require("process");
let fs = require("fs");
let readline = require("readline")
let {cons, auto, reset, Stack, fileStack, Loc, curLoc } = require("./util");
let util = require("./util");
let { Token, Tokens, intrinsics, hasIntrinsic, determineType, tokenTypeToName, tokenLen, vars, hasVar, errLoc, dataStack, runTokens } = require("./classes");
let { currentTokens} = require("./globals");
let globals = require("./globals");
//Load in intrinsic functions
require("./intrinsics");

function write(input){
    process.stdout.write(input);
}
function writeln(str){
    return write(`${str}\n`);
}



function todo(msg){
    console.log(cons.blue(`TODO: ${msg}`));
    process.exit(1);
}

function usage(){
    console.log(
`Usage: ${process.argv0} [-l] sourceFile
    -l      Lexes the file and prints the tokens only
`)
}

/**
 * Makes a token based on the string input. Handles 0o 0b 0r formats as well as decimal
 * @param {string} word 
 */
function numberToken(word){
    tokenLen(8);
    let isNeg = false;
    if(word[0] == '-') {
        word = word.slice(1);
        isNeg = true;
    }
    let val = 0;
    if(/^[0-9]+(\.[0-9]+)?$/.test(word)){
        //Decimal
        val = Number(word);
    } else if(/^0x[0-9a-fA-F]+$/.test(word)){ 
        //Hex
        word = word.slice(2).toUpperCase();
        let key = {A:10,B:11,C:12,D:13,E:14,F:15}
        for(let i=word.length - 1; i >= 0; i--){
            //This is the current multiplier
            let v = (/[A-F]/.test(word[i]))?key[word[i]]:Number(word);
            val += v * Math.pow(16,((word.length - i - 1)));
        }
    } else if(/^0o[0-7]+$/.test(word)){ 
        //Octal
        word = word.slice(2);
        //TODO
        for(let i=word.length - 1; i >= 0; i--){
            //This is the current multiplier
            val += Number(word[i]) * Math.pow(8,((word.length - i - 1)));
        }
    } else if(/^0b[01]+$/.test(word)){ 
        //Binary
        word = word.slice(2);
        //TODO
        for(let i=word.length - 1; i >= 0; i--){
            //This is the current multiplier
            val += Number(word[i]) * Math.pow(2,(word.length - i - 1));
        }
    } else if(word.startsWith('0r') && word[2] && 
        /(?<=^)M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})(?=$)/
        .test(word.slice(2).toUpperCase()))
    { 
        //Roman Numberals
        word = word.slice(2).toUpperCase();
        let key = {
            I:1,V:5,X:10,L:50,C:100,D:500,M:1000
        }
        let i;
        for(i=0; i < word.length - 1; i++){
            let v1 = key[word[i]];
            let v2 = key[word[i+1]];
            if(v1 < v2){
                val += (v2 - v1);
                i++;
            } else {
                val += v1;
            }
        }
        if(i != word.length){
            let last = word.at(-1);
            val += key[last];
        }
    }
    if(isNeg)
        val = -val;
    return val;
}

/** @type {Parser} Takes the input and grabs a word from it */
function parseNext(input){
    tokenLen(8)
    var [word, left] = grabWord(input);
    let loc = curLoc();
    util.setCol(util.getCol() + input.length);
    var type = determineType(word);
    //console.log(`Found Token ${tokenTypeToName(type)}`);
    if(type == Tokens.string){
        // @ts-ignore
        word = word.replaceAll("\\n", "\n").replaceAll('\\"','"');
        return { token:new Token(Tokens.string,word.substring(1,word.length-1),loc),
            succ:true,remain:left
        };
    }
    if(type == Tokens.bool){ 
        //Bool
        return { token:new Token(Tokens.bool,Boolean(word),loc), 
            succ:true,remain:left
        };
    } 
    if(type == Tokens.number){
        //Number
        //New parsing for other literals
        //let n = Number(word) ;let t = new Token(Tokens.number, n, loc)
        let t = numberToken(word);
        return { token:new Token(Tokens.number, t, loc),
            succ:true,remain:left
        }
    }
    if(type == Tokens.intrinsic){
        return {token:new Token(Tokens.intrinsic, word, loc), succ:true, remain:left}
    }
    if(type == Tokens.var) {
        //This will likely need to change but its okay for now. They work like constants of sorts
        //if(hasVar(word)){
        //    let v = vars.get(word);
        //    return { token:new Token(v.type, v.value, v.loc), succ:true, remain:left}
        //}
        return {token:new Token(Tokens.var, word, loc), succ:true, remain:left}
    }
    if(type == Tokens.if){
        return {
            token:new Token(Tokens.if, null, loc),succ:true,remain:left
        }
    }
    if(type == Tokens.end){
        
        return {
            token:new Token(Tokens.end, null,loc), succ:true, remain:left
        }
    }
    if(type == Tokens.word) {
        //Word        
        return { token:new Token(Tokens.word,word,loc), 
            succ:true, remain:left
        };
    } else {
        //Err
        return {
            succ:false,
            token:new Token(Tokens.err, word, loc),
            remain:left
        }
    }
}



/**
 * @param {string} str Grabs up to the next whitespace 
 * @returns {[string,string]}
 * @todo "Hello World" is an error because it splits by spaces.
 */
function grabWord(str){
    //Trim whitespace at the beginning
    let beginWs = str.match(/^\s*/);
    util.setCol(util.getCol() + (beginWs[0].length));
    //String after moving forward
    let ss = str.substring(beginWs[0].length);
    //Checks for "\"\'" etc
    let strCheck = ss.match(/^\"([^\"\\]|\\.)*\"/)
    if(strCheck !== null){
        //console.log(strCheck)
        return [strCheck[0], ss.substring(strCheck[0].length)];
    }
    let sp = ss.search(/\s/);
    return (sp != -1)? [ss.substring(0,sp), ss.substring(sp)] : [ss,""];
}

//Used for making enums



(function main(){
    let args = process.argv;
    //Removes first arg of node if called through node
    if(args[0].endsWith("node")){
        args.shift();
    }
    /**This is the name of the executable that called this */
    let called = args.shift();
    console.log("Plates Compiler v0.0.1");
    if(args.length == 0) {
        //Enable shell
        handleShell();
        return;
    }
    let inputDir = args.at(-1);
    console.log(`-Trying to parse ${inputDir}`);
    let input;
    try {
        input = fs.readFileSync(inputDir).toString();
        fileStack.push(inputDir);
    } catch(e) {
        console.error(cons.red(`Could not read file ${inputDir}`,true));
        process.exit(1)
    }
    currentTokens.push(...lexInput(input));
    logTokens(currentTokens);
    //logTokens(currentTokens);    
    runTokens(currentTokens);
    if(currentTokens.length !== 0){
        cons.err("\nNot all of the input tokens are consumed");
        console.log(cons.cyan(`NOTE: The tokens left are`))
        logTokens(currentTokens);
        exit(1);
    }
})();

/**
 * @param {Token[]} tokens 
 */
function logTokens(tokens){
    tokens.map(t=>t.toString()).forEach(t=>{
        console.log(t)
    })
}

/**
 * Tokenizes any string input
 * @param {string} input
 */
function lexInput(input){
    let tokens = [];
    let lines;
    
    lines = input.split("\r\n")
        .map(e=>e.split("//")[0]); //Removes comments
    for(let crow = 0; crow < lines.length; crow++){
        util.setRow(crow + 1);
        util.setCol(1);
        let cur,next,line;
        do {
            //Gets first from array, then from line variable
            [cur, next] = grabWord((line==undefined)?lines[crow]:line);
            if(cur !== ""){
                //Add token if you got something
                let {remain, succ, token} = parseNext(cur);
                if(!succ){
                    return [token]
                }
                if(token !== null){
                    tokens.push(token);
                }
                if(remain !== ""){
                    todo("Add additional case for sub parsing, i.e. 1+1. May not need for stack based though...");
                }
            }
            line = next;
        } while(line !== "");
    }
    return tokens;
}

/**
 * @param {number} len 
 * @param {Token} token 
 */
function requireStackLen(len, token){
    if(dataStack.length < len){
        errLoc(`Token ${token.value} requires ${len} on the stack, but there is only ${dataStack.length}`,token.loc)
    }
}



function handleShell(){
    globals.setShell(true);
    fileStack.push("shell");
    process.stdout.write(cons.blue("pl8> ",true));
    let rl = readline.createInterface({
        input:process.stdin,
        output:process.stdout,
        terminal:false
    });
    rl.on("line",line=>{
        let tokens = lexInput(line);
        if(tokens.length == 1 && tokens[0].type == Tokens.err){
            process.stdout.write(`Invalid Token of ${tokens[0].value}\n`);
        } else {
            runTokens(tokens);
        }
        logTokens(globals.currentTokens);
        process.stdout.write(cons.blue("\npl8> ",true));

    });
    process.on("SIGINT",l=> {
        process.stdout.write("\nGoodbye!\n");
        rl.close();
        process.exit(0);
    })
}