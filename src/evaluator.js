
EvaluationStrategy = {
    FULL_BETA       : 'Full beta reduction',
    NORMAL_ORD      : 'Normal order',
    APPLICATIVE_ORD : 'Applicative order',
    CALL_BY_VALUE   : 'Call by value',
    CALL_BY_NAME    : 'Call by name'
};

function isValue(exp) {
    return exp instanceof Abs || exp instanceof Primitive;
}

function isDeltaRedex(exp) {
    if (!(exp instanceof App)) {
        return false;
    }

    //fix
    if (exp.term1.name == "FIX") {
        return exp.term2 instanceof Abs;
    }

    /* ite */
    if (exp.term1.term1 && exp.term1.term1.term1 &&
    exp.term1.term1.term1.name == "ITE") {
        var cond = exp.term1.term1.term2;
        var t1 = exp.term1.term2;
        var t2 = exp.term2;

        var checkTypes = unify(getHMType(t1), getHMType(t2)) ? true : false;
        checkTypes = checkTypes
            || Settings.discipline == TypeDiscipline.UNTYPED;

        return cond instanceof Con && cond.type.type == "Bool" && checkTypes;
    }

    /* unary fns */
    if (exp.term1 instanceof Con && exp.term1.arity == 1) {
        var fType = exp.term1.type;
        var argType = exp.term2.type;
        
        if (!fType && Settings.discipline == TypeDiscipline.UNTYPED) {
            return exp.term2 != null;
        }

        return fType instanceof FunctionType && unify(fType.from, argType) ?
            true : false;
    }

    /* binary functions */
    if (exp.term1.term1 instanceof Con && exp.term1.term1.arity == 2) {
        if (exp.term1.term1.name == "DIV" && exp.term2.name == "0") {
            return false;
        }

        var fType = exp.term1.term1.type;
        var t1 = exp.term1.term2 instanceof Con ? exp.term1.term2.type : null;
        var t2 = exp.term2 instanceof Con ? exp.term2.type : null;

        if (!fType && Settings.discipline == TypeDiscipline.UNTYPED) {
            return exp.term1.term2 && exp.term2;
        }

        return fType instanceof FunctionType && t1 && t2 ?
            fType.from.equals(t1) && fType.to.from.equals(t2) : false;
    }

    /* ternary, only S_combinator uses this */
    if (exp.term1 && exp.term1.term1 && exp.term1.term1.term1 &&
        exp.term1.term1.term1 instanceof Con && exp.term1.term1.term1.arity == 3) {
        return exp.term2 && exp.term1.term2 && exp.term1.term1.term2;
    }

    return false;
}

function isEtaRedex(exp, original = exp) {
    check = exp instanceof Abs &&
        exp.term instanceof App &&
        exp.variable.equals(exp.term.term2) &&
        getAllRedexes(original).length == 0 &&
        getAllDeltaRedexes(original).length == 0;

    if (check) {
        var fv = exp.term.term1.freeVars(); 
        for (var i = 0; i < fv.length; i++) {
            if (exp.variable.equals(fv[i])) {
                return false;
            }
        }
    }

    return check;
}

function applyEta(exp) {
    return exp.term.term1;
}

function isRedex(exp) {
    var check = exp instanceof Let ||
        (exp instanceof App && exp.term1 instanceof Abs);

    if (check) {
        if (Settings.discipline == TypeDiscipline.UNTYPED) {
            return true;
        }

        if (Settings.discipline == TypeDiscipline.SIMPLY_TYPED) {
            return getSimpleType(exp) ? true : false;
        }

        if (Settings.discipline == TypeDiscipline.HINDLEY_MILNER) {
            return getHMType(exp) ? true : false;
        }
    }

    return false;
}

/*   returns true if term is reduction strategy redex or eta redex.
 *   the second parameter needed as eval strategy redex
 *   depends on where it is located in term
 */
function isReductionStrategyRedex(term, original = term) {
    var strat = Settings.strategy;
    if (!term) {
        return false;
    }
    if (isEtaRedex(term, original)) {
        return true;
    }
    switch (strat) {
    case EvaluationStrategy.FULL_BETA:
        return isRedex(term) || isDeltaRedex(term);
    case EvaluationStrategy.NORMAL_ORD:
        return getNormalRedex(original) === term;
    case EvaluationStrategy.APPLICATIVE_ORD:
        return getApplicativeRedex(original) === term;
    case EvaluationStrategy.CALL_BY_VALUE:
        return getCallByValueRedex(original) === term;
    case EvaluationStrategy.CALL_BY_NAME:
        return getCallByNameRedex(original) === term;
    }
}

