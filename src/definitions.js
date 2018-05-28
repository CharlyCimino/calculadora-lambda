
/* object containing hardcoded constants and aliases definitions, also method for associating with the main object*/
const Constant = {
    pri_false : new Primitive("FALSE", new BaseType("Bool")),
    
    pri_true  : new Primitive("TRUE", new BaseType("Bool")),
    
    pri_n     : (n) => new Primitive(n, new BaseType("Int")),
    
    constant_k_comb : new Primitive("K", null, 2, (x,y) => x),
    
    constant_s_comb : new Primitive("S", null, 3, (x,y,z) => new App(new App(x, z), new App(y, z))),
    
    constant_i_comb : new Primitive("I", null, 1, (x) => x),
    
    constant_times  : new Primitive(
        "TIMES",
        new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Int"))),
        2,
        (x,y) => Constant.pri_n(parseInt(x.name,10) * parseInt(y.name,10))),
    
    constant_minus  : new Primitive(
        "MINUS",
        new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Int"))),
        2,
        (x,y) => Constant.pri_n(parseInt(x.name, 10) - parseInt(y.name, 10))),
    
    constant_plus   : new Primitive(
        "PLUS",
        new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Int"))),
        2,
        (x,y) => Constant.pri_n(parseInt(x.name,10) + parseInt(y.name,10))),
    
    constant_div    : new Primitive(
        "DIV",
        new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Int"))),
        2,
        (x,y) => Constant.pri_n(Math.floor(parseInt(x.name,10) / parseInt(y.name,10)))),
    
    constant_eq     : new Primitive(
        "EQ",
        new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Bool"))),
        2,
        (x,y) => x.name != y.name ? Constant.pri_false : Constant.pri_true),
    
    constant_leq    : new Primitive(
        "LEQ",
        new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Bool"))),
        2,
        (x,y) => parseInt(x.name, 10) <= parseInt(y.name, 10) ? Constant.pri_true : Constant.pri_false),
    
    constant_not    : new Primitive(
        "NOT",
        new FunctionType(new BaseType("Bool"), new BaseType("Bool")),
        1,
        (a) => a.equals(Constant.pri_true) ? Constant.pri_false : Constant.pri_true),
    
    constant_ite    : new Primitive(
        "ITE",
        new FunctionType(new BaseType("Bool"), new FunctionType(new TypeVariable('σ'), new FunctionType(new TypeVariable('σ'), new TypeVariable('σ')))),
        3,
        (a,b,c) => a.equals(Constant.pri_true) ? b : c),

    constant_succ   : new Primitive(
        "SUCC",
        new FunctionType(new BaseType('Int'), new BaseType('Int')),
        1,
        (x) => Constant.pri_n(parseInt(x.name) + 1)),
    
    constant_pred   : new Primitive(
        "PRED",
        new FunctionType(new BaseType('Int'), new BaseType('Int')),
        1,
        (x) => Constant.pri_n(parseInt(x.name) - 1)),
    
    constant_iszero : new Primitive(
        "ISZERO",
        new FunctionType(new BaseType('Int'), new BaseType('Bool')),
        1,
        (x) => x.equals(Constant.pri_n(0)) ? Constant.pri_true : Constant.pri_false),
    
    constant_or     : new Primitive(
        "OR",
        new FunctionType(new BaseType("Bool"), new FunctionType(new BaseType("Bool"), new BaseType("Bool"))), 
        2,
        (x,y) => x.equals(Constant.pri_true) || y.equals(Constant.pri_true) ? Constant.pri_true : Constant.pri_false),
    
    constant_and    : new Primitive(
        "AND",
        new FunctionType(new BaseType("Bool"), new FunctionType(new BaseType("Bool"), new BaseType("Bool"))),
        2,
        (x,y) => x.equals(Constant.pri_true) && y.equals(Constant.pri_true) ? Constant.pri_true : Constant.pri_false),
    
    constant_fix    : new Primitive(
        "FIX",
        new FunctionType(new FunctionType(new TypeVariable('σ'), new TypeVariable('σ')), new TypeVariable('σ')),
        1,
        (x) => Evaluator.applyBetaStep(new App(x, new App(Constant.constant_fix, x)))),

    // add to the global OLCE object namespace 
    addConstantsAndAliases() {
        var a = (x, y) => OLCE.Data.aliases.addAlias(x, y);
        var b = (x)    => OLCE.Data.constants.push(x);
        var p = (s)    => Parser.parse(s);
    
        //aliases
        a("ITE",    p("(λx.(λy.(λz.((x y) z))))"));
        a("FALSE",  p("(λx.(λy.y))"));
        a("TRUE",   p("(λx.(λy.x))"));
        a("OR",     p("(λy.(λx.((y y) x)))"));
        a("AND",    p("(λy.(λx.((y x) y)))"));
        a("NOT",    p("(λx.((x (λx.(λy.y))) (λx.(λy.x))))"));
        a("PLUS",   p("(λm.(λn.(λf.(λx.((m f) ((n f) x))))))"));
        a("MINUS",  p("(λm.(λn.((n (λn.(λf.(λx.(((n (λg.(λh.(h (g f))))) (λu.x)) (λu.u)))))) m)))"));
        a("TIMES",  p("(λm.(λn.(λf.(m (n f)))))"));
        a("SUCC",   p("(λn.(λf.(λx.(f ((n f) x)))))"));
        a("PRED",   p("(λn.(λf.(λx.(((n (λg.(λh.(h (g f))))) (λu.x)) (λu.u)))))"));
        a("DIV",    p("(λn.(((λf.((λx.(f (x x))) (λx.(f (x x))))) (λc.(λn.(λm.(λf.(λx.((λd.((((λn.((n (λx.(λx.(λy.y)))) (λx.(λy.x)))) d) (((λf.(λx.x)) f) x)) (f ((((c d) m) f) x)))) (((λm.(λn.((n (λn.(λf.(λx.(((n (λg.(λh.(h (g f))))) (λu.x)) (λu.u)))))) m))) n) m)))))))) ((λn.(λf.(λx.(f ((n f) x))))) n)))"));
        a("Ω",      p("((λx.(x x)) (λx.(x x)))"));
        a("OMEGA",  p("((λx.(x x)) (λx.(x x)))"));
        a("Θ",      p("((λx.(λf.(f ((x x) f)))) (λx.(λf.(f ((x x) f)))))"));
        a("THETA",  p("((λx.(λf.(f ((x x) f)))) (λx.(λf.(f ((x x) f)))))"));
        a("ISZERO", p("(λn.((n (λx.(λx.(λy.y)))) (λx.(λy.x))))"));
        a("LEQ",    p("(λm.(λn.((λn.((n (λx.(λx.(λy.y)))) (λx.(λy.x)))) (((λm.(λn.((n (λn.(λf.(λx.(((n (λg.(λh.(h (g f))))) (λu.x)) (λu.u)))))) m))) m) n))))"));
        a("EQ",     p(" (λm.(λn.(((λy.(λx.((y x) y))) (((λm.(λn.((λn.((n (λx.(λx.(λy.y)))) (λx.(λy.x)))) (((λm.(λn.((n (λn.(λf.(λx.(((n (λg.(λh.(h (g f))))) (λu.x)) (λu.u)))))) m))) m) n)))) m) n)) (((λm.(λn.((λn.((n (λx.(λx.(λy.y)))) (λx.(λy.x)))) (((λm.(λn.((n (λn.(λf.(λx.(((n (λg.(λh.(h (g f))))) (λu.x)) (λu.u)))))) m))) m) n)))) n) m))))"));
        a("Y",      p("(λf.((λx.(f (x x))) (λx.(f (x x)))))"));
        a("S",      p("(λxyz.((xz)(yz)))"));
        a("K",      p("(λij.i)"));
        a("I",      p("(λi.i)"));
    
        b(this.constant_iszero);
        b(this.constant_pred);
        b(this.constant_succ);
        b(this.constant_times);
        b(this.constant_plus);
        b(this.constant_minus);
        b(this.constant_div);
        b(this.constant_eq);
        b(this.constant_leq);
        b(this.constant_ite);
        b(this.constant_and);
        b(this.constant_not);
        b(this.constant_or);
        b(this.pri_true);
        b(this.pri_false);
        b(this.constant_s_comb);
        b(this.constant_k_comb);
        b(this.constant_i_comb);
        b(this.constant_fix);
    },
}//Constant
