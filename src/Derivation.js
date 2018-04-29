
Arrow = {
    BETA  : '→<sub>β</sub>',
    ETA   : '→<sub>η</sub>',
    DELTA : '→<sub>δ</sub>',
    EQ    : '&nbsp;=',
    STAR  : '→*',
    NO    : null,
    toName : (a) => {
        switch (a) {
        case Arrow.BETA:  return 'BETA';
        case Arrow.ETA:   return 'ETA';
        case Arrow.DELTA: return 'DELTA';
        case Arrow.EQ:    return 'EQ';
        case Arrow.STAR:  return 'STAR';
        default:          return 'NO'; }},
    toLatex : (a) => {
        switch (a) {
        case Arrow.BETA:  return '\\to_\\beta\\quad';
        case Arrow.ETA:   return '\\to_\\eta\\quad';
        case Arrow.DELTA: return '\\to_\\delta\\quad';
        case Arrow.EQ:    return ' =\\quad';
        case Arrow.STAR:  return '\\to*\\quad';
        default: return "";}},
};

class Derivation {
    constructor(data) {
        this.term             = data;
        this.arrow            = null;
        this.parentDerivation = null;
        this.childDerivation  = null;
    }

    addChildTerm(term, arrow = null) {
        var newDerivation = new Derivation(term);
        newDerivation.parentDerivation = this;
        newDerivation.arrow = arrow;
        this.childDerivation = newDerivation;
        return true;
    }

    toHtml() {
        return "nothing";    
    }

    toLatex() {
        var node = this;
        var warning = "% don't forget to \\usepackage{amsmath}\n";
        var s = "";

        while (node) {
            s += Arrow.toLatex(node.arrow) + "&" + node.term.toLatex();
            if (node.childDerivation) {
                s += "\\\\\n";
            }
            node = node.childDerivation;
        }
        
        return warning + "\\begin{align*}\n" + s + "\n\\end{align*}";
    } 
}
