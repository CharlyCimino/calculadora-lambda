
class Variable {
    constructor(v) {
        this.vardata = v;
    }

    /* returns true iff other term is syntactically identical*/
    equals(other) {
        return other instanceof Var && other.vardata === this.vardata;
    }

    /* returns indentical term */
    copy() {
        return new Var(this.vardata);
    }

    /* returns Term as string, uses user display settins */
    toDisplay() {
        return this.vardata;
    }

    /* returns Term as latex source, uses user display settings */
    toLatex() {
        var character = this.vardata[0];
        var number    = this.vardata.match(/[a-z]*([0-9]+)/);
        if (OLCE.Data.aliases.containsTerm(this) && OLCE.Settings.expandMacros) {
          	return "\\mathrm{" + OLCE.Data.aliases.getName(this) + "}";
        }
        return number ? character + "_{" + number[1] + "}" : character;
    }

    /* returns Term as HTML source, uses user display settings */
    toHtml(depth = "0.") {
        var env = OLCE.Data.aliases;
        var stringPart = this.vardata[0];
        var numPart;
        var variable;

		if (numPart = this.vardata.match(/[a-z]*([0-9]+)/)) {
			numPart = numPart[1];
		} else {
			numPart = "";
		}
        variable = stringPart + "<sub>" + numPart + "</sub>";
        return (env.containsTerm(this) ? HtmlLiteral.hasAlias : "") +
            HtmlLiteral.combine(variable, depth) +
            (env.containsTerm(this) ? HtmlLiteral.end +
            HtmlLiteral.isAlias + env.getName(this) +
            HtmlLiteral.end : "");
    }

    /* Variable specific -- increments: x-> x_1, x_n -> x_(n+1) */
    increment() {
        var stringPart = this.vardata[0];
        var numPart;
		if (numPart = this.vardata.match(/[a-z]*([0-9]+)/)) {
			numPart = numPart[1];
		} else {
			numPart = "0";
		}
        this.vardata = stringPart + (parseInt(numPart, 10) + 1);
        return this;
    }

    /* returns an array of free variables of a Term */
    freeVars() {
        return [this];
    }

    /* returns a sub-term based on a string encoding */
    fromCode(code, returnRedex = false, redex = null, original = this) {
        return returnRedex ? redex : null;
    }

    /* applies a function to every subterm (pre-order) */
    apply(fn) {
        fn(this);   
    }
}

class Application {
    constructor(t1, t2) {
        this.term1 = t1;
        this.term2 = t2;
    }

    equals(other) {
        return other instanceof App &&
            this.term1.equals(other.term1) &&
            this.term2.equals(other.term2);
    }

    copy() {
        return new App(this.term1.copy(), this.term2.copy());
    }

    toDisplay(dropParens = true) {
        dropParens = dropParens && OLCE.Settings.dropParens;
        var a = this.term1 instanceof App;
        return (dropParens ? "" : "(") + this.term1.toDisplay(a) + " " +
            this.term2.toDisplay(false) + (dropParens ? "" : ")");
    }

	toLatex(dropParens = true) {
		dropParens = dropParens && OLCE.Settings.dropParens;
		var a = this.term1 instanceof App;
		if (OLCE.Data.aliases.containsTerm(this) && OLCE.Settings.expandMacros) {
            var name = OLCE.Data.aliases.getName(this);
            if (name == "Ω") {
                return "\\Omega";
            } else if (name == "Θ") {
                return "\\Theta";
            }
			return "\\mathrm{" + name + "}";
		}
		return (dropParens ? "" : "(") + this.term1.toLatex(a) + "\\;" +
			this.term2.toLatex(false) + (dropParens ? "" : ")");
	}

