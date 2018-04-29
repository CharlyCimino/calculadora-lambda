
class Environment {
    constructor() {
        this.aliases = [];
    }

    addAlias(name, term, userDefined = false) {
        var alias = new Alias(name, term, userDefined);
        if (!this.containsAlias(alias)) {
            this.aliases.push(alias);
        }
    }

    getName(term) {
        var permit = Settings.enableNumerals;
        for (var i = 0; i < this.aliases.length; i++) {
            if (this.aliases[i].term.equals(term)) {
                return this.aliases[i].name;
            }
        }

        return permit ? fromNumeral(term) : null;
    }

    getTerm(name) {
        var permit = Settings.enableNumerals;
        for (var i = 0; i < this.aliases.length; i++) {
            if (this.aliases[i].name == name) {
                return this.aliases[i].term;
            }
        }

        if (permit && !isNaN(name)) {
            return toNumeral(parseInt(name, 10));
        }

        return null;
    }

    containsTerm(term) {
        var permit = Settings.enableNumerals;
        for (var i = 0; i < this.aliases.length; i++) {
            if (this.aliases[i].term.equals(term)) {
                return true;
            }
        }

        return permit && fromNumeral(term) != null;
    }

    containsName(name) {
        if (name == "") {
            return false;
        }
        var permit = Settings.enableNumerals;
        for (var i = 0; i < this.aliases.length; i++) {
            if (this.aliases[i].name == name) {
                return true;
            }
        }

        return permit && !isNaN(name);
    }

    containsAlias(alias) {
        for (var i = 0; i < this.aliases.length; i++) {
            if (this.aliases[i].equals(alias)) {
                return true;
            }
        }

        return false;
    }

    resetAliases() {
        this.aliases = [];
    }
}

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
}

function toNumeral(number) {
    if (typeof(number) != 'number' || number < 0) {
        return null;
    }

    var internal = new Var('x');

    for (var i = 0; i < number; i++) {
        internal = new App(new Var('f'), internal);
    }

    return new Abs(new Var('f'), new Abs(new Var('x'), internal));
}

function fromNumeral(term) {
    if (!term) {
        return null;
    }
    var valid    = term && term.term && term.term.term;
    var internal = valid ? term.term.term : null;
    var number   = 0;
    var xvar     = new Var('x');
    var fvar     = new Var('f');

    if (valid && (!term.variable.equals(fvar) || !term.term.variable.equals(xvar))) {
        return null;
    }

    while (internal) {
        if (internal.equals(xvar)) {
            return number;
        } else if (internal instanceof App && internal.term1.equals(fvar)) {
            internal = internal.term2;
            number++;
        } else {
            return null;
        }
    }

    return null;
}


