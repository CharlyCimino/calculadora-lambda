
/*'enum' for evaluation strategy*/
const EvaluationStrategy = {
    FULL_BETA       : 'Full beta reduction',
    NORMAL_ORD      : 'Normal order',
    APPLICATIVE_ORD : 'Applicative order',
    CALL_BY_VALUE   : 'Call by value',
    CALL_BY_NAME    : 'Call by name'
};

/*evaluator singleton*/
Evaluator = {
    /*returns true iff exp is a value*/
    isValue(exp) {
        return exp instanceof Abs ||
               exp instanceof Primitive ||
               Evaluator.isPartialApplication(exp);
    },

    /*reduces eta redex and returns result*/
    applyEta(exp) {
        return exp.term.term1.copy();
    },

    /*reduces a beta redex*/
    applyBetaStep(redex) {
        return Evaluator.substitute(redex.term1.term,
            redex.term1.variable, redex.term2);
    },

    /*reduces a delta redex*/
    applyDeltaStep(redex) {
        var toArray = (term) => {
            if (term.term1 instanceof Con) {
                return [term.term1, term.term2]; 
            }
            return toArray(term.term1).concat([term.term2]);
        }
        var args = toArray(redex);
        return args[0].fn.apply(null, args.splice(1));
    },

    /*returns true iff exp is a partial application*/
    isPartialApplication(exp) {
        if (getHMType(exp) == null ||
            Evaluator.getRedex.allBeta(exp).length != 0  ||
            Evaluator.getRedex.allDelta(exp).length != 0 ||
            !(exp instanceof App)) {
            return false; 
        } 
        var leftmostTerm = exp;
        while (leftmostTerm instanceof App) {
            var right = leftmostTerm.term2;
            if (getHMType(right) == null ||
                    Evaluator.isRedex.beta(right) ||
                    isDeltaRedex(right)) {
                return false;  
            } 
            leftmostTerm = leftmostTerm.term1;
        }
        return leftmostTerm instanceof Con;
    },

    /*returns true iff 'variable' is free in 'term'*/
    varIsFreeIn(variable, term) {
        var fv = term.freeVars();
        for (var i = 0; i < fv.length; i++) {
            if (fv[i].equals(variable)) {
                return true;
            }
        }
        return false;
    },

    /*performs a substitution as formally defined*/
    substitute(M, x, N) {
        const E = Evaluator;
        const rec = Evaluator.substitute;
        if (M instanceof Var) {
            return M.equals(x) ? N.copy() : M.copy();
        } 
        if (M instanceof App) {
            return new App(rec(M.term1, x, N), rec(M.term2, x, N));
        }
        if (M instanceof Abs) {
            if (M.variable.equals(x)) {
                return M.copy(); 
            }
            if (!E.varIsFreeIn(x, M) || !E.varIsFreeIn(M.variable, N)) {
                return new Abs(M.variable.copy(), rec(M.term, x, N)); 
            }
            if (E.varIsFreeIn(x, M) && E.varIsFreeIn(M.variable, N)) {
                var guess = M.variable.copy().increment(); 
                while (E.varIsFreeIn(guess, new App(M, N))) {
                    guess.increment(); 
                }
                return new Abs(guess, rec(rec(M.term, M.variable, guess), x, N));
            }
        }
        if (M instanceof Con) {
            return M.copy();
        }
        if (M instanceof Let) {
            var term = rec(M.desugarOnly(), x, N);
            return Let.toLet(term, M.rec);
        }
        return null;
    },

    /*returns a normal form if exists, loops forever otherwise*/
    getNormalForm(term, counterObject = null) {
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
    },

    /*returns a term as SKI combinator aliases, null if not doable*/
    toSki(term) {
        const rec = Evaluator.toSki;
        var translate = (x) => {
            if (x.term.equals(x.variable)) {
                return OLCE.Data.aliases.getTerm("I");
            } else if (!Evaluator.varIsFreeIn(x.variable, x.term)) {
                return new App(OLCE.Data.aliases.getTerm("K"), x.term);  
            } else {
                var t1 = translate(new Abs(x.variable, x.term.term1));
                var t2 = translate(new Abs(x.variable, x.term.term2));
                if (t1 && t2) {
                    return new App(new App(OLCE.Data.aliases.getTerm("S"), t1), t2);
                } else {
                    return null;
                }
            }
            return null;
        };
        if (term instanceof Var) {
            return term;
        }
        if (term instanceof App) {
            return new App(rec(term.term1), rec(term.term2));
        }
        if (term instanceof Abs) {
            return translate(new Abs(term.variable, rec(term.term)));
        }
        return null;
    },

    /*redex query functions*/
    getRedex : {
        /*returns applicative redex*/
        applicative(term) {
            if (term instanceof Abs) {
                return Evaluator.getRedex.applicative(term.term);
            } else if (term instanceof App) {
                var l = Evaluator.getRedex.applicative(term.term1);
                var r = Evaluator.getRedex.applicative(term.term2);
                if (l != null) {
                    return l;
                }
                if (r != null) {
                    return r;
                }
                if (Evaluator.isRedex.beta(term) || isDeltaRedex(term)) {
                    return term;
                }
            }
            return null;
        },

        /*returns a normal order redex*/
        normal(term) {
            if (Evaluator.isRedex.beta(term) || isDeltaRedex(term)) {
                return term;
            }
        
            if (term instanceof Abs) {
                return Evaluator.getRedex.normal(term.term);
            } else if (term instanceof App) {
                var l = Evaluator.getRedex.normal(term.term1);
                if (l != null) {
                    return l;
                }
                return Evaluator.getRedex.normal(term.term2);
            }
            return null;
        },

        /*returns a call-by-value redex*/
        callByValue(term) {
            if (isDeltaRedex(term) || (Evaluator.isRedex.beta(term) &&
                                       Evaluator.isValue(term.term2))) {
                return term;
            }
            if (term instanceof App) {
                if (Evaluator.isValue(term.term1)) {
                    return Evaluator.getRedex.callByValue(term.term2);
                }
                return Evaluator.getRedex.callByValue(term.term1);
            }
            if (term instanceof Let) {
                if (Evaluator.isValue(term.term1)) {
                    return term;
                }
                return Evaluator.getRedex.callByValue(term.term1);
            }
            return null;
        },

        /*returns a call-by-name redex*/
        callByName(term) {
            if (Evaluator.isRedex.beta(term) || isDeltaRedex(term)) {
                return term;
            }
            if (term instanceof App) {
                var l = Evaluator.getRedex.callByName(term.term1);
                if (l != null) {
                    return l;
                }
                return Evaluator.getRedex.callByName(term.term2);
            }
            return null;
        },

        /*returns an array of all beta redexes*/
        allBeta(term) {
            var redexes = [];
            term.apply((t) => {
                if (Evaluator.isRedex.beta(t)) {
                    redexes.push(t);
                }
            });
            return redexes;
        },
        
        /*returns an array of all eta redexes*/
        allEta(term) {
            var redexes = [];
            term.apply((t) => {
                if (Evaluator.isRedex.eta(t)) {
                    redexes.push(t);
                } 
            });
            
            return redexes;
        },

        /*returns an array of all delta redexes*/
        allDelta(term) {
            var redexes = [];
            term.apply((t) => {
                if (isDeltaRedex(t)) {
                    redexes.push(t);
                }
            });
            return redexes;
        },
    },//getRedex

    /*true iff terms are redex queries*/
    isRedex : {
        beta(exp) {
            var check = exp instanceof Let ||
                (exp instanceof App && exp.term1 instanceof Abs);
        
            if (check) {
                if (OLCE.Settings.discipline == TypeDiscipline.UNTYPED) {
                    return true;
                }
                if (OLCE.Settings.discipline == TypeDiscipline.SIMPLY_TYPED) {
                    return getSimpleType(exp.term2) &&
                        getSimpleType(exp.term2).equals(exp.term1.inputType);
                }
                if (OLCE.Settings.discipline == TypeDiscipline.HINDLEY_MILNER) {
                    return getHMType(exp) ? true : false;
                }
            }
            return false;
        },

        eta(exp, original = exp) {
            check = exp instanceof Abs &&
                exp.term instanceof App &&
                exp.variable.equals(exp.term.term2) &&
                Evaluator.getRedex.allBeta(original).length == 0 &&
                Evaluator.getRedex.allDelta(original).length == 0;
        
            if (check) {
                var fv = exp.term.term1.freeVars(); 
                for (var i = 0; i < fv.length; i++) {
                    if (exp.variable.equals(fv[i])) {
                        return false;
                    }
                }
            }
            return check;
        },




    },//isRedex



}//Evaluator

