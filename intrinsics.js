//This holds all the intrinsic functions 
var { defineIntrinsic, requireType, Tokens, Token, defineVar, expandIfVariable, hasVar, vars, errLoc, } = require("./classes");
var {Loc, cons} = require("./util")

//Variables are just pointers....
defineIntrinsic("+", Loc.generic(),(a,b)=>{
    requireType(a, Tokens.number);
    requireType(b, Tokens.number);
    return [new Token(Tokens.number, a.value + b.value)];
});

defineIntrinsic("-", Loc.generic(),(a,b)=>{
    requireType(a, Tokens.number);
    requireType(b, Tokens.number);
    return [new Token(Tokens.number, a.value - b.value)];
});

defineIntrinsic("/", Loc.generic(),(a,b)=>{
    requireType(a, Tokens.number);
    requireType(b, Tokens.number);
    return [new Token(Tokens.number, a.value / b.value)];
});
defineIntrinsic("*", Loc.generic(),(a,b)=>{
    requireType(a, Tokens.number);
    requireType(b, Tokens.number);
    return [new Token(Tokens.number, a.value * b.value)];
});
defineIntrinsic("print", Loc.generic(),(a)=>{
    process.stdout.write(String(a.value));
    return [];
});
defineIntrinsic("p", Loc.generic(),(a)=>{
    process.stdout.write(String(a.value));
    return [];
});
defineIntrinsic("println", Loc.generic(),(a)=>{
    process.stdout.write(String(a.value) + "\n");
    return [];
});
defineIntrinsic("swap", Loc.generic(),(a, b)=>{
    //B is top of stack?
    return [b, a];
});
defineIntrinsic("drop", Loc.generic(),(a)=>{
    void(a);
    return [];
});
defineIntrinsic("rot", Loc.generic(),(a,b,c)=>{
    return [b, c, a]
});

defineIntrinsic("def", Loc.generic(),(name,value)=>{
    requireType(name, Tokens.word);
    defineVar(name.value, value.value);
    return [];
});

defineIntrinsic("@", Loc.generic(), (tok)=>{
    requireType(tok, Tokens.var);
    if(!hasVar(tok.value))
        errLoc(`Trying to read variable of ${tok.value} but it does not exist`, tok.loc);
    return [expandIfVariable(tok)];
})

defineIntrinsic("!", Loc.generic(), (tok, val)=>{
    requireType(tok, Tokens.var)
    if(!hasVar(tok.value)){
        errLoc(`Trying to assign a value to var ${tok.value} when it is not defined`, tok.loc);
    }
    vars.get(tok.value).type = val.type;
    vars.get(tok.value).value = val.value;
    vars.get(tok.value).loc = tok.value;
    return [];
})