function getApplicativeRedex(term) {
    if (term instanceof Abs) {
        return getApplicativeRedex(term.term);
    } else if (term instanceof App) {
        var l = getApplicativeRedex(term.term1);
        var r = getApplicativeRedex(term.term2);
        if (l != null) {
            return l;
        }
        if (r != null) {
            return r;
        }
        if (isRedex(term) || isDeltaRedex(term)) {
            return term;
        }
    }

    return null;
}

// implement let and delta reduction finding
function getNormalRedex(term) {
    if (isRedex(term) || isDeltaRedex(term)) {
        return term;
    }

    if (term instanceof Abs) {
        return getNormalRedex(term.term);
    } else if (term instanceof App) {
        var l = getNormalRedex(term.term1);
        if (l != null) {
            return l;
        }
        return getNormalRedex(term.term2);
    }

    return null;
}

function getCallByValueRedex(term) {
    if ((isDeltaRedex(term) || isRedex(term)) && isValue(term.term2)) {
        return term;
    }

    if (term instanceof App) {
        if (isValue(term.term1)) {
            return getCallByValueRedex(term.term2);
        }
        return getCallByValueRedex(term.term1);
    }

    if (term instanceof Let) {
        if (isValue(term.term1)) {
            return term;
        }
        return getCallByValueRedex(term.term1);
    }

    return null;
}

function getCallByNameRedex(term) {
    if (isRedex(term) || isDeltaRedex(term)) {
        return term;
    }

    if (term instanceof App) {
        var l = getCallByNameRedex(term.term1);
        if (l != null) {
            return l;
        }
        return getCallByNameRedex(term.term2);
    }

    return null;
}

function getReductionStrategyRedex(term) {
    switch (Settings.strategy) {
    case EvaluationStrategy.FULL_BETA://fallthrough
    case EvaluationStrategy.NORMAL_ORD:
        return getNormalRedex(term);
    case EvaluationStrategy.CALL_BY_NAME:
        return getCallByNameRedex(term);
    case EvaluationStrategy.CALL_BY_VALUE:
        return getCallByValueRedex(term);
    case EvaluationStrategy.APPLICATIVE_ORD:
        return getApplicativeRedex(term);
    }
}

function getAllRedexes(term) {
    var redexes = [];
    forAllDescendants((term) => {
        if (isRedex(term)) {
            redexes.push(term);
        }
    }, term);

    return redexes;
}

function getAllEtaRedexes(term) {
    var redexes = [];
    forAllDescendants((term) => {
        if (isEtaRedex(term)) {
            redexes.push(term);
        } 
    }, term);
    
    return redexes;
}

function getAllDeltaRedexes(term) {
    var redexes = [];
    forAllDescendants((term) => {
        if (isDeltaRedex(term)) {
            redexes.push(term);
        }
    }, term);

    return redexes;
}

function applyBetaDelta(term, redex, rArrow = null) {
    var rec = (t) => applyBetaDelta(t, redex, rArrow);

    if (term instanceof Var) {
        return term.copy();
    } else if (term instanceof Abs) {
        if (term == redex && isEtaRedex(term)) {
            if (rArrow) {
                rArrow.arrow = Arrow.ETA;
            }
            return applyEta(term);
        }
        return new Abs(rec(term.variable), rec(term.term), term.inputType);
    } else if (term instanceof App) {
        if (term === redex && isRedex(term)) {
            return applyBetaStep(term, rArrow);
        } else if (term === redex && isDeltaRedex(term)) {
            return applyDeltaStep(term, rArrow);
        }
        return new App(rec(term.term1), rec(term.term2));
    } else if (term instanceof Primitive) {
        return term.copy();
    } else if (term instanceof Let) {
        if (Settings.discipline == TypeDiscipline.UNTYPED) {
            if (rArrow) {
                rArrow.arrow = Arrow.EQ;
            }
            return term.desugar();
        }

        if (rArrow) {
            rArrow.arrow = Arrow.BETA;
        }
        return applyBetaStep(term.desugar());
    }
}

function applyBetaStep(redex, rArrow) {
    redex = redex.copy();
    var freeVars = redex.term2.freeVars();
    for (var i = 0; i < freeVars.length; i++) {
        if (placeHeldByFirstIsBoundBySecond(redex.term1.term,
                                     redex.term1.variable, freeVars[i])) {
            redex.term1.term = redex.term1.term.replace(freeVars[i],
                findSuitableSubstitute(redex.term1.term, freeVars[i]));
        }
    }

    return reduce(redex.term1, redex.term2, redex.term1.variable, rArrow);
}

