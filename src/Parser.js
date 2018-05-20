
class Parser {
    constructor(word) {
        this.index = 0;
        this.word = word;
        this.errmsg = null;
    }

    eatWhite() {
        while (!this.end() && this.word[this.index].match(/\s/)) {
            this.index++;
        }
    }

    remains() {
        return this.word.substr(this.index);
    }
 
    end() {
        return this.index >= this.word.length;
    }

    error(t, i = this.index) {
        if (this.errmsg == null) {
            this.errmsg = { index:i, tokenName:t };
        }
    }
    
    maybe(fn) {
        var previousError = this.errmsg;
        var previousIndex = this.index;

        var result = this[fn]();
        if (result) {
            return result;
        }

        this.errmsg = previousError;
        this.index = previousIndex;
        return null;
    }

    parseAliasPrimitive() {
       if (this.errmsg != null) {
            return null;
        }
        this.eatWhite();
        if (!this.word[this.index]) {
            this.error("alias");
            return null;
        }

        var chars = []; 
        var letter = "";
        var other = false;

        if (!this.end() && this.word[this.index].match(/!/)) {
            other = true;
            this.index++;
        }

        if (!this.end() &&
                (letter = this.word[this.index].match(/[A-Z]/))) {
            chars.push(letter);
            this.index++;
            while (!this.end() &&
                    (letter = this.word[this.index].match(/[A-Z]/))) {
                chars.push(letter);
                this.index++;
            }
        } else if (!this.end() &&
                (letter = this.word[this.index].match(/-|[0-9]/))) {
            chars.push(letter);
            this.index++;
            while (!this.end() &&
                    (letter = this.word[this.index].match(/[0-9]/))) {
                chars.push(letter);
                this.index++;
            }
        } else {
            this.error("alias");
            return null;
        }
    
        var word = chars.join("");
        var alias = word.match(/[0-9]{4,}/) ? null : OLCE.Data.aliases.getTerm(word);
        var constant = OLCE.Data.constants.map(x => x.name).indexOf(word);
        constant = constant >= 0 ? OLCE.Data.constants[constant] : null;
        constant = word.match(/-?[0-9]/) ? pri_n(word) : constant;
        if (OLCE.Settings.discipline == TypeDiscipline.SIMPLY_TYPED) {
            alias = alias && alias.simpleTypedOnly ? alias : null;
        }

        if (!alias || !constant) {
            return alias ? alias : constant;
        }

		if (other) {
            return OLCE.Settings.preferConstants ? alias : constant;
        }
        return OLCE.Settings.preferConstants ? constant : alias;
    }

    parseVar() {
        if (this.errmsg != null) {
            return null;
        }
        this.eatWhite();
        if (this.word[this.index] == null) {
            this.error("variable");
            return null;
        }

        var letter = "";
        var number = "";

        letter = this.word[this.index].match(/[a-z]/);
        if (!letter) {
            this.error("variable");
            return null;
        }
        this.index++;
        letter = letter[0];
        var s;
        while (!this.end() && (s = this.word[this.index].match(/[0-9]/))) {
            number += s[0]; 
            this.index++;
        }

        return this.errmsg == null ? new Var(letter + number) : null;
    }

    parseCharacter(c) {
        if (this.errmsg != null) {
            return false;
        }
        this.eatWhite();
        if (!this.word[this.index]) {
            this.error(c);
            return false;
        }
        if (this.word[this.index].match(new RegExp(c))) {
            this.index++;
            return true;
        }
        this.error(c);
        return false;
    }

    parseArrow() {
        return this.parseCharacter("→");
    }

    parseAbs() {
        if (this.errmsg != null) {
            return null;
        }
        this.eatWhite();         
        if (!this.word[this.index]) {
            this.error("abstraction");
            return null;
        }
       
        var type = null;
        var check = true;
        check = check && this.parseCharacter('\\(');
        check = check && this.parseCharacter('λ');
        var variable = this.parseVar();

        if (OLCE.Settings.discipline == TypeDiscipline.SIMPLY_TYPED) {
            check = check && this.parseCharacter(':');   
            type = this.parseType();
            if (!type) {
                return null;
            }
        }

        check = check && this.parseCharacter('\\.');
        var term = this.parseTerm();
        var otherTerms = [];
        var oTerm;
        while (oTerm = this.maybe('parseTerm')) {
            otherTerms.push(oTerm); 
        }
        check = check && this.parseCharacter('\\)');

        if (!term || !variable || !check) {
            return null;
        }
        
        var result = term;
        for (var i = 0; i < otherTerms.length; i++) {
            result = new App(result, otherTerms[i]); 
        }
        
        return new Abs(variable, result, type);
    }

