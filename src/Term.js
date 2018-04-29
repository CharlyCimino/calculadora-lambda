
class Variable {
    constructor(v) {
        this.vardata = v;
    }

    equals(other) {
        return other instanceof Var && other.vardata === this.vardata;
    }

    copy() {
        return new Var(this.vardata);
    }

    toDisplay() {
        return this.vardata;
    }

    toLatex() {
        var character = this.vardata[0];
        var number    = this.vardata.match(/[a-z]*([0-9]+)/);
        if (Global.aliases.containsTerm(this) && Settings.expandMacros) {
          	return "\\mathrm{" + Global.aliases.getName(this) + "}";
        }
        return number ? character + "_{" + number[1] + "}" : character;
    }

    toHtml(depth = "0") {
        var env = Global.aliases;
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

    isVarFree() {
        return true;
    }

    freeVars() {
        return [this];
    }

    contains(term) {
        return this.equals(term);
    }

    replace(old, newT) {
        if (this.equals(old)) {
            return newT.copy();
        } 
        return this.copy();
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
        dropParens = dropParens && Settings.dropParens;
        var a = this.term1 instanceof App;
        return (dropParens ? "" : "(") + this.term1.toDisplay(a) + " " +
            this.term2.toDisplay(false) + (dropParens ? "" : ")");
    }
	
	toLatex(dropParens = true) {
		dropParens = dropParens && Settings.dropParens;	
		var a = this.term1 instanceof App;
		if (Global.aliases.containsTerm(this) && Settings.expandMacros) {
            var name = Global.aliases.getName(this);
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

    toHtml(depth = "0", originalTerm = this, dropParens = true) {
        var env = Global.aliases;
        var red = (a) => isReductionStrategyRedex(this, originalTerm) ? a : "";

        var childApp = this.term1 instanceof App;
        dropParens = dropParens && Settings.dropParens;

        return (env.containsTerm(this) ? HtmlLiteral.hasAlias : "") +
            red(isDeltaRedex(this) ? "<span class='deltaRedex'>" : "<span class='redex'>") +
            (dropParens ? "" : HtmlLiteral.combine("(", depth)) +
            red(isDeltaRedex(this) ? "" : "<span class='redA'>") +
            this.term1.toHtml(depth + "0", originalTerm, childApp) +
            red(isDeltaRedex(this) ? "" : HtmlLiteral.end) +
            HtmlLiteral.combine(" ", depth) +
            red(isDeltaRedex(this) ? "" : "<span class='redB'>") +
            this.term2.toHtml(depth + "1", originalTerm, false) +
            red(isDeltaRedex(this) ? "" : HtmlLiteral.end) +
            (dropParens ? "" : HtmlLiteral.combine(")", depth)) +
            red(HtmlLiteral.end) +
            (env.containsTerm(this) ? HtmlLiteral.end + HtmlLiteral.isAlias +
            env.getName(this) + HtmlLiteral.end : "");
    }

    isVarFree(variable) {
        return this.term1.isVarFree(variable) &&
               this.term2.isVarFree(variable);
    }

    freeVars() {
        return this.term1.freeVars().concat(this.term2.freeVars());
    }

    contains(term) {
        return this.equals(term) ? true :
               this.term1.contains(term) || this.term2.contains(term);
    }

    replace(old, newT) {
        if (this.equals(old)) {
            return newT.copy();
        }
        return new App(this.term1.replace(old, newT),
                       this.term2.replace(old, newT));
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
        var permission = Settings.dropParens && this.inputType == null;
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
		var permission = Settings.dropParens && this.inputType == null;		
		var kidDropLam = this.term instanceof Abs &&
                         !Global.aliases.containsTerm(this.term) &&
                         this.inputType == null &&
                         permission;
		var dropDot    = kidDropLam;

		dropParens = dropParens && permission;
		dropLambda = dropLambda && permission;

		if (Global.aliases.containsTerm(this) && Settings.expandMacros) {
			return "\\mathrm{" + Global.aliases.getName(this) + "}";
		}
	
		return (dropParens ? "" : "(") + (dropLambda ? "" : "\\lambda ") +
			this.variable.toLatex() +
			(this.inputType !== null ? ":\\mathrm{" + this.inputType.write().replace(/→/g, "\\to") + "}": "") +
			(dropDot ? "" : ".") + this.term.toLatex(true, kidDropLam) +
			(dropParens ? "" : ")");
	}

    toHtml(depth = "0", originalTerm = this, dropParens = true, dropLam = false) {
        var env = Global.aliases;
        var permission = Settings.dropParens;
        var kidDropLam = this.term instanceof Abs &&
                         !env.containsTerm(this.term) &&
                         permission &&
                         this.inputType == null;

        dropParens = dropParens && permission;
        dropLam = dropLam && permission && this.inputType == null;

        return (isReductionStrategyRedex(this, originalTerm) ? "<span class='termLetRedex'>" : "") +
            (env.containsTerm(this) ? HtmlLiteral.hasAlias : "") +
            HtmlLiteral.combine((dropParens ? "" : "(") +
            (dropLam ? "" : "λ"), depth) + this.variable.toHtml(depth) +
            HtmlLiteral.combine(HtmlLiteral.type(this, depth) +
			(kidDropLam ? "" : "."), depth) +
            this.term.toHtml(depth + "1", originalTerm, true, kidDropLam) +
            (dropParens ? "" : HtmlLiteral.combine(")" , depth)) +
            (env.containsTerm(this) ? HtmlLiteral.end +
            HtmlLiteral.isAlias + env.getName(this) +
            HtmlLiteral.end : "") +
            (isReductionStrategyRedex(this, originalTerm) ? HtmlLiteral.end : "");
    }

    isVarFree(variable) {
        if (this.variable.equals(variable)) {
            return false;
        }

        return this.term.isVarFree(variable);
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

    contains(term) {
        return this.equals(term) ? true :   
            this.variable.contains(term) || this.term.contains(term);
    }

	replace(old, newT) {
        if (this.equals(old)) {
            return newT.copy();
        }
        return new Abs(this.variable.replace(old, newT),
                       this.term.replace(old, newT));
    }
}

class Let {
    constructor(v, t1, t2, args = [], r = false) {
        this.variable = v;
        this.term1    = t1;
        this.term2    = t2;
        this.args     = args;
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

        return new Let(v, a, b, [], this.rec);
    }

    toDisplay() {
        return "Let" + (this.rec ? "Rec " : " ") +
            this.variable.toDisplay() + " = " +
            this.term1.toDisplay() + " In " +
            this.term2.toDisplay();
    }

	toLatex() {
		if (Global.aliases.containsTerm(this) && Settings.expandMacros) {
			return "\\mathrm{" + Global.aliases.getName(this) + "}";
		}

		return "\\mathit{Let" + (this.rec ? " Rec}\\;" : "}\\;") +
			this.variable.toLatex() + " = " +
			this.term1.toLatex() + "\\;\\mathit{In}\\;" +
			this.term2.toLatex();
	}

    toHtml(depth = "0", originalTerm = this) {
        var letV = this.rec ? "LetRec " : "Let ";
        var varString = this.variable.toHtml(depth, originalTerm);
        var termNoAbs = this.term1;

        while (termNoAbs instanceof Abs) {
            varString += HtmlLiteral.combine(" ", depth) +
            termNoAbs.variable.toHtml(depth, originalTerm);
            termNoAbs = termNoAbs.term;
        }

        return (isReductionStrategyRedex(this, originalTerm) ?
            "<span class='termLetRedex'>" : "") +
            HtmlLiteral.combine(HtmlLiteral.lets(letV), depth) +
            varString + HtmlLiteral.combine(" = ", depth) +
            termNoAbs.toHtml(depth + "0", originalTerm) +
            HtmlLiteral.combine(HtmlLiteral.lets(" In "), depth) +
            this.term2.toHtml(depth + "1", originalTerm) +
            (isReductionStrategyRedex(this, originalTerm) ? "</span>" : "");
    }

    //let x = M in N ⇒ (λx.N) M
    //let rec x = M in N ⇒ (λx.N) (Y λx.M)
    desugar() { 
        if (this.rec && Settings.discipline == TypeDiscipline.UNTYPED) {
            return new App(new Abs(this.variable, this.term2),
                   new App(YCOMB, new Abs(this.variable, this.term1)));
        } else if (this.rec) {
            return new App(new Abs(this.variable, this.term2),
                   new App(constant_fix, new Abs(this.variable, this.term1)));
        }
        var t = new App(new Abs(this.variable, this.term2), this.term1);
        return t;
    }

    isVarFree(variable) { //implement
        return; 
    }

    freeVars() {//implement
        return;
    }

    contains(term) { //implemetn
        return;
    }

    replace(old, newT) { //implemetn
        return;
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
            this.name === other.name &&
            this.arity === other.arity;
    }

    copy(other) {
        return new Primitive(this.name, this.type, this.arity, this.fn);
    }

    toDisplay() {
        return this.name;
    }

	toLatex() {
		if (Global.aliases.containsTerm(this)) {
			return "\\mathrm{" + Global.aliases.getName(this) + "}";
		}
		return "\\mathit{" + this.name + "}";
	}

    toHtml(depth = "0", originalTerm = this) {
        var env = Global.aliases;
        var s = HtmlLiteral.combine(HtmlLiteral.primitive +
            this.name + HtmlLiteral.end, depth);

        return (env.containsTerm(this) ?
                HtmlLiteral.hasAlias : "") + s +
            (env.containsTerm(this) ? HtmlLiteral.end +
                HtmlLiteral.isAlias + env.getName(this) +
                HtmlLiteral.end : "");
    }

    isVarFree(variable) {
        return true;
    }

    freeVars() {
        return [];
    }

    contains(term) {
        return this.equals(term);
    }

	replace(old, newT) {
	    return old.equals(this) ? newT : old;	
	}
}

var Var = Variable;
var App = Application;
var Abs = Abstraction;
var Con = Primitive;

function forAllDescendants(fn, term) {
    var forAll = (nextTerm) => forAllDescendants(fn, nextTerm);

    if (term instanceof Variable) {
        fn(term);
    } else if (term instanceof Application) {
        fn(term);
        forAll(term.term1);
        forAll(term.term2);
    } else if (term instanceof Abstraction) {
        fn(term);
        forAll(term.variable);
        forAll(term.term);
    } else if (term instanceof Primitive) {
        fn(term);
    }
}

var HtmlLiteral = {
    lets: (m) => "<span class='lets'>" + m + "</span>",
    end: "</span>",
    isAlias: "<span class='isAlias'>",
    hasAlias: "<span class='hasAlias'>",
    primitive: "<span class='primitive'>",
    deltaRedex: "<span class='deltaRedex'>",
    combine: (mid, dep) => HtmlLiteral.start(dep) + mid + "</span>",
    start: (depth) => "<span onmouseover='highlight(this)' " +
        "onmouseleave='highlight(this, false)' " +
        "onclick='clickReduce(this)' class='" + depth + "'>",
    type: (t, depth) => t.inputType != null ? "<span class='" + depth +
        " type'>:" + t.inputType.write() + HtmlLiteral.end : "",
    deltaRedexWrapper: (condition, text) => condition ?
        HtmlLiteral.deltaRedex + text + HtmlLiteral.end : text,
};