function applyDeltaStep(redex, rArrow) {
    var toArray = (term) => {
        if (term.term1 instanceof Con) {
            return [term.term1, term.term2]; 
        }
        return toArray(term.term1).concat([term.term2]);
    }

    if (rArrow) {
        rArrow.arrow = Arrow.DELTA;
    }

    var args = toArray(redex);
    return args[0].fn.apply(null, args.splice(1));
}

function reduce(M, N, V, rArrow = null, bound = false) { //misising Let
    var r = (m, b) => reduce(m, N, V, rArrow, b);

    if (M.equals(V)) {
        if (rArrow != null) {
            rArrow.arrow = Arrow.BETA;
        }
        return N.copy();
    } else if (M instanceof Abs) {
        if (M.variable.equals(V)) {
            if (bound) {
                return M.copy();
            }
            return r(M.term, true);
        }
        return new Abs(M.variable.copy(), r(M.term, bound), term.inputType);
    } else if (M instanceof App) {
        return new App(r(M.term1, bound), r(M.term2, bound));
    } else if (M instanceof Primitive) {
        return M.copy();
    }
    return M.copy();
}

function evaluateComplete(term, counterObject = null) {
    var e = term;
    var repeat = true;
    var c = 0;

    while (repeat) {
        var r = getReductionStrategyRedex(e);
        if (r != null) {
            e = applyBetaDelta(e, r);
            c++;
        } else {
            repeat = false;
        }
    }

    if (counterObject) {
        counterObject.count = c;
    }

    return e;
}

function findSuitableSubstitute(term, variable) {
    var guess = variable.copy().increment();
    while (term.contains(guess)) {
        guess.increment();
    }
    return guess;
}

function placeHeldByFirstIsBoundBySecond(term, fst, snd, bound = false) {
    if (term instanceof App) {
        return placeHeldByFirstIsBoundBySecond(term.term1, fst, snd, bound) ||
               placeHeldByFirstIsBoundBySecond(term.term2, fst, snd, bound);
    } else if (term instanceof Abs) {
        if (term.variable.equals(fst)) {
            return false;
        }
        if (term.variable.equals(snd)) {
            bound = true;
        }
        return placeHeldByFirstIsBoundBySecond(term.term, fst, snd, bound);
    } else if (term instanceof Var) {
        if (fst.equals(term)) {
            return bound;
        }
        return false;
    } else if (term instanceof Let) {

    } else if (term instanceof Primitive) {
        return false;
    }
}

function info(term = currentNode.term) {
    var disc  = Settings.discipline;
    var strat = Settings.strategy;
    var numRedexes      = getAllRedexes(term).length;
    var numDeltaRedexes = getAllDeltaRedexes(term).length;
    var numEtaRedexes   = getAllEtaRedexes(term).length;
    var s = "The current term ";

    if (strat != EvaluationStrategy.FULL_BETA) {
        numRedexes = getReductionStrategyRedex(term) ? 1 : 0;
    }

    if (numRedexes + numDeltaRedexes == 0) {
        if (disc == TypeDiscipline.UNTYPED) {
            s += "is in β" + (numEtaRedexes == 0 ? "η" : "") + "-normal form";
        } else if (disc == TypeDiscipline.SIMPLY_TYPED) {
            var type = getSimpleType(term);
            s += isValue(term) && type ?
                "is in β-normal form and it’s a value of type " +
                "<span class='type'>" +
                (type ? type.write() : "[internal error]") +
                "</span>" :
                "contains no redexes, but it’s not " +
                "a value so it contains a type error";
        } else {
            var type = getHMType(term);
            s += type ? "is in β-normal form and its type is " +
                "<span class='type'>" + type.write() + "</span>" :
                "has no redexes and it is not typeable";
        }
    } else {
        s += "contains ";
    }

    if (numRedexes > 0) {
        if (strat == EvaluationStrategy.FULL_BETA) {
            s += numRedexes;
        }
        s += " beta-redex" + (numRedexes > 1 ? "es" : "");
    }

    if (numDeltaRedexes * numRedexes > 0) {
        s += " <em>&amp;</em> ";
    }

    if (numDeltaRedexes > 0) {
        s += numDeltaRedexes + " delta-redex";
        s += numDeltaRedexes > 1 ? "es" : "";
    }

    if (numDeltaRedexes + numRedexes == 0 && numEtaRedexes > 0) {
        s += ", and it can be η-reduced";
    }

    if (derivationTree.childDerivation == null &&
        ((getReductionStrategyRedex(term)) ||
        numEtaRedexes > 0)
        ) {
        s += ". Click on a redex to reduce it";
    }

    return s + ".";
}