    toHtml(depth = "0.", originalTerm = this, dropParens = true) {
        var env = OLCE.Data.aliases;
        var red = (a) => Evaluator.isRedex.byStrategy(this, originalTerm) ? a : "";

        var childApp = this.term1 instanceof App;
        dropParens = dropParens && OLCE.Settings.dropParens;

        return (env.containsTerm(this) ? HtmlLiteral.hasAlias : "") +
            red(Evaluator.isRedex.delta(this) ? "<span class='deltaRedex'>" :
                                     "<span class='redex'>") +
            (dropParens ? "" : HtmlLiteral.combine("(", depth)) +
            red(Evaluator.isRedex.delta(this) ? "" : "<span class='redA'>") +
            this.term1.toHtml(depth + "0", originalTerm, childApp) +
            red(Evaluator.isRedex.delta(this) ? "" : HtmlLiteral.end) +
            HtmlLiteral.combine(" ", depth) +
            red(Evaluator.isRedex.delta(this) ? "" : "<span class='redB'>") +
            this.term2.toHtml(depth + "1", originalTerm, false) +
            red(Evaluator.isRedex.delta(this) ? "" : HtmlLiteral.end) +
            (dropParens ? "" : HtmlLiteral.combine(")", depth)) +
            red(HtmlLiteral.end) +
            (env.containsTerm(this) ? HtmlLiteral.end + HtmlLiteral.isAlias +
            env.getName(this) + HtmlLiteral.end : "");
    }

    freeVars() {
        return this.term1.freeVars().concat(this.term2.freeVars());
    }

    fromCode(code, returnRedex = false, redex = null, original = this) {
        redex = Evaluator.isRedex.byStrategy(this, original) ? this : redex;
        if (code == "") {
            return returnRedex ? redex : this;
        } 
        return code[0] == "0" ?
            this.term1.fromCode(code.substr(1), returnRedex, redex, original) :
            this.term2.fromCode(code.substr(1), returnRedex, redex, original);
    }

    apply(fn) {
        fn(this);
        this.term1.apply(fn);
        this.term2.apply(fn);
    }
}

class Abstraction {
    constructor(v, t, type = null) {
        this.variable  = v;
        this.term      = t;
        this.inputType = type;
    }

    equals(other) {
        return other instanceof Abs &&
            this.variable.equals(other.variable) &&
            this.term.equals(other.term) &&
          ((this.inputType == null && other.inputType == null) ||
           (this.inputType != null && this.inputType.equals(other.inputType)));
    }

    copy() {
        return new Abs(this.variable.copy(), this.term.copy(), this.inputType);
    }

    toDisplay(dropParens = true, dropLambda = false) {
        var permission = OLCE.Settings.dropParens && this.inputType == null;
        var kidDropLam = this.term instanceof Abs && permission;
        var dropDot = kidDropLam;

        dropParens = dropParens && permission;
        dropLambda = dropLambda && permission;

        return (dropParens ? "" : "(") + (dropLambda ? "" : "λ") +
            this.variable.toDisplay() +
            (this.inputType !== null ? ":" + this.inputType.write() : "") +
            (dropDot ? "" : ".") + this.term.toDisplay(true, kidDropLam) +
            (dropParens ? "" : ")");
    }

	toLatex(dropParens = true, dropLambda = false) {
		var permission = OLCE.Settings.dropParens && this.inputType == null;
		var kidDropLam = this.term instanceof Abs &&
                         !OLCE.Data.aliases.containsTerm(this.term) &&
                         this.inputType == null &&
                         permission;
		var dropDot    = kidDropLam;

		dropParens = dropParens && permission;
		dropLambda = dropLambda && permission;

		if (OLCE.Data.aliases.containsTerm(this) && OLCE.Settings.expandMacros) {
			return "\\mathrm{" + OLCE.Data.aliases.getName(this) + "}";
		}

		return (dropParens ? "" : "(") + (dropLambda ? "" : "\\lambda ") +
			this.variable.toLatex() +
			(this.inputType !== null ? "{:}\\text{\\small$\\mathrm{" +
                this.inputType.write().replace(/→/g, "\\to") + "}$}": "") +
			(dropDot ? "" : ".") + this.term.toLatex(true, kidDropLam) +
			(dropParens ? "" : ")");
	}

