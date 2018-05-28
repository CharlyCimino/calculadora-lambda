
/*'enumumeration' object for arrows -- different redex kinds*/
const Arrow = {
    BETA  : '→<sub>β</sub>',
    ETA   : '→<sub>η</sub>',
    DELTA : '→<sub>δ</sub>',
    EQ    : '&nbsp;=',
    STAR  : '→*',
    NO    : null,
    toName(a) {
        switch (a) {
        case Arrow.BETA:  return 'BETA';
        case Arrow.ETA:   return 'ETA';
        case Arrow.DELTA: return 'DELTA';
        case Arrow.EQ:    return 'EQ';
        case Arrow.STAR:  return 'STAR';
        default:          return 'NO'; }},
    toLatex(a) {
        switch (a) {
        case Arrow.BETA:  return '\\to_\\beta\\quad';
        case Arrow.ETA:   return '\\to_\\eta\\quad';
        case Arrow.DELTA: return '\\to_\\delta\\quad';
        case Arrow.EQ:    return ' =\\;\\;\\quad';
        case Arrow.STAR:  return '\\to^\\ast\\quad';
        default: return "";}},
};

/* linked-list for derivation chain */
class Derivation {
    constructor(term = null) {
        this.term             = term;
        this.arrow            = null;
        this.childDerivation  = null;
    }

    /* adds new term */
    addChildTerm(term, arrow = null) {
        var newDerivation = new Derivation(term);
        newDerivation.arrow = arrow;
        this.childDerivation = newDerivation;
        return true;
    }

    /* returns final html code of the derivation 
       'lineOffset' is a number determining the start
       of encoded line number. useful when
       appending generated html to existing one */
    toHtml(lineOffset = 0) {
        if (this.term == null) {
            return "";
        }
        var currentDerivation = this;
        var evalAtOnce = "<div onclick='OLCE.UI.evaluateAtOnce()' " +
                         "class='arrow' id='evalButton'>→*</div>";
        var s = ""; 
        var termNumber = lineOffset;
        while (currentDerivation) {
            var hasRedex = Evaluator.getRedex.byStrategy(currentDerivation.term) != null;
            var arrow = currentDerivation.arrow;  
            arrow = arrow == null ? "&nbsp;" : arrow;
            s += "<div class='nodebox'><div class='arrow'>" + arrow + "</div>" +
                 "<div class='termContainer' onmouseleave='OLCE.UI.appear" +
                 "Aliases(this, true)' onmouseover='OLCE.UI.appearAliases(this, false)'>" +
                 currentDerivation.term.toHtml(termNumber + ".") + "</div>" +
                 (currentDerivation.childDerivation == null && hasRedex ? evalAtOnce : "") +
                 "</div>";
            currentDerivation = currentDerivation.childDerivation;
            termNumber++;
        }
        return s;
    }

    /* returns string of latex source code of the derivation */
    toLatex() {
        var node = this;
        var warning = "% don't forget to \\usepackage{amsmath}\n";
        var result = "";

        while (node) {
            result += Arrow.toLatex(node.arrow) + "&" + node.term.toLatex();
            if (node.childDerivation) {
                result += "\\\\\n";
            }
            node = node.childDerivation;
        }
        
        return warning + "\\begin{align*}\n" + result + "\n\\end{align*}";
    } 

    /* downloads a file of the derivation */
	toFile() {
	    let aliases = OLCE.Data.aliases.aliases;
	    var state = OLCE.Settings.dropParens;
	    var result = "discipline " + TypeDiscipline.toName(OLCE.Settings.discipline) + "\n";
	    var currentDerivation = OLCE.Data.derivation;
	    OLCE.Settings.dropParens = false;
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
	    OLCE.Settings.dropParens = state;
		return Derivation.downloadFile(result);
	}

    /* returns a particular term from string encoding */
    codeToTerm(code, returnRedex = false) {
        var codes = (code + "").match(/(.*)\.(.*)/);
        if (!codes) {
            return null;
        }
        var node = this.getLineByNumber(parseInt(codes[1], 10));
        return node.term.fromCode(codes[2], returnRedex);
    }

    /* gets particular term by number */
    getLineByNumber(n) {
        var node = this;
        while (node && n > 0) {
            node = node.childDerivation;
            n--;
        }
        return node;
    }

    /* returns a number of derivation (list length) */
    getNumberOfLines() {
        var node = this;
        var n = 0;
        while (node) {
            node = node.childDerivation;
            n++;
        }
        return n;
    }

    /* returns the last (the current) term */ 
    getLast() {
        var node = this;
        while (node.childDerivation) {
            node = node.childDerivation; 
        }
        return node;
    }

    /* utility function for file download, input is a string to be downloaded */
    static downloadFile(text, filename = "save.lambda") {
        var el = document.createElement("a");
        el.setAttribute("href", "data:text/plain;charset=utf-8," +
                                encodeURIComponent(text));
        el.setAttribute("download", filename);
        el.style.display = "none";
        document.body.appendChild(el);
        el.click();
      
        document.body.removeChild(el);
    }

    /*utility function, opens a new browser window containing argument text*/
	static generatePage(text) {
	    var newWindow = window.open("");
	    var w = (h, b) =>"<html><head>" + h +
	        "</head><body>" + b + "</body></html>";
	    var head = "<title>λx.export</title>" +
	    "<style>body{font-family:monospace;white-space:pre-line;}</style>";
	    newWindow.document.write(w(head, text));
	}

    /*parses (file) text into Derivation*/
	static textToDerivation(text) {
        var newTree = new Derivation();
        var current = newTree;
        var lines = text.split('\n');
        var aliasCounter = 0;
        var termCounter = 0;
        var disc = TypeDiscipline.UNTYPED;
        var constantPreferenceBefore = OLCE.Settings.preferConstants;
        var disciplineBefore = OLCE.Settings.discipline;
        var reset = () => {
            OLCE.Settings.preferConstants = constantPreferenceBefore;
            OLCE.Settings.discipline = disciplineBefore;
        };
        OLCE.Settings.preferConstants = true;
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].trim().match(/^term/)) {
                var tokens = lines[i].match(/^\s*term\s+([A-Z]+)\s+(.+)/);
                if (tokens == null || tokens.length != 3) {
                    reset();
                    return null;
                }
                var term = Parser.parse(tokens[2]);
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
                var term = Parser.parse(tokens[2]);
                if (term == null) {
                    reset();
                    return null;
                }
                OLCE.Data.aliases.addAlias(tokens[1], term, true);
                aliasCounter++;
            } else if (lines[i].trim().match(/^discipline/)) {
                var tokens = lines[i].match(/^\s*discipline\s+(.+)/);
                if (tokens && TypeDiscipline[tokens[1]]) {
                    disc = tokens[1];
                }
                OLCE.Settings.discipline = TypeDiscipline[tokens[1]];
            }
        }
        reset();
        return { derivation: newTree,
                 discipline: disc,
                 terms:      termCounter,
                 aliases:    aliasCounter };
    }
}//Derivation