function isDeltaRedex(exp) {
    if (!(exp instanceof App)) {
        return false;
    }

    //fix
    if (exp.term1.name == "FIX") {
        return exp.term2 instanceof Abs &&
            getHMType(exp.term2) instanceof FunctionType &&
            getHMType(exp.term2).from.equals(getHMType(exp.term2).to);
    }

    /* ite */
    if (exp.term1.term1 && exp.term1.term1.term1 &&
    exp.term1.term1.term1.name == "ITE") {
        var cond = exp.term1.term1.term2;
        var t1 = exp.term1.term2;
        var t2 = exp.term2;

        var checkTypes = unify(getHMType(t1), getHMType(t2)) != null;
        checkTypes = checkTypes || OLCE.Settings.discipline == TypeDiscipline.UNTYPED;

        return cond instanceof Con && cond.type.type == "Bool" && checkTypes;
    }

    /* unary fns */
    if (exp.term1 instanceof Con && exp.term1.arity == 1) {
        var fType = exp.term1.type;
        var argType = exp.term2.type;
        
        if (!fType && OLCE.Settings.discipline == TypeDiscipline.UNTYPED) {
            return exp.term2 != null;
        }

        return fType instanceof FunctionType && unify(fType.from, argType) != null;
    }

    /* binary functions */
    if (exp.term1.term1 instanceof Con && exp.term1.term1.arity == 2) {
        if (exp.term1.term1.name == "DIV" && exp.term2.name == "0") {
            return false;
        }

        var fType = exp.term1.term1.type;
        var t1 = exp.term1.term2 instanceof Con ? exp.term1.term2.type : null;
        var t2 = exp.term2 instanceof Con ? exp.term2.type : null;

        if (!fType && OLCE.Settings.discipline == TypeDiscipline.UNTYPED) {
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




/*   returns true if term is reduction strategy redex or eta redex.
 *   the second parameter needed as eval strategy redex
 *   depends on where it is located in term                      */
function isReductionStrategyRedex(term, original = term) {
    var strat = OLCE.Settings.strategy;
    if (!term) {
        return false;
    }
    if (Evaluator.isRedex.eta(term, original)) {
        return true;
    }
    switch (strat) {
    case EvaluationStrategy.FULL_BETA:
        return Evaluator.isRedex.beta(term) || isDeltaRedex(term);
    case EvaluationStrategy.NORMAL_ORD:
        return Evaluator.getRedex.normal(original) === term;
    case EvaluationStrategy.APPLICATIVE_ORD:
        return Evaluator.getRedex.applicative(original) === term;
    case EvaluationStrategy.CALL_BY_VALUE:
        return Evaluator.getRedex.callByValue(original) === term;
    case EvaluationStrategy.CALL_BY_NAME:
        return Evaluator.getRedex.callByName(original) === term;
    }
}




function getReductionStrategyRedex(term) {
    switch (OLCE.Settings.strategy) {
    case EvaluationStrategy.FULL_BETA://fallthrough
    case EvaluationStrategy.NORMAL_ORD:
        return Evaluator.getRedex.normal(term);
    case EvaluationStrategy.CALL_BY_NAME:
        return Evaluator.getRedex.callByName(term);
    case EvaluationStrategy.CALL_BY_VALUE:
        return Evaluator.getRedex.callByValue(term);
    case EvaluationStrategy.APPLICATIVE_ORD:
        return Evaluator.getRedex.applicative(term);
    }
}



function applyBetaDelta(term, redex, rArrow = null) {
    if (term == null || redex == null) {
        return null;
    }
    var rec = (t) => applyBetaDelta(t, redex, rArrow);

    if (term instanceof Var) {
        return term.copy();
    } else if (term instanceof Abs) {
        if (term == redex && Evaluator.isRedex.eta(term)) {
            if (rArrow) {
                rArrow.arrow = Arrow.ETA;
            }
            return Evaluator.applyEta(term);
        }
        return new Abs(rec(term.variable), rec(term.term), term.inputType);
    } else if (term instanceof App) {
        if (term === redex && Evaluator.isRedex.beta(term)) {
            return Evaluator.applyBetaStep(term);
        } else if (term === redex && isDeltaRedex(term)) {
            if (rArrow) {
                rArrow.arrow = Arrow.DELTA;
            }
            return Evaluator.applyDeltaStep(term);
        }
        return new App(rec(term.term1), rec(term.term2));
    } else if (term instanceof Primitive) {
        return term.copy();
    } else if (term instanceof Let) {
        if (term == redex && OLCE.Settings.discipline == TypeDiscipline.UNTYPED) {
            if (rArrow) {
                rArrow.arrow = Arrow.EQ;
            }
            return term.desugar();
        }
        if (term == redex) {
            if (rArrow) {
                rArrow.arrow = Arrow.BETA;
            }
            return Evaluator.applyBetaStep(term.desugar());
        }
        return new Let(rec(term.variable), rec(term.term1), rec(term.term2), [], term.rec);
    }
}


function info(term = OLCE.Data.derivation.getLast().term) {
    if (term == null) {
        return "no term";
    }
    var disc  = OLCE.Settings.discipline;
    var strat = OLCE.Settings.strategy;
    var numRedexes      = Evaluator.getRedex.allBeta(term).length;
    var numDeltaRedexes = Evaluator.getRedex.allDelta(term).length;
    var numEtaRedexes   = Evaluator.getRedex.allEta(term).length;
    var s = "The current term ";

    if (strat != EvaluationStrategy.FULL_BETA) {
        numRedexes = getReductionStrategyRedex(term) && numRedexes > 0 ? 1 : 0;
    }
    if (numRedexes + numDeltaRedexes == 0) {
        if (disc == TypeDiscipline.UNTYPED) {
            s += "is in β" + (numEtaRedexes == 0 ? "η" : "") + "-normal form";
        } else if (disc == TypeDiscipline.SIMPLY_TYPED) {
            var type = getSimpleType(term);
            s += Evaluator.isValue(term) && type ?
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
    if (OLCE.Data.derivation.childDerivation == null &&
        ((getReductionStrategyRedex(term)) ||
        numEtaRedexes > 0)
        ) {
        s += ". Click on a redex to reduce it";
    }
    return s + ".";
}
