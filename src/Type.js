
const TypeDiscipline = {
    UNTYPED        : 'Untyped',
    SIMPLY_TYPED   : 'Simply typed',
    HINDLEY_MILNER : 'Hindley-Milner',
    toName         : (x) => {
        switch (x) {
        case TypeDiscipline.UNTYPED :       return 'UNTYPED';
        case TypeDiscipline.SIMPLY_TYPED:   return 'SIMPLY_TYPED';
        case TypeDiscipline.HINDLEY_MILNER: return 'HINDLEY_MILNER'; }},
};

class FunctionType {
    constructor(from, to) {
        this.from = from;
        this.to   = to;
    }

    write(dropParens = true) {
        dropParens = dropParens && OLCE.Settings.dropParens;
        return (dropParens ? "" : "(") +
            this.from.write(false) + " → " +
            this.to.write() + (dropParens ? "" : ")");
    }

    equals(other) {
        return other instanceof FunctionType &&
            this.from.equals(other.from) &&
            this.to.equals(other.to);
    }

    freeTypeVariables() {
        var everything = this.from.freeTypeVariables()
                             .concat(this.to.freeTypeVariables());
        var result = [];
        
        for (var i = 0; i < everything.length; i++) {
            var index = i;
            for (var j = 0; j < everything.length; j++) {
                if (everything[j].equals(everything[i]) && j == i) {
                    result.push(everything[i]);
                }
            }
        }

        return result;
    }

    applySubstution(sub) {
        return sub ? new FunctionType(this.from.applySubstution(sub),
                                      this.to.applySubstution(sub)) : null;
    }

    copy() {
        return new FunctionType(this.from.copy(), this.to.copy());
    }
}

class BaseType {
    constructor(type) {
        this.type = type;
    }

    write() {
        return this.type;
    }

    equals(other) {
        return other instanceof BaseType &&
            this.type === other.type;
    }

    freeTypeVariables() {
        return [];
    }

    applySubstution(sub) {
        return this;
    }

    copy() {
        return new BaseType(this.type);
    }
}

class TypeVariable {
    constructor(v) {
        this.vardata = v;
    }

    write() {
        return this.vardata;
    }

    equals(other) {
        return other instanceof TypeVariable &&
            this.vardata === other.vardata;
    }

    increment() {
        if (this.vardata.length == 1 && this.vardata != 'z') {
            this.vardata = String.fromCharCode(this.vardata.charCodeAt(0) + 1);
        } else {
            if (this.vardata.length === 1) {
                this.vardata = 't';
            }
            this.vardata = new Variable(this.vardata).increment().vardata;
        }
    }

    copy() {
        return new TypeVariable(this.vardata);
    }

    freeTypeVariables() {
        return [this];
    }

    applySubstution(sub) {
        if (!sub) {
            return null;
        }

        for (var i = 0; i < sub.assignments.length; i++) {
            if (sub.assignments[i].term.equals(this)) {
                return sub.assignments[i].type;
            }
        }
        return this;
    }
}

class Polytype {
    constructor(variables, type) {
        this.variables = variables; 
        this.type = type;
    }

    copy() {
        var vars = [];
        for (var i = 0; i < this.variables.length; i++) {
            vars.push(this.variables[i].copy());  
        }
        return new Polytype(vars, this.type.copy());
    }

    freeTypeVariables() {
        var all = this.type.freeTypeVariables();
        var result = [];
        for (var i = 0; i < all.length; i++) {
            var isBound = false;
            for (var j = 0; !isBound && j < this.variables.length; j++) {
                if (all[i].equals(this.variables[j])) {
                    isBound = true;
                }
            }
            if (!isBound) {
                result.push(all[i]);
            }
        }
        return result;
    }

    applySubstution(sub) {
        var resultType = this.type;
        var localSub = new TypeEnvironment();
        for (var i = 0; i < sub.assignments.length; i++) {
            var contains = false;
            for (var j = 0; j < this.variables.length && !contains; j++) {
                if (sub.assignments[i].term.equals(this.variables[j])) {
                    contains = true;  
                }
            }
            if (!contains) {
                localSub.assignments = [new SimpleTypeAssignment(
                                            sub.assignments[i].term,
                                            sub.assignments[i].type)];
                resultType = resultType.applySubstution(localSub);
            }
        }
        return new Polytype(this.variables, resultType);
    }

    equals(other) { // also check variables
        return other instanceof Polytype &&
            other.type.equals(type) &&
            this.variables.length == other.variables.length;
    }

    write() {
        var s = "∀";
        for (var i = 0; i < this.variables.length; i++) {
            s += this.variables[i].write();
        }
        s += ".";
        return s + this.type.write();
    }

