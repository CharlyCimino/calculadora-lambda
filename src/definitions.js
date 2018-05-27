var ite = new Abs(new Var('x'),
                  new Abs(new Var('y'),
                          new Abs(new Var('z'),
                                  new App(new App(new Var('x'),
                                                  new Var('y')),
                                          new Var('z')))));
var alias_true = new Abs(new Var('x'), new Abs(new Var('y'), new Var('x')));
var fals = new Abs(new Var('x'), new Abs(new Var('y'), new Var('y')));

var om1 = new Abs(new Var('x'), new App(new Var('x'), new Var('x')));
var alias_Omega = new App(om1, om1.copy());

//ycomb is used in Term::Let
var YCOMB = new Abs(new Var('f'), new App(new Abs(new Var('x'), new App(new Var('f'), new App(new Var('x'), new Var('x')))),new Abs(new Var('x'), new App(new Var('f'), new App(new Var('x'), new Var('x'))))));

var alias_times = new Abs(new Var('m'), new Abs(new Var('n'), new Abs(new Var('f'), new App(new Var('m'), new App(new Var('n'), new Var('f'))))));
var succuntyped = new Abs(new Var('n'), new Abs(new Var('f'), new Abs(new Var('x'), new App(new Var('f'), new App(new App(new Var('n'), new Var('f')), new Var('x'))))));
var plusuntyped = new Abs(new Var('m'), new Abs(new Var('n'), new Abs(new Var('f'), new Abs(new Var('x'), new App(new App(new Var('m'), new Var('f')), new App(new App(new Var('n'), new Var('f')), new Var('x')))))));

var uuu = new Abs(new Var('u'), new Var('u'));
var vvv = new Abs(new Var('u'), new Var('x'));
var ggg = new App(new Var('g'), new Var('f'));
var ooo = new Abs(new Var('g'), new Abs(new Var('h'), new App(new Var('h'), ggg)));
var predrest = new App(new App(new App(new Var('n'), ooo), vvv), uuu);

var pred = new Abs(new Var('n'), new Abs(new Var('f'), new Abs(new Var('x'), predrest)));

var iszero = new Abs(new Var('n'), new App(new App(new Var('n'), new Abs(new Var('x'), fals)), alias_true));

/* CONSTANTS */
var pri_false = new Primitive("FALSE", new BaseType("Bool"));
var pri_true  = new Primitive("TRUE", new BaseType("Bool"));
var pri_n     = (n) => new Primitive(n, new BaseType("Int"));

var constant_k_comb = new Primitive("K", null, 2, (x,y) => x);
var constant_s_comb = new Primitive("S", null, 3, (x,y,z) => new App(new App(x, z), new App(y, z)));
var constant_i_comb = new Primitive("I", null, 1, (x) => x);

var constant_times = new Primitive(
    "TIMES",
    new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Int"))),
    2,
    (x,y) => pri_n(parseInt(x.name,10) * parseInt(y.name,10)));

var constant_minus  = new Primitive(
    "MINUS",
    new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Int"))),
    2,
    (x,y) => pri_n(parseInt(x.name, 10) - parseInt(y.name, 10)));

var constant_plus = new Primitive(
    "PLUS",
    new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Int"))),
    2,
    (x,y) => pri_n(parseInt(x.name,10) + parseInt(y.name,10)));

var constant_div = new Primitive(
    "DIV",
    new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Int"))),
    2,
    (x,y) => pri_n(Math.floor(parseInt(x.name,10) / parseInt(y.name,10))));

var constant_eq = new Primitive(
    "EQ",
    new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Bool"))),
    2,
    (x,y) => x.name != y.name ? pri_false : pri_true);

var constant_leq = new Primitive(
    "LEQ",
    new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Bool"))),
    2,
    (x,y) => parseInt(x.name, 10) <= parseInt(y.name, 10) ? pri_true : pri_false);

var constant_not = new Primitive(
    "NOT",
    new FunctionType(new BaseType("Bool"), new BaseType("Bool")),
    1,
    (a) => a.equals(pri_true) ? pri_false : pri_true);

var constant_ite = new Primitive(
    "ITE",
    new FunctionType(new BaseType("Bool"), new FunctionType(new TypeVariable('σ'), new FunctionType(new TypeVariable('σ'), new TypeVariable('σ')))),
    3,
    (a,b,c) => a.equals(pri_true) ? b : c);

