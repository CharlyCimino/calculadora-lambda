var w = new Abs(new Var('x'), new Abs(new Var('x'), new Var('x'), new BaseType("Int")), new BaseType("Bool"));
var term = new Application(new Abstraction(new Variable('x'),
                                           new Variable('x')),
                           new Variable('y'));
var ite = new Abs(new Var('x'),
                  new Abs(new Var('y'),
                          new Abs(new Var('z'),
                                  new App(new App(new Var('x'),
                                                  new Var('y')),
                                          new Var('z')))));
var tru = new Abs(new Var('x'), new Abs(new Var('y'), new Var('x')));
var fals = new Abs(new Var('x'), new Abs(new Var('y'), new Var('y')));
var itefals = new App(ite, fals);
var sapp = new App(new Var('a'), new Var('b'));
var a = new Var('a');
var b = new Var('b');
var simpleRedex  = new App(new Abs(new Var('f'), new Var('f')), new Var('a'));
var simpleRedex2 = new App(new Abs(new Var('f'), new Var('f')), simpleRedex.copy());
var simpleRedex3 = new App(new Abs(new Var('f'), new Var('f')), simpleRedex2.copy());
var simpleRedex4 = new App(new Abs(new Var('f'), new Var('f')), simpleRedex3.copy());
var comb = new Abs(new Var('w'), new App(new App(new Var('w'), new Var('w')), new Var('w')));
var classTrick = new App(new Abs(new Var('x'), new Var('z')), new App(comb, comb));
var om1 = new Abs(new Var('x'), new App(new Var('x'), new Var('x')));
var Omega = new App(om1, om1.copy());

//ycomb is used in Term::Let
var YCOMB = new Abs(new Var('f'), new App(new Abs(new Var('x'), new App(new Var('f'), new App(new Var('x'), new Var('x')))),new Abs(new Var('x'), new App(new Var('f'), new App(new Var('x'), new Var('x'))))));


var someType = new FunctionType(new BaseType('Bool'), new FunctionType(new BaseType('Bool'), new BaseType('Int')));
var smi = new App(new Abs(new Var('x'), new Var('x'), new BaseType("Int")), new Primitive(12, new BaseType('Int')));
var simplyt = new App(new Abs(new Var('x'), new Var('y'), someType), new Var('x'));

var nattype = new BaseType("Int");

var zero = new Abs(new Var('f'), new Abs(new Var('x'), new Var('x')));

var multuntyped = new Abs(new Var('m'), new Abs(new Var('n'), new Abs(new Var('f'), new App(new Var('m'), new App(new Var('n'), new Var('f'))))));
var succuntyped = new Abs(new Var('n'), new Abs(new Var('f'), new Abs(new Var('x'), new App(new Var('f'), new App(new App(new Var('n'), new Var('f')), new Var('x'))))));
var plusuntyped = new Abs(new Var('m'), new Abs(new Var('n'), new Abs(new Var('f'), new Abs(new Var('x'), new App(new App(new Var('m'), new Var('f')), new App(new App(new Var('n'), new Var('f')), new Var('x')))))));

var uuu = new Abs(new Var('u'), new Var('u'));
var vvv = new Abs(new Var('u'), new Var('x'));
var ggg = new App(new Var('g'), new Var('f'));
var ooo = new Abs(new Var('g'), new Abs(new Var('h'), new App(new Var('h'), ggg)));
var predrest = new App(new App(new App(new Var('n'), ooo), vvv), uuu);

var pred = new Abs(new Var('n'), new Abs(new Var('f'), new Abs(new Var('x'), predrest)));

var iszero = new Abs(new Var('n'), new App(new App(new Var('n'), new Abs(new Var('x'), fals)), tru));

var primitive4 = new Primitive("4", new BaseType("Int"));
var primitive2 = new Primitive("2", new BaseType("Int"));

var id = new Abs(new Var('x'), new Var('x'));
var redexample = new App(id.copy(), new App(id.copy(), new Abs(new Var('z'), new App(id.copy(), new Var('z')))));

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
var pri_times = (a,b) => new App(new App(constant_times, a), b);

var constant_minus  = new Primitive(
    "MINUS",
    new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Int"))),
    2,
    (x,y) => pri_n(parseInt(x.name,10) - parseInt(y.name,10)));
var pri_minus = (a,b) => new App(new App(constant_minus, a), b);

var constant_plus = new Primitive(
    "PLUS",
    new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Int"))),
    2,
    (x,y) => pri_n(parseInt(x.name,10) + parseInt(y.name,10)));
var pri_plus = (a,b) => new App(new App(constant_plus, a), b);

var constant_div = new Primitive(
    "DIV",
    new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Int"))),
    2,
    (x,y) => pri_n(Math.floor(parseInt(x.name,10) / parseInt(y.name,10))));
var pri_div = (a,b) => new App(new App(constant_div, a), b);

var constant_eq = new Primitive(
    "EQ",
    new FunctionType(new BaseType("Int"), new FunctionType(new BaseType("Int"), new BaseType("Bool"))),
    2,
    (x,y) => x.name != y.name ? pri_false : pri_true);
var pri_eq  = (a,b) => new App(new App(constant_eq, a), b);

var constant_ite = new Primitive(
    "ITE",
    new FunctionType(new BaseType("Bool"), new FunctionType(new TypeVariable('a1'), new FunctionType(new TypeVariable('a1'), new TypeVariable('a1')))),
    3,
    (a,b,c) => a.equals(pri_true) ? new App(new App(tru, b), c) : new App(new App(fals, b), c));