    instantiate(instantiationVariable) {
        var typeVar = instantiationVariable;
        var sub = new TypeEnvironment();
        for (var i = 0; i < this.variables.length; i++) {
            sub.assignments
               .push(new SimpleTypeAssignment(this.variables[i], typeVar));
            typeVar.increment();
        }
        return this.type.applySubstution(sub);
    }
}

class SimpleTypeAssignment {
    constructor(term, type) {
        this.term = term;
        this.type = type;
    }
}

class TypeEnvironment {
    constructor(a = []) {
        this.assignments = a;
    }

    addAssignment(sta) {
        for (var i = 0; i < this.assignments.length; i++) {
            if (this.assignments[i].term.equals(sta.term)) {
                this.assignments[i] = sta;
                return;
            }
        }
        this.assignments.push(sta);
    }

    getTermType(term) {
        for (var i = 0; i < this.assignments.length; i++) {
            if (this.assignments[i].term.equals(term)) {
                return this.assignments[i].type;
            }
        }

        return null;
    }
    
    removeTerm(term) {
        var result = new TypeEnvironment();
        for (var i = 0; i < this.assignments.length; i++) {
            if (!this.assignments[i].term.equals(term)) {
                result.assignments.push(this.assignments[i]);
            }
        }
        return result;
    }

    freeTypeVariables() {
        var result = []; 
        for (var i = 0; i < this.assignments.length; i++) {
            result.concat(this.assignments[i].type.freeTypeVariables());
        }
        return result;
    }

    applySubstution(sub) {
        var result = new TypeEnvironment();

        for (var i = 0; i < this.assignments.length; i++) {
            result.assignments.push(
                new SimpleTypeAssignment(this.assignments[i].term,
                    this.assignments[i].type.applySubstution(sub)));
        }
        return result;
    }

    generalize(type) {
        var variables = type.freeTypeVariables();
        var thisVars = this.freeTypeVariables();
        var resultVars = [];

        for (var i = 0; i < variables.length; i++) {
            var contains = false;
            for (var j = 0; !contains && j < thisVars.length; j++) {
                contains = variables[i].equals(thisVars[j]);
            }
            if (!contains) {
                var alreadyInRes = false;
                for (var q = 0; !alreadyInRes && q < resultVars.length; q++) {
                    if (resultVars[q].equals(variables[i])) {
                        alreadyInRes = true;
                    }    
                }
                if (!alreadyInRes) {
                    resultVars.push(variables[i]);
                }
            }
        }

        return new Polytype(resultVars, type);
    }

    copy() {
        var result = new TypeEnvironment();
        for (var i = 0; i < this.assignments.length; i++) {
            result.assignments.push(new SimpleTypeAssignment(
                this.assignments[i].term.copy(),
                this.assignments[i].type.copy(),
            ));
        }
        return result;
    }

    compose(another) {
        var result = another.applySubstution(this);
        for (var i = 0; i < this.assignments.length; i++) {
            result.assignments.push(this.assignments[i]);
        }
        return result;
    }
}

function getSimpleType(term, env = new TypeEnvironment()) { //fix ite typing
    var rec = (t) => getSimpleType(t, env);
    if (term instanceof Abs) {
        env.addAssignment(
            new SimpleTypeAssignment(term.variable, term.inputType));
        var nt = rec(term.term);
        return nt ? new FunctionType(term.inputType, nt) : null;
    }
    if (term instanceof App) {
        var t1 = rec(term.term1);
        var t2 = rec(term.term2);

        if (t1 instanceof FunctionType && t1.from.equals(t2)) {
            return t1.to;
        }
        return null;
    }
    if (term instanceof Var) {
        return env.getTermType(term);
    }
    if (term instanceof Primitive) {
        return term.type;
    } 
    return env.getTermType(term);
}

function unify(type1, type2) {
    if (type1 instanceof BaseType && type2 instanceof BaseType &&
        ((type1.type == "Bool" && type2.type == "Bool") ||
        (type1.type == "Int" && type2.type == "Int"))) {
            return new TypeEnvironment();
        }

    if (type1 instanceof FunctionType && type2 instanceof FunctionType) {
        var sub1 = unify(type1.from, type2.from);
        var sub2 = unify(type1.to.applySubstution(sub1),
                         type2.to.applySubstution(sub1));

        return sub1 && sub2 ? sub1.compose(sub2) : null;
    }

    if (type1 instanceof TypeVariable || type2 instanceof TypeVariable) {
        return variableBind(type1, type2);
    }

    console.log("no unification today");
    return null;
}