    parseLet() {
        var rec = false;
        var args = [];

        if (this.errmsg != null) {
            return null;
        }
        this.eatWhite();
        if (!this.word[this.index]) {
            return null;
        }
        if (this.word.substr(this.index, 3).match(/Let/)) {
            this.index += 3;   
        } else {
            return null;
        }
        if (this.word.substr(this.index, 3).match(/Rec/)) {
            rec = true; 
            this.index += 3;
        }

        var variable = this.parseVar();
        var currentVar;
        while (currentVar = this.maybe('parseVar')) {
            args.push(currentVar);
        }
        if (!this.parseCharacter('=')) {
            return null; 
        }
        var t = null;
        var term1 = this.parseTerm(); 

        if (!term1) {
            return null;
        }

        for (var i = args.length - 1; i >= 0; i--) {
            term1 = new Abs(args[i], term1.copy());    
        }

        this.eatWhite();
        if (this.word.substr(this.index, 2).match(/In/)) {
            this.index += 2;
        } else {
            return null;
        }
        var term2 = this.parseTerm();
        var allTerms = [term2];
        var result = allTerms[0];
        while (t = this.maybe('parseTerm')) {
            allTerms.push(t);  
        }
        for (var i = 1; i < allTerms.length; i++) {
            result = new App(result, allTerms[i]);
        }

        return variable && term1 && term2 ?
            new Let(variable, term1, result, [], rec) : null;
    }

    parseApp() {
        if (this.errmsg != null) {
            return null;
        }
        this.eatWhite();         
        if (!this.word[this.index]) {
            this.error("application");
            return null;
        }
        
        var check = true;
        check = check && this.parseCharacter('\\(');
        var term1 = this.parseTerm();
        var term2 = this.parseTerm();

        var anotherTerms = [];
        var aTerm;
        while (aTerm = this.maybe('parseTerm')) {
            anotherTerms.push(aTerm); 
        }

        check = check && this.parseCharacter('\\)');

        if (!term1 || !term2 || !check) {
            return null;
        }

        var result = new App(term1, term2);
        for (var i = 0; i < anotherTerms.length; i++) {
            result = new App(result, anotherTerms[i]); 
        }
        
        return result;
    }

    parseBaseType() {
        if (this.errmsg != null) {
            return null;
        }
        this.eatWhite();
        if (this.word.substr(this.index, 4).match(/Bool/)) {
            this.index += 4;
            return new BaseType('Bool');
        } else if (this.word.substr(this.index, 3).match(/Int/)) {
            this.index += 3;
            return new BaseType('Int');
        }
        this.error("missing type");
        return null;
    }

    parseFunctionType() {
        if (this.errmsg != null) {
            return null;
        }
        this.parseCharacter('\\(');
        var from = this.parseType();
        this.parseCharacter('→');
        var to   = this.parseType();
        
        var others = [from, to];
        while (this.maybe('parseArrow')) {
            others.push(this.parseType());
        }
        this.parseCharacter('\\)');
        var result = others[others.length - 1];
        if (result == null) {
            return null;
        }
        for (var i = others.length - 2; i >= 0; i--) {
            if (others[i] == null) {
                return null;  
            }
            result = new FunctionType(others[i], result); 
        }
        
        return result;
    }

    parseType() {
        var type = null;
        type = this.maybe('parseBaseType');
        type = type ? type : this.maybe('parseFunctionType');
        return type;
    }

    parseTerm() {
        var term = null;
        term = term == null ? this.maybe('parseApp') : term;
        term = term == null ? this.maybe('parseLet') : term;
        term = term == null ? this.maybe('parseAliasPrimitive') : term;
        term = term == null ? this.maybe('parseVar') : term;
        term = term == null ? this.maybe('parseAbs') : term;
        this.eatWhite();
        return term;
    }
}