var pri_ite = (a,b,c) => new App(new App(new App(constant_ite, a), b), c);

var constant_succ = new Primitive(
    "SUCC",
    new FunctionType(new BaseType('Int'), new BaseType('Int')),
    1,
    (x) => pri_n(parseInt(x.name) + 1));
var pri_succ = a => new App(constant_succ, a);

var constant_pred = new Primitive(
    "PRED",
    new FunctionType(new BaseType('Int'), new BaseType('Int')),
    1,
    (x) => pri_n(parseInt(x.name) - 1));
var pri_pred = a => new App(constant_pred, a);

var constant_or = new Primitive(
    "OR",
    new FunctionType(new BaseType("Bool"), new FunctionType(new BaseType("Bool"), new BaseType("Bool"))), 
    2,
    (x,y) => x.equals(pri_true) || y.equals(pri_true) ? pri_true : pri_false);
var pri_or   = (a,b) => new App(new App(constant_or, a), b);

var constant_and = new Primitive(
    "AND",
    new FunctionType(new BaseType("Bool"), new FunctionType(new BaseType("Bool"), new BaseType("Bool"))),
    2,
    (x,y) => x.equals(pri_true) && y.equals(pri_true) ? pri_true : pri_false);
var pri_and = (a,b) => new App(new App(constant_and, a), b);

var constant_fix = new Primitive(
    "FIX",
    new FunctionType(new FunctionType(new TypeVariable('f1'), new TypeVariable('f1')), new TypeVariable('f1')),
    1,
    (x) => applyBetaStep(new App(x, new App(constant_fix, x))));

var pri_fib = (n) => new Let(new Var('f'), pri_ite(pri_or(pri_eq(new Var('x'), pri_n(1)), pri_eq(new Var('x'), pri_n(0))), new Var('x'), pri_plus(new App(new Var('f'), pri_minus(new Var('x'), pri_n(1))), new App(new Var('f'), pri_minus(new Var('x'), pri_n(2))))), new App(new Var('f'), pri_n(n)), [new Var('x')], true);

var megaplus = new Primitive("FOUR_PLUS",
                                  new FunctionType(new BaseType("Int"),
                                                   new FunctionType(new BaseType("Int"),
                                                                    new FunctionType(new BaseType("Int"),
                                                                                     new FunctionType(new BaseType("Int"),
                                                                                                      new BaseType("Int"))))),
                                  4,
                                  (x,y,z,t) => new Primitive(parseInt(z.name,10) + parseInt(t.name,10) + parseInt(x.name,10) + parseInt(y.name,10), new BaseType("Int")),
                                  primitive4,
                                  primitive2,
                                  primitive4,
                                  primitive2
                                 );
var G = new Abs(new Var('f'), new Abs(new Var('n'), new App(new App(new App(ite, new App(iszero, new Var('n'))), toNumeral(1)), new App(new App(multuntyped    , new Var('n')), new App(new Var('f'), new App(pred, new Var('n')))))));
var special = new App(itefals, primitive2);
var pri_g = new Abs(new Var('f'), new Abs(new Var('n'), pri_ite(pri_eq(new Var('n'), pri_n(0)), pri_n(1), pri_times(new Var('n'), new App(new Var('f'), pri_pred(new Var('n')))))));
var fib7 = new Let(new Var('f'),new App(new App(new App(ite, new App(iszero, new Var('x'))), toNumeral(0)), new App(new App(new App(ite, new App(iszero, new App(pred, new Var('x')))), toNumeral(1)), new App(new App(plusuntyped, new App(new Var('f'), new App(pred, new Var('x')))), new App(new Var('f'), new App(pred, new App(pred, new Var('x') )))))), new App(new Var('f'), toNumeral(7)) ,[new Var('x')], true);

var lets = new Let(new Var('x'), ite, new App(new Var('x'), fals));

function addUntypedMacros() {
    var a = (x, y) => Global.aliases.addAlias(x, y);
    var b = (x) => Global.constants.push(x);

     a("ITE",      ite);
     a("FALSE",    fals);
     a("TRUE",     tru);
     a("OR",       parse("\\yx.(yyx)"));
     a("AND",      parse("\\yx.(yxy)"));

     a("PLUS",     plusuntyped);
     a("MINUS",    new Abs(new Var('m'), new Abs(new Var('n'), new App(new App(new Var('n'), pred), new Var('m')))));
     a("TIMES",    multuntyped);
     a("SUCC",     succuntyped);
     a("PRED",     pred);
     a("Ω",        Omega);
     a("OMEGA",    Omega);
     a("Θ",        parse("((λx.(λf.(f ((x x) f)))) (λx.(λf.(f ((x x) f)))))"));
     a("THETA",    parse("((λx.(λf.(f ((x x) f)))) (λx.(λf.(f ((x x) f)))))"));
     a("ISZERO",   iszero);
     a("Y",        YCOMB);
     a("FACT",     G);


     b(constant_pred);
     b(constant_succ);
     b(constant_times);
     b(constant_plus);
     b(constant_minus);
     b(constant_div);
     b(constant_eq);

     b(constant_ite);
     b(constant_and);
     b(constant_or);
     b(pri_true);
     b(pri_false);

     b(constant_s_comb);
     b(constant_k_comb);
     b(constant_i_comb);

     b(constant_fix);
}