    toHtml(depth = "0.", originalTerm = this, dropParens = true, dropLam = false) {
        var env = OLCE.Data.aliases;
        var permission = OLCE.Settings.dropParens;
        var kidDropLam = this.term instanceof Abs &&
                         !env.containsTerm(this.term) &&
                         permission &&
                         this.inputType == null;

        dropParens = dropParens && permission;
        dropLam = dropLam && permission && this.inputType == null;

        return (Evaluator.isRedex.byStrategy(this, originalTerm) ? "<span class='termLetRedex'>" : "") +
            (env.containsTerm(this) ? HtmlLiteral.hasAlias : "") +
            HtmlLiteral.combine((dropParens ? "" : "(") +
            (dropLam ? "" : "λ"), depth) + this.variable.toHtml(depth + "0") +
            HtmlLiteral.combine(HtmlLiteral.type(this.inputType, depth) + (kidDropLam ? "" : "."), depth) +
            this.term.toHtml(depth + "1", originalTerm, true, kidDropLam) +
            (dropParens ? "" : HtmlLiteral.combine(")" , depth)) +
            (env.containsTerm(this) ? HtmlLiteral.end +
            HtmlLiteral.isAlias + env.getName(this) +
            HtmlLiteral.end : "") +
            (Evaluator.isRedex.byStrategy(this, originalTerm) ? HtmlLiteral.end : "");
    }

    freeVars() {
        var arr = this.term.freeVars();
        var result = [];
        for (var i = 0; i < arr.length; i++) {
            if (!arr[i].equals(this.variable)) {
                result = result.concat(arr[i]);
            }
        }
        return result;
    }

    fromCode(code, returnRedex = false, redex = null, original = this) {
        redex = Evaluator.isRedex.byStrategy(this, original) ? this : redex;
        if (code == "") {
            return returnRedex ? redex : this;
        }
        return code[0] == "0" ?
            this.variable.fromCode(code.substr(1), returnRedex, redex, original) :
            this.term.fromCode(code.substr(1), returnRedex, redex, original);
    }

    apply(fn) {
        fn(this);  
        this.variable.apply(fn);
        this.term.apply(fn);
    }
}

class Let {
    constructor(v, t1, t2, type = null, r = false) {
        this.variable = v;
        this.term1    = t1;
        this.term2    = t2;
        this.type     = type;
        this.rec      = r;
    }

    equals(other) {
        return other instanceof Let &&
            this.variable.equals(other.variable) &&
            this.term1.equals(other.term1) &&
            this.term2.equals(other.term2) &&
            this.rec === other.rec;
    }

    copy() {
        var v = this.variable.copy();
        var a = this.term1.copy();
        var b = this.term2.copy();

        return new Let(v, a, b, this.type.copy(), this.rec);
    }

    toDisplay() {
        var type = "";
        if (this.type != null) {
            type = ":" + this.type.write();
        }
        return "Let" + (this.rec ? "Rec " : " ") +
            this.variable.toDisplay() + type + " = " +
            this.term1.toDisplay() + " In " +
            this.term2.toDisplay();
    }

	toLatex() {
		if (OLCE.Data.aliases.containsTerm(this) && OLCE.Settings.expandMacros) {
			return "\\mathrm{" + OLCE.Data.aliases.getName(this) + "}";
		}
        var type = "";
        if (this.type != null) {
            type = ":\\mathrm{" + this.type.write().replace(/→/g, "\\to") + "}";
        }
		return "\\mathit{Let" + (this.rec ? " Rec}\\;" : "}\\;") +
			this.variable.toLatex() + type + " = " +
			this.term1.toLatex() + "\\;\\mathit{In}\\;" +
			this.term2.toLatex();
	}

    toHtml(depth = "0.", originalTerm = this) {
        var letV = this.rec ? "LetRec " : "Let ";
        var varString = this.variable.toHtml(depth, originalTerm);
        var termNoAbs = this.term1;
		var type = this.type != null ?
            HtmlLiteral.combine(HtmlLiteral.type(this.type, depth), depth) : "";

        while (termNoAbs instanceof Abs &&
                OLCE.Settings.discipline != TypeDiscipline.SIMPLY_TYPED) {
            varString += HtmlLiteral.combine(" ", depth) +
            termNoAbs.variable.toHtml(depth, originalTerm);
            termNoAbs = termNoAbs.term;
        }

        return (Evaluator.isRedex.byStrategy(this, originalTerm) ?
            "<span class='termLetRedex'>" : "") +
            HtmlLiteral.combine(HtmlLiteral.lets(letV), depth) +
            varString + type + HtmlLiteral.combine(" = ", depth) +
            termNoAbs.toHtml(depth + "0", originalTerm) +
            HtmlLiteral.combine(HtmlLiteral.lets(" In "), depth) +
            this.term2.toHtml(depth + "1", originalTerm) +
            (Evaluator.isRedex.byStrategy(this, originalTerm) ? "</span>" : "");
    }