function variableBind(t1, t2) {
    if (t1.equals(t2)) {
        return new TypeEnvironment();
    }

    var free1 = t1.freeTypeVariables();
    var free2 = t2.freeTypeVariables();
    for (var i = 0; i < free1.length; i++) {
        for (var j = 0; j < free2.length; j++) {
            if (free1[i].equals(free2[j])) {
                console.log("infinite type");
                return null;
            }
        }
    }

    return t1 instanceof TypeVariable ?
        new TypeEnvironment([new SimpleTypeAssignment(t1, t2)]) :
        new TypeEnvironment([new SimpleTypeAssignment(t2, t1)]);
}

function getHMType(term) {
    var typeVar = new TypeVariable('a');
    var result = getHM(term, new TypeEnvironment(), typeVar);
    if (result && result.type) {
        return result.type.applySubstution(result.sub); 
    }

    return null;
}

function getHM(term, env = new TypeEnvironment(), v) {
    if (term instanceof Primitive) {
        if (term.name == "ITE") {
            var newV = v.copy();
            v.increment();
            return {
                sub:  new TypeEnvironment(),
                type: new FunctionType(new BaseType('Bool'),
                      new FunctionType(newV, new FunctionType(newV, newV))),
            };
        }
        
        if (term.name == "FIX") {
            var newV = v.copy();
            v.increment();
            return {
                sub:  new TypeEnvironment(),   
                type: new FunctionType(new FunctionType(newV, newV), newV),
            };
        }

        if (term.name == "I") {
            var newV = v.copy();
            v.increment();
            return {
                sub:  new TypeEnvironment(),   
                type: new FunctionType(newV, newV)
            };
        }

        if (term.name == "S") {
            var newV1 = v.copy();
            v.increment();
            var newV2 = v.copy();
            v.increment();
            var newV3 = v.copy();
            v.increment();
            return {
                sub:  new TypeEnvironment(),
                type: new FunctionType(new FunctionType(newV3, new FunctionType(newV2, newV1)),
                new FunctionType(new FunctionType(newV3, newV2), new FunctionType(newV3, newV1)))
            };
        }

        if (term.name == "K") {
            var newV1 = v.copy();
            v.increment();
            var newV2 = v.copy();
            v.increment();
            return {
                sub:  new TypeEnvironment(),
                type: new FunctionType(newV1, new FunctionType(newV2, newV1))
            };
        }

        return { sub:new TypeEnvironment(), type:term.type };
    }

    if (term instanceof Application) {
        var newVariable = v.copy();
        v.increment();

        var l = getHM(term.term1, env, v);
        if (!l || !l.sub || !l.type) {
            return null;
        }
        l = { sub:l.sub.copy(), type:l.type.copy() };
        var r = getHM(term.term2, env.applySubstution(l.sub), v);
        if (!r || !r.sub || !r.type) {
            return null;
        }
        var s = unify(l.type.applySubstution(r.sub),
                      new FunctionType(r.type, newVariable));
        return s && r && l && r.sub && r.type && l.sub && l.type ? {
            sub  : s.compose(r.sub).compose(l.sub),
            type : newVariable.applySubstution(s)
        } : null;
    }

    if (term instanceof Variable) {
        for (var i = 0; i < env.assignments.length; i++) {
            if (env.assignments[i].term.equals(term)) {
                return { sub: new TypeEnvironment(),
                         type:env.assignments[i].type.instantiate(v) };
            }
        }
        return null;
    }

    if (term instanceof Abstraction) {
        var newVariable = v.copy();
        v.increment();

        var env1 = env.removeTerm(term.variable);
        env1.assignments
            .push(new SimpleTypeAssignment(term.variable, 
                                           new Polytype([], newVariable)));
		var r = getHM(term.term, env1, v);

		if (!r || !r.type || !r.sub) {
			return null;
		}
        return {
			sub  : r.sub,
        	type : new FunctionType(newVariable.applySubstution(r.sub), r.type)
		};
    }

    if (term instanceof Let) {
        var t = getHM(term.term1, env, v);
        if (!t || !t.type || !t.sub) {
            return null;
        }
        var env1  = env.removeTerm(term.variable);
        var type1 = env.applySubstution(t.sub).generalize(t.type);
        var env2  = env1;
        env2.assignments.push(new SimpleTypeAssignment(term.variable, type1));
        var t2    = getHM(term.term2, env2.applySubstution(t.sub), v);
        return t && t.sub && t.type && t2 && t2.sub && t2.type ? {
            sub  : t2.sub.compose(t.sub), 
            type : t2.type
        } : null;
    }
}