function abstractionMultiple(string) { // \xyz.T -> \x.\y.\z.T
    if (string == null || OLCE.Settings.discipline == TypeDiscipline.SIMPLY_TYPED) {
        return string;
    }
    var result;
    var resultString = "";
    var stringToLambdas = (s) => {
        var check = s.match(/(\s*[a-z][0-9]*)+/g);
        var r;
        var res = [];
        if (check == null || check[0].trim() != s.trim()) {
            return null;
        }
        while (r = s.match(/^\s*[a-z][0-9]*/)) {
            s = s.substr(r[0].length);
            res.push(r[0].trim());
        }
        return res.map(x => "λ" + x + ".").join("");
    };

    while (result = string.match(/^([^λ]*)λ(.*?)\.(.*)/)) {
        resultString += result[1];
        var s = stringToLambdas(result[2]);
        if (s == null) {
            return null;
        }
        resultString += s;
        string = result[3];
    }
    
    return resultString + string;
}

function abstractionParenthesis(string) { // \x.\y.\z.T -> (\x.(\y.(\z.(T))))
    if (string == null) {
        return null;
    }

    var index = 0; 
    var isParenBefore = false;
    var findEnd = (i) => {
        var parensStack = 0;
        var afterDot = false;
        while (i < string.length && parensStack >= 0) {
            if (string[i] == '.') {
                afterDot = true;
            }
            if (string[i] == ':') {
                afterDot = false;
            }

            if (afterDot) {
                if (string[i] == ')' || string.substr(i + 1, 2) == "In") {
                    parensStack--;
                } 
                if (string[i] == '(' || string.substr(i + 1, 3) == "Let" ||
                string.substr(i + 1, 6) == "LetRec") {
                    parensStack++;
                }
            }
            i++;
        } 
        return i;
    }
    var lambdaWithNoParens = (s) => {
        if (s.match(/λ/g)) {
            return s.match(/\(\s*λ/g) != null ? 
                s.match(/λ/g).length != s.match(/\(\s*λ/g).length :
                true;
        }
        return false;
    }
    for (var i = 0; i < string.length; i++) {
        if (string[i] == "λ") {
            if (lambdaWithNoParens(string.substring(0, i + 1))) {
                var namespaceEnd = findEnd(i);
                string = string.substring(0, i) + "(" +
                    string.substring(i, namespaceEnd) + ")" +
                    string.substring(namespaceEnd, string.length);
            }
        }
    }
    return string;
}

function preprocess(string) {
    string = string.replace(/\\/g, "λ")
                   .replace(/->/g, "→")
                   .replace(/,/g, " In Let ");
    return abstractionParenthesis(
           abstractionMultiple(
           string));
}

function parse(str, preprocessor = true) {
    if (preprocessor) {
        str = preprocess(str);
    }
    if (str == null) {
        return null;
    }
    var p = new Parser(str);
    var x = p.parseTerm();
    var other = [];
    var o;
    while (o = p.maybe('parseTerm')) {
        other.push(o); 
    }
    var result = x;

    for (var i = 0; i < other.length; i++) {
        result = new App(result, other[i]);
    }

    if (x && p.remains() == "") {
        return result;
    }

    return null;
} 

function slashToLambda(inputBox) {
    var before = inputBox.selectionStart;
    var withArrow = inputBox.value.replace(/->/g, "→");
    if (withArrow != inputBox.value) {
        inputBox.value = withArrow;
        before--; 
    }
    inputBox.value = inputBox.value.replace(/\\/g, "λ")
    inputBox.value = inputBox.value.replace(/\//g, "÷")
    inputBox.value = inputBox.value.replace(/\*/g, "×")
    inputBox.selectionStart = before;
    inputBox.selectionEnd = before;

    return parse(inputBox.value) != null;
}

function slashToLambdaWelcome(inputBox) {
    if (slashToLambda(inputBox)) {
        inputBox.style.outlineColor = "#8bbb8d";
    } else {
        inputBox.style.outlineColor = "#e08888";
    }
}

function slashToLambdaAlias(inputBox) {
    if (slashToLambda(inputBox)) {
        inputBox.style.borderBottomColor = "#8bbb8d";
        return true;
    } else {
        inputBox.style.borderBottomColor = "#e08888"; 
    }
    return false;
}