    desugar() {
        if (this.rec && OLCE.Settings.discipline == TypeDiscipline.UNTYPED) {
            return new App(new Abs(this.variable, this.term2),
                   new App(OLCE.Data.aliases.getTerm("Y"),
                   new Abs(this.variable, this.term1)));
        }
        if (this.rec && OLCE.Settings.discipline) {
            return new Let(this.variable,
                           new App(Constant.constant_fix,
                                   new Abs(this.variable, this.term1, this.type)),
                           this.term2, null, false);
        }
        return this.desugarOnly();
    }

    desugarOnly() {
        return new App(new Abs(this.variable, this.term2), this.term1);
    }

    freeVars() {
        return this.desugarOnly().freeVars();
    }

    fromCode(code, returnRedex = false, redex = null, original = this) {
        redex = Evaluator.isRedex.byStrategy(this, original) ? this : redex;
        if (code == "") {
            return returnRedex ? redex : this;  
        }
        return code[0] == "0" ?
            this.term1.fromCode(code.substr(1), returnRedex, redex, original) :
            this.term2.fromCode(code.substr(1), returnRedex, redex, original);
    }

    apply(fn) {
        fn(this);
        this.variable.apply(fn);
        this.term1.apply(fn);
        this.term2.apply(fn);
    }

    /*desugar inverse function, useful for substitution*/
    static toLet(redex, type = null, rec = false) {
        if (!rec) {
            return new Let(redex.term1.variable.copy(),
                       redex.term2.copy(), redex.term1.term, type, rec);
        }
    }
}

class Primitive {
    constructor(name, type, arity = 0, fn = null) {
        this.type     = type;
        this.name     = name;
        this.arity    = arity;
        this.fn       = fn;
    }

    equals(other) {
        return other instanceof Primitive &&
            this.name == other.name &&
            this.arity === other.arity;
    }

    copy(other) {
        return new Primitive(this.name, this.type, this.arity, this.fn);
    }

    toDisplay() {
        return this.name;
    }

	toLatex() {
		if (OLCE.Data.aliases.containsTerm(this)) {
			return "\\mathrm{" + OLCE.Data.aliases.getName(this) + "}";
		}
		return "\\mathit{" + this.name + "}";
	}

    toHtml(depth = "0.", originalTerm = this) {
        var env = OLCE.Data.aliases;
        var s = HtmlLiteral.combine(HtmlLiteral.primitive +
            this.name + HtmlLiteral.end, depth);

        return (env.containsTerm(this) ?
                HtmlLiteral.hasAlias : "") + s +
            (env.containsTerm(this) ? HtmlLiteral.end +
                HtmlLiteral.isAlias + env.getName(this) +
                HtmlLiteral.end : "");
    }

    freeVars() {
        return [];
    }

    fromCode(code, returnRedex = false, redex = null, original = this) {
        redex = Evaluator.isRedex.byStrategy(this, original) ? this : redex;
        if (code == "") {
            return returnRedex ? redex : this;
        }
        return null;
    }

    apply(fn) {
        fn(this);
    }
}

/*shortcuts*/
let Var = Variable;
let App = Application;
let Abs = Abstraction;
let Con = Primitive;

/*common HTML elements*/
const HtmlLiteral = {
    lets: (m) => "<span class='lets'>" + m + "</span>",
    end: "</span>",
    isAlias: "<span class='isAlias'>",
    hasAlias: "<span class='hasAlias'>",
    primitive: "<span class='primitive'>",
    deltaRedex: "<span class='deltaRedex'>",
    combine: (mid, dep) => HtmlLiteral.start(dep) + mid + "</span>",
    start: (depth) => "<span onmouseover='OLCE.UI.highlight(this)' " +
        "onmouseleave='OLCE.UI.highlight(this, false)' " +
        "onclick='OLCE.UI.clickReduce(\"" + depth + "\")'>",
    type: (t, depth) => t != null ? "<span class='type'>:" +
        t.write() + HtmlLiteral.end : "",
    deltaRedexWrapper: (condition, text) => condition ?
        HtmlLiteral.deltaRedex + text + HtmlLiteral.end : text,
};
