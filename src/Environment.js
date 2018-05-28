
/*a class for manipulation of aliases*/
class Environment {
    constructor() {
        this.aliases = [];
    }

    /* adds a new alias*/
    addAlias(name, term, userDefined = false, simplyTypedOnly = false) {
        var alias = new Alias(name, term, userDefined, simplyTypedOnly);
        if (!this.containsName(name)) {
            this.aliases.push(alias);
        }
    }

    /* returns an alias name of a term*/
    getName(term) {
        for (var i = 0; i < this.aliases.length; i++) {
            if (this.aliases[i].term.equals(term)) {
                return this.aliases[i].name;
            }
        }
        return Alias.fromNumeral(term);
    }

    /* returns an alias obejct by name*/
    getAliasByName(name) {
        for (var i = 0; i < this.aliases.length; i++) {
            if (this.aliases[i].name == name) {
                return this.aliases[i]; 
            }
        }  
        if (!isNaN(name)) {
            return new Alias(name, Alias.toNumeral(parseInt(name, 10)));
        }
        return null;
    }

    /* returns a term of a given alias-name, works for numerals too*/
    getTerm(name) {
        for (var i = 0; i < this.aliases.length; i++) {
            if (this.aliases[i].name == name) {
                return this.aliases[i].term;
            }
        }
        if (!isNaN(name)) {
            return Alias.toNumeral(parseInt(name, 10));
        }
        return null;
    }

    /* returns true iff Env contains a given term*/
    containsTerm(term) {
        for (var i = 0; i < this.aliases.length; i++) {
            if (this.aliases[i].term.equals(term)) {
                return true;
            }
        }

        return Alias.fromNumeral(term) != null;
    }

    /* returns true iff Env contains some alias under a given name*/
    containsName(name) {
        if (name == "") {
            return false;
        }
        for (var i = 0; i < this.aliases.length; i++) {
            if (this.aliases[i].name == name) {
                return true;
            }
        }

        return !isNaN(name);
    }
}

/* associating a term and a name*/
class Alias {
    constructor(name, term, userDefined = false, simpleTypedOnly = false) {
        this.name = name;
        this.term = term;
        this.userDefined = userDefined;
        this.simpleTypedOnly = simpleTypedOnly;
    }

    equals(other) {
        return other instanceof Alias &&
            this.name == other.name &&
            this.term.equals(other.term);
    }

    /* converts an integer into Church-encoded numeral*/
    static toNumeral(number) {
        if (typeof(number) != 'number' || number < 0) {
            return null;
        }

        var internal = new Var('x');

        for (var i = 0; i < number; i++) {
            internal = new App(new Var('f'), internal);
        }

        return new Abs(new Var('f'), new Abs(new Var('x'), internal));
    }

    /* converts a Church encoded numeral term to integer*/
    static fromNumeral(term) {
        if (!term) {
            return null;
        }
        var valid    = term && term.term && term.term.term;
        var internal = valid ? term.term.term : null;
        var number   = 0;
        var xvar     = new Var('x');
        var fvar     = new Var('f');

        if (valid && (!term.variable.equals(fvar) ||
                      !term.term.variable.equals(xvar))) {
            return null;
        }
        while (internal) {
            if (internal.equals(xvar)) {
                return number;
            }
            if (internal instanceof App && internal.term1.equals(fvar)) {
                internal = internal.term2;
                number++;
            } else {
                return null;
            }
        }
        return null;
    }
}

