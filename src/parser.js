
function internalToLatex(termInput, macros = false, fullParens = true) { //not working
    return "$" + termInput.toDisplay().replace(/ /g,"\\;").replace(/λ/g, "\\lambda ") + "$";
}

function getTermByCode(term, code = "0", returnRedex = false,
                               redex = null, original = term) {
    var c   = code[1];
    var rec =
        (t, r) => getTermByCode(t, code.substr(1), returnRedex, r, original);
    
    if (!code) {
        return null;
    }

    if (code.length === 1) {
        if (isReductionStrategyRedex(term, original)) {
            redex = term;
        }

        return returnRedex ? redex : term;
    }

    redex = isReductionStrategyRedex(term, original) ? term : redex;
    if (term instanceof Var) {
        return returnRedex ? redex : null;
    } else if (term instanceof Abs) {
        return c === "0" ? rec(term.variable, redex) : rec(term.term, redex);
    } else if (term instanceof App) {
        return c === "0" ? rec(term.term1, redex) : rec(term.term2, redex);
    } else if (term instanceof Primitive) {
        return returnRedex ? redex : null;
    } else if (term instanceof Let) {
        return c === "0" ? rec(term.term1, redex) : rec(term.term2, redex);
    }
}

function derivationTreeToHtml(tree = derivationTree) { //implement as list of terms, move to derivation
    if (tree == null) {
        return "";
    }

    var currentTerm   = tree.term.toHtml();
    var boxstart      = "<div class='nodebox'>";
    var childrenStart = "<div class='children'>";
    var end           = "</div>";
    var thisTermStart = "<div class='termContainer' " +
        "onmouseleave='showAliases(this)' onmouseover='hideAliases(this)'>";
    var hasRedex      = getReductionStrategyRedex(tree.term) != null;
    var evalAtOnce    = (tree.childDerivation == null && hasRedex) ?
        "<span onclick='evaluateAtOnce()'" +
        " class='arrow' id='evalButton'>→*" + end : "";
    var arrow = "<span class='arrow'>" +
        (tree.arrow == null ? "&nbsp;" : tree.arrow) + "</span>";

    return boxstart + arrow + thisTermStart + currentTerm + end + evalAtOnce + childrenStart +
        derivationTreeToHtml(tree.childDerivation) + end + end;
}

function generatePage(text) {
    var newWindow = window.open("");
    var w = (h, b) =>"<html><head>" + h +
        "</head><body>" + b + "</body></html>";
    var head = "<title>λx.export</title>" +
    "<style>body{font-family:monospace;white-space:pre-line;}</style>";
    newWindow.document.write(w(head, text));
}

function generateFileText() {
    var state = Settings.dropParens;
    var result = "discipline " + TypeDiscipline.toName(Settings.discipline) + "\n";
    var aliases = Global.aliases.aliases;
    var currentDerivation = derivationTree;
    Settings.dropParens = false;
    for (var i = 0; i < aliases.length; i++) {
        if (aliases[i].userDefined) {
            result += "alias " + aliases[i].name + " " +
                      aliases[i].term.toDisplay() + "\n";
        }
    }

    while (currentDerivation != null) {
        result += "term " + Arrow.toName(currentDerivation.arrow) +
            " " + currentDerivation.term.toDisplay() + "\n";
        currentDerivation = currentDerivation.childDerivation;
    }
    
    Settings.dropParens = state;
    return result;
}

function textToDerivation(text) {
    var newTree = new Derivation();
    var current = newTree;
    var lines = text.split('\n');
    var aliasCounter = 0;
    var termCounter = 0;
    var disc = TypeDiscipline.UNTYPED;
    var constantPreferenceBefore = Settings.preferConstants;
    var disciplineBefore = Settings.discipline;
    var reset = () => {
        Settings.preferConstants = constantPreferenceBefore;
        Settings.discipline = disciplineBefore;
    };
    
    Settings.preferConstants = true;

    for (var i = 0; i < lines.length; i++) {
        if (lines[i].trim().match(/^term/)) {
            var tokens = lines[i].match(/^\s*term\s+([A-Z]+)\s+(.+)/);
            if (tokens == null || tokens.length != 3) {
                reset();
                return null;
            }
            var term = parse(tokens[2]);
            if (current.term == null) {
                current.term = term;
                current.arrow = Arrow[tokens[1]];
            } else {
                current.addChildTerm(term, Arrow[tokens[1]]);
                current = current.childDerivation;
            }
            if (term == null) {
                reset();
                return null;
            }
            termCounter++;
        } else if (lines[i].trim().match(/^alias/)) {
            var tokens = lines[i].match(/^\s*alias\s+([A-Z]+)\s+(.+)/);
            if (tokens == null) {
                reset();
                return null;
            }
            var term = parse(tokens[2]);
            if (term == null) {
                reset();
                return null;
            }
            Global.aliases.addAlias(tokens[1], term, true);
            aliasCounter++;
        } else if (lines[i].trim().match(/^discipline/)) {
            var tokens = lines[i].match(/^\s*discipline\s+(.+)/);
            if (tokens != null && TypeDiscipline[tokens[1]]) {
                disc = tokens[1]; 
            }
            Settings.discipline = TypeDiscipline[tokens[1]];
        }
    }
    
    reset();
    return { derivation: newTree,
             discipline: disc,
             terms:      termCounter,
             aliases:    aliasCounter };
}

function downloadFile(text, filename = 'save.lambda') {
    var el = document.createElement('a');
    el.setAttribute('href', 'data:text/plain;charset=utf-8,' +
                            encodeURIComponent(text));
    el.setAttribute('download', filename);
    el.style.display = 'none';
    document.body.appendChild(el);
    el.click();
  
    document.body.removeChild(el);
}

function derivationTreeToLatex(tree = derivationTree, first = true) {
    if (tree == null) {
        return "";
    }

    var start = "\\usepackage{forest}\n\\begin{forest}";
    var end   = "\n\\end{forest}";

    return (first ? start : "") + "\n[" + internalToLatex(tree.term) +
        derivationTreeToLatex(tree.childDerivation, false) +
        "]" + (first ? end : "");
}