var constant_succ = new Primitive(
    "SUCC",
    new FunctionType(new BaseType('Int'), new BaseType('Int')),
    1,
    (x) => pri_n(parseInt(x.name) + 1));

var constant_pred = new Primitive(
    "PRED",
    new FunctionType(new BaseType('Int'), new BaseType('Int')),
    1,
    (x) => pri_n(parseInt(x.name) - 1));

var constant_iszero = new Primitive(
    "ISZERO",
    new FunctionType(new BaseType('Int'), new BaseType('Bool')),
    1,
    (x) => x.equals(pri_n(0)) ? pri_true : pri_false);

var constant_or = new Primitive(
    "OR",
    new FunctionType(new BaseType("Bool"), new FunctionType(new BaseType("Bool"), new BaseType("Bool"))), 
    2,
    (x,y) => x.equals(pri_true) || y.equals(pri_true) ? pri_true : pri_false);

var constant_and = new Primitive(
    "AND",
    new FunctionType(new BaseType("Bool"), new FunctionType(new BaseType("Bool"), new BaseType("Bool"))),
    2,
    (x,y) => x.equals(pri_true) && y.equals(pri_true) ? pri_true : pri_false);

var constant_fix = new Primitive(
    "FIX",
    new FunctionType(new FunctionType(new TypeVariable('σ'), new TypeVariable('σ')), new TypeVariable('σ')),
    1,
    (x) => Evaluator.applyBetaStep(new App(x, new App(constant_fix, x))));

function addUntypedMacros() {
    var a = (x, y) => OLCE.Data.aliases.addAlias(x, y);
    var b = (x)    => OLCE.Data.constants.push(x);

    a("ITE",    ite);
    a("FALSE",  fals);
    a("TRUE",   alias_true);
    a("OR",     Parser.parse("\\yx.(yyx)"));
    a("AND",    Parser.parse("\\yx.(yxy)"));
    a("NOT",    Parser.parse("\\x.(x FALSE TRUE)"));

    a("PLUS",   plusuntyped);
    a("MINUS",  new Abs(new Var('m'), new Abs(new Var('n'), new App(new App(new Var('n'), pred), new Var('m')))));
    a("TIMES",  alias_times);
    a("SUCC",   succuntyped);
    a("PRED",   pred);
    a("DIV",    Parser.parse("(λn.(((λf.((λx.(f (x x))) (λx.(f (x x))))) (λc.(λn.(λm.(λf.(λx.((λd.((((λn.((n (λx.(λx.(λy.y)))) (λx.(λy.x)))) d) (((λf.(λx.x)) f) x)) (f ((((c d) m) f) x)))) (((λm.(λn.((n (λn.(λf.(λx.(((n (λg.(λh.(h (g f))))) (λu.x)) (λu.u)))))) m))) n) m)))))))) ((λn.(λf.(λx.(f ((n f) x))))) n)))"));
    a("Ω",      alias_Omega);
    a("OMEGA",  alias_Omega);
    a("Θ",      Parser.parse("((λx.(λf.(f ((x x) f)))) (λx.(λf.(f ((x x) f)))))"));
    a("THETA",  Parser.parse("((λx.(λf.(f ((x x) f)))) (λx.(λf.(f ((x x) f)))))"));
    a("ISZERO", iszero);
    a("LEQ",    Parser.parse("λm.λn.ISZERO (MINUS m n)"));
    a("EQ",     Parser.parse("(λm.(λn.((AND ((LEQ m) n)) ((LEQ n) m))))"));
    a("Y",      YCOMB);

    a("S", Parser.parse("(λxyz.((xz)(yz)))"));
    a("K", Parser.parse("(λij.i)"));
    a("I", Parser.parse("(λi.i)"));

    b(constant_iszero);
    b(constant_pred);
    b(constant_succ);
    b(constant_times);
    b(constant_plus);
    b(constant_minus);
    b(constant_div);
    b(constant_eq);
    b(constant_leq);

    b(constant_ite);
    b(constant_and);
    b(constant_not);
    b(constant_or);
    b(pri_true);
    b(pri_false);

    b(constant_s_comb);
    b(constant_k_comb);
    b(constant_i_comb);

    b(constant_fix);
}

